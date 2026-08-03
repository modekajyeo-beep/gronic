import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ==========================================
// FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyDI2REmsCMwoaaV4xndPZKpX_EUntnCG4k",
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
// CANVAS
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

// 세로형 게임 해상도
canvas.width = 450;
canvas.height = 800;

// ==========================================
// 캐릭터 이미지
// ==========================================

const CHAR_IMAGES = {
    char1: new Image(),
    char2: new Image()
};

CHAR_IMAGES.char1.src = "./gojo.png";
CHAR_IMAGES.char2.src = "./luffy.png";

// ==========================================
// 플레이어
// ==========================================

let myPlayer = {
    userId: "",
    nickname: "익명",
    charType: "char1",

    level: 1,
    exp: 0,
    maxExp: 100,

    x: 200,
    y: 600,

    size: 55,
    facing: "right",

    hp: 100,
    maxHp: 100,

    energy: 0,
    maxEnergy: 100,

    combo: 0
};

let players = {};
let keysPressed = {};
let isGameStarted = false;
let myRef = null;

let effects = [];
let damageTexts = [];

// ==========================================
// 테스트 몬스터
// ==========================================

let testMonster = {
    id: "monster_1",

    name: "테스트 몬스터",

    x: 200,
    y: 300,

    size: 45,

    hp: 100,
    maxHp: 100,

    speed: 1.2,

    state: "IDLE",
    facing: "left"
};

// ==========================================
// 캐릭터 선택
// ==========================================

window.selectInitialChar = function(charType) {

    myPlayer.charType = charType;

    document
        .querySelectorAll(".char-card")
        .forEach(c => c.classList.remove("selected"));

    const card = document.getElementById(`card-${charType}`);

    if (card) {
        card.classList.add("selected");
    }
};

// ==========================================
// 로그인
// ==========================================

window.handlePinLogin = function() {

    const pin =
        document
            .getElementById("user-pin")
            .value
            .trim();

    const inputNickname =
        document
            .getElementById("user-nickname")
            .value
            .trim();

    if (pin.length !== 4 || isNaN(pin)) {

        alert("숫자 4자리 코드를 입력해 주세요!");

        return;
    }

    const userRef =
        ref(db, `users/PIN_${pin}`);

    get(userRef).then(snapshot => {

        if (snapshot.exists()) {

            const userData = snapshot.val();

            myPlayer.userId = `PIN_${pin}`;

            myPlayer.nickname =
                userData.nickname || "익명";

            myPlayer.charType =
                userData.charType || "char1";

            myPlayer.level =
                userData.level || 1;

            myPlayer.exp =
                userData.exp || 0;

            myPlayer.maxExp =
                userData.maxExp || 100;

            myPlayer.hp =
                userData.hp ?? 100;

            myPlayer.maxHp =
                userData.maxHp ?? 100;

        } else {

            if (!inputNickname) {

                alert(
                    "처음 접속하는 코드입니다.\n닉네임을 입력해주세요."
                );

                return;
            }

            myPlayer.userId = `PIN_${pin}`;

            myPlayer.nickname = inputNickname;

            myPlayer.level = 1;
            myPlayer.exp = 0;
            myPlayer.maxExp = 100;

            myPlayer.hp = 100;
            myPlayer.maxHp = 100;

            set(userRef, {

                nickname: myPlayer.nickname,

                charType: myPlayer.charType,

                level: 1,

                exp: 0,

                maxExp: 100,

                hp: 100,

                maxHp: 100

            });
        }

        updateLobbyUI();

        document
            .getElementById("setup-screen")
            .style.display = "none";

        document
            .getElementById("lobby-screen")
            .style.display = "flex";

    }).catch(error => {

        console.error(error);

        alert(
            "데이터베이스 연결 실패!\n" +
            error.message
        );

    });
};

// ==========================================
// 로비 UI
// ==========================================

function updateLobbyUI() {

    const nickname =
        document.getElementById("profile-nickname");

    const level =
        document.getElementById("profile-level-badge");

    const avatar =
        document.getElementById("profile-avatar");

    if (nickname)
        nickname.textContent = myPlayer.nickname;

    if (level)
        level.textContent = `Lv.${myPlayer.level}`;

    if (avatar) {

        avatar.src =
            myPlayer.charType === "char1"
                ? "./gojo.png"
                : "./luffy.png";
    }

    const hudLevel =
        document.getElementById("hud-level");

    if (hudLevel)
        hudLevel.textContent =
            `Lv.${myPlayer.level}`;
}

