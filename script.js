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

// 내 정보 관리 객체
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

// 3분 잠수 체크
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

// 로그인 / 회원가입 탭 전환
window.switchAuthTab = function(tab) {
    if(tab === 'login') {
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('tab-signup-btn').classList.remove('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    } else {
        document.getElementById('tab-signup-btn').classList.add('active');
        document.getElementById('tab-login-btn').classList.remove('active');
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    }
};

window.selectInitialChar = function(charType) {
    selectedCharType = charType;
    document.querySelectorAll('#signup-form .char-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`card-${charType}`).classList.add('selected');
};

// 1. 회원가입 로직
window.handleSignUp = function() {
    const id = document.getElementById('signup-id').value.trim();
    const pw = document.getElementById('signup-pw').value.trim();
    const nickname = document.getElementById('signup-nickname').value.trim();

    if(!id || !pw || !nickname) {
        alert("모든 입력칸을 작성해 주세요!");
        return;
    }

    const userRef = ref(db, `users/${id}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            alert("이미 존재하는 아이디입니다!");
        } else {
            const newUser = {
                password: pw,
                nickname: nickname,
                charType: selectedCharType,
                level: 1,
                exp: 0,
                maxExp: 100
            };
            set(userRef, newUser).then(() => {
                alert("🎉 회원가입 성공! 로그인해 주세요.");
                window.switchAuthTab('login');
                document.getElementById('login-id').value = id;
            });
        }
    });
};

// 2. 로그인 로직
window.handleLogin = function() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();

    if(!id || !pw) {
        alert("아이디와 비밀번호를 입력하세요!");
        return;
    }

    const userRef = ref(db, `users/${id}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if(userData.password === pw) {
                // 로그인 성공!
                myPlayer.userId = id;
                myPlayer.nickname = userData.nickname;
                myPlayer.charType = userData.charType;
                myPlayer.level = userData.level || 1;
                myPlayer.exp = userData.exp || 0;
                myPlayer.maxExp = userData.maxExp || 100;
                
                myPlayer.x = Math.floor(Math.random() * (canvas.width - 60));
                myPlayer.y = Math.floor(Math.random() * (canvas.height - 60));

                updateProfileUI();
                document.getElementById("setup-screen").style.display = "none";
                document.getElementById("lobby-screen").style.display = "flex";
                resetActivityTime();
            } else {
                alert("비밀번호가 일치하지 않습니다.");
            }
        } else {
            alert("존재하지 않는 아이디입니다.");
        }
    });
};

// UI에 내 레벨 & EXP 업데이트
function updateProfileUI() {
    document.getElementById("profile-nickname").textContent = myPlayer.nickname;
    document.getElementById("profile-level-badge").textContent = `Lv.${myPlayer.level}`;
    document.getElementById("profile-avatar").src = myPlayer.charType === 'char1' ? "./gojo.png" : "./luffy.png";

    const percent = Math.min(100, Math.floor((myPlayer.exp / myPlayer.maxExp) * 100));
    
    // 로비 경험치바
    document.getElementById("exp-bar-fill").style.width = `${percent}%`;
    document.getElementById("exp-bar-text").textContent = `EXP ${myPlayer.exp} / ${myPlayer.maxExp}`;

    // 인게임 HUD 경험치바
    document.getElementById("hud-level").textContent = `Lv.${myPlayer.level}`;
    document.getElementById("hud-exp-fill").style.width = `${percent}%`;
    document.getElementById("hud-exp-text").textContent = `${myPlayer.exp} / ${myPlayer.maxExp}`;
}

// ⚡ 경험치 획득 및 레벨업 함수
window.addExp = function(amount) {
    myPlayer.exp += amount;
    
    // 레벨업 체크
    let levelUp = false;
    while(myPlayer.exp >= myPlayer.maxExp) {
        myPlayer.exp -= myPlayer.maxExp;
        myPlayer.level += 1;
        myPlayer.maxExp = Math.floor(myPlayer.maxExp * 1.5); // 다음 레벨 필요 경험치 증가
        levelUp = true;
    }

    if(levelUp) {
        alert(`🎉 LEVEL UP! 축하합니다! [Lv.${myPlayer.level}]에 도달하셨습니다!`);
    }

    // 서버(파이어베이스)에 내 키우기 정보 업데이트 저장!
    const userRef = ref(db, `users/${myPlayer.userId}`);
    set(userRef, {
        password: myPlayer.password || "1234", // 기존 정보 유지
        nickname: myPlayer.nickname,
        charType: myPlayer.charType,
        level: myPlayer.level,
        exp: myPlayer.exp,
        maxExp: myPlayer.maxExp
    });

    updateProfileUI();

    // 게임 공간 안이라면 위치 정보 서버 업데이트
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

// 4자리 비밀코드 & 날짜별 헬스 보관함 로직
let userPin = "";
let currentRecordTab = 'arm';
const todayStr = new Date().toISOString().split('T')[0];

window.openRecordBox = function() {
    document.getElementById("record-screen").style.display = "flex";
    if(userPin && userPin.length === 4) {
        document.getElementById("pin-view").style.display = "none";
        document.getElementById("main-record-view").style.display = "block";
        window.onDateOrTabChange();
    } else {
        document.getElementById("pin-view").style.display = "flex";
        document.getElementById("main-record-view").style.display = "none";
        document.getElementById("pin-input-field").value = "";
    }
};

window.closeRecordBox = function() { document.getElementById("record-screen").style.display = "none"; };

window.unlockRecordBox = function() {
    const pinVal = document.getElementById("pin-input-field").value.trim();
    if(pinVal.length !== 4 || isNaN(pinVal)) {
        alert("숫자 4자리를 정확히 입력해 주세요!");
        return;
    }
    userPin = pinVal;
    document.getElementById("active-pin-tag").textContent = `코드: ${userPin}`;
    document.getElementById("workout-date").value = todayStr;
    document.getElementById("pin-view").style.display = "none";
    document.getElementById("main-record-view").style.display = "block";
    window.onDateOrTabChange();
};

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

    const recordRef = ref(db, `workoutRecords/PIN_${userPin}/${selectedDate}/${currentRecordTab}`);
    get(recordRef).then((snapshot) => {
        textarea.value = snapshot.exists() ? snapshot.val() : "";
    });
};

// 헬스 기록 저장 시 +50 EXP 지급!
window.saveRecord = function() {
    const selectedDate = document.getElementById("workout-date").value;
    if(!selectedDate) { alert("날짜를 선택해주세요!"); return; }

    const currentText = document.getElementById("record-textarea").value;
    const recordRef = ref(db, `workoutRecords/PIN_${userPin}/${selectedDate}/${currentRecordTab}`);

    set(recordRef, currentText).then(() => {
        alert(`💪 [${selectedDate}] 기록 완료! 경험치 +50 EXP 획득!`);
        window.addExp(50); // 경험치 보상!
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

    // 격자 그리기
    ctx.strokeStyle = "#e0e0e0"; 
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 다른 플레이어들 그리기
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

        // [Lv.X] 닉네임 표시하기
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
