import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

const CHAR_IMAGES = {
    char1: new Image(),
    char2: new Image()
};
CHAR_IMAGES.char1.src = "./gojo.png";
CHAR_IMAGES.char2.src = "./luffy.png";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

// 내 플레이어 정보
let myPlayer = {
    userId: "",
    nickname: "익명",
    charType: "char1",
    level: 1,
    exp: 0,
    maxExp: 100,
    x: 200,
    y: 200,
    size: 55
};

let selectedCharType = "char1";
let players = {};
const keysPressed = {};
let isGameStarted = false;
let isAFK = false;

let myRef = null;
const playersRef = ref(db, 'players');

// 잠수 체크 (3분)
let lastActivityTime = Date.now();
const AFK_LIMIT = 3 * 60 * 1000;

function resetActivityTime() {
    if (isAFK) return;
    lastActivityTime = Date.now();
}

window.addEventListener('mousemove', resetActivityTime);
window.addEventListener('keydown', resetActivityTime);
window.addEventListener('touchstart', resetActivityTime);
window.addEventListener('click', resetActivityTime);

setInterval(() => {
    if (isGameStarted && !isAFK && (Date.now() - lastActivityTime > AFK_LIMIT)) {
        isAFK = true;
        isGameStarted = false;
        if(myRef) remove(myRef); 
        document.getElementById("lobby-screen").style.display = "none";
        document.getElementById("game-screen").style.display = "none";
        document.getElementById("afk-screen").style.display = "flex";
    }
}, 1000);

window.selectInitialChar = function(charType) {
    selectedCharType = charType;
    document.querySelectorAll('#setup-screen .char-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`card-${charType}`).classList.add('selected');
};

// 🔑 4자리 PIN 코드 로그인 & 생성 완벽 개선
window.handlePinLogin = function() {
    const pin = document.getElementById('user-pin').value.trim();
    const inputNickname = document.getElementById('user-nickname').value.trim();

    // 1. PIN 번호 유효성 검사
    if(pin.length !== 4 || isNaN(pin)) {
        alert("숫자 4자리 코드를 정확히 입력해 주세요! (예: 1234)");
        return;
    }

    const userRef = ref(db, `users/PIN_${pin}`);
    
    // 2. DB에서 유저 정보 가져오기 시도
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            // [기존 유저] 저장된 데이터 불러오기
            const userData = snapshot.val();
            myPlayer.userId = `PIN_${pin}`;
            myPlayer.nickname = userData.nickname;
            myPlayer.charType = userData.charType || "char1";
            myPlayer.level = userData.level || 1;
            myPlayer.exp = userData.exp || 0;
            myPlayer.maxExp = userData.maxExp || 100;
            
            alert(`👋 환영합니다, ${myPlayer.nickname}님! [Lv.${myPlayer.level}] 데이터를 불러왔습니다.`);
        } else {
            // [신규 유저] 처음 접속하는 코드일 경우
            if(!inputNickname) {
                alert("이 4자리 코드는 처음 접속하는 코드네요!\n'닉네임'을 먼저 입력하고 다시 접속 버튼을 눌러주세요.");
                return;
            }

            myPlayer.userId = `PIN_${pin}`;
            myPlayer.nickname = inputNickname;
            myPlayer.charType = selectedCharType;
            myPlayer.level = 1;
            myPlayer.exp = 0;
            myPlayer.maxExp = 100;

            // 데이터베이스 저장
            set(userRef, {
                nickname: myPlayer.nickname,
                charType: myPlayer.charType,
                level: 1,
                exp: 0,
                maxExp: 100
            });
            alert(`🎉 신규 캐릭터 [${myPlayer.nickname}] 생성 완료! 접속합니다.`);
        }

        // 공통 접속 처리 (성공 시)
        myPlayer.x = Math.floor(Math.random() * (canvas.width - 60));
        myPlayer.y = Math.floor(Math.random() * (canvas.height - 60));

        document.getElementById("active-pin-tag").textContent = `코드: ${pin}`;
        updateProfileUI();
        document.getElementById("setup-screen").style.display = "none";
        document.getElementById("lobby-screen").style.display = "flex";
        resetActivityTime();
        
    }).catch((error) => {
        // [오류 발생 시] 화면이 먹통되지 않도록 알림창 띄우기
        console.error("데이터베이스 접근 에러:", error);
        alert("데이터베이스 연결에 실패했습니다!\n파이어베이스 규칙(Rules)이 막혀있거나 네트워크 문제일 수 있습니다.\n에러 내용: " + error.message);
    });
};

function updateProfileUI() {
    document.getElementById("profile-nickname").textContent = myPlayer.nickname;
    document.getElementById("profile-level-badge").textContent = `Lv.${myPlayer.level}`;
    document.getElementById("profile-avatar").src = myPlayer.charType === 'char1' ? "./gojo.png" : "./luffy.png";

    const percent = Math.min(100, Math.floor((myPlayer.exp / myPlayer.maxExp) * 100));
    
    document.getElementById("exp-bar-fill").style.width = `${percent}%`;
    document.getElementById("exp-bar-text").textContent = `EXP ${myPlayer.exp} / ${myPlayer.maxExp}`;

    document.getElementById("hud-level").textContent = `Lv.${myPlayer.level}`;
    document.getElementById("hud-exp-fill").style.width = `${percent}%`;
    document.getElementById("hud-exp-text").textContent = `${myPlayer.exp} / ${myPlayer.maxExp}`;
}

