import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 1. 파이어베이스 설정
const firebaseConfig = {
    apiKey: "AIzaSyDI2REmsCMwoaaV4xndPZKpX_EUntnCGk4",
    authDomain: "croos-9aafb.firebaseapp.com",
    databaseURL: "https://croos-9aafb-default-rtdb.firebaseio.com",
    projectId: "croos-9aafb",
    storageBucket: "croos-9aafb.firebasestorage.app",
    messagingSenderId: "314607076707",
    appId: "1:314607076707:web:f15984e304272721e47f56",
    measurementId: "G-K8JR2FBWBY"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

// 캐릭터 및 배경 이미지 로드 (bg.png 소문자 적용)
const CHAR_IMAGES = { char1: new Image(), char2: new Image() };
CHAR_IMAGES.char1.src = "./gojo.png";
CHAR_IMAGES.char2.src = "./luffy.png";

const bgImage = new Image();
bgImage.src = "./bg.png";

// 2. 내 캐릭터 상태
let myPlayer = {
    userId: "", nickname: "익명", charType: "char1",
    level: 1, exp: 0, maxExp: 100,
    x: 100, y: 200, size: 55, facing: 'right',
    energy: 0, maxEnergy: 100, combo: 0
};

let players = {};
const keysPressed = {};
let isGameStarted = false;
let myRef = null;

// 이펙트 및 몬스터 배열
let effects = []; 
let damageTexts = [];

// [1단계 추가] 테스트 몬스터 객체
let testMonster = {
    id: "monster_1",
    name: "테스트 몬스터",
    x: 400,
    y: 200,
    size: 45,
    hp: 100,
    maxHp: 100
};

// 전역 함수 등록 (HTML onclick 연동용)
window.selectInitialChar = function(charType) {
    myPlayer.charType = charType;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`card-${charType}`).classList.add('selected');
};

window.handlePinLogin = function() {
    const pin = document.getElementById('user-pin').value.trim();
    const inputNickname = document.getElementById('user-nickname').value.trim();

    if(pin.length !== 4 || isNaN(pin)) {
        alert("숫자 4자리 코드를 정확히 입력해 주세요! (예: 1234)");
        return;
    }

    const userRef = ref(db, `users/PIN_${pin}`);
    
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            myPlayer.userId = `PIN_${pin}`;
            myPlayer.nickname = userData.nickname;
            myPlayer.charType = userData.charType || "char1";
            myPlayer.level = userData.level || 1;
            myPlayer.exp = userData.exp || 0;
            myPlayer.maxExp = userData.maxExp || 100;
            
            alert(`👋 환영합니다, ${myPlayer.nickname}님! 데이터를 성공적으로 불러왔습니다.`);
        } else {
            if(!inputNickname) {
                alert("이 코드는 처음 접속하는 코드입니다!\n'닉네임'을 먼저 입력하고 접속을 눌러주세요.");
                return;
            }
            myPlayer.userId = `PIN_${pin}`;
            myPlayer.nickname = inputNickname;
            myPlayer.level = 1;
            myPlayer.exp = 0;
            myPlayer.maxExp = 100;

            set(userRef, {
                nickname: myPlayer.nickname,
                charType: myPlayer.charType,
                level: 1, exp: 0, maxExp: 100
            });
            alert(`🎉 신규 캐릭터 [${myPlayer.nickname}] 생성 완료!`);
        }

        // 로비 UI 업데이트
        document.getElementById("profile-nickname").textContent = myPlayer.nickname;
        document.getElementById("profile-level-badge").textContent = `Lv.${myPlayer.level}`;
        document.getElementById("profile-avatar").src = myPlayer.charType === 'char1' ? "./gojo.png" : "./luffy.png";
        
        const hudLevelEl = document.getElementById("hud-level");
        if(hudLevelEl) hudLevelEl.textContent = `Lv.${myPlayer.level}`;

        document.getElementById("setup-screen").style.display = "none";
        document.getElementById("lobby-screen").style.display = "flex";
        
    }).catch((error) => {
        console.error("DB 에러:", error);
        alert("데이터베이스 연결 실패! 에러: " + error.message);
    });
};

window.enterGame = function() {
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "flex";
    myRef = ref(db, `players/${myPlayer.userId}`);
    set(myRef, myPlayer);
    onDisconnect(myRef).remove();
    isGameStarted = true;
};

