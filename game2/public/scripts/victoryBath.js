// This module draws the animation on the game over page:
// the winner relaxing in a bathtub with the golden rubber duck.
// If nobody won, the duck is shown alone on its pedestal.
const VictoryBath = (function() {
    const WIDTH = 320;
    const HEIGHT = 200;
    const RIM_Y = 112;          // Top of the bathtub
    const TUB_LEFT = 70;
    const TUB_RIGHT = 250;

    // The sprite sheets of the two players (same layout as in the game)
    const sheets = { blue: new Image(), red: new Image() };
    sheets.blue.src = "resources/archer_blue.png";
    sheets.red.src = "resources/archer_red.png";

    let ctx = null;
    let frameId = null;
    let winnerColour = null;    // "blue", "red" or null for no winner

    // Bubbles rising from the water: { x, y, r, speed }
    let bubbles = [];

    const drawBackground = function(time) {
        // Stone wall
        ctx.fillStyle = "#1c1714";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        for (let y = 0; y < 150; y += 16) {
            ctx.fillRect(0, y, WIDTH, 2);
            for (let x = ((y / 16) % 2) * 20; x < WIDTH; x += 40) ctx.fillRect(x, y, 2, 16);
        }
        // Floor
        ctx.fillStyle = "#2a211d";
        ctx.fillRect(0, 150, WIDTH, HEIGHT - 150);

        // Warm torch light
        const flick = 0.9 + 0.1 * Math.sin(time / 90);
        const light = ctx.createRadialGradient(WIDTH / 2, 90, 10, WIDTH / 2, 90, 170 * flick);
        light.addColorStop(0, "rgba(255, 190, 90, 0.28)");
        light.addColorStop(1, "rgba(255, 150, 60, 0)");
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    };

    // The winner sitting in the water: only the head and shoulders are visible
    const drawWinner = function(time) {
        const sheet = sheets[winnerColour];
        if (!sheet.complete || sheet.naturalHeight == 0) return;

        // Use the idling frames (row 0) of the sprite sheet: breathing and blinking
        const frame = Math.floor(time / 600) % 3;
        const scale = 4;
        const bob = Math.round(Math.sin(time / 700) * 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, frame * 24, 0, 24, 16,
            WIDTH / 2 - 12 * scale - 10, RIM_Y - 58 + bob, 24 * scale, 16 * scale);
    };

    const drawWater = function(time) {
        ctx.fillStyle = "#7fc4e8";
        ctx.fillRect(TUB_LEFT + 6, RIM_Y - 4, TUB_RIGHT - TUB_LEFT - 12, 8);
        ctx.fillStyle = "#b8e4f7";
        for (let x = TUB_LEFT + 10; x < TUB_RIGHT - 10; x += 16) {
            const wave = Math.round(Math.sin(time / 300 + x / 12));
            ctx.fillRect(x, RIM_Y - 4 + wave, 8, 2);
        }
    };

    const drawTub = function() {
        // Gold claw feet
        ctx.fillStyle = "#c9901e";
        ctx.fillRect(TUB_LEFT + 14, 164, 12, 14);
        ctx.fillRect(TUB_RIGHT - 26, 164, 12, 14);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(TUB_LEFT + 12, 174, 16, 4);
        ctx.fillRect(TUB_RIGHT - 28, 174, 16, 4);

        // The enamel tub with a rounded bottom
        ctx.fillStyle = "#f4efe6";
        ctx.beginPath();
        ctx.moveTo(TUB_LEFT, RIM_Y);
        ctx.lineTo(TUB_RIGHT, RIM_Y);
        ctx.quadraticCurveTo(TUB_RIGHT - 4, 168, TUB_RIGHT - 40, 168);
        ctx.lineTo(TUB_LEFT + 40, 168);
        ctx.quadraticCurveTo(TUB_LEFT + 4, 168, TUB_LEFT, RIM_Y);
        ctx.fill();

        // Shading and the rim
        ctx.fillStyle = "#d8d0c2";
        ctx.fillRect(TUB_LEFT + 20, 156, TUB_RIGHT - TUB_LEFT - 40, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(TUB_LEFT - 4, RIM_Y - 2, TUB_RIGHT - TUB_LEFT + 8, 6);
        ctx.fillStyle = "#cfc8bb";
        ctx.fillRect(TUB_LEFT - 4, RIM_Y + 4, TUB_RIGHT - TUB_LEFT + 8, 2);
    };

    // Foam on the rim and bubbles rising from it
    const drawBubbles = function(time) {
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 9; i++) {
            const x = TUB_LEFT + 4 + i * 21;
            const r = 5 + ((i * 7) % 4) + Math.sin(time / 400 + i) * 1.2;
            ctx.beginPath();
            ctx.arc(x, RIM_Y - 2, r, 0, Math.PI * 2);
            ctx.fill();
        }

        if (Math.random() < 0.08) {
            bubbles.push({
                x: TUB_LEFT + 20 + Math.random() * (TUB_RIGHT - TUB_LEFT - 40),
                y: RIM_Y - 6, r: 2 + Math.random() * 3, speed: 0.3 + Math.random() * 0.4
            });
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        bubbles.forEach(b => {
            b.y -= b.speed;
            b.x += Math.sin(b.y / 8) * 0.3;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
        });
        bubbles = bubbles.filter(b => b.y > 10);
    };

    // The duck alone on its pedestal (when nobody won)
    const drawLonelyDuck = function(time) {
        const x = WIDTH / 2, y = 150;
        ctx.fillStyle = "#3b3e4b";
        ctx.fillRect(x - 30, y - 30, 60, 30);
        ctx.fillStyle = "#6c7186";
        ctx.fillRect(x - 34, y - 36, 68, 8);
        const glow = ctx.createRadialGradient(x, y - 60, 4, x, y - 60, 60);
        glow.addColorStop(0, "rgba(255, 210, 90, 0.35)");
        glow.addColorStop(1, "rgba(255, 210, 90, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 60, y - 120, 120, 120);
        const bob = Math.sin(time / 500) > 0 ? 0 : 2;
        GoldenDuck.drawShape(ctx, x - 32, y - 88 + bob, 4);
    };

    const doFrame = function(time) {
        drawBackground(time);
        if (winnerColour) {
            drawWinner(time);
            drawWater(time);
            // The duck floats in the water next to the winner
            const bob = Math.round(Math.sin(time / 450) * 2);
            GoldenDuck.drawShape(ctx, WIDTH / 2 + 26, RIM_Y - 38 + bob, 3, false);
            drawTub();
            drawBubbles(time);
        } else {
            drawLonelyDuck(time);
        }
        frameId = requestAnimationFrame(doFrame);
    };

    // This function starts the animation.
    // - `colour` - "blue" or "red" for the winner, or null if nobody won
    const start = function(colour) {
        stop();
        ctx = $("#victory-canvas").get(0).getContext("2d");
        winnerColour = colour;
        bubbles = [];
        $("#victory-canvas").show();
        frameId = requestAnimationFrame(doFrame);
    };

    // This function stops the animation and hides it.
    const stop = function() {
        if (frameId != null) cancelAnimationFrame(frameId);
        frameId = null;
        $("#victory-canvas").hide();
    };

    return { start, stop };
})();
