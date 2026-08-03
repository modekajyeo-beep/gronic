import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDI2REmsCMwoaaV4xndPZKpX_EUntnCGk4",
    authDomain: "croos-9aafb.firebaseapp.com",
    databaseURL: "https://croos-9aafb-default-rtdb.firebaseio.com",
    projectId: "croos-9aafb"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CHAR_IMAGES = { char1: new Image(), char2: new Image() };
CHAR_IMAGES.char1.src = "./gojo.png";
CHAR_IMAGES.char2.src = "./luffy.png";

// ⚔️ 전투 관련 상태
let myPlayer = {
    userId: "", nickname: "익명", charType: "char1",
    level: 1, x: 100, y: 200, size: 55, facing: 'right',
    energy: 0, maxEnergy: 100, combo: 0
};
let players = {};
const keysPressed = {};
let isGameStarted = false;
let myRef = null;

// 🎯 전투 타겟 (샌드백 몬스터)
let dummyBoss = { x: 400, y: 200, size: 70, hp: 5000, maxHp: 5000 };

// 💥 시각 효과 및 데미지 텍스트
let effects = []; 
let damageTexts = [];

window.selectInitialChar = function(charType) {
    myPlayer.charType = charType;
    document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`card-${charType}`).classList.add('selected');
};

window.handlePinLogin = function() {
    const pin = document.getElementById('user-pin').value.trim();
    if(pin.length !== 4) return alert("4자리 숫자를 입력하세요.");
    myPlayer.userId = `PIN_${pin}`;
    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "flex";
};

window.enterGame = function() {
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "flex";
    myRef = ref(db, `players/${myPlayer.userId}`);
    set(myRef, myPlayer);
    onDisconnect(myRef).remove();
    isGameStarted = true;
};

// ==========================================
// 🔥 전투 스킬 시스템 로직
// ==========================================

function updateEnergyUI() {
    const percent = Math.min(100, (myPlayer.energy / myPlayer.maxEnergy) * 100);
    document.getElementById("hud-energy-fill").style.width = `${percent}%`;
    
    const textEl = document.getElementById("hud-energy-text");
    if(percent >= 100) {
        textEl.textContent = "🔥 치명타 장전 완료! (다음 공격 강력함)";
        textEl.style.color = "#ffff00";
    } else {
        textEl.textContent = `에너지 ${Math.floor(percent)}% (맞출수록 증가)`;
        textEl.style.color = "#fff";
    }
}

// 스킬 명중 시 처리 (데미지 계산, 콤보, 크리티컬)
function hitTarget(baseDmg, hitX, hitY) {
    myPlayer.combo++;
    
    // 1. 게이지 비례 크리티컬 확률 (최대 게이지면 100% 크리티컬)
    let isCrit = false;
    let finalDmg = baseDmg + (myPlayer.combo * 2); // 콤보 누적 딜 상승
    
    if (myPlayer.energy >= myPlayer.maxEnergy) {
        isCrit = true;
        myPlayer.energy = 0; // 게이지 소모
        finalDmg *= 3; // 폭발 딜
    } else {
        myPlayer.energy = Math.min(myPlayer.maxEnergy, myPlayer.energy + 15); // 타격시 게이지 충전
    }

    dummyBoss.hp -= finalDmg;
    if(dummyBoss.hp < 0) dummyBoss.hp = dummyBoss.maxHp; // 샌드백 리필

    // 텍스트 생성
    damageTexts.push({
        x: hitX + (Math.random()*40 - 20),
        y: hitY - 20,
        text: isCrit ? `💥 크리티컬! ${finalDmg}` : `${finalDmg} (콤보${myPlayer.combo})`,
        color: isCrit ? "#ffcc00" : "#ffffff",
        life: 40,
        isCrit: isCrit
    });

    updateEnergyUI();
}

// 버튼 클릭 이벤트 바인딩
document.getElementById("btn-attack").onclick = () => useSkill("attack");
document.getElementById("btn-skill1").onclick = () => useSkill("skill1");
document.getElementById("btn-skill2").onclick = () => useSkill("skill2");

