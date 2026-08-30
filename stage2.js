const canvas = document.getElementById("gameCanvas");

if (canvas) {

    const ctx = canvas.getContext("2d");

    const worldWidth = 6000;

    let cameraX = 0;

    let player = {
        x: 100,
        y: 350,
        width: 40,
        height: 70,
        velocityY: 0,
        jumping: false
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
        maxX: 1300
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
        maxX: 2400
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
        maxX: 3800
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
    velocityY: 0
}

];

let message = "";
let messageTimer = 0;

let isDead = false;

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
            }
        }
    });

    function update() {

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

    if (keys["ArrowLeft"]) player.x -= 3;
        if (keys["ArrowRight"]) player.x += 3;

        if (player.x < 0) player.x = 0;

        if (player.x > worldWidth - player.width) {
            player.x = worldWidth - player.width;
        }

        if (keys[" "] && !player.jumping) {
            player.velocityY = -13;
            player.jumping = true;
        }

        if (player.velocityY < 0) {
            player.velocityY += 0.35;
        } else {
            player.velocityY += 0.20;
        }

        player.y += player.velocityY;

        if (player.y >= 350) {
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

// スライム移動
enemies.forEach(enemy => {

    if (!enemy.alive) return;

    // 左右移動
    enemy.x += enemy.speed * enemy.direction;

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
    window.location.href = "boss.html";
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

            // 踏んだ反動で少し跳ねる
            player.velocityY = -8;

            

        }

        // 横から当たった
        else {

            message = "💀 スライムにやられた！";
            messageTimer = 60;

            isDead = true;

        }

    }

});

        cameraX = player.x - 300;

        if (cameraX < 0) cameraX = 0;

        if (cameraX > worldWidth - canvas.width) {
            cameraX = worldWidth - canvas.width;
        }

        if (messageTimer > 0) {
    messageTimer--;
}

    }

    function draw() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 夜空
        ctx.fillStyle = "#2C2C54";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 月
ctx.fillStyle = "#F5F5DC";

ctx.beginPath();

ctx.arc(
    750,
    80,
    50,
    0,
    Math.PI * 2
);

ctx.fill();

// 背景の星
ctx.fillStyle = "white";

ctx.fillRect(100, 50, 3, 3);
ctx.fillRect(200, 120, 3, 3);
ctx.fillRect(350, 80, 3, 3);
ctx.fillRect(500, 40, 3, 3);
ctx.fillRect(650, 100, 3, 3);
ctx.fillRect(820, 150, 3, 3);

// 魔王城（背景）
ctx.fillStyle = "#222";

ctx.fillRect(
    5400 - cameraX,
    150,
    250,
    260
);

// 左塔
ctx.fillRect(
    5350 - cameraX,
    100,
    50,
    310
);

// 右塔
ctx.fillRect(
    5650 - cameraX,
    100,
    50,
    310
);

// 左塔屋根
ctx.beginPath();

ctx.moveTo(5350 - cameraX, 100);
ctx.lineTo(5375 - cameraX, 50);
ctx.lineTo(5400 - cameraX, 100);

ctx.fill();

// 右塔屋根
ctx.beginPath();

ctx.moveTo(5650 - cameraX, 100);
ctx.lineTo(5675 - cameraX, 50);
ctx.lineTo(5700 - cameraX, 100);

ctx.fill();

// 魔王城の扉
ctx.fillStyle = goal.visible ? "#8B0000" : "#111";

ctx.fillRect(
    goal.x - cameraX,
    goal.y,
    60,
    80
);



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

        // スライム
enemies.forEach(enemy => {

    if (!enemy.alive) return;

    // 本体
    ctx.fillStyle = "#66BB6A";

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

        // プレイヤー
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(player.x - cameraX + 5, player.y, 30, 12);

        ctx.fillStyle = "#FFDAB9";
        ctx.fillRect(player.x - cameraX + 8, player.y + 12, 24, 18);

        ctx.fillStyle = "#C62828";
        ctx.fillRect(player.x - cameraX + 10, player.y + 30, 20, 30);

        ctx.fillStyle = "#333";
        ctx.fillRect(player.x - cameraX + 10, player.y + 60, 6, 10);
        ctx.fillRect(player.x - cameraX + 24, player.y + 60, 6, 10);

        // 星表示
        ctx.fillStyle = "white";
        ctx.font = "24px Arial";

        ctx.fillText(
            "⭐ " + starCount + " / 5",
            20,
            40
        );

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
