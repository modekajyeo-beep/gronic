import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    get,
    remove,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


// ==========================================
// Firebase
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
// Canvas
// ==========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");


// ==========================================
// 이미지
// ==========================================

const CHAR_IMAGES = {
    char1: new Image(),
    char2: new Image()
};

CHAR_IMAGES.char1.src = "./gojo.png";
CHAR_IMAGES.char2.src = "./luffy.png";

const bgImage = new Image();
bgImage.src = "./bg.png";


// ==========================================
// 스킨 시스템
// ==========================================

const SKINS = {
    skin1: {
        name: "기본 스킨",
        image: null
    },

    skin2: {
        name: "스킨 2",
        image: "./skins/skin2.png"
    },

    skin3: {
        name: "스킨 3",
        image: "./skins/skin3.png"
    },

    skin4: {
        name: "스킨 4",
        image: "./skins/skin4.png"
    },

    skin5: {
        name: "스킨 5",
        image: "./skins/skin5.png"
    },

    skin6: {
        name: "스킨 6",
        image: "./skins/skin6.png"
    }
};


// ==========================================
// 플레이어
// ==========================================

let myPlayer = {

    userId: "",
    nickname: "익명",

    charType: "char1",
    skinId: "skin1",

    level: 1,
    exp: 0,
    maxExp: 100,

    x: 100,
    y: 200,

    size: 55,

    facing: "right",

    energy: 0,
    maxEnergy: 100,

    hp: 100,
    maxHp: 100,

    combo: 0
};


// ==========================================
// 게임 상태
// ==========================================

let players = {};

const keysPressed = {};

let isGameStarted = false;

let isGuest = false;

let isGameOver = false;

let myRef = null;


// ==========================================
// 이펙트
// ==========================================

let effects = [];

let damageTexts = [];


// ==========================================
// 몬스터
// ==========================================

let testMonster = {

    id: "monster_1",

    name: "테스트 몬스터",

    x: 400,
    y: 200,

    size: 45,

    hp: 100,
    maxHp: 100,

    speed: 1.2,

    state: "IDLE",

    facing: "left",

    attackDamage: 10,

    attackCooldown: 1000,

    lastAttackTime: 0
};


// ==========================================
// 현재 캐릭터 이미지 가져오기
// ==========================================

function getCurrentCharacterImage(player) {

    if (player.skinId &&
        SKINS[player.skinId] &&
        SKINS[player.skinId].image) {

        if (!SKINS[player.skinId]._img) {

            const img = new Image();

            img.src = SKINS[player.skinId].image;

            SKINS[player.skinId]._img = img;
        }

        const img = SKINS[player.skinId]._img;

        if (img.complete && img.naturalWidth > 0) {
            return img;
        }
    }

    return CHAR_IMAGES[player.charType] || CHAR_IMAGES.char1;
}


// ==========================================
// Firebase에 플레이어 정보 저장
// ==========================================

function savePlayerToFirebase() {

    if (!myRef || isGuest) return;

    set(myRef, {

        userId: myPlayer.userId,

        nickname: myPlayer.nickname,

        charType: myPlayer.charType,

        skinId: myPlayer.skinId,

        level: myPlayer.level,

        exp: myPlayer.exp,

        maxExp: myPlayer.maxExp,

        hp: myPlayer.hp,

        maxHp: myPlayer.maxHp,

        energy: myPlayer.energy,

        maxEnergy: myPlayer.maxEnergy,

        x: myPlayer.x,

        y: myPlayer.y,

        size: myPlayer.size,

        facing: myPlayer.facing
    });
}


// ==========================================
// UI 업데이트
// ==========================================

function updateLobbyUI() {

    const profileNickname =
        document.getElementById("profile-nickname");

    const profileLevel =
        document.getElementById("profile-level-badge");

    const profileAvatar =
        document.getElementById("profile-avatar");

    if (profileNickname) {
        profileNickname.textContent = myPlayer.nickname;
    }

    if (profileLevel) {
        profileLevel.textContent = `Lv.${myPlayer.level}`;
    }

    if (profileAvatar) {
        const img = getCurrentCharacterImage(myPlayer);

        if (img && img.src) {
            profileAvatar.src = img.src;
        } else {
            profileAvatar.src =
                myPlayer.charType === "char1"
                    ? "./gojo.png"
                    : "./luffy.png";
        }
    }

    updateHUD();
}


// ==========================================
// HUD
// ==========================================

