"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const playerSprite = new Image();
playerSprite.src = "megumi-player.png";
const bossSprite = new Image();
bossSprite.src = "purple-demon.png";
const panel = document.getElementById("messagePanel");
const title = document.getElementById("messageTitle");
const message = document.getElementById("messageText");
const restartButton = document.getElementById("restartButton");
const endingButton = document.getElementById("endingButton");

const WIDTH = 900;
const HEIGHT = 500;
const GROUND_Y = 350;
const keys = Object.create(null);
const AWAKENED_BEAM_PATTERNS = [
    [75],
    [405],
    [735],
    [240],
    [570],
    [75, 735],
    [240, 570]
];

let player;
let boss;
let gameState;
let frame;
let hitFlash;
let particles;
let defeatTimer;
let presentRevealTimer;
let shockwaves;
let introTimer;
let awakeningTimer;
let verticalBeams;
let entranceTimer;
let finisherTimer;
let hasSeenEntrance = false;

function resetGame() {
    player = {
        x: 105, y: GROUND_Y - 58, width: 42, height: 58,
        vx: 0, vy: 0, speed: 3, jumpPower: -13, onGround: true
    };
    const showEntrance = !hasSeenEntrance;
    boss = {
        x: showEntrance ? WIDTH + 90 : 650, y: showEntrance ? 70 : GROUND_Y - 100, width: 92, height: 100,
        vx: -2.15, vy: 0, hp: 3, maxHp: 3, invincible: 0,
        state: "patrol", stateTimer: 110, direction: -1, hopCount: 0,
        attackCycle: 0, awakened: false, beamIndex: 0
    };
    gameState = showEntrance ? "entrance" : "playing";
    frame = 0;
    hitFlash = 0;
    particles = [];
    defeatTimer = 0;
    presentRevealTimer = 0;
    shockwaves = [];
    introTimer = showEntrance ? 0 : 120;
    awakeningTimer = 0;
    verticalBeams = [];
    entranceTimer = showEntrance ? 360 : 0;
    finisherTimer = 0;
    if (showEntrance) {
        hasSeenEntrance = true;
        const controls = document.querySelector(".mobile-controls");
        if (controls) { controls.style.opacity = ".2"; controls.style.pointerEvents = "none"; }
    }
    window.GameAudio?.setIntensity(false);
    panel.classList.add("hidden");
    restartButton.classList.remove("hidden");
    endingButton.classList.add("hidden");
}

function setEndState(state) {
    gameState = state;
    panel.classList.remove("hidden");
    if (state === "dead") {
        title.textContent = "GAME OVER";
        message.textContent = "魔王にぶつかってしまった…\nもう一度挑戦しよう！";
        restartButton.classList.remove("hidden");
        endingButton.classList.add("hidden");
    } else {
        title.textContent = "封印が解けた！";
        message.textContent = "紫の魔王をたおし、\n伝説のプレゼントを取り戻した！";
        restartButton.classList.add("hidden");
        endingButton.classList.remove("hidden");
        burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 100);
    }
}

function burst(x, y, amount = 26) {
    const colors = ["#ffe66d", "#ff69b4", "#7cf7ff", "#c694ff", "#ffffff"];
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 6;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
            life: 45 + Math.random() * 55, size: 3 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
}

