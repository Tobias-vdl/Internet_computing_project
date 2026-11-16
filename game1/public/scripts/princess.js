// This function defines the Princess module: the captive princess
// in a hanging cage behind the dragon.
// - `ctx` - A canvas context for drawing
const Princess = function(ctx) {
    const { x, y } = { x: 9 * GameMap.TILE, y: 4 * GameMap.TILE };

    const rows = PixelArt.mirrorRows([
        "...y.y",
        "...yyy",
        "..hhhh",
        ".hhsss",
        ".hhsks",
        ".hhsss",
        "..hhss",
        "...ppp",
        "..pppp",
        "..pPpp",
        ".ppppp",
        ".ppppp",
        "pppppp"
    ]);
    const palette = {
        y: "#f2c14e", h: "#7a4320", s: "#f1c9a5", k: "#2b1a12",
        p: "#e86fa8", P: "#f6a8cb"
    };

    // This is true when the princess has been freed (the game is won).
    let freed = false;

    const setFreed = function(value) {
        freed = value;
    };

    // This function draws the cage, the princess and a "HELP!" bubble.
    const draw = function(time) {
        const top = y - 14, bottom = y + 36;

        // Chain up to the ceiling
        ctx.fillStyle = "#3a3d48";
        for (let cy = y - 40; cy < top; cy += 6) ctx.fillRect(x + 19, cy, 2, 4);

        // The princess
        const sway = Math.sin(time / 600) > 0.6 ? -1 : 0;
        PixelArt.draw(ctx, rows, palette, x + 2 + sway, top + 8, 3);

        // The cage: frame, domed top and bars (the bars are gone when she is freed)
        ctx.fillStyle = "#1c1d24";
        ctx.fillRect(x + 1, bottom - 4, 38, 6);
        ctx.fillRect(x + 1, top, 38, 4);
        ctx.fillRect(x + 6, top - 4, 28, 4);
        if (!freed) {
            ctx.fillStyle = "#4a4d5c";
            for (let bx = x + 2; bx <= x + 36; bx += 6) ctx.fillRect(bx, top + 2, 2, bottom - top - 4);
            ctx.fillStyle = "#f2c14e";
            ctx.fillRect(x + 16, bottom - 14, 8, 7);
            ctx.fillStyle = "#1c1d24";
            ctx.fillRect(x + 19, bottom - 12, 2, 3);
        }
        ctx.fillStyle = "#6d7184";
        ctx.fillRect(x + 1, top, 38, 1);

        // A speech bubble: "HELP!" now and then, a heart when she is freed
        const phase = (time % 7000) / 7000;
        if (freed || (phase > 0.15 && phase < 0.45)) {
            const bx = x + 20, by = top - 18;
            ctx.fillStyle = "#f4efe6";
            ctx.fillRect(bx - 26, by - 9, 52, 18);
            ctx.fillRect(bx - 4, by + 9, 6, 4);
            ctx.font = "8px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#b3261e";
            ctx.fillText(freed ? "♥" : "HELP!", bx, by + 1);
        }
    };

    return { setFreed, draw };
};