// ⚡ 경험치 획득 및 레벨업
window.addExp = function(amount) {
    myPlayer.exp += amount;
    
    let levelUp = false;
    while(myPlayer.exp >= myPlayer.maxExp) {
        myPlayer.exp -= myPlayer.maxExp;
        myPlayer.level += 1;
        myPlayer.maxExp = Math.floor(myPlayer.maxExp * 1.5);
        levelUp = true;
    }

    if(levelUp) {
        alert(`🎉 LEVEL UP! 축하합니다! [Lv.${myPlayer.level}]에 도달하셨습니다!`);
    }

    // 서버 업데이트
    const userRef = ref(db, `users/${myPlayer.userId}`);
    set(userRef, {
        nickname: myPlayer.nickname,
        charType: myPlayer.charType,
        level: myPlayer.level,
        exp: myPlayer.exp,
        maxExp: myPlayer.maxExp
    });

    updateProfileUI();

    if(isGameStarted && myRef) {
        set(myRef, myPlayer);
    }
};

window.enterGame = function() {
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "flex";

    myRef = ref(db, `players/${myPlayer.userId}`);
    set(myRef, myPlayer);
    onDisconnect(myRef).remove();
    isGameStarted = true;
    resetActivityTime();
};

// 헬스 기록 보관함 로직
let currentRecordTab = 'arm';
const todayStr = new Date().toISOString().split('T')[0];

window.openRecordBox = function() {
    document.getElementById("record-screen").style.display = "flex";
    document.getElementById("workout-date").value = todayStr;
    window.onDateOrTabChange();
};

window.closeRecordBox = function() { document.getElementById("record-screen").style.display = "none"; };

window.changeTab = function(tabName) {
    currentRecordTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    window.onDateOrTabChange();
};

window.onDateOrTabChange = function() {
    const selectedDate = document.getElementById("workout-date").value;
    if(!selectedDate) return;
    const textarea = document.getElementById("record-textarea");
    textarea.value = "기록 불러오는 중...";

    const recordRef = ref(db, `workoutRecords/${myPlayer.userId}/${selectedDate}/${currentRecordTab}`);
    get(recordRef).then((snapshot) => {
        textarea.value = snapshot.exists() ? snapshot.val() : "";
    });
};

window.saveRecord = function() {
    const selectedDate = document.getElementById("workout-date").value;
    if(!selectedDate) { alert("날짜를 선택해주세요!"); return; }

    const currentText = document.getElementById("record-textarea").value;
    const recordRef = ref(db, `workoutRecords/${myPlayer.userId}/${selectedDate}/${currentRecordTab}`);

    set(recordRef, currentText).then(() => {
        alert(`💪 [${selectedDate}] 기록 완료! 경험치 +50 EXP 획득!`);
        window.addExp(50);
    });
};

onValue(playersRef, (snapshot) => {
    players = snapshot.val() || {};
    statusEl.textContent = `현재 서버 인원: ${Object.keys(players).length}명 접속 중`;
});

window.addEventListener("keydown", (e) => keysPressed[e.key] = true);
window.addEventListener("keyup", (e) => keysPressed[e.key] = false);

function bindTouchBtn(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const startHandler = (e) => { e.preventDefault(); keysPressed[keyName] = true; resetActivityTime(); };
    const endHandler = (e) => { e.preventDefault(); keysPressed[keyName] = false; resetActivityTime(); };
    btn.addEventListener("touchstart", startHandler);
    btn.addEventListener("touchend", endHandler);
    btn.addEventListener("mousedown", startHandler);
    btn.addEventListener("mouseup", endHandler);
    btn.addEventListener("mouseleave", endHandler);
}

bindTouchBtn("btn-up", "ArrowUp");
bindTouchBtn("btn-down", "ArrowDown");
bindTouchBtn("btn-left", "ArrowLeft");
bindTouchBtn("btn-right", "ArrowRight");

function updatePosition() {
    if (!isGameStarted || isAFK) return;
    const speed = 4.5;
    let moved = false;

    if (keysPressed["ArrowUp"] && myPlayer.y > 0) { myPlayer.y -= speed; moved = true; }
    if (keysPressed["ArrowDown"] && myPlayer.y < canvas.height - myPlayer.size) { myPlayer.y += speed; moved = true; }
    if (keysPressed["ArrowLeft"] && myPlayer.x > 0) { myPlayer.x -= speed; moved = true; }
    if (keysPressed["ArrowRight"] && myPlayer.x < canvas.width - myPlayer.size) { myPlayer.x += speed; moved = true; }

    if (moved && myRef) { set(myRef, myPlayer); }
}

function draw() {
    if (!isAFK) { updatePosition(); }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#e0e0e0"; 
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    Object.keys(players).forEach((id) => {
        const p = players[id];
        const charImg = CHAR_IMAGES[p.charType] || CHAR_IMAGES.char1;

        if (charImg && charImg.complete && charImg.naturalWidth !== 0) {
            ctx.save();
            ctx.globalCompositeOperation = "multiply"; 
            ctx.drawImage(charImg, p.x, p.y, p.size, p.size);
            ctx.restore();
        } else {
            ctx.fillStyle = id === myPlayer.userId ? "#00ff88" : "#ff4444";
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        const levelText = `[Lv.${p.level || 1}] `;
        const nameText = p.nickname || "익명";
        const fullText = levelText + nameText;

        ctx.font = "bold 12px 'Segoe UI', sans-serif";
        const textWidth = ctx.measureText(fullText).width;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(p.x + p.size / 2 - textWidth / 2 - 4, p.y - 18, textWidth + 8, 16);

        ctx.fillStyle = id === myPlayer.userId ? "#00ff88" : "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(fullText, p.x + p.size / 2, p.y - 6);
    });

    requestAnimationFrame(draw);
}

draw();
