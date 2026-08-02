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

const myId = "user_" + Math.random().toString(36).substring(2, 9);

let myPlayer = {
    nickname: "익명",
    charType: "char1",
    x: Math.floor(Math.random() * (canvas.width - 60)),
    y: Math.floor(Math.random() * (canvas.height - 60)),
    size: 55
};

let players = {};
const keysPressed = {};
let isGameStarted = false;
let isAFK = false;

const myRef = ref(db, `players/${myId}`);
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
        remove(myRef); 
        document.getElementById("lobby-screen").style.display = "none";
        document.getElementById("game-screen").style.display = "none";
        document.getElementById("afk-screen").style.display = "flex";
    }
}, 1000);

window.selectInitialChar = function(charType) {
    myPlayer.charType = charType;
    document.querySelectorAll('.char-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`card-${charType}`).classList.add('selected');
};

window.confirmSetup = function() {
    const inputVal = document.getElementById("nickname-input").value.trim();
    if (!inputVal) {
        alert("멋진 닉네임을 입력해 주세요!");
        return;
    }

    myPlayer.nickname = inputVal;
    document.getElementById("profile-nickname").textContent = myPlayer.nickname;
    
    if(myPlayer.charType === 'char1') {
        document.getElementById("profile-avatar").src = "./gojo.png";
    } else {
        document.getElementById("profile-avatar").src = "./luffy.png";
    }

    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "flex";
    resetActivityTime();
};

window.enterGame = function() {
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "flex";

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
        document.getElementById("pin-input-field").focus();
    }
};

window.closeRecordBox = function() {
    document.getElementById("record-screen").style.display = "none";
};

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
        if (snapshot.exists()) {
            textarea.value = snapshot.val();
        } else {
            textarea.value = "";
        }
    }).catch((error) => {
        console.error("기록 불러오기 실패:", error);
        textarea.value = "";
    });
};

window.saveRecord = function() {
    const selectedDate = document.getElementById("workout-date").value;
    if(!selectedDate) {
        alert("날짜를 선택해주세요!");
        return;
    }

    const currentText = document.getElementById("record-textarea").value;
    const recordRef = ref(db, `workoutRecords/PIN_${userPin}/${selectedDate}/${currentRecordTab}`);

    set(recordRef, currentText)
        .then(() => {
            alert(`💪 [${selectedDate}] 기록이 서버에 안전하게 저장되었습니다!`);
        })
        .catch((error) => {
            alert("저장 실패: " + error.message);
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

    if (moved) { set(myRef, myPlayer); }
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
            ctx.fillStyle = id === myId ? "#00ff88" : "#ff4444";
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        const text = p.nickname || "익명";
        ctx.font = "bold 13px 'Segoe UI', sans-serif";
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(p.x + p.size / 2 - textWidth / 2 - 4, p.y - 18, textWidth + 8, 16);

        ctx.fillStyle = id === myId ? "#00ff88" : "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(text, p.x + p.size / 2, p.y - 6);
    });

    requestAnimationFrame(draw);
}

draw();