function update() {
    frame++;
    if (introTimer > 0) introTimer--;
    updateParticles();
    if (hitFlash > 0) hitFlash--;

    if (gameState === "entrance") {
        entranceTimer--;
        const elapsed = 360 - entranceTimer;
        if (elapsed > 35) {
            boss.x += (650 - boss.x) * 0.045;
            boss.y += (GROUND_Y - boss.height - boss.y) * 0.035;
        }
        if (entranceTimer === 185) {
            burst(boss.x + boss.width / 2, GROUND_Y - 12, 55);
            window.GameAudio?.play("bossEntrance");
        }
        if (entranceTimer <= 0) {
            boss.x = 650;
            boss.y = GROUND_Y - boss.height;
            gameState = "playing";
            introTimer = 0;
            const controls = document.querySelector(".mobile-controls");
            if (controls) { controls.style.opacity = "1"; controls.style.pointerEvents = ""; }
        }
        return;
    }

    if (gameState === "finisher") {
        finisherTimer--;
        if (finisherTimer > 0 && finisherTimer % 22 === 0) {
            burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 12);
        }
        if (finisherTimer <= 0) {
            gameState = "defeating";
            defeatTimer = 220;
            burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 70);
        }
        return;
    }

    if (gameState === "defeating") {
        defeatTimer--;
        if (defeatTimer > 0 && defeatTimer % 28 === 0) {
            burst(
                boss.x + 15 + Math.random() * (boss.width - 30),
                boss.y + 15 + Math.random() * (boss.height - 25),
                8
            );
        }
        if (defeatTimer <= 0) {
            gameState = "giftReveal";
            presentRevealTimer = 300;
            burst(boss.x + boss.width / 2, GROUND_Y - 55, 70);
            window.GameAudio?.play("victory");
        }
        return;
    }

    if (gameState === "giftReveal") {
        presentRevealTimer--;
        if (presentRevealTimer <= 0) setEndState("victory");
        return;
    }

    if (gameState === "awakening") {
        awakeningTimer--;
        player.vx = 0;
        player.x += (120 - player.x) * 0.045;
        player.vy += player.vy < 0 ? 0.35 : 0.20;
        player.y += player.vy;
        if (player.y + player.height >= GROUND_Y) {
            player.y = GROUND_Y - player.height;
            player.vy = 0;
            player.onGround = true;
        }
        boss.x += (WIDTH / 2 - boss.width / 2 - boss.x) * 0.035;
        boss.y += (120 - boss.y) * 0.035;
        if (awakeningTimer > 0 && awakeningTimer % 42 === 0) {
            burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 18);
        }
        if (awakeningTimer <= 0) {
            gameState = "playing";
            boss.awakened = true;
            boss.invincible = 85;
            boss.state = "awakenRise";
            boss.stateTimer = 90;
            boss.beamIndex = 0;
            window.GameAudio?.setIntensity(true);
            const controls = document.querySelector(".mobile-controls");
            if (controls) { controls.style.opacity = "1"; controls.style.pointerEvents = ""; }
        }
        return;
    }

    if (gameState !== "playing") return;

    const movingLeft = keys.ArrowLeft || keys.KeyA;
    const movingRight = keys.ArrowRight || keys.KeyD;
    player.vx = movingLeft === movingRight ? 0 : movingLeft ? -player.speed : player.speed;
    player.x += player.vx;
    player.x = Math.max(22, Math.min(WIDTH - player.width - 22, player.x));

    const gravity = player.vy < 0 ? 0.35 : 0.20;
    player.vy += gravity;
    const previousBottom = player.y + player.height;
    player.y += player.vy;
    if (player.y + player.height >= GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.onGround = true;
    } else {
        player.onGround = false;
    }

    updateBossMovement();
    updateShockwaves();
    updateVerticalBeams();
    if (gameState !== "playing") return;
    if (boss.invincible > 0) boss.invincible--;
    const bossVulnerable = !boss.awakened || boss.state === "awakenTired";
    if (boss.hp > 0 && bossVulnerable && boss.invincible === 0 && overlaps(player, boss)) {
        const stomped = player.vy > 0 && previousBottom <= boss.y + 18;
        if (stomped) {
            boss.hp--;
            window.GameAudio?.play("stomp");
            boss.invincible = 55;
            player.y = boss.y - player.height;
            player.vy = -9;
            hitFlash = 9;
            burst(boss.x + boss.width / 2, boss.y + 15);
            if (boss.hp <= 0) {
                boss.vx = 0;
                boss.vy = 0;
                boss.invincible = 0;
                boss.state = "defeated";
                shockwaves = [];
                verticalBeams = [];
                gameState = "finisher";
                finisherTimer = 150;
                hitFlash = 15;
                window.GameAudio?.play("finalHit");
                burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 45);
            } else if (boss.hp === 1 && !boss.awakened) {
                gameState = "awakening";
                awakeningTimer = 360;
                boss.state = "awakening";
                boss.vx = 0;
                boss.vy = 0;
                boss.invincible = 99999;
                shockwaves = [];
                verticalBeams = [];
                keys.ArrowLeft = false;
                keys.ArrowRight = false;
                keys.Space = false;
                window.GameAudio?.play("awaken");
                const controls = document.querySelector(".mobile-controls");
                if (controls) { controls.style.opacity = ".2"; controls.style.pointerEvents = "none"; }
            }
        } else {
            window.GameAudio?.play("damage");
            setEndState("dead");
        }
    }
}