function updateHUD() {

    const levelEl =
        document.getElementById("hud-level");

    const hpFill =
        document.getElementById("hud-hp-fill");

    const hpText =
        document.getElementById("hud-hp-text");

    const energyFill =
        document.getElementById("hud-energy-fill");

    const energyText =
        document.getElementById("hud-energy-text");


    if (levelEl) {
        levelEl.textContent =
            `Lv.${myPlayer.level}`;
    }


    if (hpFill) {

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
    }


    if (hpText) {

        hpText.textContent =
            `❤️ HP ${Math.ceil(myPlayer.hp)} / ${myPlayer.maxHp}`;
    }


    if (energyFill) {

        const percent =
            (myPlayer.energy / myPlayer.maxEnergy) * 100;

        energyFill.style.width =
            `${Math.max(0, Math.min(100, percent))}%`;
    }


    if (energyText) {

        energyText.textContent =
            `에너지 ${Math.floor(myPlayer.energy)}%`;
    }
}


// ==========================================
// 캐릭터 선택
// ==========================================

window.selectInitialChar = function(charType) {

    myPlayer.charType = charType;

    document
        .querySelectorAll(".char-card")
        .forEach(c =>
            c.classList.remove("selected")
        );

    const card =
        document.getElementById(`card-${charType}`);

    if (card) {
        card.classList.add("selected");
    }
};


