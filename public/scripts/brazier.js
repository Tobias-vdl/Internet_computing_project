// This function defines the Brazier module: a fire bowl that blocks
// movement and arrows next to the dragon.
// - `ctx` - A canvas context for drawing
// - `c`, `r` - The tile of the brazier
const Brazier = function(ctx, c, r) {
    const x = c * GameMap.TILE, y = r * GameMap.TILE;

    // This function returns the tile, e.g. for the lighting.
    const getTile = function() {
        return { c, r };
    };

    // This function draws the brazier with animated flames.
    const draw = function(time) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 34, 15, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2b2c34";
        ctx.fillRect(x + 16, y + 22, 8, 12);
        ctx.fillRect(x + 10, y + 32, 20, 4);
        ctx.fillStyle = "#4a4d5c";
        ctx.fillRect(x + 6, y + 14, 28, 10);
        ctx.fillStyle = "#6d7184";
        ctx.fillRect(x + 6, y + 14, 28, 2);
        for (let k = 0; k < 3; k++) {
            const h = 10 + 6 * Math.abs(Math.sin(time / 85 + k * 2.1 + c));
            const fx = x + 10 + k * 7;
            ctx.fillStyle = "#e0451a";
            ctx.fillRect(fx, y + 14 - h, 7, h);
            ctx.fillStyle = "#ffb43a";
            ctx.fillRect(fx + 2, y + 16 - h * 0.7, 3, h * 0.6);
        }
    };

    return { getTile, draw };
};