// ==========================================
// 게임 입장
// ==========================================

window.enterGame = function() {

    document
        .getElementById("lobby-screen")
        .style.display = "none";

    document
        .getElementById("game-screen")
        .style.display = "flex";

    myPlayer.x = 200;
    myPlayer.y = 600;

    myRef =
        ref(
            db,
            `players/${myPlayer.userId}`
        );

    savePlayer();

    onDisconnect(myRef).remove();

    isGameStarted = true;

    updateHPUI();
};

// ==========================================
// 플레이어 저장
// ==========================================

function savePlayer() {

    if (!myRef) return;

    set(myRef, {

        userId: myPlayer.userId,

        nickname: myPlayer.nickname,

        charType: myPlayer.charType,

        level: myPlayer.level,

        exp: myPlayer.exp,

        hp: myPlayer.hp,

        maxHp: myPlayer.maxHp,

        x: myPlayer.x,

        y: myPlayer.y,

        size: myPlayer.size,

        facing: myPlayer.facing
    });
}

// ==========================================
// HP UI
// ==========================================

function updateHPUI() {

    const hpFill =
        document.getElementById("hud-hp-fill");

    const hpText =
        document.getElementById("hud-hp-text");

    if (!hpFill || !hpText)
        return;

    const percent =
        Math.max(
            0,
            Math.min(
                100,
                (myPlayer.hp / myPlayer.maxHp) * 100
            )
        );

    hpFill.style.width =
        `${percent}%`;

    hpText.textContent =
        `HP ${myPlayer.hp}/${myPlayer.maxHp}`;
}

// ==========================================
// 스킬
// ==========================================

const btnAtk =
    document.getElementById("btn-attack");

const btnS1 =
    document.getElementById("btn-skill1");

const btnS2 =
    document.getElementById("btn-skill2");

if (btnAtk)
    btnAtk.onclick =
        () => useSkill("attack");

if (btnS1)
    btnS1.onclick =
        () => useSkill("skill1");

if (btnS2)
    btnS2.onclick =
        () => useSkill("skill2");

function useSkill(type) {

    if (!isGameStarted)
        return;

    const isGojo =
        myPlayer.charType === "char1";

    let attackX =
        myPlayer.facing === "right"
            ? myPlayer.x + 60
            : myPlayer.x - 60;

    // 평타
    if (type === "attack") {

        effects.push({

            x: attackX,

            y: myPlayer.y + 20,

            radius: 20,

            color:
                isGojo
                    ? "#00ffff"
                    : "#ff3333",

            life: 10
        });

        attackMonster(80, 20);
    }

    // 스킬 1
    else if (type === "skill1") {

        if (isGojo) {

            myPlayer.x +=
                myPlayer.facing === "right"
                    ? 100
                    : -100;

            clampPlayer();

            effects.push({

                x: myPlayer.x,

                y: myPlayer.y,

                radius: 40,

                color:
                    "rgba(150,0,255,0.5)",

                life: 15
            });

        } else {

            attackX =
                myPlayer.facing === "right"
                    ? myPlayer.x + 100
                    : myPlayer.x - 100;

            effects.push({

                x: attackX,

                y: myPlayer.y + 20,

                radius: 30,

                color: "#ff5500",

                life: 15
            });

            attackMonster(120, 30);
        }
    }

    // 스킬 2
    else if (type === "skill2") {

        effects.push({

            x: myPlayer.x + 25,

            y: myPlayer.y + 25,

            radius:
                isGojo ? 80 : 90,

            color:
                isGojo
                    ? "rgba(100,0,255,0.6)"
                    : "rgba(255,200,0,0.5)",

            life: 20
        });

        attackMonster(
            120,
            40
        );
    }
}

// ==========================================
// 몬스터 공격 판정
// ==========================================

function attackMonster(range, damage) {

    if (
        !testMonster ||
        testMonster.hp <= 0
    )
        return;

    const distanceX =
        testMonster.x - myPlayer.x;

    const horizontalHit =
        myPlayer.facing === "right"
            ? distanceX >= 0 &&
              distanceX <= range
            : distanceX <= 0 &&
              Math.abs(distanceX) <= range;

    const verticalHit =
        Math.abs(
            testMonster.y - myPlayer.y
        ) < 70;

    if (
        horizontalHit &&
        verticalHit
    ) {

        testMonster.hp -= damage;

        if (testMonster.hp < 0)
            testMonster.hp = 0;

        damageTexts.push({

            text: `-${damage}`,

            x:
                testMonster.x +
                testMonster.size / 2,

            y:
                testMonster.y - 10,

            life: 25,

            color: "#ff3333"
        });
    }
}

