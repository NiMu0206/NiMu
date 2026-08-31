const canvas = document.getElementById("gameCanvas");

if (canvas) {

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const playerSprite = new Image();
    playerSprite.src = "megumi-player.png";

    const skyStars = Array.from({ length: 42 }, (_, i) => ({
        x: (i * 197 + 73) % 1100,
        y: 24 + (i * 83) % 230,
        size: i % 7 === 0 ? 3 : (i % 3 === 0 ? 2 : 1)
    }));

    const worldWidth = 6000;

    let cameraX = 0;

    let player = {
        x: 100,
        y: 350,
        width: 40,
        height: 70,
        velocityY: 0,
        jumping: false,
        facing: 1
    };

    let keys = {};

    let starCount = 0;

    let stars = [
        { x: 800, y: 360, collected: false },
        { x: 1800, y: 100, collected: false },
        { x: 3000, y: 100, collected: false },
        { x: 4200, y: 80, collected: false },
        { x: 5500, y: 100, collected: false }
    ];

    let platforms = [

        { x: 1500, y: 330, width: 100, height: 20 },
        { x: 1650, y: 250, width: 100, height: 20 },
        { x: 1800, y: 170, width: 100, height: 20 },

        { x: 2800, y: 320, width: 100, height: 20 },
        { x: 2950, y: 240, width: 100, height: 20 },
        { x: 3100, y: 160, width: 100, height: 20 },

        { x: 4000, y: 350, width: 100, height: 20 },
        { x: 4150, y: 260, width: 100, height: 20 },
        { x: 4300, y: 170, width: 100, height: 20 }

    ];

    let goal = {
    x: 5495,
    y: 330,
    visible: false
};

let enemies = [

    {
        x: 1000,
        y: 370,
        width: 40,
        height: 40,
        alive: true,
        direction: 1,
        speed: 1,
        minX: 900,
        maxX: 1300,
        type: "slime"
    },

    {
        x: 1600, y: 370, width: 40, height: 40, alive: true,
        direction: -1, speed: 1.35, minX: 1450, maxX: 1750,
        type: "chaser", chaseRange: 420
    },

    {
        x: 2300,
        y: 370,
        width: 40,
        height: 40,
        alive: true,
        direction: -1,
        speed: 1.5,
        minX: 2200,
        maxX: 2400,
        type: "slime"
    },

    {
        x: 2860, y: 215, baseY: 215, width: 46, height: 30, alive: true,
        direction: 1, speed: 1.25, minX: 2700, maxX: 3200,
        type: "bat", phase: 0
    },

        {
        x: 3600,
        y: 370,
        width: 40,
        height: 40,
        alive: true,
        direction: 1,
        speed: 1.5,
        minX: 3500,
        maxX: 3800,
        type: "slime"
    },

    {
        x: 3950, y: 370, width: 40, height: 40, alive: true,
        direction: 1, speed: 1.55, minX: 3850, maxX: 4200,
        type: "chaser", chaseRange: 480
    },

    {
        x: 4380, y: 195, baseY: 195, width: 46, height: 30, alive: true,
        direction: -1, speed: 1.55, minX: 4200, maxX: 4650,
        type: "bat", phase: Math.PI
    },

   {
    x: 4600,
    y: 370,
    width: 40,
    height: 40,
    alive: true,
    direction: -1,
    speed: 2,
    minX: 4500,
    maxX: 5000,
    jumpingEnemy: true,
    jumping: false,
    velocityY: 0,
    type: "slime"
},

{
    x: 5150, y: 370, width: 40, height: 40, alive: true,
    direction: -1, speed: 1.8, minX: 5000, maxX: 5350,
    type: "chaser", chaseRange: 520
}

];

let message = "";
let messageTimer = 0;

let isDead = false;
let introTimer = 230;
let goalRevealTimer = 0;
let cameraReturnTimer = 0;
let landingSquash = 0;
let starParticles = [];
let bossTransitionTimer = 0;

function burstStar(x, y) {
    for (let i = 0; i < 18; i++) {
        const angle = i * Math.PI * 2 / 18;
        const speed = 1.4 + (i % 4) * 0.45;
        starParticles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: 42 });
    }
}