function facePlayer() {
    boss.direction = player.x + player.width / 2 < boss.x + boss.width / 2 ? -1 : 1;
}

function updateBossMovement() {
    if (boss.awakened) {
        updateAwakenedBoss();
        return;
    }

    const leftEdge = 330;
    const rightEdge = WIDTH - boss.width - 35;
    const speedUp = (boss.maxHp - boss.hp) * 0.35;
    boss.stateTimer--;

    if (boss.state === "patrol") {
        boss.vx = boss.direction * (1.75 + speedUp);
        if (boss.stateTimer <= 0) {
            facePlayer();
            boss.state = "hop";
            boss.hopCount = 0;
            boss.vy = -7.5;
        }
    } else if (boss.state === "hop") {
        boss.vx = boss.direction * (2.35 + speedUp);
        boss.vy += 0.28;
        boss.y += boss.vy;
        if (boss.y + boss.height >= GROUND_Y) {
            boss.y = GROUND_Y - boss.height;
            boss.vy = 0;
            boss.hopCount++;
            if (boss.hopCount < 2) {
                facePlayer();
                boss.vy = -6.4;
            } else {
                boss.attackCycle++;
                const useShockwave = boss.attackCycle % 2 === 0;
                boss.state = useShockwave ? "shockCharge" : "warning";
                boss.stateTimer = useShockwave
                    ? Math.max(58, 82 - (boss.maxHp - boss.hp) * 8)
                    : Math.max(34, 50 - (boss.maxHp - boss.hp) * 6);
                boss.vx = 0;
                facePlayer();
                if (useShockwave) window.GameAudio?.play("charge");
            }
        }
    } else if (boss.state === "warning") {
        boss.vx = 0;
        if (boss.stateTimer <= 0) {
            boss.state = "dash";
            boss.stateTimer = 48;
        }
    } else if (boss.state === "dash") {
        boss.vx = boss.direction * (6.5 + speedUp);
        if (boss.stateTimer <= 0) {
            boss.state = "tired";
            boss.stateTimer = 55;
            boss.vx = 0;
        }
    } else if (boss.state === "shockCharge") {
        boss.vx = 0;
        if (boss.stateTimer <= 0) {
            const centerX = boss.x + boss.width / 2;
            shockwaves.push(
                { originX: centerX, direction: -1, age: 0, duration: 38 },
                { originX: centerX, direction: 1, age: 0, duration: 38 }
            );
            window.GameAudio?.play("shock");
            burst(centerX, GROUND_Y - 8, 32);
            boss.state = "tired";
            boss.stateTimer = 72;
        }
    } else if (boss.state === "tired") {
        boss.vx *= 0.8;
        if (boss.stateTimer <= 0) {
            boss.state = "patrol";
            boss.stateTimer = Math.max(75, 115 - (boss.maxHp - boss.hp) * 15);
            facePlayer();
        }
    }

    boss.x += boss.vx;
    if (boss.x <= leftEdge || boss.x >= rightEdge) {
        boss.x = Math.max(leftEdge, Math.min(rightEdge, boss.x));
        boss.direction *= -1;
        if (boss.state === "dash") {
            boss.state = "tired";
            boss.stateTimer = 55;
            boss.vx = 0;
        }
    }
}

function updateParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);
}

function jump() {
    if (gameState === "playing" && player.onGround) {
        player.vy = player.jumpPower;
        player.onGround = false;
        window.GameAudio?.play("jump");
    }
}