// ==========================================
// 키보드 조작
// ==========================================

window.addEventListener(
    "keydown",
    e => {

        const k =
            e.key.toLowerCase();

        if (
            [
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                "w",
                "a",
                "s",
                "d",
                " "
            ].includes(k)
        ) {

            e.preventDefault();
        }

        keysPressed[k] = true;
    }
);

window.addEventListener(
    "keyup",
    e => {

        const k =
            e.key.toLowerCase();

        keysPressed[k] = false;
    }
);

// ==========================================
// 모바일 조작
// ==========================================

function bindControlBtn(
    btnId,
    keyName
) {

    const btn =
        document.getElementById(btnId);

    if (!btn)
        return;

    const pressOn = e => {

        e.preventDefault();

        keysPressed[keyName] = true;
    };

    const pressOff = e => {

        e.preventDefault();

        keysPressed[keyName] = false;
    };

    btn.addEventListener(
        "touchstart",
        pressOn,
        { passive: false }
    );

    btn.addEventListener(
        "touchend",
        pressOff,
        { passive: false }
    );

    btn.addEventListener(
        "touchcancel",
        pressOff,
        { passive: false }
    );

    btn.addEventListener(
        "mousedown",
        pressOn
    );

    btn.addEventListener(
        "mouseup",
        pressOff
    );

    btn.addEventListener(
        "mouseleave",
        pressOff
    );
}

bindControlBtn(
    "btn-up",
    "w"
);

bindControlBtn(
    "btn-down",
    "s"
);

bindControlBtn(
    "btn-left",
    "a"
);

bindControlBtn(
    "btn-right",
    "d"
);

// ==========================================
// 플레이어 이동
// ==========================================

function updatePosition() {

    if (!isGameStarted)
        return;

    const speed = 3;

    let moved = false;

    if (
        keysPressed["arrowup"] ||
        keysPressed["w"]
    ) {

        myPlayer.y -= speed;

        moved = true;
    }

    if (
        keysPressed["arrowdown"] ||
        keysPressed["s"]
    ) {

        myPlayer.y += speed;

        moved = true;
    }

    if (
        keysPressed["arrowleft"] ||
        keysPressed["a"]
    ) {

        myPlayer.x -= speed;

        myPlayer.facing = "left";

        moved = true;
    }

    if (
        keysPressed["arrowright"] ||
        keysPressed["d"]
    ) {

        myPlayer.x += speed;

        myPlayer.facing = "right";

        moved = true;
    }

    clampPlayer();

    if (moved)
        savePlayer();
}

// ==========================================
// 벽 충돌
// ==========================================

function clampPlayer() {

    myPlayer.x =
        Math.max(
            0,
            Math.min(
                canvas.width -
                myPlayer.size,
                myPlayer.x
            )
        );

    myPlayer.y =
        Math.max(
            0,
            Math.min(
                canvas.height -
                myPlayer.size,
                myPlayer.y
            )
        );
}

// ==========================================
// 몬스터 AI
// ==========================================

function updateMonsterAI() {

    if (
        !testMonster ||
        testMonster.hp <= 0 ||
        !isGameStarted
    )
        return;

    const distance =
        Math.hypot(
            myPlayer.x -
                testMonster.x,

            myPlayer.y -
                testMonster.y
        );

    // 400 안에 들어오면 추적
    if (
        distance < 400 &&
        distance > 60
    ) {

        testMonster.state =
            "CHASE";

        const dx =
            myPlayer.x -
            testMonster.x;

        const dy =
            myPlayer.y -
            testMonster.y;

        const length =
            Math.hypot(dx, dy);

        if (length > 0) {

            testMonster.x +=
                (dx / length) *
                testMonster.speed;

            testMonster.y +=
                (dy / length) *
                testMonster.speed;
        }

        if (dx > 0)
            testMonster.facing = "right";

        if (dx < 0)
            testMonster.facing = "left";

    } else {

        testMonster.state =
            "IDLE";
    }
}

// ==========================================
// Firebase 플레이어 동기화
// ==========================================

onValue(
    ref(db, "players"),
    snapshot => {

        players =
            snapshot.val() || {};

        if (statusEl) {

            statusEl.textContent =
                `현재 서버 인원: ${
                    Object.keys(players).length
                }명`;
        }
    }
);