// ==========================================
// PIN 로그인
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

        alert(
            "숫자 4자리 코드를 정확히 입력해 주세요!"
        );

        return;
    }


    const userRef =
        ref(db, `users/PIN_${pin}`);


    get(userRef)

        .then((snapshot) => {

            isGuest = false;

            if (snapshot.exists()) {

                const userData =
                    snapshot.val();

                myPlayer.userId =
                    `PIN_${pin}`;

                myPlayer.nickname =
                    userData.nickname || "익명";

                myPlayer.charType =
                    userData.charType || "char1";

                myPlayer.skinId =
                    userData.skinId || "skin1";

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


                myPlayer.userId =
                    `PIN_${pin}`;

                myPlayer.nickname =
                    inputNickname;

                myPlayer.charType =
                    myPlayer.charType || "char1";

                myPlayer.skinId =
                    "skin1";

                myPlayer.level = 1;

                myPlayer.exp = 0;

                myPlayer.maxExp = 100;

                myPlayer.hp = 100;

                myPlayer.maxHp = 100;


                set(userRef, {

                    nickname:
                        myPlayer.nickname,

                    charType:
                        myPlayer.charType,

                    skinId:
                        myPlayer.skinId,

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

        })

        .catch((error) => {

            console.error(
                "DB 에러:",
                error
            );

            alert(
                "데이터베이스 연결 실패!\n" +
                error.message
            );
        });
};


// ==========================================
// 게스트 모드
// ==========================================

window.startGuestMode = function() {

    isGuest = true;

    const guestNumber =
        Math.floor(
            1000 + Math.random() * 9000
        );

    myPlayer.userId =
        `GUEST_${Date.now()}_${guestNumber}`;

    myPlayer.nickname =
        `게스트_${guestNumber}`;

    myPlayer.charType = "char1";

    myPlayer.skinId = "skin1";

    myPlayer.level = 1;

    myPlayer.exp = 0;

    myPlayer.maxExp = 100;

    myPlayer.hp = 100;

    myPlayer.maxHp = 100;

    myPlayer.energy = 0;


    updateLobbyUI();


    document
        .getElementById("setup-screen")
        .style.display = "none";

    document
        .getElementById("lobby-screen")
        .style.display = "flex";
};


// ==========================================
// 게임 입장
// ==========================================

window.enterGame = function() {

    document
        .getElementById("lobby-screen")
        .style.display = "none";

    document
        .getElementById("customize-screen")
        .style.display = "none";

    document
        .getElementById("game-screen")
        .style.display = "flex";


    document
        .getElementById("game-over-screen")
        .style.display = "none";


    isGameOver = false;

    isGameStarted = true;


    myPlayer.hp =
        Math.min(
            myPlayer.hp,
            myPlayer.maxHp
        );


    myRef =
        ref(
            db,
            `players/${myPlayer.userId}`
        );


    set(myRef, {

        userId: myPlayer.userId,

        nickname: myPlayer.nickname,

        charType: myPlayer.charType,

        skinId: myPlayer.skinId,

        level: myPlayer.level,

        hp: myPlayer.hp,

        maxHp: myPlayer.maxHp,

        x: myPlayer.x,

        y: myPlayer.y,

        size: myPlayer.size,

        facing: myPlayer.facing
    });


    onDisconnect(myRef).remove();

    updateHUD();
};


// ==========================================
// 게임 재시작
// ==========================================

window.restartGame = function() {

    myPlayer.hp =
        myPlayer.maxHp;

    myPlayer.x = 100;
    myPlayer.y = 200;

    myPlayer.facing = "right";

    testMonster.x = 500;
    testMonster.y = 200;

    testMonster.hp =
        testMonster.maxHp;

    testMonster.state = "IDLE";

    testMonster.lastAttackTime = 0;

    effects = [];

    damageTexts = [];

    isGameOver = false;

    isGameStarted = true;


    document
        .getElementById("game-over-screen")
        .style.display = "none";


    savePlayerToFirebase();

    updateHUD();
};


// ==========================================
// 로비로 돌아가기
// ==========================================

window.returnToLobby = function() {

    isGameStarted = false;

    isGameOver = false;


    if (myRef) {

        remove(myRef);

        myRef = null;
    }


    document
        .getElementById("game-over-screen")
        .style.display = "none";

    document
        .getElementById("game-screen")
        .style.display = "none";

    document
        .getElementById("lobby-screen")
        .style.display = "flex";
};


// ==========================================
// 꾸미기 열기
// ==========================================

window.openCustomize = function() {

    document
        .getElementById("lobby-screen")
        .style.display = "none";

    document
        .getElementById("customize-screen")
        .style.display = "flex";


    renderSkinSlots();
};


// ==========================================
// 꾸미기 닫기
// ==========================================

window.closeCustomize = function() {

    document
        .getElementById("customize-screen")
        .style.display = "none";

    document
        .getElementById("lobby-screen")
        .style.display = "flex";
};


// ==========================================
// 스킨 슬롯 생성
// ==========================================

function renderSkinSlots() {

    const grid =
        document.getElementById("skin-grid");

    if (!grid) return;

    grid.innerHTML = "";


    Object.entries(SKINS).forEach(
        ([skinId, skin]) => {

            const slot =
                document.createElement("div");

            slot.className = "skin-slot";


            if (myPlayer.skinId === skinId) {
                slot.classList.add("selected");
            }


            if (skin.image) {

                const img =
                    document.createElement("img");

                img.src = skin.image;

                img.alt = skin.name;

                img.onerror = function() {

                    this.style.display = "none";

                    const placeholder =
                        document.createElement("div");

                    placeholder.className =
                        "skin-placeholder";

                    placeholder.textContent =
                        "준비중";

                    this.parentElement.insertBefore(
                        placeholder,
                        this
                    );
                };

                slot.appendChild(img);

            } else {

                const placeholder =
                    document.createElement("div");

                placeholder.className =
                    "skin-placeholder";

                placeholder.textContent =
                    "기본";

                slot.appendChild(placeholder);
            }


            const name =
                document.createElement("div");

            name.className =
                "skin-name";

            name.textContent =
                skin.name;

            slot.appendChild(name);


            slot.onclick = () => {

                selectSkin(skinId);
            };


            grid.appendChild(slot);
        }
    );


    updateCustomizePreview();
}


// ==========================================
// 스킨 선택
// ==========================================

function selectSkin(skinId) {

    if (!SKINS[skinId]) return;


    myPlayer.skinId =
        skinId;


    updateCustomizePreview();


    renderSkinSlots();


    // 로그인 계정만 저장
    if (!isGuest) {

        const userRef =
            ref(
                db,
                `users/${myPlayer.userId}`
            );

        set(userRef, {

            nickname:
                myPlayer.nickname,

            charType:
                myPlayer.charType,

            skinId:
                myPlayer.skinId,

            level:
                myPlayer.level,

            exp:
                myPlayer.exp,

            maxExp:
                myPlayer.maxExp,

            hp:
                myPlayer.hp,

            maxHp:
                myPlayer.maxHp
        });
    }


    updateLobbyUI();
}


// ==========================================
// 꾸미기 미리보기
// ==========================================

function updateCustomizePreview() {

    const preview =
        document.getElementById(
            "customize-preview-img"
        );

    const name =
        document.getElementById(
            "customize-preview-name"
        );


    if (!preview || !name) return;


    const skin =
        SKINS[myPlayer.skinId];


    name.textContent =
        skin ? skin.name : "기본 스킨";


    if (skin && skin.image) {

        preview.src =
            skin.image;

    } else {

        preview.src =
            myPlayer.charType === "char1"
                ? "./gojo.png"
                : "./luffy.png";
    }
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


if (btnAtk) {
    btnAtk.onclick =
        () => useSkill("attack");
}

if (btnS1) {
    btnS1.onclick =
        () => useSkill("skill1");
}

if (btnS2) {
    btnS2.onclick =
        () => useSkill("skill2");
}


function useSkill(type) {

    if (!isGameStarted || isGameOver) return;


    const isGojo =
        myPlayer.charType === "char1";


    let attackX =
        myPlayer.facing === "right"
            ? myPlayer.x + 60
            : myPlayer.x - 60;


    // =========================
    // 평타
    // =========================

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


        if (
            testMonster &&
            testMonster.hp > 0
        ) {

            const distanceX =
                testMonster.x -
                myPlayer.x;


            const inRangeRight =
                myPlayer.facing === "right" &&
                distanceX >= 0 &&
                distanceX <= 80;


            const inRangeLeft =
                myPlayer.facing === "left" &&
                distanceX <= 0 &&
                Math.abs(distanceX) <= 80;


            const inVerticalRange =
                Math.abs(
                    testMonster.y -
                    myPlayer.y
                ) < 50;


            if (
                (inRangeRight || inRangeLeft) &&
                inVerticalRange
            ) {

                const damage = 20;

                testMonster.hp -= damage;


                if (testMonster.hp < 0) {
                    testMonster.hp = 0;
                }


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

        return;
    }


    // =========================
    // 스킬1
    // =========================

    if (type === "skill1") {

        if (isGojo) {

            myPlayer.x =
                myPlayer.facing === "right"
                    ? myPlayer.x + 100
                    : myPlayer.x - 100;


            myPlayer.x =
                Math.max(
                    0,
                    Math.min(
                        canvas.width - myPlayer.size,
                        myPlayer.x
                    )
                );


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
        }

        return;
    }


    // =========================
    // 스킬2
    // =========================

    if (type === "skill2") {

        effects.push({

            x:
                myPlayer.x + 25,

            y:
                myPlayer.y + 25,

            radius:
                isGojo
                    ? 80
                    : 90,

            color:
                isGojo
                    ? "rgba(100,0,255,0.6)"
                    : "rgba(255,200,0,0.5)",

            life: 20
        });
    }
}


// ==========================================
// 키보드
// ==========================================

window.addEventListener(
    "keydown",
    (e) => {

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
    (e) => {

        const k =
            e.key.toLowerCase();

        keysPressed[k] = false;
    }
);


// ==========================================
// 모바일 버튼
// ==========================================

function bindControlBtn(
    btnId,
    keyName
) {

    const btn =
        document.getElementById(btnId);

    if (!btn) return;


    const pressOn =
        (e) => {

            e.preventDefault();

            keysPressed[keyName] = true;
        };


    const pressOff =
        (e) => {

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

    if (
        !isGameStarted ||
        isGameOver
    ) return;


    const speed = 2.5;

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


    if (moved) {

        savePlayerToFirebase();
    }
}


// ==========================================
// 몬스터 AI
// ==========================================

function updateMonsterAI() {

    if (
        !testMonster ||
        testMonster.hp <= 0 ||
        !isGameStarted ||
        isGameOver
    ) return;


    const distance =
        Math.hypot(
            myPlayer.x -
                testMonster.x,

            myPlayer.y -
                testMonster.y
        );


    if (
        distance < 400 &&
        distance > 55
    ) {

        testMonster.state =
            "CHASE";


        if (
            testMonster.x <
            myPlayer.x
        ) {

            testMonster.x +=
                testMonster.speed;

            testMonster.facing =
                "right";

        } else if (
            testMonster.x >
            myPlayer.x
        ) {

            testMonster.x -=
                testMonster.speed;

            testMonster.facing =
                "left";
        }


        if (
            testMonster.y <
            myPlayer.y
        ) {

            testMonster.y +=
                testMonster.speed;

        } else if (
            testMonster.y >
            myPlayer.y
        ) {

            testMonster.y -=
                testMonster.speed;
        }

    } else {

        testMonster.state =
            "IDLE";
    }
}


// ==========================================
// 몬스터 공격
// ==========================================

function updateMonsterAttack() {

    if (
        !testMonster ||
        testMonster.hp <= 0 ||
        !isGameStarted ||
        isGameOver
    ) return;


    const distance =
        Math.hypot(
            myPlayer.x -
                testMonster.x,

            myPlayer.y -
                testMonster.y
        );


    if (distance > 60) {
        return;
    }


    const now =
        Date.now();


    if (
        now -
        testMonster.lastAttackTime <
        testMonster.attackCooldown
    ) {
        return;
    }


    testMonster.lastAttackTime =
        now;


    myPlayer.hp -=
        testMonster.attackDamage;


    if (myPlayer.hp < 0) {
        myPlayer.hp = 0;
    }


    damageTexts.push({

        text:
            `-${testMonster.attackDamage}`,

        x:
            myPlayer.x +
            myPlayer.size / 2,

        y:
            myPlayer.y - 10,

        life: 25,

        color: "#ff5555"
    });


    updateHUD();


    savePlayerToFirebase();


    if (myPlayer.hp <= 0) {

        triggerGameOver();
    }
}


// ==========================================
// 게임오버
// ==========================================

function triggerGameOver() {

    isGameOver = true;

    isGameStarted = false;


    Object.keys(keysPressed)
        .forEach(
            key =>
                keysPressed[key] = false
        );


    document
        .getElementById(
            "game-over-screen"
        )
        .style.display = "flex";
}


// ==========================================
// Firebase 플레이어
// ==========================================

onValue(
    ref(db, "players"),
    (snapshot) => {

        players =
            snapshot.val() || {};


        if (statusEl) {

            statusEl.textContent =
                `현재 서버 인원: ${
                    Object.keys(players).length
                }명 접속 중`;
        }
    }
);


// ==========================================
// DRAW
// ==========================================

function draw() {

    updatePosition();

    updateMonsterAI();

    updateMonsterAttack();


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // 배경
    if (
        bgImage &&
        bgImage.complete &&
        bgImage.naturalWidth !== 0
    ) {

        ctx.drawImage(
            bgImage,
            0,
            0,
            canvas.width,
            canvas.height
        );

    } else {

        ctx.fillStyle =
            "#1a1a1a";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }


    // ======================================
    // 몬스터
    // ======================================

    if (
        testMonster &&
        testMonster.hp > 0
    ) {

        ctx.fillStyle =
            "#ff4444";

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
            "bold 11px 'Segoe UI', sans-serif";

        ctx.textAlign =
            "center";


        ctx.fillStyle =
            "#ffaa00";

        ctx.fillText(
            testMonster.name,
            testMonster.x +
                testMonster.size / 2,
            testMonster.y - 22
        );


        // HP바
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
            barW *
                Math.max(
                    0,
                    Math.min(
                        1,
                        hpPercent
                    )
                ),
            barH
        );
    }


    // ======================================
    // 플레이어
    // ======================================

    Object.keys(players)
        .forEach((id) => {

            const p =
                players[id];


            const charImg =
                getCurrentCharacterImage(p);


            if (
                charImg &&
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

                    ctx.scale(
                        -1,
                        1
                    );

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
            const fullText =
                `[Lv.${p.level || 1}] ${
                    p.nickname || "익명"
                }`;


            ctx.font =
                "bold 12px 'Segoe UI', sans-serif";


            const textWidth =
                ctx.measureText(
                    fullText
                ).width;


            ctx.fillStyle =
                "rgba(0,0,0,0.7)";


            ctx.fillRect(
                p.x +
                    p.size / 2 -
                    textWidth / 2 -
                    4,

                p.y - 18,

                textWidth + 8,

                16
            );


            ctx.fillStyle =
                id === myPlayer.userId
                    ? "#00ff88"
                    : "#ffffff";


            ctx.textAlign =
                "center";


            ctx.fillText(
                fullText,

                p.x +
                    p.size / 2,

                p.y - 6
            );


            // 플레이어 HP바
            if (
                p.hp !== undefined &&
                p.maxHp
            ) {

                const hpW = 45;

                const hpH = 5;

                const hpX =
                    p.x +
                    p.size / 2 -
                    hpW / 2;

                const hpY =
                    p.y +
                    p.size +
                    4;


                ctx.fillStyle =
                    "#333";

                ctx.fillRect(
                    hpX,
                    hpY,
                    hpW,
                    hpH
                );


                ctx.fillStyle =
                    "#ff3333";

                ctx.fillRect(
                    hpX,
                    hpY,
                    hpW *
                        Math.max(
                            0,
                            Math.min(
                                1,
                                p.hp /
                                    p.maxHp
                            )
                        ),
                    hpH
                );
            }
        });


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


        if (
            eff.life <= 0
        ) {

            effects.splice(
                i,
                1
            );
        }
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
            "bold 14px 'Segoe UI', sans-serif";

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


        if (
            dt.life <= 0
        ) {

            damageTexts.splice(
                i,
                1
            );
        }
    }


    requestAnimationFrame(draw);
}


updateHUD();

draw();