// 스킬 버튼 이벤트 연동
const btnAtk = document.getElementById("btn-attack");
const btnS1 = document.getElementById("btn-skill1");
const btnS2 = document.getElementById("btn-skill2");

if(btnAtk) btnAtk.onclick = () => useSkill("attack");
if(btnS1) btnS1.onclick = () => useSkill("skill1");
if(btnS2) btnS2.onclick = () => useSkill("skill2");

function useSkill(type) {
    if(!isGameStarted) return;
    
    const isGojo = myPlayer.charType === "char1";
    let attackX = myPlayer.facing === 'right' ? myPlayer.x + 60 : myPlayer.x - 60;

    if (type === "attack") {
        effects.push({ x: attackX, y: myPlayer.y + 20, radius: 20, color: isGojo?"#00ffff":"#ff3333", life: 10 });

        // [1단계 추가] 평타 적중 및 데미지 판정
        if (testMonster && testMonster.hp > 0) {
            const distanceX = testMonster.x - myPlayer.x;
            const inRangeRight = (myPlayer.facing === 'right' && distanceX >= 0 && distanceX <= 80);
            const inRangeLeft = (myPlayer.facing === 'left' && distanceX <= 0 && Math.abs(distanceX) <= 80);
            const inVerticalRange = Math.abs(testMonster.y - myPlayer.y) < 50;

            if ((inRangeRight || inRangeLeft) && inVerticalRange) {
                const damage = 20;
                testMonster.hp -= damage;
                if (testMonster.hp < 0) testMonster.hp = 0;

                // 데미지 텍스트 이펙트 추가
                damageTexts.push({
                    text: `-${damage}`,
                    x: testMonster.x + testMonster.size / 2,
                    y: testMonster.y - 10,
                    life: 25,
                    color: "#ff3333"
                });
            }
        }
    } else if (type === "skill1") {
        if(isGojo) {
            myPlayer.x = myPlayer.facing === 'right' ? myPlayer.x + 100 : myPlayer.x - 100;
            effects.push({ x: myPlayer.x, y: myPlayer.y, radius: 40, color: "rgba(150, 0, 255, 0.5)", life: 15 });
        } else {
            attackX = myPlayer.facing === 'right' ? myPlayer.x + 100 : myPlayer.x - 100;
            effects.push({ x: attackX, y: myPlayer.y + 20, radius: 30, color: "#ff5500", life: 15 });
        }
    } else if (type === "skill2") {
        if(isGojo) {
            effects.push({ x: myPlayer.x + 25, y: myPlayer.y + 25, radius: 80, color: "rgba(100, 0, 255, 0.6)", life: 20 });
        } else {
            effects.push({ x: myPlayer.x + 25, y: myPlayer.y + 25, radius: 90, color: "rgba(255, 200, 0, 0.5)", life: 20 });
        }
    }
}

// ==========================================
// 🎮 이동 및 조작 로직 (WASD + 방향키 지원, 속도 조절)
// ==========================================
window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
        e.preventDefault();
    }
    keysPressed[k] = true;
});

window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    keysPressed[k] = false;
});

function bindControlBtn(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const pressOn = (e) => {
        e.preventDefault();
        keysPressed[keyName] = true;
    };

    const pressOff = (e) => {
        e.preventDefault();
        keysPressed[keyName] = false;
    };

    btn.addEventListener("touchstart", pressOn, { passive: false });
    btn.addEventListener("touchend", pressOff, { passive: false });
    btn.addEventListener("touchcancel", pressOff, { passive: false });
    
    btn.addEventListener("mousedown", pressOn);
    btn.addEventListener("mouseup", pressOff);
    btn.addEventListener("mouseleave", pressOff);
}

bindControlBtn("btn-up", "w");
bindControlBtn("btn-down", "s");
bindControlBtn("btn-left", "a");
bindControlBtn("btn-right", "d");

