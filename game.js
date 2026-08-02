import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ==========================================
// 1. Firebase 설정
// ==========================================
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

// ==========================================
// 2. 캐릭터 이미지 로드
// ==========================================
const CHAR_IMAGES = {
    char1: new Image(),
    char2: new Image()
};

CHAR_IMAGES.char1.src = "https://image.zeta-ai.io/profile-image/3ccac6c2-9a72-4105-a1d1-b55e8d0924e4/35e03299-9201-4eea-9323-afac61c9d2ee.jpeg?w=750&q=75&f=webp";
CHAR_IMAGES.char2.src = "https://saegchil.co.kr/wp-content/uploads/2022/09/lupi-paiting-saegchil.jpg";

// ==========================================
// 3. 게임 변수 및 초기화
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const myId = "user_" + Math.random().toString(36).substring(2, 9);

let myPlayer = {
    x: Math.floor(Math.random() * (canvas.width - 50)),
    y: Math.floor(Math.random() * (canvas.height - 50)),
    charType: "char1", // 기본값
    size: 45 // 이미지 크기
};

let players = {};
const keysPressed = {};
let isGameStarted = false;

// Firebase 참조
const myRef = ref(db, `players/${myId}`);
const playersRef = ref(db, 'players');

// HTML에서 접근할 수 있도록 window 객체에 바인딩
window.selectCharacter = function(selectedChar) {
    myPlayer.charType = selectedChar;
    
    // 데이터베이스에 내 정보 업데이트
    set(myRef, myPlayer);
    onDisconnect(myRef).remove();

    // 선택창 닫기 및 게임 시작
    document.getElementById("character-select-screen").style.display = "none";
    isGameStarted = true;
};

// 실시간 접속자 동기화
onValue(playersRef, (snapshot) => {
    players = snapshot.val() || {};
    const playerCount = Object.keys(players).length;
    statusEl.textContent = `현재 접속자: ${playerCount}명 (내 ID: ${myId.substring(0, 6)})`;
});

// ==========================================
// 4. 입력 처리
// ==========================================
window.addEventListener("keydown", (e) => keysPressed[e.key] = true);
window.addEventListener("keyup", (e) => keysPressed[e.key] = false);

function bindTouchBtn(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const startHandler = (e) => {
        e.preventDefault();
        keysPressed[keyName] = true;
    };
    const endHandler = (e) => {
        e.preventDefault();
        keysPressed[keyName] = false;
    };

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
    if (!isGameStarted) return;

    const speed = 4;
    let moved = false;

    if (keysPressed["ArrowUp"] && myPlayer.y > 0) {
        myPlayer.y -= speed;
        moved = true;
    }
    if (keysPressed["ArrowDown"] && myPlayer.y < canvas.height - myPlayer.size) {
        myPlayer.y += speed;
        moved = true;
    }
    if (keysPressed["ArrowLeft"] && myPlayer.x > 0) {
        myPlayer.x -= speed;
        moved = true;
    }
    if (keysPressed["ArrowRight"] && myPlayer.x < canvas.width - myPlayer.size) {
        myPlayer.x += speed;
        moved = true;
    }

    if (moved) {
        set(myRef, myPlayer);
    }
}

// ==========================================
// 5. 화면 렌더링 루프
// ==========================================
function draw() {
    updatePosition();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 격자 그리기
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 모든 접속 유저 그리기
    Object.keys(players).forEach((id) => {
        const p = players[id];
        const charImg = CHAR_IMAGES[p.charType || "char1"];

        if (charImg && charImg.complete) {
            ctx.drawImage(charImg, p.x, p.y, p.size, p.size);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        // 테두리 구분
        ctx.strokeStyle = id === myId ? "#00ff88" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.size, p.size);

        // 플레이어 이름 표시
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(id === myId ? "나" : "상대방", p.x + p.size / 2, p.y - 8);
    });

    requestAnimationFrame(draw);
}

draw();
