// This function defines the Princess module: the captive princess,
// locked in a cage hanging on the wall behind the dragon.
// - `ctx` - A canvas context for drawing
// - `x` - The x position of the centre of the cage
// - `y` - The y position of the bottom of the cage
const Princess = function(ctx, x, y) {

    // Pixel art of the princess: every character is one pixel
    // ('.' is transparent). Only the left half is written; it is mirrored.
    const half = [
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
    ];
    const rows = half.map(row => row + row.split("").reverse().join(""));
    const palette = {
        y: "#f2c14e",   // crown
        h: "#7a4320",   // hair
        s: "#f1c9a5",   // skin
        k: "#2b1a12",   // eyes
        p: "#e86fa8",   // dress
        P: "#f6a8cb"    // dress highlight
    };
    const SCALE = 2;
    const WIDTH = 28;
    const HEIGHT = 36;

    // This function draws the pixel art at (px, py).
    const drawPixels = function(px, py) {
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const ch = rows[r][c];
                if (ch == ".") continue;
                ctx.fillStyle = palette[ch];
                ctx.fillRect(px + c * SCALE, py + r * SCALE, SCALE, SCALE);
            }
        }
    };

    // This function draws the cage, the princess and a "HELP!" bubble now and then.
    // - `time` - The timestamp when this function is called
    const draw = function(time) {
        const left = x - WIDTH / 2;
        const top = y - HEIGHT;

        ctx.save();

        // Chain holding the cage
        ctx.fillStyle = "#3a3d48";
        for (let cy = 0; cy < top - 3; cy += 5) ctx.fillRect(x - 1, cy, 2, 3);

        // Dark back of the cage
        ctx.fillStyle = "rgba(10, 8, 8, 0.75)";
        ctx.fillRect(left, top, WIDTH, HEIGHT);

        // The princess, swaying a little
        const sway = Math.sin(time / 600) > 0.6 ? -1 : 0;
        drawPixels(x - 12 + sway, top + 6);

        // The cage: frame, domed top, bars and a padlock
        ctx.fillStyle = "#1c1d24";
        ctx.fillRect(left, y - 3, WIDTH, 4);
        ctx.fillRect(left, top, WIDTH, 3);
        ctx.fillRect(left + 4, top - 3, WIDTH - 8, 3);
        ctx.fillStyle = "#5a5e70";
        for (let bx = left + 1; bx <= left + WIDTH - 2; bx += 5) ctx.fillRect(bx, top + 2, 2, HEIGHT - 4);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(x - 3, y - 12, 6, 5);

        // A "HELP!" speech bubble to the right of the cage
        const phase = (time % 6000) / 6000;
        if (phase > 0.1 && phase < 0.45) {
            const bx = x + WIDTH / 2 + 8, by = top - 2;
            ctx.fillStyle = "#f4efe6";
            ctx.fillRect(bx, by, 44, 16);
            ctx.fillRect(bx - 4, by + 10, 5, 4);
            ctx.fillStyle = "#b3261e";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("HELP!", bx + 22, by + 9);
        }

        ctx.restore();
    };

    // The methods are returned as an object here.
    return {
        draw: draw
    };
};
