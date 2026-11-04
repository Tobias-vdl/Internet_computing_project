// This function defines the Dragon module.
// The dragon covers 3x3 tiles in the centre of the dungeon.
// - `ctx` - A canvas context for drawing
const Dragon = function(ctx) {
    const TILE = GameMap.TILE;

    // The area of the dragon in pixels (tiles 8-10, 5-7)
    const area = { x: 8 * TILE, y: 5 * TILE, size: 3 * TILE };

    // Pixel art of the dragon (the left half is mirrored)
    //   k outline, r/R/d body, y belly, w teeth/claws, h horns,
    //   g/G wings, e eyes, o fire in the mouth
    const rows = PixelArt.mirrorRows([
        "............",
        "....hk......",
        "G...hhk.....",
        "GG...hhkkkkk",
        "GgG...krrrrr",
        "GggG..krRRrr",
        "GgggG.kreerr",
        "GggggGkrkkrr",
        "GgggggGkrrrr",
        "GgggggGkkwkw",
        "GgggggGrkooo",
        ".GgggGkrrrkk",
        "..GggGkrrryy",
        "...GGkrrrryy",
        "....krRrrryy",
        "...krRrrrryy",
        "..krrrrrrryy",
        "..krrdrrrryy",
        "..krrdrrrrry",
        "..kddkrrrrrr",
        ".kddkkkrrrrr",
        ".kwkwkdkrrrr",
        "..kk..kkkkkk",
        "............"
    ]);
    const isWing = ch => ch === "G" || ch === "g";

    // This is the time until the dragon is drawn with a white 'hit' flash.
    let flashUntil = 0;

    // This function makes the dragon flash white when it is hit.
    const hit = function(time) {
        flashUntil = time + 120;
    };

    // This function returns true if the tile is part of the dragon.
    const containsTile = function(c, r) {
        return GameMap.get(c, r) === "D";
    };

    // This function returns the position of the dragon's mouth (where fireballs start).
    const getMouth = function() {
        return { x: area.x + area.size / 2, y: area.y + 52 };
    };

    // This function draws the dragon with breathing, wing flapping and glowing eyes.
    const draw = function(time) {
        const scale = 5;
        const bob = Math.round(Math.sin(time / 400) * 1.5);
        const flap = Math.sin(time / 220) > 0 ? 0 : 1;
        const glow = 0.5 + 0.5 * Math.sin(time / 150);
        const palette = {
            k: "#1a0a0a", r: "#b3261e", R: "#e04a3a", d: "#6e1410",
            y: "#f2c14e", w: "#f4efe6", h: "#e8dcc0",
            g: "#7a1e3a", G: "#4a0f24",
            e: "rgb(255," + Math.round(200 + 40 * glow) + ",60)",
            o: "rgb(255," + Math.round(110 + 80 * glow) + ",30)"
        };

        // Shadow under the dragon
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(area.x + 60, area.y + 112, 46, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        PixelArt.draw(ctx, rows, palette, area.x, area.y + bob + flap * scale, scale, isWing);
        PixelArt.draw(ctx, rows, palette, area.x, area.y + bob, scale, ch => !isWing(ch));

        // White flash when hit
        if (time < flashUntil) {
            const white = {};
            Object.keys(palette).forEach(k => white[k] = "#ffffff");
            ctx.save();
            ctx.globalAlpha = 0.55;
            PixelArt.draw(ctx, rows, white, area.x, area.y + bob, scale);
            ctx.restore();
        }
    };

    return { hit, containsTile, getMouth, draw };
};
