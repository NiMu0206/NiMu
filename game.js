const startBtn = document.getElementById("start-btn");
const continueBtn = document.getElementById("continue-btn");

const titleScreen = document.getElementById("title-screen");
const openingScreen = document.getElementById("opening-screen");

// タイトル画面
if (startBtn) {

    startBtn.addEventListener("click", () => {

        titleScreen.classList.add("hidden");
        openingScreen.classList.remove("hidden");

    });

}

// オープニング画面
if (continueBtn) {

    continueBtn.addEventListener("click", () => {

        window.location.href = "game.html";

    });

}

const canvas = document.getElementById("gameCanvas");

if (canvas) {

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const playerSprite = new Image();
    playerSprite.src = "megumi-player.png";

    const clouds = [
        { x: 90, y: 70, scale: 1.0 },
        { x: 430, y: 125, scale: 0.72 },
        { x: 760, y: 55, scale: 1.15 },
        { x: 1080, y: 105, scale: 0.85 }
    ];

    const worldWidth = 5000;

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

    const gravity = 0.35;

    let keys = {};

    let starCount = 0;

   let stars = [

    { x: 400, y: 360, collected: false },

    // エリア1
    { x: 1140, y: 50, collected: false },

    // エリア2
    { x: 2200, y: 60, collected: false },

    // エリア3
    { x: 3350, y: 60, collected: false },

    // エリア4
    { x: 4300, y: 90, collected: false }

];

let platforms = [

    // エリア1
    { x: 900,  y: 340, width: 120, height: 20 },
    { x: 1080, y: 280, width: 120, height: 20 },

    // エリア2
    { x: 1800, y: 340, width: 100, height: 20 },
    { x: 1950, y: 250, width: 100, height: 20 },
    { x: 2100, y: 160, width: 100, height: 20 },

    // エリア3
    { x: 2800, y: 320, width: 100, height: 20 },
    { x: 2950, y: 240, width: 100, height: 20 },
    { x: 3100, y: 160, width: 100, height: 20 },

    // エリア4
    { x: 3800, y: 350, width: 100, height: 20 },
    { x: 3950, y: 260, width: 100, height: 20 },
    { x: 4100, y: 170, width: 100, height: 20 },
    { x: 4250, y: 120, width: 100, height: 20 }

];

let goal = {
    x: 4800,
    y: 290,
    visible: false
};

let stageCleared = false;
let introTimer = 230;
let goalRevealTimer = 0;
let cameraReturnTimer = 0;
let landingSquash = 0;
let starParticles = [];

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

// 地面に開いた落とし穴（ゲーム内座標）
const pits = [
    { x: 650, width: 150 },
    { x: 2470, width: 170 },
    { x: 3500, width: 170 }
];

function isOverPit() {
    const leftFoot = player.x + 8;
    const rightFoot = player.x + player.width - 8;
    return pits.some(pit => rightFoot > pit.x && leftFoot < pit.x + pit.width);
}

function restartAfterPit() {
    window.GameAudio?.play("damage");
    player.x = 100;
    player.y = 350;
    player.velocityY = 0;
    player.jumping = false;
    cameraX = 0;
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
            if (!player.jumping) {
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

    if (goalRevealTimer > 0) {
        goalRevealTimer--;
        const target = Math.max(0, Math.min(worldWidth - canvas.width, goal.x - canvas.width * 0.68));
        cameraX += (target - cameraX) * 0.055;
        if (goalRevealTimer === 0) cameraReturnTimer = 90;
        return;
    }

    // 左右移動
    if (keys["ArrowLeft"]) {
        player.x -= 3;
        player.facing = -1;
    }

    if (keys["ArrowRight"]) {
        player.x += 3;
        player.facing = 1;
    }

    // ワールド端
    if (player.x < 0) {
        player.x = 0;
    }

    if (player.x > worldWidth - player.width) {
        player.x = worldWidth - player.width;
    }

    // ジャンプ
    if (keys[" "] && !player.jumping) {
        player.velocityY = -13;
        player.jumping = true;
        window.GameAudio?.play("jump");
    }

    // 重力
    if (player.velocityY < 0) {

        // 上昇中
        player.velocityY += 0.35;

    } else {

        // 落下中
        player.velocityY += 0.20;

    }

    player.y += player.velocityY;

    // 地面
    if (player.y >= 350 && !isOverPit()) {
        if (player.velocityY > 3) landingSquash = 14;
        player.y = 350;
        player.velocityY = 0;
        player.jumping = false;
    }

    if (player.y > canvas.height + 100) {
        restartAfterPit();
    }

    // 足場判定
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

    // スター取得
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

    // 星5個で旗出現
if (starCount >= 5) {
    goal.visible = true;
}

// ゴール判定
   if (
    !stageCleared &&
    goal.visible &&
    player.x + player.width > goal.x &&
    player.x < goal.x + 40 &&
    player.y + player.height > goal.y
) {

    stageCleared = true;

    window.location.href = "stage1-clear.html";

}

    // カメラ
    const desiredCameraX = player.x - 300;
    if (cameraReturnTimer > 0) {
        cameraReturnTimer--;
        cameraX += (desiredCameraX - cameraX) * 0.075;
    } else {
        cameraX = desiredCameraX;
    }

    if (cameraX < 0) {
        cameraX = 0;
    }

    if (cameraX > worldWidth - canvas.width) {
        cameraX = worldWidth - canvas.width;
    }

}

    function drawStageOneBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, 410);
        sky.addColorStop(0, "#65c9f4");
        sky.addColorStop(0.62, "#b8ebf2");
        sky.addColorStop(1, "#fff0bd");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, canvas.width, 410);

        // 朝日の光
        ctx.fillStyle = "#fff3a6";
        ctx.shadowColor = "#fff2a1";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(760, 78, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ゆっくり流れて見える雲
        const cloudShift = (cameraX * 0.045) % 1200;
        ctx.fillStyle = "rgba(255,255,255,.82)";
        clouds.forEach(cloud => {
            let x = cloud.x - cloudShift;
            if (x < -160) x += 1200;
            const s = cloud.scale;
            ctx.beginPath();
            ctx.arc(x, cloud.y, 29 * s, 0, Math.PI * 2);
            ctx.arc(x + 36 * s, cloud.y - 12 * s, 38 * s, 0, Math.PI * 2);
            ctx.arc(x + 78 * s, cloud.y, 30 * s, 0, Math.PI * 2);
            ctx.fill();
        });

        // 遠くの青い山
        const farShift = (cameraX * 0.08) % 520;
        ctx.fillStyle = "#74abc0";
        for (let x = -560 - farShift; x < canvas.width + 560; x += 310) {
            ctx.beginPath();
            ctx.moveTo(x, 410);
            ctx.lineTo(x + 135, 215);
            ctx.lineTo(x + 310, 410);
            ctx.fill();
            ctx.fillStyle = "#a5d1d1";
            ctx.beginPath();
            ctx.moveTo(x + 92, 277);
            ctx.lineTo(x + 135, 215);
            ctx.lineTo(x + 180, 280);
            ctx.lineTo(x + 145, 268);
            ctx.lineTo(x + 126, 286);
            ctx.fill();
            ctx.fillStyle = "#74abc0";
        }

        // 手前の丘と森
        const hillShift = (cameraX * 0.15) % 650;
        ctx.fillStyle = "#4c9364";
        for (let x = -700 - hillShift; x < canvas.width + 700; x += 420) {
            ctx.beginPath();
            ctx.ellipse(x + 210, 410, 255, 108, 0, Math.PI, Math.PI * 2);
            ctx.fill();
        }

        const treeShift = (cameraX * 0.23) % 180;
        for (let x = -200 - treeShift; x < canvas.width + 200; x += 90) {
            const h = 48 + ((Math.floor((x + treeShift) / 90) * 17) % 34);
            ctx.fillStyle = "#326d4b";
            ctx.fillRect(x + 40, 410 - h, 9, h);
            ctx.beginPath();
            ctx.arc(x + 44, 410 - h, 25, 0, Math.PI * 2);
            ctx.arc(x + 25, 392 - h, 20, 0, Math.PI * 2);
            ctx.arc(x + 63, 392 - h, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function draw() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawStageOneBackground();

        // 地面
        ctx.fillStyle = "#6cad54";
        ctx.fillRect(0, 410, canvas.width, 90);
        ctx.fillStyle = "#3f873f";
        ctx.fillRect(0, 410, canvas.width, 8);

        // 小さな草と花。ワールドに固定してあるので自然にスクロールする
        for (let worldX = 80; worldX < worldWidth; worldX += 137) {
            const x = worldX - cameraX;
            if (x < -15 || x > canvas.width + 15) continue;
            ctx.strokeStyle = "#2e7438";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 410); ctx.lineTo(x - 4, 398);
            ctx.moveTo(x, 410); ctx.lineTo(x + 5, 395);
            ctx.stroke();
            if (worldX % 274 === 80) {
                ctx.fillStyle = "#fff4a8";
                ctx.beginPath(); ctx.arc(x + 5, 394, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 落とし穴は地面の上に描き、ゲーム画面の外へ落下できるようにする
        pits.forEach(pit => {
            const screenX = pit.x - cameraX;
            ctx.fillStyle = "#17121f";
            ctx.fillRect(screenX, 410, pit.width, 90);
            ctx.fillStyle = "#38253e";
            ctx.fillRect(screenX, 410, pit.width, 7);
        });

        // 足場

platforms.forEach(platform => {
    ctx.fillStyle = "#81502d";
    ctx.fillRect(
        platform.x - cameraX,
        platform.y,
        platform.width,
        platform.height
    );
    ctx.fillStyle = "#65a94e";
    ctx.fillRect(platform.x - cameraX, platform.y, platform.width, 6);

});

       // 星を集めると現れる「伝説の道」への魔法の門
if (goal.visible) {
    const gateX = goal.x - cameraX + 20;
    const gateY = 303;
    const pulse = Math.sin(performance.now() * 0.004) * 5;
    const portal = ctx.createRadialGradient(gateX, gateY, 8, gateX, gateY, 58 + pulse);
    portal.addColorStop(0, "rgba(255,255,220,.98)");
    portal.addColorStop(0.35, "rgba(255,112,205,.88)");
    portal.addColorStop(0.72, "rgba(118,72,230,.72)");
    portal.addColorStop(1, "rgba(90,52,170,0)");
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.ellipse(gateX, gateY + 18, 50 + pulse, 92, 0, 0, Math.PI * 2);
    ctx.fill();

    // 石造りのアーチ
    ctx.fillStyle = "#6a5279";
    ctx.fillRect(gateX - 57, gateY - 10, 18, 117);
    ctx.fillRect(gateX + 39, gateY - 10, 18, 117);
    ctx.strokeStyle = "#a98fc2";
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(gateX, gateY - 5, 48, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = "#ddc777";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(gateX, gateY - 5, 48, Math.PI, 0);
    ctx.stroke();

    // 門の周囲を回る5つの星
    ctx.fillStyle = "#fff18a";
    for (let i = 0; i < 5; i++) {
        const angle = performance.now() * 0.0015 + i * Math.PI * 2 / 5;
        const sx = gateX + Math.cos(angle) * 68;
        const sy = gateY + 12 + Math.sin(angle) * 98;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.beginPath();
        for (let point = 0; point < 10; point++) {
            const radius = point % 2 === 0 ? 7 : 3;
            const a = -Math.PI / 2 + point * Math.PI / 5;
            const px = Math.cos(a) * radius;
            const py = Math.sin(a) * radius;
            if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

        // スター
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

        // スター表示
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
            ctx.fillStyle = "rgba(20,47,37,.76)";
            ctx.fillRect(245, 190, 410, 92);
            ctx.strokeStyle = "#fff1a6";
            ctx.lineWidth = 3;
            ctx.strokeRect(245, 190, 410, 92);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText("STAGE 1", 450, 222);
            ctx.font = "bold 30px sans-serif";
            ctx.fillText("伝説の森", 450, 260);
            ctx.textAlign = "left";
            ctx.globalAlpha = 1;
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