function updatePosition() {
    if (!isGameStarted) return;
    const speed = 2.5; 
    let moved = false;

    if (keysPressed["arrowup"] || keysPressed["w"]) { myPlayer.y -= speed; moved = true; }
    if (keysPressed["arrowdown"] || keysPressed["s"]) { myPlayer.y += speed; moved = true; }
    if (keysPressed["arrowleft"] || keysPressed["a"]) { myPlayer.x -= speed; myPlayer.facing = 'left'; moved = true; }
    if (keysPressed["arrowright"] || keysPressed["d"]) { myPlayer.x += speed; myPlayer.facing = 'right'; moved = true; }

    // 캔버스 벽 처리
    if (myPlayer.x < 0) myPlayer.x = 0;
    if (myPlayer.y < 0) myPlayer.y = 0;
    if (myPlayer.x > canvas.width - myPlayer.size) myPlayer.x = canvas.width - myPlayer.size;
    if (myPlayer.y > canvas.height - myPlayer.size) myPlayer.y = canvas.height - myPlayer.size;

    if (moved && myRef) {
        set(myRef, {
            userId: myPlayer.userId,
            nickname: myPlayer.nickname,
            charType: myPlayer.charType,
            level: myPlayer.level,
            x: myPlayer.x,
            y: myPlayer.y,
            size: myPlayer.size,
            facing: myPlayer.facing
        });
    }
}

onValue(ref(db, 'players'), (snapshot) => { 
    players = snapshot.val() || {}; 
    if (statusEl) {
        statusEl.textContent = `현재 서버 인원: ${Object.keys(players).length}명 접속 중`;
    }
});

function draw() {
    updatePosition();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 배경 이미지 (bg.png) 그리기
    if (bgImage && bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // [1단계 추가] 테스트 몬스터 그리기 (HP가 남아있을 때만)
    if (testMonster && testMonster.hp > 0) {
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(testMonster.x, testMonster.y, testMonster.size, testMonster.size);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(testMonster.x, testMonster.y, testMonster.size, testMonster.size);

        // 몬스터 이름 및 HP 텍스트
        const mText = `[HP] ${testMonster.hp}/${testMonster.maxHp} ${testMonster.name}`;
        ctx.font = "bold 11px 'Segoe UI', sans-serif";
        const mTextWidth = ctx.measureText(mText).width;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(testMonster.x + testMonster.size / 2 - mTextWidth / 2 - 4, testMonster.y - 32, mTextWidth + 8, 16);
        ctx.fillStyle = "#ffaa00";
        ctx.textAlign = "center";
        ctx.fillText(mText, testMonster.x + testMonster.size / 2, testMonster.y - 20);

        // HP 게이지 바
        const barW = 50;
        const barH = 6;
        const barX = testMonster.x + testMonster.size / 2 - barW / 2;
        const barY = testMonster.y - 12;

        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barW, barH);

        const hpPercent = testMonster.hp / testMonster.maxHp;
        ctx.fillStyle = "#00ff88";
        ctx.fillRect(barX, barY, barW * hpPercent, barH);
    }

    // 2. 캐릭터 그리기
    Object.keys(players).forEach((id) => {
        const p = players[id];
        const charImg = CHAR_IMAGES[p.charType] || CHAR_IMAGES.char1;
        
        if (charImg && charImg.complete && charImg.naturalWidth !== 0) {
            ctx.save();
            if(p.facing === 'left') {
                ctx.translate(p.x + p.size, p.y);
                ctx.scale(-1, 1);
                ctx.drawImage(charImg, 0, 0, p.size, p.size);
            } else {
                ctx.drawImage(charImg, p.x, p.y, p.size, p.size);
            }
            ctx.restore();
        }

        // 닉네임 표시
        const fullText = `[Lv.${p.level || 1}] ${p.nickname || "익명"}`;
        ctx.font = "bold 12px 'Segoe UI', sans-serif";
        const textWidth = ctx.measureText(fullText).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(p.x + p.size / 2 - textWidth / 2 - 4, p.y - 18, textWidth + 8, 16);
        ctx.fillStyle = id === myPlayer.userId ? "#00ff88" : "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(fullText, p.x + p.size / 2, p.y - 6);
    });

    // 3. 스킬 이펙트 그리기
    for (let i = effects.length - 1; i >= 0; i--) {
        const eff = effects[i];
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
        ctx.fillStyle = eff.color;
        ctx.fill();
        eff.life--;
        if (eff.life <= 0) effects.splice(i, 1);
    }

    // [1단계 추가] 데미지 텍스트 이펙트 그리기
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const dt = damageTexts[i];
        ctx.font = "bold 14px 'Segoe UI', sans-serif";
        ctx.fillStyle = dt.color;
        ctx.textAlign = "center";
        ctx.fillText(dt.text, dt.x, dt.y);
        dt.y -= 0.5;
        dt.life--;
        if (dt.life <= 0) damageTexts.splice(i, 1);
    }

    requestAnimationFrame(draw);
}
draw();