function drawBackground() {
    const rage = boss && (boss.awakened || gameState === "awakening" || gameState === "finisher");
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, rage ? "#26000d" : "#090822");
    sky.addColorStop(0.72, rage ? "#57112d" : "#261342");
    sky.addColorStop(1, rage ? "#180009" : "#10091b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = rage ? "#ff526f" : "#ddd7ff";
    ctx.beginPath();
    ctx.arc(755, 78, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rage ? "#26000d" : "#090822";
    ctx.beginPath();
    ctx.arc(738, 65, 42, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 24; i++) {
        const x = (i * 97 + 35) % WIDTH;
        const y = (i * 43 + 24) % 180;
        ctx.fillStyle = i % 3 ? "#b7a6e8" : "#fff4b2";
        ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = rage ? "#281019" : "#171126";
    ctx.fillRect(0, 210, WIDTH, 140);
    for (let x = 0; x < WIDTH; x += 100) {
        ctx.fillStyle = rage ? "#471a26" : "#25183a";
        ctx.fillRect(x, 210, 48, 22);
        ctx.fillStyle = "#120d20";
        ctx.fillRect(x + 13, 272, 30, 78);
    }
    ctx.strokeStyle = "#39264e";
    ctx.lineWidth = 3;
    for (let y = 230; y < 350; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }

    ctx.fillStyle = "#30213e";
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.fillStyle = "#513567";
    ctx.fillRect(0, GROUND_Y, WIDTH, 10);
    ctx.strokeStyle = "#1d142a";
    ctx.lineWidth = 3;
    for (let y = GROUND_Y + 40; y < HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    for (let x = 0; x < WIDTH; x += 90) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x - 35, HEIGHT); ctx.stroke();
    }

    if (rage) {
        ctx.strokeStyle = "#8f304b";
        ctx.lineWidth = 4;
        [[180,220],[350,260],[590,215],[735,270]].forEach(([x,y], i) => {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (i % 2 ? 22 : -18), y + 32);
            ctx.lineTo(x + (i % 2 ? 4 : 12), y + 62);
            ctx.lineTo(x + (i % 2 ? 30 : -8), y + 88);
            ctx.stroke();
        });
    }

    drawTorch(80, 250);
    drawTorch(820, 250);
}

