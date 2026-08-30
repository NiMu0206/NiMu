"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const panel = document.getElementById("messagePanel");
const title = document.getElementById("messageTitle");
const message = document.getElementById("messageText");
const restartButton = document.getElementById("restartButton");
const endingButton = document.getElementById("endingButton");

const WIDTH = 900;
const HEIGHT = 500;
const GROUND_Y = 350;
const keys = Object.create(null);

let player;
let boss;
let gameState;
let frame;
let hitFlash;
let particles;

function resetGame() {
    player = {
        x: 105, y: GROUND_Y - 58, width: 42, height: 58,
        vx: 0, vy: 0, speed: 3, jumpPower: -13, onGround: true
    };
    boss = {
        x: 650, y: GROUND_Y - 100, width: 92, height: 100,
        vx: -2.15, vy: 0, hp: 3, maxHp: 3, invincible: 0,
        state: "patrol", stateTimer: 110, direction: -1, hopCount: 0
    };
    gameState = "playing";
    frame = 0;
    hitFlash = 0;
    particles = [];
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
        title.textContent = "HAPPY BIRTHDAY!";
        message.textContent = "紫の魔王をたおした！\nめぐみの大冒険、大勝利！";
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
    updateParticles();
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
    if (boss.invincible > 0) boss.invincible--;
    if (hitFlash > 0) hitFlash--;

    if (boss.hp > 0 && boss.invincible === 0 && overlaps(player, boss)) {
        const stomped = player.vy > 0 && previousBottom <= boss.y + 18;
        if (stomped) {
            boss.hp--;
            boss.invincible = 55;
            player.y = boss.y - player.height;
            player.vy = -9;
            hitFlash = 9;
            burst(boss.x + boss.width / 2, boss.y + 15);
            if (boss.hp <= 0) {
                boss.vx = 0;
                window.setTimeout(() => setEndState("victory"), 550);
            }
        } else {
            setEndState("dead");
        }
    }
}

function facePlayer() {
    boss.direction = player.x + player.width / 2 < boss.x + boss.width / 2 ? -1 : 1;
}

function updateBossMovement() {
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
                boss.state = "warning";
                boss.stateTimer = Math.max(34, 50 - (boss.maxHp - boss.hp) * 6);
                boss.vx = 0;
                facePlayer();
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
    }
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#090822");
    sky.addColorStop(0.72, "#261342");
    sky.addColorStop(1, "#10091b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ddd7ff";
    ctx.beginPath();
    ctx.arc(755, 78, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#090822";
    ctx.beginPath();
    ctx.arc(738, 65, 42, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 24; i++) {
        const x = (i * 97 + 35) % WIDTH;
        const y = (i * 43 + 24) % 180;
        ctx.fillStyle = i % 3 ? "#b7a6e8" : "#fff4b2";
        ctx.fillRect(x, y, 2, 2);
    }

    ctx.fillStyle = "#171126";
    ctx.fillRect(0, 210, WIDTH, 140);
    for (let x = 0; x < WIDTH; x += 100) {
        ctx.fillStyle = "#25183a";
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

    drawTorch(80, 250);
    drawTorch(820, 250);
}

function drawTorch(x, y) {
    ctx.fillStyle = "#6b4a42";
    ctx.fillRect(x - 5, y, 10, 62);
    const flicker = Math.sin(frame * .25 + x) * 5;
    ctx.fillStyle = "#ff5b2b";
    ctx.beginPath(); ctx.ellipse(x, y - 12, 15 + flicker / 3, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe262";
    ctx.beginPath(); ctx.ellipse(x, y - 8, 7, 15 + flicker / 2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer() {
    const p = player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "#f7c7a5";
    ctx.beginPath(); ctx.arc(21, 13, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b2539";
    ctx.beginPath(); ctx.arc(21, 9, 13, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff6f9f";
    ctx.fillRect(7, 24, 28, 24);
    ctx.fillStyle = "#fff";
    ctx.fillRect(15, 28, 12, 9);
    ctx.fillStyle = "#453060";
    ctx.fillRect(8, 48, 11, 10);
    ctx.fillRect(25, 48, 11, 10);
    ctx.fillStyle = "#25152a";
    ctx.fillRect(15, 12, 3, 3); ctx.fillRect(25, 12, 3, 3);
    ctx.restore();
}

function drawBoss() {
    if (boss.hp <= 0 && gameState === "victory") return;
    if (boss.invincible > 0 && Math.floor(boss.invincible / 4) % 2 === 0) return;
    const b = boss;
    const bob = Math.sin(frame * .07) * 3;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
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
    if (b.state === "dash") {
        ctx.fillStyle = "#b44cff55";
        for (let i = 1; i <= 3; i++) {
            ctx.fillRect(-b.direction * i * 28, 24, b.direction * 24, 65);
        }
    }
    ctx.fillStyle = "#3a155e";
    ctx.beginPath();
    ctx.moveTo(8, 95); ctx.quadraticCurveTo(-6, 35, 24, 18);
    ctx.quadraticCurveTo(46, -5, 68, 18); ctx.quadraticCurveTo(100, 42, 84, 95);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7d35b2";
    ctx.beginPath(); ctx.ellipse(46, 56, 40, 43, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2d0b48";
    ctx.beginPath(); ctx.moveTo(14, 27); ctx.lineTo(6, -5); ctx.lineTo(32, 20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, 20); ctx.lineTo(85, -5); ctx.lineTo(78, 31); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(31, 46, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(61, 46, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff3b70";
    ctx.fillRect(29, 44, 5, 8); ctx.fillRect(59, 44, 5, 8);
    ctx.strokeStyle = "#260b38"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(46, 65, 19, 0.15, Math.PI - .15); ctx.stroke();
    if (b.state === "tired") {
        ctx.fillStyle = "#ffe96a";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("★", 15, -8 + Math.sin(frame * .15) * 5);
        ctx.fillText("★", 65, -14 + Math.cos(frame * .15) * 5);
    }
    ctx.restore();
}

function drawHud() {
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

function draw() {
    drawBackground();
    drawPlayer();
    drawBoss();
    drawParticles();
    drawHud();
    if (hitFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${hitFlash / 15})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
