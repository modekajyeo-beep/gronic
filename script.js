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


// 게임 내부 해상도
canvas.width = 960;
canvas.height = 540;


// ==========================================
// 이미지
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

    x: 100,

    y: 200,

    size: 55,

    facing: "right",

    // HP
    hp: 100,

    maxHp: 100,

    // 에너지
    energy: 0,

    maxEnergy: 100,

    combo: 0
};


let players = {};

const keysPressed = {};

let isGameStarted = false;

let myRef = null;

let isGuest = false;


// ==========================================
// 이펙트
// ==========================================

let effects = [];

let damageTexts = [];


// ==========================================
// 테스트 몬스터
// ==========================================

let testMonster = {

    id: "monster_1",

    name: "테스트 몬스터",

    x: 500,

    y: 250,

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
        .forEach(card => {
            card.classList.remove("selected");
        });

    const selectedCard =
        document.getElementById(
            `card-${charType}`
        );

    if (selectedCard) {
        selectedCard.classList.add("selected");
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


    if (
        pin.length !== 4 ||
        isNaN(pin)
    ) {

        alert(
            "숫자 4자리 코드를 정확히 입력해 주세요!"
        );

        return;
    }


    isGuest = false;


    const userRef =
        ref(
            db,
            `users/PIN_${pin}`
        );


    get(userRef)
        .then(snapshot => {

            if (snapshot.exists()) {

                const userData =
                    snapshot.val();

                myPlayer.userId =
                    `PIN_${pin}`;

                myPlayer.nickname =
                    userData.nickname;

                myPlayer.charType =
                    userData.charType ||
                    "char1";

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


                alert(
                    `👋 ${myPlayer.nickname}님 환영합니다!`
                );

            } else {

                if (!inputNickname) {

                    alert(
                        "처음 접속하는 코드입니다!\n닉네임을 입력해주세요."
                    );

                    return;
                }


                myPlayer.userId =
                    `PIN_${pin}`;

                myPlayer.nickname =
                    inputNickname;

                myPlayer.level = 1;

                myPlayer.exp = 0;

                myPlayer.maxExp = 100;

                myPlayer.hp = 100;

                myPlayer.maxHp = 100;


                set(
                    userRef,
                    {
                        nickname:
                            myPlayer.nickname,

                        charType:
                            myPlayer.charType,

                        level: 1,

                        exp: 0,

                        maxExp: 100,

                        hp: 100,

                        maxHp: 100
                    }
                );


                alert(
                    `🎉 ${myPlayer.nickname} 생성 완료!`
                );
            }


            updateLobbyUI();

        })
        .catch(error => {

            console.error(
                "DB 에러:",
                error
            );

            alert(
                "데이터베이스 연결 실패!"
            );

        });
};


// ==========================================
// 게스트 모드
// ==========================================

window.enterGuestMode = function() {

    isGuest = true;


    myPlayer.userId =
        `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    myPlayer.nickname =
        "게스트";

    myPlayer.level = 1;

    myPlayer.exp = 0;

    myPlayer.maxExp = 100;

    myPlayer.hp = 100;

    myPlayer.maxHp = 100;

    myPlayer.x = 100;

    myPlayer.y = 200;


    updateLobbyUI();


    alert(
        "👤 게스트 모드로 시작합니다.\n\n게임을 종료하면 데이터가 저장되지 않습니다."
    );
};


// ==========================================
// 로비 UI
// ==========================================

function updateLobbyUI() {

    document
        .getElementById("profile-nickname")
        .textContent =
        myPlayer.nickname;

    document
        .getElementById("profile-level-badge")
        .textContent =
        `Lv.${myPlayer.level}`;

    document
        .getElementById("profile-avatar")
        .src =
        myPlayer.charType === "char1"
            ? "./gojo.png"
            : "./luffy.png";


    document
        .getElementById("lobby-hp-text")
        .textContent =
        `${myPlayer.hp} / ${myPlayer.maxHp}`;


    document
        .getElementById("setup-screen")
        .style.display = "none";

    document
        .getElementById("lobby-screen")
        .style.display = "flex";
}


// ==========================================
// 꾸미기
// ==========================================

window.openCustomize = function() {

    const screen =
        document.getElementById(
            "customize-screen"
        );

    screen.style.display = "flex";

    updateSkinPreview();
};


window.closeCustomize = function() {

    document
        .getElementById(
            "customize-screen"
        )
        .style.display = "none";
};


window.selectSkin = function(charType) {

    myPlayer.charType = charType;

    updateSkinPreview();

    document
        .getElementById("profile-avatar")
        .src =
        charType === "char1"
            ? "./gojo.png"
            : "./luffy.png";
};


function updateSkinPreview() {

    const preview =
        document.getElementById(
            "skin-preview-img"
        );

    preview.src =
        myPlayer.charType === "char1"
            ? "./gojo.png"
            : "./luffy.png";
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


    isGameStarted = true;


    // 게스트
    if (isGuest) {

        myRef = null;

        return;
    }


    // 로그인 사용자
    myRef =
        ref(
            db,
            `players/${myPlayer.userId}`
        );


    set(
        myRef,
        myPlayer
    );


    onDisconnect(myRef)
        .remove();
};


// ==========================================
// HP UI
// ==========================================

function updateHPUI() {

    const hpPercent =
        Math.max(
            0,
            Math.min(
                100,
                (myPlayer.hp /
                    myPlayer.maxHp) *
                100
            )
        );


    const fill =
        document.getElementById(
            "hud-hp-fill"
        );

    const text =
        document.getElementById(
            "hud-hp-text"
        );


    if (fill) {
        fill.style.width =
            `${hpPercent}%`;
    }

    if (text) {
        text.textContent =
            `HP ${myPlayer.hp} / ${myPlayer.maxHp}`;
    }
}


// ==========================================
// 에너지 UI
// ==========================================

function updateEnergyUI() {

    const percent =
        (myPlayer.energy /
            myPlayer.maxEnergy) *
        100;


    const fill =
        document.getElementById(
            "hud-energy-fill"
        );

    const text =
        document.getElementById(
            "hud-energy-text"
        );


    if (fill) {

        fill.style.width =
            `${percent}%`;
    }

    if (text) {

        text.textContent =
            `EN ${myPlayer.energy} / ${myPlayer.maxEnergy}`;
    }
}


// ==========================================
// 플레이어 데미지
// ==========================================

function damagePlayer(damage) {

    if (!isGameStarted) return;

    if (myPlayer.hp <= 0) return;


    myPlayer.hp -= damage;


    if (myPlayer.hp < 0) {
        myPlayer.hp = 0;
    }


    updateHPUI();


    if (myRef) {

        set(
            myRef,
            myPlayer
        );
    }


    if (myPlayer.hp <= 0) {

        playerDeath();
    }
}


// ==========================================
// 사망
// ==========================================

function playerDeath() {

    isGameStarted = false;


    effects.push({

        x:
            myPlayer.x +
            myPlayer.size / 2,

        y:
            myPlayer.y +
            myPlayer.size / 2,

        radius: 70,

        color:
            "rgba(255,0,0,0.5)",

        life: 40
    });


    setTimeout(() => {

        myPlayer.hp =
            myPlayer.maxHp;

        myPlayer.x = 100;

        myPlayer.y = 200;


        testMonster.x = 500;

        testMonster.y = 250;


        updateHPUI();


        isGameStarted = true;

    }, 1500);
}


// ==========================================
// 스킬
// ==========================================

const btnAtk =
    document.getElementById(
        "btn-attack"
    );

const btnS1 =
    document.getElementById(
        "btn-skill1"
    );

const btnS2 =
    document.getElementById(
        "btn-skill2"
    );


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

    if (!isGameStarted) return;


    const isGojo =
        myPlayer.charType === "char1";


    let attackX =
        myPlayer.facing === "right"
            ? myPlayer.x + 60
            : myPlayer.x - 60;


    // =====================================
    // 평타
    // =====================================

    if (type === "attack") {

        effects.push({

            x: attackX,

            y:
                myPlayer.y + 20,

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
                (inRangeRight ||
                    inRangeLeft) &&
                inVerticalRange
            ) {

                const damage = 20;

                testMonster.hp -= damage;


                if (testMonster.hp < 0) {
                    testMonster.hp = 0;
                }


                damageTexts.push({

                    text:
                        `-${damage}`,

                    x:
                        testMonster.x +
                        testMonster.size / 2,

                    y:
                        testMonster.y - 10,

                    life: 25,

                    color: "#ff3333"

                });


                // 에너지 획득
                myPlayer.energy += 10;

                if (
                    myPlayer.energy >
                    myPlayer.maxEnergy
                ) {
                    myPlayer.energy =
                        myPlayer.maxEnergy;
                }

                updateEnergyUI();
            }
        }
    }


    // =====================================
    // 스킬 1
    // =====================================

    else if (type === "skill1") {

        if (isGojo) {

            myPlayer.x =
                myPlayer.facing === "right"
                    ? myPlayer.x + 100
                    : myPlayer.x - 100;


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

                y:
                    myPlayer.y + 20,

                radius: 30,

                color: "#ff5500",

                life: 15

            });
        }
    }


    // =====================================
    // 스킬 2
    // =====================================

    else if (type === "skill2") {

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
// 모바일 버튼
// ==========================================

function bindControlBtn(
    btnId,
    keyName
) {

    const btn =
        document.getElementById(
            btnId
        );

    if (!btn) return;


    const pressOn = e => {

        e.preventDefault();

        keysPressed[keyName] =
            true;
    };


    const pressOff = e => {

        e.preventDefault();

        keysPressed[keyName] =
            false;
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
// 이동
// ==========================================

function updatePosition() {

    if (!isGameStarted)
        return;


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

        myPlayer.facing =
            "left";

        moved = true;
    }


    if (
        keysPressed["arrowright"] ||
        keysPressed["d"]
    ) {

        myPlayer.x += speed;

        myPlayer.facing =
            "right";

        moved = true;
    }


    // 960 x 540 기준 벽
    if (myPlayer.x < 0)
        myPlayer.x = 0;

    if (myPlayer.y < 0)
        myPlayer.y = 0;


    if (
        myPlayer.x >
        canvas.width -
        myPlayer.size
    ) {

        myPlayer.x =
            canvas.width -
            myPlayer.size;
    }


    if (
        myPlayer.y >
        canvas.height -
        myPlayer.size
    ) {

        myPlayer.y =
            canvas.height -
            myPlayer.size;
    }


    // 게스트는 Firebase 저장 안 함
    if (
        moved &&
        myRef &&
        !isGuest
    ) {

        set(
            myRef,
            myPlayer
        );
    }
}


// ==========================================
// 몬스터 AI
// ==========================================

function updateMonsterAI() {

    if (
        !testMonster ||
        testMonster.hp <= 0 ||
        !isGameStarted
    ) {
        return;
    }


    const distance =
        Math.hypot(
            myPlayer.x -
                testMonster.x,

            myPlayer.y -
                testMonster.y
        );


    // 추적
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


    // 공격
    if (
        distance <= 55
    ) {

        if (
            !testMonster.lastAttack ||
            Date.now() -
                testMonster.lastAttack >
                1000
        ) {

            testMonster.lastAttack =
                Date.now();

            damagePlayer(10);
        }
    }
}


// ==========================================
// Firebase 플레이어
// ==========================================

onValue(
    ref(db, "players"),
    snapshot => {

        players =
            snapshot.val() || {};


        const statusEl =
            document.getElementById(
                "status"
            );


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

    updateHPUI();

    updateEnergyUI();


    // 배경 이미지 제거
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    ctx.fillStyle =
        "#111111";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // =====================================
    // 몬스터
    // =====================================

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


        const mText =
            `[HP] ${
                testMonster.hp
            }/${
                testMonster.maxHp
            } ${
                testMonster.name
            }`;


        ctx.font =
            "bold 11px Segoe UI";


        const mTextWidth =
            ctx.measureText(
                mText
            ).width;


        ctx.fillStyle =
            "rgba(0,0,0,0.7)";


        ctx.fillRect(
            testMonster.x +
                testMonster.size / 2 -
                mTextWidth / 2 -
                4,

            testMonster.y - 32,

            mTextWidth + 8,

            16
        );


        ctx.fillStyle =
            "#ffaa00";

        ctx.textAlign =
            "center";


        ctx.fillText(
            mText,

            testMonster.x +
                testMonster.size / 2,

            testMonster.y - 20
        );


        // 몬스터 HP 바

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


        ctx.fillStyle =
            "#00ff88";


        ctx.fillRect(
            barX,
            barY,
            barW *
                (
                    testMonster.hp /
                    testMonster.maxHp
                ),
            barH
        );
    }


    // =====================================
    // 플레이어
    // =====================================

    Object.keys(players)
        .forEach(id => {

            const p =
                players[id];


            const charImg =
                CHAR_IMAGES[
                    p.charType
                ] ||
                CHAR_IMAGES.char1;


            if (
                charImg &&
                charImg.complete &&
                charImg.naturalWidth !== 0
            ) {

                ctx.save();


                if (
                    p.facing ===
                    "left"
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
                `[Lv.${
                    p.level || 1
                }] ${
                    p.nickname ||
                    "익명"
                }`;


            ctx.font =
                "bold 12px Segoe UI";


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
                id ===
                myPlayer.userId
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

        });


    // =====================================
    // 스킬 이펙트
    // =====================================

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


    // =====================================
    // 데미지 텍스트
    // =====================================

    for (
        let i =
            damageTexts.length - 1;
        i >= 0;
        i--
    ) {

        const dt =
            damageTexts[i];


        ctx.font =
            "bold 14px Segoe UI";


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


    requestAnimationFrame(
        draw
    );
}


draw();
