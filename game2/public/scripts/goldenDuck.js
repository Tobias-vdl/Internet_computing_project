// This function defines the GoldenDuck module: the dragon's most precious
// treasure, a golden rubber duck on a pedestal on the wall behind the dragon.
// - `ctx` - A canvas context for drawing
// - `x` - The x position of the centre of the pedestal
// - `y` - The y position of the bottom of the pedestal
const GoldenDuck = function(ctx, x, y) {

    // This function draws the duck on its pedestal with a golden glow and sparkles.
    // - `time` - The timestamp when this function is called
    const draw = function(time) {
        ctx.save();

        // Golden glow behind the duck
        const pulse = 0.5 + 0.5 * Math.sin(time / 400);
        const glow = ctx.createRadialGradient(x, y - 18, 2, x, y - 18, 30);
        glow.addColorStop(0, "rgba(255, 210, 90, " + (0.35 + 0.25 * pulse) + ")");
        glow.addColorStop(1, "rgba(255, 210, 90, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 30, y - 48, 60, 60);

        // The pedestal
        ctx.fillStyle = "#3b3e4b";
        ctx.fillRect(x - 15, y - 8, 30, 8);
        ctx.fillStyle = "#6c7186";
        ctx.fillRect(x - 13, y - 11, 26, 4);
        ctx.fillStyle = "#8b90a5";
        ctx.fillRect(x - 13, y - 11, 26, 1);

        // The duck, gently bobbing
        const bob = Math.sin(time / 500) > 0 ? 0 : 1;
        GoldenDuck.drawShape(ctx, x - 16, y - 37 + bob, 2);

        // Two sparkles that twinkle in turn
        const sparkles = [[x + 13, y - 34], [x - 12, y - 22]];
        sparkles.forEach(([sx, sy], i) => {
            const s = Math.max(0, Math.sin(time / 300 + i * Math.PI));
            if (s < 0.3) return;
            const len = Math.round(2 + 3 * s);
            ctx.fillStyle = "#fff6c8";
            ctx.fillRect(sx - len, sy, len * 2 + 1, 1);
            ctx.fillRect(sx, sy - len, 1, len * 2 + 1);
        });

        ctx.restore();
    };

    // The methods are returned as an object here.
    return {
        draw: draw
    };
};

// Pixel art of the golden rubber duck (facing left): every character is one
// pixel and '.' is transparent. It is 16 x 13 pixels.
GoldenDuck.rows = [
    "....kkkk........",
    "...kYYYYk.......",
    "..kYYwYYYk......",
    "..kYeYYYYk......",
    "kkkYYYYYYk......",
    "kOOkYYYYYk...kk.",
    ".kOOkYYYYkk.kYYk",
    "..kkYYYYYYkkYYYk",
    "..kYYYYYYYYYYYYk",
    "..kYwYYYYYYYYYyk",
    "..kYYYYYYYYYYyyk",
    "...kyYYYYYYyyyk.",
    "....kkkkkkkkkk.."
];
GoldenDuck.palette = {
    k: "#3a2a0a",   // outline
    Y: "#f2c14e",   // gold
    y: "#c9901e",   // gold shadow
    O: "#ff8a1a",   // beak
    w: "#fff6c8",   // shine
    e: "#140e0a"    // eye
};

// This function draws the duck at (x, y) with the given scale.
// It is also used by the victory bath on the game over page.
// - `flip` - true to make the duck face right
GoldenDuck.drawShape = function(ctx, x, y, scale, flip) {
    const rows = GoldenDuck.rows;
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const ch = rows[r][c];
            if (ch == ".") continue;
            const col = flip ? rows[r].length - 1 - c : c;
            ctx.fillStyle = GoldenDuck.palette[ch];
            ctx.fillRect(x + col * scale, y + r * scale, scale, scale);
        }
    }
};