function drawTorch(x, y) {
    ctx.fillStyle = "#6b4a42";
    ctx.fillRect(x - 5, y, 10, 62);
    const flicker = Math.sin(frame * .25 + x) * 5;
    const rage = boss && (boss.awakened || gameState === "awakening" || gameState === "finisher");
    ctx.fillStyle = rage ? "#ff174f" : "#ff5b2b";
    ctx.beginPath(); ctx.ellipse(x, y - 12, 15 + flicker / 3, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rage ? "#ff82b2" : "#ffe262";
    ctx.beginPath(); ctx.ellipse(x, y - 8, 7, 15 + flicker / 2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer() {
    const p = player;
    if (playerSprite.complete && playerSprite.naturalWidth > 0) {
        const bob = p.vx !== 0 && p.onGround ? Math.sin(frame * 0.22) * 3 : 0;
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height + bob);
        ctx.rotate(!p.onGround ? Math.max(-0.16, Math.min(0.16, p.vy * 0.014)) : 0);
        ctx.scale(p.vx < 0 ? -1 : 1, 1);
        ctx.drawImage(playerSprite, -28, -68, 56, 68);
        ctx.restore();
    }
}

function updateAwakenedBoss() {
    boss.stateTimer--;
    boss.vx = 0;

    if (boss.state === "awakenRise") {
        boss.x += (WIDTH / 2 - boss.width / 2 - boss.x) * 0.05;
        boss.y += (92 - boss.y) * 0.05;
        if (boss.stateTimer <= 0) {
            boss.state = "beamWarn";
            boss.stateTimer = 78;
            boss.beamIndex = 0;
        }
    } else if (boss.state === "beamWarn") {
        boss.y = 92 + Math.sin(frame * 0.08) * 7;
        if (boss.stateTimer <= 0) {
            const pattern = AWAKENED_BEAM_PATTERNS[boss.beamIndex];
            pattern.forEach(x => {
                verticalBeams.push({ x, width: 90, age: 0, duration: 38 });
                burst(x + 45, GROUND_Y - 12, 16);
            });
            window.GameAudio?.play("verticalBeam");
            boss.beamIndex++;
            if (boss.beamIndex < AWAKENED_BEAM_PATTERNS.length) {
                // 後半は少しテンポアップする
                boss.stateTimer = boss.beamIndex >= 5 ? 58 : 68;
            } else {
                boss.state = "awakenReturn";
                boss.stateTimer = 115;
            }
        }
    } else if (boss.state === "awakenReturn") {
        boss.y += (GROUND_Y - boss.height - boss.y) * 0.055;
        if (boss.stateTimer <= 0 || Math.abs(boss.y - (GROUND_Y - boss.height)) < 2) {
            boss.y = GROUND_Y - boss.height;
            boss.state = "awakenTired";
            boss.stateTimer = 125;
            boss.invincible = 0;
        }
    } else if (boss.state === "awakenTired") {
        if (boss.stateTimer <= 0) {
            boss.invincible = 85;
            boss.state = "awakenRise";
            boss.stateTimer = 90;
        }
    }
}

function updateVerticalBeams() {
    verticalBeams.forEach(beam => { beam.age++; });
    verticalBeams = verticalBeams.filter(beam => beam.age < beam.duration);
    const hit = verticalBeams.find(beam => {
        if (beam.age < 5 || beam.age > 29) return false;
        return overlaps(player, { x: beam.x, y: 0, width: beam.width, height: GROUND_Y });
    });
    if (hit && gameState === "playing") {
        window.GameAudio?.play("damage");
        verticalBeams = [];
        setEndState("dead");
    }
}

function updateShockwaves() {
    shockwaves.forEach(beam => { beam.age++; });
    shockwaves = shockwaves.filter(beam => beam.age < beam.duration);

    const hitWave = shockwaves.find(beam => {
        if (beam.age < 6 || beam.age > 28) return false;
        const beamHitbox = beam.direction < 0
            ? { x: 0, y: GROUND_Y - 31, width: beam.originX, height: 31 }
            : { x: beam.originX, y: GROUND_Y - 31, width: WIDTH - beam.originX, height: 31 };
        return overlaps(player, beamHitbox);
    });
    if (hitWave && gameState === "playing") {
        window.GameAudio?.play("damage");
        shockwaves = [];
        setEndState("dead");
    }
}

function drawBoss() {
    if (gameState === "giftReveal" || gameState === "victory") return;
    if (gameState === "playing" && boss.invincible > 0 && Math.floor(boss.invincible / 4) % 2 === 0) return;
    const b = boss;
    const bob = Math.sin(frame * .07) * 3;
    const chargeLift = b.state === "shockCharge"
        ? (1 - Math.max(0, b.stateTimer) / 82) * 15
        : 0;
    ctx.save();
    ctx.translate(b.x + b.width / 2, b.y + b.height / 2 + bob - chargeLift);
    if (gameState === "defeating") {
        const remaining = Math.max(0, defeatTimer / 220);
        const scale = 0.55 + remaining * 0.45;
        ctx.globalAlpha = Math.max(0, remaining) * (0.65 + Math.sin(frame * 0.7) * 0.25);
        ctx.rotate((1 - remaining) * 0.18);
        ctx.scale(scale, scale);
    }
    ctx.translate(-b.width / 2, -b.height / 2);
    if (b.state === "warning") {
        const pulse = 8 + Math.sin(frame * .55) * 5;
        ctx.strokeStyle = "#ffdf59";
        ctx.lineWidth = 5;
        ctx.globalAlpha = .75;
        ctx.beginPath();
        ctx.arc(46, 52, 62 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    if (b.state === "shockCharge") {
        const charge = 1 - Math.max(0, b.stateTimer) / 82;
        ctx.strokeStyle = "#d85cff";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.45 + charge * 0.45;
        for (let ring = 0; ring < 3; ring++) {
            ctx.beginPath();
            ctx.arc(46, 64, 38 + ring * 14 + Math.sin(frame * .2 + ring) * 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    if (b.state === "dash") {
        ctx.fillStyle = "#b44cff55";
        for (let i = 1; i <= 3; i++) {
            ctx.fillRect(-b.direction * i * 28, 24, b.direction * 24, 65);
        }
    }
    if (b.awakened || gameState === "awakening") {
        const aura = ctx.createRadialGradient(46, 50, 18, 46, 50, 82);
        aura.addColorStop(0, "rgba(255,70,130,.30)");
        aura.addColorStop(.55, "rgba(209,42,255,.25)");
        aura.addColorStop(1, "rgba(100,0,150,0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(46, 50, 86 + Math.sin(frame * .16) * 7, 0, Math.PI * 2);
        ctx.fill();
    }
    if (bossSprite.complete && bossSprite.naturalWidth > 0) {
        ctx.drawImage(bossSprite, -18, -22, 128, 122);
    }
    if (b.state === "shockCharge") {
        const charge = 1 - Math.max(0, b.stateTimer) / 82;
        const orbY = -22 - charge * 16;
        const orbRadius = 10 + charge * 24 + Math.sin(frame * .35) * 3;
        const orb = ctx.createRadialGradient(46, orbY, 2, 46, orbY, orbRadius);
        orb.addColorStop(0, "#ffffff");
        orb.addColorStop(.3, "#f3a1ff");
        orb.addColorStop(.7, "#b22bff");
        orb.addColorStop(1, "rgba(111,17,190,0)");
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(46, orbY, orbRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    if (b.state === "tired") {
        ctx.fillStyle = "#ffe96a";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("★", 15, -8 + Math.sin(frame * .15) * 5);
        ctx.fillText("★", 65, -14 + Math.cos(frame * .15) * 5);
    }
    ctx.restore();
}

function drawLegendaryPresent() {
    if (gameState !== "giftReveal" && gameState !== "victory") return;

    const x = boss.x + boss.width / 2;
    const y = GROUND_Y - 54 + Math.sin(frame * 0.06) * 5;
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 90);
    glow.addColorStop(0, "rgba(255,244,132,.72)");
    glow.addColorStop(1, "rgba(255,105,180,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 95, y - 95, 190, 190);

    ctx.save();
    ctx.translate(x, y);
    if (gameState === "giftReveal") {
        const revealProgress = Math.min(1, (300 - presentRevealTimer) / 70);
        const revealScale = 0.2 + revealProgress * 0.8;
        ctx.globalAlpha = revealProgress;
        ctx.scale(revealScale, revealScale);
    }
    ctx.fillStyle = "#f04f9a";
    ctx.fillRect(-34, -16, 68, 50);
    ctx.fillStyle = "#ffdc54";
    ctx.fillRect(-7, -16, 14, 50);
    ctx.fillStyle = "#ff6bad";
    ctx.fillRect(-40, -27, 80, 16);
    ctx.fillStyle = "#ffe46d";
    ctx.fillRect(-7, -27, 14, 16);
    ctx.strokeStyle = "#fff7b0";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(-14, -34, 15, 9, -0.35, 0, Math.PI * 2);
    ctx.ellipse(14, -34, 15, 9, 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#fff7a8";
    for (let i = 0; i < 8; i++) {
        const angle = frame * 0.02 + i * Math.PI / 4;
        const radius = 56 + Math.sin(frame * 0.05 + i) * 8;
        ctx.fillRect(x + Math.cos(angle) * radius - 2, y + Math.sin(angle) * radius - 2, 4, 4);
    }
}

function drawHud() {
    if (gameState !== "playing") return;
    ctx.fillStyle = "#080512cc";
    ctx.fillRect(24, 18, 240, 57);
    ctx.strokeStyle = "#b376ed";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 18, 240, 57);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`魔王 HP  ${boss.hp}/${boss.maxHp}`, 42, 53);
    for (let i = 0; i < boss.maxHp; i++) {
        ctx.fillStyle = i < boss.hp ? "#d948ff" : "#4c3d55";
        ctx.fillRect(155 + i * 29, 38, 20, 12);
    }
    ctx.fillStyle = "#ffe66d";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("上から3回ふもう！", WIDTH - 30, 48);
    ctx.textAlign = "left";
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = Math.min(1, p.life / 18);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function drawShockwaves() {
    if (boss.state === "shockCharge" && gameState === "playing") {
        const charge = 1 - Math.max(0, boss.stateTimer) / 82;
        const pulse = 0.25 + Math.abs(Math.sin(frame * .32)) * 0.55;
        ctx.save();
        ctx.globalAlpha = pulse * (0.35 + charge * 0.65);
        ctx.strokeStyle = charge > 0.7 ? "#ffffff" : "#e268ff";
        ctx.lineWidth = charge > 0.7 ? 5 : 3;
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = -frame * 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y - 20);
        ctx.lineTo(WIDTH, GROUND_Y - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#f3a1ff";
        for (let x = 35; x < WIDTH; x += 75) {
            const arrowY = GROUND_Y - 42 - Math.abs(Math.sin(frame * .18 + x)) * 8;
            ctx.beginPath();
            ctx.moveTo(x, arrowY);
            ctx.lineTo(x - 7, arrowY - 10);
            ctx.lineTo(x + 7, arrowY - 10);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    shockwaves.forEach(beam => {
        const grow = Math.min(1, beam.age / 8);
        const fade = Math.min(1, (beam.duration - beam.age) / 8);
        const alpha = grow * fade;
        const endX = beam.direction < 0 ? 0 : WIDTH;
        const length = Math.abs(endX - beam.originX) * grow;
        const startX = beam.direction < 0 ? beam.originX - length : beam.originX;
        const width = length;
        const y = GROUND_Y - 21;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "#db5cff";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "rgba(175,52,255,.72)";
        ctx.fillRect(startX, y - 13, width, 27);
        ctx.shadowBlur = 13;
        ctx.fillStyle = "#ef91ff";
        ctx.fillRect(startX, y - 7, width, 14);
        ctx.shadowBlur = 5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(startX, y - 2, width, 5);

        // 床に映る紫の光
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.42;
        ctx.fillStyle = "#c34cff";
        ctx.fillRect(startX, GROUND_Y, width, 13);
        ctx.restore();
    });
}

function drawVerticalBeams() {
    if (boss.awakened && boss.state === "beamWarn") {
        const pattern = AWAKENED_BEAM_PATTERNS[Math.min(boss.beamIndex, AWAKENED_BEAM_PATTERNS.length - 1)];
        const pulse = 0.22 + Math.abs(Math.sin(frame * .28)) * 0.42;
        pattern.forEach(x => {
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.fillStyle = "#d94cff";
            ctx.fillRect(x, 0, 90, GROUND_Y);
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = "#ffb4ff";
            ctx.lineWidth = 4;
            ctx.setLineDash([16, 12]);
            ctx.strokeRect(x + 3, 2, 84, GROUND_Y - 5);
            ctx.setLineDash([]);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(x + 45, GROUND_Y - 18);
            ctx.lineTo(x + 30, GROUND_Y - 43);
            ctx.lineTo(x + 60, GROUND_Y - 43);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    verticalBeams.forEach(beam => {
        const grow = Math.min(1, beam.age / 5);
        const fade = Math.min(1, (beam.duration - beam.age) / 8);
        ctx.save();
        ctx.globalAlpha = grow * fade;
        ctx.shadowColor = "#ef5cff";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "rgba(180,40,255,.75)";
        ctx.fillRect(beam.x, 0, beam.width, GROUND_Y);
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#f3a2ff";
        ctx.fillRect(beam.x + 18, 0, beam.width - 36, GROUND_Y);
        ctx.shadowBlur = 6;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(beam.x + 37, 0, 16, GROUND_Y);
        ctx.restore();
    });
}

function draw() {
    ctx.save();
    if (gameState === "finisher") {
        const power = Math.max(0, finisherTimer / 150);
        ctx.translate(Math.sin(frame * 2.4) * 9 * power, Math.cos(frame * 1.9) * 6 * power);
    }
    drawBackground();
    drawShockwaves();
    drawVerticalBeams();
    drawPlayer();
    drawBoss();
    drawLegendaryPresent();
    drawParticles();
    drawHud();
    if (hitFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${hitFlash / 15})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();

    if (gameState === "entrance") {
        const elapsed = 360 - entranceTimer;
        const darkness = elapsed < 80 ? .72 - elapsed / 130 : Math.max(0, (220 - elapsed) / 350);
        ctx.fillStyle = `rgba(4,1,12,${Math.max(0, darkness)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        if (elapsed > 135) {
            const alpha = Math.min(1, (elapsed - 135) / 35) * Math.min(1, entranceTimer / 45);
            ctx.globalAlpha = alpha;
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff77cb";
            ctx.shadowColor = "#cb42ff";
            ctx.shadowBlur = 22;
            ctx.font = "bold 48px sans-serif";
            ctx.fillText("紫の魔王、現る", WIDTH / 2, 118);
            ctx.font = "bold 18px sans-serif";
            ctx.fillStyle = "#f9dcff";
            ctx.fillText("伝説のプレゼントを奪いし者", WIDTH / 2, 150);
            if (elapsed > 225) {
                ctx.globalAlpha = Math.min(1, (elapsed - 225) / 24);
                ctx.fillStyle = "rgba(10,2,18,.82)";
                ctx.fillRect(220, 390, 460, 58);
                ctx.strokeStyle = "#c84de8";
                ctx.lineWidth = 2;
                ctx.strokeRect(220, 390, 460, 58);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 24px sans-serif";
                ctx.fillText("「そのプレゼントは渡さん！」", WIDTH / 2, 427);
            }
            ctx.shadowBlur = 0;
            ctx.textAlign = "left";
            ctx.globalAlpha = 1;
        }
    }

    if (gameState === "finisher") {
        const elapsed = 150 - finisherTimer;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, .6 - elapsed / 190)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.globalAlpha = Math.min(1, elapsed / 24) * Math.min(1, finisherTimer / 28);
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff4a8";
        ctx.shadowColor = "#ff4fa3";
        ctx.shadowBlur = 25;
        ctx.font = "bold 58px sans-serif";
        ctx.fillText("FINAL HIT!", WIDTH / 2, 145);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
    if (introTimer > 0 && gameState === "playing") {
        const alpha = Math.min(1, introTimer / 35, (230 - introTimer) / 35);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = "rgba(10,4,22,.84)";
        ctx.fillRect(225, 186, 450, 100);
        ctx.strokeStyle = "#d85cff";
        ctx.lineWidth = 3;
        ctx.strokeRect(225, 186, 450, 100);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("FINAL BATTLE", 450, 220);
        ctx.fillStyle = "#f0b6ff";
        ctx.font = "bold 31px sans-serif";
        ctx.fillText("紫の魔王", 450, 262);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
    if (gameState === "awakening") {
        const elapsed = 360 - awakeningTimer;
        const darkness = Math.min(.66, elapsed / 140);
        ctx.fillStyle = `rgba(14,0,22,${darkness})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        const pulse = 0.55 + Math.sin(frame * .22) * .18;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#ef65ff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(boss.x + boss.width / 2, boss.y + boss.height / 2, 80 + elapsed * .12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, Math.max(0, (elapsed - 90) / 38));
        ctx.textAlign = "center";
        ctx.fillStyle = "#ff78c8";
        ctx.shadowColor = "#e142ff";
        ctx.shadowBlur = 22;
        ctx.font = "bold 52px sans-serif";
        ctx.fillText("魔王覚醒", WIDTH / 2, 255);
        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#ffe1ff";
        ctx.fillText("FINAL PHASE", WIDTH / 2, 288);
        if (elapsed > 165) {
            ctx.globalAlpha = Math.min(1, (elapsed - 165) / 28);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("「まだ終わらぬぞ……！」", WIDTH / 2, 330);
        }
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
}

// 元の143.97Hz環境の操作感を、描画FPSに関係なく維持する
const FIXED_STEP = 1000 / 144;
let previousTime = 0;
let accumulator = 0;

function loop(currentTime) {
    if (previousTime === 0) previousTime = currentTime;

    // 復帰直後などの極端に長い停止時間は切り捨てる
    const elapsed = Math.min(currentTime - previousTime, 100);
    previousTime = currentTime;
    accumulator += elapsed;

    while (accumulator >= FIXED_STEP) {
        update();
        accumulator -= FIXED_STEP;
    }

    draw();
    requestAnimationFrame(loop);
}

window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
    keys[event.code] = true;
    if (["ArrowUp", "KeyW", "Space"].includes(event.code) && !event.repeat) jump();
    if (event.code === "Enter" && gameState === "dead") resetGame();
});
window.addEventListener("keyup", event => { keys[event.code] = false; });
restartButton.addEventListener("click", resetGame);

setupMobileControls({ keys, onJump: jump });

resetGame();
requestAnimationFrame(loop);