function useSkill(type) {
    if(!isGameStarted) return;
    
    const isGojo = myPlayer.charType === "char1";
    let attackX = myPlayer.facing === 'right' ? myPlayer.x + 60 : myPlayer.x - 60;
    
    // 거리 계산 (기획하신 패시브 연동용)
    const dist = Math.hypot(dummyBoss.x - myPlayer.x, dummyBoss.y - myPlayer.y);
    let hitSuccess = false;

    if (type === "attack") {
        // 평타: 짧은 거리 공격
        effects.push({ x: attackX, y: myPlayer.y + 20, radius: 20, color: isGojo?"#00ffff":"#ff3333", life: 10 });
        if (dist < 100) hitSuccess = true;

    } else if (type === "skill1") {
        if(isGojo) {
            // 고조 스킬1: 공간 대쉬 (적 통과 + 딜)
            myPlayer.x = myPlayer.facing === 'right' ? myPlayer.x + 150 : myPlayer.x - 150;
            effects.push({ x: myPlayer.x, y: myPlayer.y, radius: 40, color: "rgba(150, 0, 255, 0.5)", life: 15 });
            if (dist < 180) hitSuccess = true;
        } else {
            // 루피 스킬1: 고무 펀치 (긴 사거리)
            attackX = myPlayer.facing === 'right' ? myPlayer.x + 150 : myPlayer.x - 150;
            effects.push({ x: attackX, y: myPlayer.y + 20, radius: 30, color: "#ff5500", life: 15 });
            if (dist < 200) hitSuccess = true;
        }
    } else if (type === "skill2") {
        if(isGojo) {
            // 고조 스킬2: 압축 붕괴 (제자리 넓은 폭발)
            effects.push({ x: myPlayer.x + 25, y: myPlayer.y + 25, radius: 100, color: "rgba(100, 0, 255, 0.6)", life: 20 });
            if (dist < 120) hitSuccess = true;
        } else {
            // 루피 스킬2: 동료 호출 (넓은 범위 타격)
            effects.push({ x: dummyBoss.x + 25, y: dummyBoss.y + 25, radius: 120, color: "rgba(255, 200, 0, 0.5)", life: 20 });
            if (dist < 300) hitSuccess = true;
        }
    }

    if(hitSuccess) {
        hitTarget(isGojo ? 20 : 25, dummyBoss.x, dummyBoss.y);
    } else {
        myPlayer.combo = 0; // 허공에 치면 콤보 끊김
    }
}

// ==========================================
// 🎮 이동 및 그리기 로직
// ==========================================

window.addEventListener("keydown", (e) => keysPressed[e.key] = true);
window.addEventListener("keyup", (e) => keysPressed[e.key] = false);

function bindTouchBtn(btnId, keyName) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); keysPressed[keyName] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keysPressed[keyName] = false; });
}
bindTouchBtn("btn-up", "ArrowUp"); bindTouchBtn("btn-down", "ArrowDown");
bindTouchBtn("btn-left", "ArrowLeft"); bindTouchBtn("btn-right", "ArrowRight");

function updatePosition() {
    if (!isGameStarted) return;
    const speed = 5;
    let moved = false;

    if (keysPressed["ArrowUp"]) { myPlayer.y -= speed; moved = true; }
    if (keysPressed["ArrowDown"]) { myPlayer.y += speed; moved = true; }
    if (keysPressed["ArrowLeft"]) { myPlayer.x -= speed; myPlayer.facing = 'left'; moved = true; }
    if (keysPressed["ArrowRight"]) { myPlayer.x += speed; myPlayer.facing = 'right'; moved = true; }

    if (moved && myRef) set(myRef, myPlayer);
}

onValue(ref(db, 'players'), (snapshot) => { players = snapshot.val() || {}; });

function draw() {
    updatePosition();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 샌드백(더미) 그리기
    ctx.fillStyle = "#555";
    ctx.fillRect(dummyBoss.x, dummyBoss.y, dummyBoss.size, dummyBoss.size);
    ctx.fillStyle = "red";
    ctx.fillRect(dummyBoss.x, dummyBoss.y - 15, (dummyBoss.hp / dummyBoss.maxHp) * dummyBoss.size, 8);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("전투 샌드백", dummyBoss.x, dummyBoss.y - 20);

    // 2. 다른 플레이어 및 내 캐릭터 그리기
    Object.keys(players).forEach((id) => {
        const p = players[id];
        const charImg = CHAR_IMAGES[p.charType];
        if (charImg && charImg.complete) {
            ctx.save();
            if(p.facing === 'left') { // 왼쪽 볼 때 이미지 반전
                ctx.translate(p.x + p.size, p.y);
                ctx.scale(-1, 1);
                ctx.drawImage(charImg, 0, 0, p.size, p.size);
            } else {
                ctx.drawImage(charImg, p.x, p.y, p.size, p.size);
            }
            ctx.restore();
        }
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

    // 4. 데미지 텍스트 팝업
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const dt = damageTexts[i];
        ctx.fillStyle = dt.color;
        ctx.font = dt.isCrit ? "bold 24px sans-serif" : "bold 16px sans-serif";
        ctx.fillText(dt.text, dt.x, dt.y);
        dt.y -= 1; // 위로 떠오르는 효과
        dt.life--;
        if (dt.life <= 0) damageTexts.splice(i, 1);
    }

    requestAnimationFrame(draw);
}
draw();