function drawCollectibleStar(x, y, phase = 0) {
    const time = performance.now() * 0.0025 + phase;
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 1.8) * 4);
    ctx.rotate(Math.sin(time) * 0.18);
    ctx.shadowColor = "#fff27a";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? 14 : 6;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffe44f";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#e89a24";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fffbd1";
    ctx.beginPath();
    ctx.arc(-3, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function updateStarParticles() {
    starParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--; });
    starParticles = starParticles.filter(p => p.life > 0);
}

    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    setupMobileControls({
        keys,
        onJump: () => {
            if (!player.jumping && !isDead) {
                player.velocityY = -13;
                player.jumping = true;
                window.GameAudio?.play("jump");
            }
        }
    });

    function update() {

    if (introTimer > 0) introTimer--;
    if (landingSquash > 0) landingSquash--;
    updateStarParticles();

    if (bossTransitionTimer > 0) {
        bossTransitionTimer--;
        keys["ArrowLeft"] = false;
        keys["ArrowRight"] = false;
        keys[" "] = false;
        const target = Math.max(0, Math.min(worldWidth - canvas.width, goal.x - canvas.width * 0.68));
        cameraX += (target - cameraX) * 0.08;
        const elapsed = 430 - bossTransitionTimer;
        if (elapsed < 105) cameraX += Math.sin(elapsed * 0.8) * (elapsed / 105) * 3.5;
        if (bossTransitionTimer === 0) window.location.href = "boss.html";
        return;
    }

    // 死亡中は何もしない
    if (isDead) {

        messageTimer--;

        if (messageTimer <= 0) {

            isDead = false;

            keys["ArrowLeft"] = false;
            keys["ArrowRight"] = false;
            keys[" "] = false;

            player.x = 100;
            player.y = 350;
            player.velocityY = 0;
            player.jumping = false;

        }

        return;

    }

    if (goalRevealTimer > 0) {
        goalRevealTimer--;
        const target = Math.max(0, Math.min(worldWidth - canvas.width, goal.x - canvas.width * 0.68));
        cameraX += (target - cameraX) * 0.055;
        if (goalRevealTimer === 0) cameraReturnTimer = 90;
        return;
    }

    if (keys["ArrowLeft"]) { player.x -= 3; player.facing = -1; }
        if (keys["ArrowRight"]) { player.x += 3; player.facing = 1; }

        if (player.x < 0) player.x = 0;

        if (player.x > worldWidth - player.width) {
            player.x = worldWidth - player.width;
        }

        if (keys[" "] && !player.jumping) {
            player.velocityY = -13;
            player.jumping = true;
            window.GameAudio?.play("jump");
        }

        if (player.velocityY < 0) {
            player.velocityY += 0.35;
        } else {
            player.velocityY += 0.20;
        }

        player.y += player.velocityY;

        if (player.y >= 350) {
            if (player.velocityY > 3) landingSquash = 14;
            player.y = 350;
            player.velocityY = 0;
            player.jumping = false;
        }

        platforms.forEach(platform => {

            if (

                player.velocityY >= 0 &&

                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&

                player.y + player.height >= platform.y &&
                player.y + player.height <= platform.y + 20

            ) {

                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.jumping = false;

            }

        });

// 敵の移動
enemies.forEach(enemy => {

    if (!enemy.alive) return;

    // 赤スライムは近づくと、範囲内でめぐみを追いかける
    if (enemy.type === "chaser" && Math.abs(player.x - enemy.x) < enemy.chaseRange) {
        enemy.direction = player.x < enemy.x ? -1 : 1;
        enemy.x += enemy.speed * 1.55 * enemy.direction;
    } else {
        enemy.x += enemy.speed * enemy.direction;
    }

    // コウモリは空中を波のように飛ぶ
    if (enemy.type === "bat") {
        enemy.phase += 0.035;
        enemy.y = enemy.baseY + Math.sin(enemy.phase) * 45;
    }

    // 端まで行ったら反転
    if (enemy.x >= enemy.maxX) {

        enemy.x = enemy.maxX;
        enemy.direction = -1;

    }

    if (enemy.x <= enemy.minX) {

        enemy.x = enemy.minX;
        enemy.direction = 1;

    }

    // ジャンプするスライムだけ
if (enemy.jumpingEnemy) {

    if (!enemy.jumping) {

        enemy.velocityY = -7;
        enemy.jumping = true;

    }

    enemy.velocityY += 0.25;
    enemy.y += enemy.velocityY;

    // 地面に着地
    if (enemy.y >= 370) {

        enemy.y = 370;
        enemy.velocityY = 0;
        enemy.jumping = false;

    }

}

});

        stars.forEach(star => {

            if (
                !star.collected &&
                player.x < star.x + 20 &&
                player.x + player.width > star.x &&
                player.y < star.y + 20 &&
                player.y + player.height > star.y
            ) {

                star.collected = true;
                starCount++;
                burstStar(star.x, star.y);
                window.GameAudio?.play("star");
                if (starCount === 5) goalRevealTimer = 230;

            }

        });

        // 星を5個集めたら魔王城の扉が開く
if (starCount >= 5) {
    goal.visible = true;
}

// 開いた扉に触れたらボス戦へ
if (
    goal.visible &&
    player.x + player.width > goal.x &&
    player.x < goal.x + 60 &&
    player.y + player.height > goal.y
) {
    bossTransitionTimer = 430;
    player.velocityY = 0;
    window.GameAudio?.play("bossDoor");
    const controls = document.querySelector(".mobile-controls");
    if (controls) {
        controls.style.opacity = "0";
        controls.style.pointerEvents = "none";
    }
    return;
}

        // 敵との当たり判定
enemies.forEach(enemy => {

    if (!enemy.alive) return;

    if (

        player.x + player.width > enemy.x &&
        player.x < enemy.x + enemy.width &&

        player.y + player.height > enemy.y &&
        player.y < enemy.y + enemy.height

    ) {

        // 上から踏んだ！
        if (
            player.velocityY > 0 &&
            player.y + player.height < enemy.y + 20
        ) {

            enemy.alive = false;
            window.GameAudio?.play("stomp");

            // 踏んだ反動で少し跳ねる
            player.velocityY = -8;

            

        }

        // 横から当たった
        else {

            message = enemy.type === "bat"
                ? "💀 コウモリにやられた！"
                : "💀 スライムにやられた！";
            messageTimer = 60;

            isDead = true;
            window.GameAudio?.play("damage");

        }

    }

});

        const desiredCameraX = player.x - 300;
        if (cameraReturnTimer > 0) {
            cameraReturnTimer--;
            cameraX += (desiredCameraX - cameraX) * 0.075;
        } else {
            cameraX = desiredCameraX;
        }

        if (cameraX < 0) cameraX = 0;

        if (cameraX > worldWidth - canvas.width) {
            cameraX = worldWidth - canvas.width;
        }

        if (messageTimer > 0) {
    messageTimer--;
}

    }

    function drawNightBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, 410);
        sky.addColorStop(0, "#090820");
        sky.addColorStop(0.55, "#241449");
        sky.addColorStop(1, "#5b294f");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, 410);

        // 星はカメラよりゆっくり動かし、遠くに見せる
        ctx.fillStyle = "#fff6d5";
        skyStars.forEach(star => {
            let x = star.x - (cameraX * 0.035) % 1100;
            if (x < -5) x += 1100;
            ctx.globalAlpha = 0.55 + (star.size * 0.14);
            ctx.fillRect(x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1;

        // 月と薄雲
        ctx.fillStyle = "#fff3c7";
        ctx.shadowColor = "#d9c7ff";
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(755, 82, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(185,174,222,.16)";
        ctx.fillRect(650, 104, 210, 13);
        ctx.fillRect(704, 124, 170, 9);

        // 遠景の山（2層の視差）
        const farShift = (cameraX * 0.08) % 450;
        ctx.fillStyle = "#17142d";
        for (let x = -500 - farShift; x < canvas.width + 500; x += 260) {
            ctx.beginPath();
            ctx.moveTo(x, 410);
            ctx.lineTo(x + 120, 235);
            ctx.lineTo(x + 270, 410);
            ctx.fill();
        }

        const nearShift = (cameraX * 0.16) % 520;
        ctx.fillStyle = "#221733";
        for (let x = -560 - nearShift; x < canvas.width + 560; x += 330) {
            ctx.beginPath();
            ctx.moveTo(x, 410);
            ctx.lineTo(x + 85, 300);
            ctx.lineTo(x + 150, 335);
            ctx.lineTo(x + 235, 255);
            ctx.lineTo(x + 350, 410);
            ctx.fill();
        }

        ctx.fillStyle = "rgba(179,119,202,.10)";
        ctx.fillRect(0, 365, canvas.width, 45);
    }

    function drawDemonCastle() {
        const x = 5230 - cameraX;
        if (x > canvas.width || x + 620 < 0) return;

        // 城の背後の紫色の不気味な光
        const aura = ctx.createRadialGradient(x + 310, 220, 20, x + 310, 220, 280);
        aura.addColorStop(0, "rgba(186,57,255,.28)");
        aura.addColorStop(1, "rgba(72,18,111,0)");
        ctx.fillStyle = aura;
        ctx.fillRect(x, 0, 620, 410);

        ctx.fillStyle = "#0d0a15";
        ctx.fillRect(x + 85, 175, 450, 235);
        ctx.fillRect(x + 210, 105, 200, 305);

        // 塔
        [45, 145, 425, 525].forEach((offset, index) => {
            const towerY = index === 0 || index === 3 ? 118 : 150;
            ctx.fillStyle = index === 0 || index === 3 ? "#12101e" : "#171225";
            ctx.fillRect(x + offset, towerY, 72, 292 - towerY + 118);
            ctx.beginPath();
            ctx.moveTo(x + offset - 13, towerY);
            ctx.lineTo(x + offset + 36, towerY - 82);
            ctx.lineTo(x + offset + 85, towerY);
            ctx.fill();
            ctx.fillStyle = "#090711";
            ctx.fillRect(x + offset - 6, towerY - 5, 84, 14);
        });

        // 中央屋根と紋章
        ctx.fillStyle = "#090711";
        ctx.beginPath();
        ctx.moveTo(x + 185, 108);
        ctx.lineTo(x + 310, 18);
        ctx.lineTo(x + 435, 108);
        ctx.fill();
        ctx.fillStyle = "#71258f";
        ctx.beginPath();
        ctx.arc(x + 310, 125, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4f9e";
        ctx.beginPath();
        ctx.moveTo(x + 310, 110);
        ctx.lineTo(x + 326, 126);
        ctx.lineTo(x + 310, 139);
        ctx.lineTo(x + 294, 126);
        ctx.closePath();
        ctx.fill();

        // 石壁の線と光る窓
        ctx.strokeStyle = "rgba(126,102,150,.20)";
        ctx.lineWidth = 2;
        for (let y = 190; y < 400; y += 32) {
            ctx.beginPath(); ctx.moveTo(x + 86, y); ctx.lineTo(x + 534, y); ctx.stroke();
        }
        ctx.fillStyle = "#c747e8";
        ctx.shadowColor = "#d85cff";
        ctx.shadowBlur = 12;
        [92, 192, 470, 570].forEach(offset => {
            ctx.fillRect(x + offset, 205, 16, 35);
            ctx.fillRect(x + offset, 285, 16, 35);
        });
        ctx.fillRect(x + 265, 190, 18, 42);
        ctx.fillRect(x + 337, 190, 18, 42);
        ctx.shadowBlur = 0;

        // 大扉。星が揃うと赤紫色に発光する
        ctx.fillStyle = goal.visible ? "#73164f" : "#050408";
        ctx.beginPath();
        ctx.arc(goal.x - cameraX + 30, goal.y + 2, 30, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(goal.x - cameraX, goal.y, 60, 80);
        ctx.strokeStyle = goal.visible ? "#ff5aa9" : "#2b2132";
        ctx.lineWidth = 4;
        ctx.strokeRect(goal.x - cameraX, goal.y, 60, 80);
    }

    function draw() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawNightBackground();
        drawDemonCastle();



        // 地面
        ctx.fillStyle = "#444";
        ctx.fillRect(0, 410, canvas.width, 90);

        // 足場
        ctx.fillStyle = "#6B4226";

        platforms.forEach(platform => {

            ctx.fillRect(
                platform.x - cameraX,
                platform.y,
                platform.width,
                platform.height
            );

        });

        // 星
        ctx.fillStyle = "yellow";

        stars.forEach((star, index) => {

            if (!star.collected) {

                drawCollectibleStar(star.x - cameraX, star.y, index * 0.7);

            }

        });

        starParticles.forEach(p => {
            ctx.globalAlpha = Math.max(0, p.life / 42);
            ctx.fillStyle = p.life % 3 ? "#fff27a" : "#ffffff";
            ctx.fillRect(p.x - cameraX - 2, p.y - 2, 5, 5);
        });
        ctx.globalAlpha = 1;

        // 敵
enemies.forEach(enemy => {

    if (!enemy.alive) return;

    if (enemy.type === "bat") {
        const x = enemy.x - cameraX;
        const flap = Math.sin(enemy.phase * 2) * 7;

        ctx.fillStyle = "#7d35b2";
        ctx.beginPath();
        ctx.moveTo(x + 22, enemy.y + 12);
        ctx.lineTo(x - 2, enemy.y + 3 + flap);
        ctx.lineTo(x + 7, enemy.y + 25);
        ctx.lineTo(x + 22, enemy.y + 18);
        ctx.lineTo(x + 39, enemy.y + 25);
        ctx.lineTo(x + 48, enemy.y + 3 + flap);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#4b176e";
        ctx.beginPath();
        ctx.ellipse(x + 23, enemy.y + 16, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4d8d";
        ctx.fillRect(x + 17, enemy.y + 12, 4, 4);
        ctx.fillRect(x + 26, enemy.y + 12, 4, 4);
        return;
    }

    // スライム本体（赤は追跡タイプ）
    ctx.fillStyle = enemy.type === "chaser" ? "#e84b4b" : "#66BB6A";

    ctx.beginPath();

    ctx.arc(
        enemy.x - cameraX + 20,
        enemy.y + 20,
        20,
        Math.PI,
        0
    );

    ctx.fill();

    ctx.fillRect(
        enemy.x - cameraX,
        enemy.y + 20,
        40,
        20
    );

    // 目
    ctx.fillStyle = "black";

    ctx.fillRect(enemy.x - cameraX + 10, enemy.y + 15, 4, 4);
    ctx.fillRect(enemy.x - cameraX + 26, enemy.y + 15, 4, 4);

});

        // めぐみ（当たり判定は元の40x70のまま）
        if (playerSprite.complete && playerSprite.naturalWidth > 0) {
            const moving = keys["ArrowLeft"] || keys["ArrowRight"];
            const bob = moving && !player.jumping ? Math.sin(performance.now() * 0.022) * 3 : 0;
            const squash = landingSquash > 0 ? Math.sin((14 - landingSquash) / 14 * Math.PI) * 0.13 : 0;
            ctx.save();
            ctx.translate(player.x - cameraX + player.width / 2, player.y + player.height + bob);
            ctx.rotate(player.jumping ? Math.max(-0.16, Math.min(0.16, player.velocityY * 0.014)) : 0);
            ctx.scale(player.facing, 1);
            ctx.scale(1 + squash, 1 - squash);
            ctx.drawImage(playerSprite, -28, -73, 56, 73);
            ctx.restore();
        }

        // 星表示
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";

        ctx.fillText(
            "⭐ " + starCount + " / 5",
            20,
            40
        );

        if (introTimer > 0) {
            const alpha = Math.min(1, introTimer / 35, (230 - introTimer) / 35);
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = "rgba(12,7,30,.80)";
            ctx.fillRect(225, 190, 450, 92);
            ctx.strokeStyle = "#c979ef";
            ctx.lineWidth = 3;
            ctx.strokeRect(225, 190, 450, 92);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText("STAGE 2", 450, 222);
            ctx.font = "bold 30px sans-serif";
            ctx.fillText("魔王城への道", 450, 260);
            ctx.textAlign = "left";
            ctx.globalAlpha = 1;
        }

        if (messageTimer > 0) {

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(200, 180, 500, 100);

    ctx.fillStyle = "white";
    ctx.font = "36px Arial";

    ctx.fillText(
        message,
        250,
        240
    );

}

        if (bossTransitionTimer > 0) {
            const elapsed = 430 - bossTransitionTimer;
            const doorX = goal.x - cameraX + 30;
            const glowRadius = 35 + Math.min(115, elapsed * 1.15);
            const glow = ctx.createRadialGradient(doorX, 350, 8, doorX, 350, glowRadius);
            glow.addColorStop(0, "rgba(255,255,255,.95)");
            glow.addColorStop(.28, "rgba(255,74,196,.78)");
            glow.addColorStop(1, "rgba(116,26,170,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(doorX - glowRadius, 350 - glowRadius, glowRadius * 2, glowRadius * 2);

            const darkness = Math.max(0, Math.min(.96, (elapsed - 85) / 145));
            ctx.fillStyle = `rgba(3,1,10,${darkness})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (elapsed > 155) {
                const textAlpha = Math.min(1, (elapsed - 155) / 35);
                ctx.globalAlpha = textAlpha;
                ctx.textAlign = "center";
                ctx.fillStyle = "#f4d8ff";
                ctx.font = "bold 24px sans-serif";
                ctx.fillText("伝説のプレゼントは、この先に――", 450, 220);
                if (elapsed > 285) {
                    const battleAlpha = Math.min(1, (elapsed - 285) / 30);
                    ctx.globalAlpha = battleAlpha;
                    ctx.fillStyle = "#ff73c8";
                    ctx.shadowColor = "#d04cff";
                    ctx.shadowBlur = 18;
                    ctx.font = "bold 48px sans-serif";
                    ctx.fillText("BOSS BATTLE", 450, 290);
                    ctx.shadowBlur = 0;
                }
                ctx.textAlign = "left";
                ctx.globalAlpha = 1;
            }
        }

    }

    // 元の143.97Hz環境の操作感を、描画FPSに関係なく維持する
    const FIXED_STEP = 1000 / 144;
    let previousTime = 0;
    let accumulator = 0;

    function gameLoop(currentTime) {

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
        requestAnimationFrame(gameLoop);

    }

    requestAnimationFrame(gameLoop);

}