// ==========================================
// 그리기
// ==========================================

function draw() {

    updatePosition();

    updateMonsterAI();

    // 배경 이미지 제거
    ctx.fillStyle = "#111";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // ======================================
    // 몬스터
    // ======================================

    if (
        testMonster &&
        testMonster.hp > 0
    ) {

        ctx.fillStyle = "#ff4444";

        ctx.fillRect(
            testMonster.x,
            testMonster.y,
            testMonster.size,
            testMonster.size
        );

        ctx.strokeStyle =
            testMonster.state === "CHASE"
                ? "#ffff00"
                : "#ffffff";

        ctx.lineWidth = 2;

        ctx.strokeRect(
            testMonster.x,
            testMonster.y,
            testMonster.size,
            testMonster.size
        );

        // 이름
        ctx.font =
            "bold 11px Segoe UI";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#ffaa00";

        ctx.fillText(

            `${testMonster.name}`,

            testMonster.x +
                testMonster.size / 2,

            testMonster.y - 22
        );

        // HP 바
        const barW = 50;
        const barH = 6;

        const barX =
            testMonster.x +
            testMonster.size / 2 -
            barW / 2;

        const barY =
            testMonster.y - 12;

        ctx.fillStyle =
            "#333";

        ctx.fillRect(
            barX,
            barY,
            barW,
            barH
        );

        const hpPercent =
            testMonster.hp /
            testMonster.maxHp;

        ctx.fillStyle =
            "#00ff88";

        ctx.fillRect(
            barX,
            barY,
            barW * hpPercent,
            barH
        );
    }

    // ======================================
    // 플레이어
    // ======================================

    Object.keys(players).forEach(
        id => {

            const p =
                players[id];

            const charImg =
                CHAR_IMAGES[p.charType] ||
                CHAR_IMAGES.char1;

            if (
                charImg.complete &&
                charImg.naturalWidth !== 0
            ) {

                ctx.save();

                if (
                    p.facing === "left"
                ) {

                    ctx.translate(
                        p.x + p.size,
                        p.y
                    );

                    ctx.scale(-1, 1);

                    ctx.drawImage(
                        charImg,
                        0,
                        0,
                        p.size,
                        p.size
                    );

                } else {

                    ctx.drawImage(
                        charImg,
                        p.x,
                        p.y,
                        p.size,
                        p.size
                    );
                }

                ctx.restore();
            }

            // 닉네임
            ctx.font =
                "bold 12px Segoe UI";

            ctx.textAlign =
                "center";

            const text =
                `[Lv.${p.level || 1}] ${
                    p.nickname || "익명"
                }`;

            ctx.fillStyle =
                id === myPlayer.userId
                    ? "#00ff88"
                    : "#ffffff";

            ctx.fillText(
                text,
                p.x + p.size / 2,
                p.y - 6
            );

            // 플레이어 HP 바
            const hp =
                p.hp ?? 100;

            const maxHp =
                p.maxHp ?? 100;

            const hpPercent =
                hp / maxHp;

            const barW = 50;

            ctx.fillStyle =
                "#333";

            ctx.fillRect(
                p.x +
                    p.size / 2 -
                    barW / 2,

                p.y - 16,

                barW,
                5
            );

            ctx.fillStyle =
                "#ff4444";

            ctx.fillRect(
                p.x +
                    p.size / 2 -
                    barW / 2,

                p.y - 16,

                barW *
                    hpPercent,

                5
            );
        }
    );

    // ======================================
    // 스킬 이펙트
    // ======================================

    for (
        let i = effects.length - 1;
        i >= 0;
        i--
    ) {

        const eff =
            effects[i];

        ctx.beginPath();

        ctx.arc(
            eff.x,
            eff.y,
            eff.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            eff.color;

        ctx.fill();

        eff.life--;

        if (eff.life <= 0)
            effects.splice(i, 1);
    }

    // ======================================
    // 데미지 텍스트
    // ======================================

    for (
        let i = damageTexts.length - 1;
        i >= 0;
        i--
    ) {

        const dt =
            damageTexts[i];

        ctx.font =
            "bold 16px Segoe UI";

        ctx.fillStyle =
            dt.color;

        ctx.textAlign =
            "center";

        ctx.fillText(
            dt.text,
            dt.x,
            dt.y
        );

        dt.y -= 0.5;

        dt.life--;

        if (dt.life <= 0)
            damageTexts.splice(i, 1);
    }

    requestAnimationFrame(draw);
}

draw();
