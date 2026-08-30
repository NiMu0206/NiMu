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

    const worldWidth = 5000;

    let cameraX = 0;

    let player = {
        x: 100,
        y: 350,
        width: 40,
        height: 70,
        velocityY: 0,
        jumping: false
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
            }
        }
    });

   function update() {

    // 左右移動
    if (keys["ArrowLeft"]) {
        player.x -= 3;
    }

    if (keys["ArrowRight"]) {
        player.x += 3;
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
    if (player.y >= 350) {
        player.y = 350;
        player.velocityY = 0;
        player.jumping = false;
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
    cameraX = player.x - 300;

    if (cameraX < 0) {
        cameraX = 0;
    }

    if (cameraX > worldWidth - canvas.width) {
        cameraX = worldWidth - canvas.width;
    }

}

    function draw() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 空
        ctx.fillStyle = "skyblue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 地面
        ctx.fillStyle = "#5fa85f";
        ctx.fillRect(0, 410, canvas.width, 90);

        // 足場

ctx.fillStyle = "#8B5A2B";

platforms.forEach(platform => {

    ctx.fillRect(
        platform.x - cameraX,
        platform.y,
        platform.width,
        platform.height
    );

});

       // ゴール旗
if (goal.visible) {

    // 棒
    ctx.fillStyle = "gray";
    ctx.fillRect(
        goal.x - cameraX,
        goal.y - 100,
        6,
        120
    );

    // 旗
    ctx.fillStyle = "red";
    ctx.fillRect(
        goal.x - cameraX + 6,
        goal.y - 100,
        40,
        25
    );

}

        // スター
        ctx.fillStyle = "yellow";

        stars.forEach(star => {

            if (!star.collected) {

                ctx.beginPath();
                ctx.arc(
                    star.x - cameraX,
                    star.y,
                    10,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

            }

        });

        // 帽子
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(player.x - cameraX + 5, player.y, 30, 12);

        // 顔
        ctx.fillStyle = "#FFDAB9";
        ctx.fillRect(player.x - cameraX + 8, player.y + 12, 24, 18);

        // 茶髪
        ctx.fillStyle = "#5C4033";
        ctx.fillRect(player.x - cameraX + 8, player.y + 12, 24, 6);

        // 赤マント
        ctx.fillStyle = "#C62828";
        ctx.fillRect(player.x - cameraX + 10, player.y + 30, 20, 30);

        // 足
        ctx.fillStyle = "#333333";
        ctx.fillRect(player.x - cameraX + 10, player.y + 60, 6, 10);
        ctx.fillRect(player.x - cameraX + 24, player.y + 60, 6, 10);

        // スター表示
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText(
            "⭐ " + starCount + " / 5",
            20,
            40
        );

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
