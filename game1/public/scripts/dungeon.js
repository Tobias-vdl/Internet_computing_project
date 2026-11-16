// This module draws the dungeon itself: floor, walls, pillars, arrow pedestals,
// spawn sigils, glowing lava cracks, torches, light and the dark vignette.
// All positions are map coordinates (the HUD offset is handled by the caller).
const Dungeon = (function() {
    const { TILE, COLS, ROWS } = GameMap;
    const hash = PixelArt.hash, rgb = PixelArt.rgb;

    // The static part is drawn once onto a hidden canvas
    const bg = document.createElement("canvas");
    bg.width = COLS * TILE;
    bg.height = ROWS * TILE;
    const b = bg.getContext("2d");

    const drawFloorTile = function(c, r) {
        const x = c * TILE, y = r * TILE;
        b.fillStyle = rgb([44, 48, 60], 0.85 + hash(c, r, 1) * 0.25);
        b.fillRect(x, y, TILE, TILE);

        // Stone slabs: each tile is split in two
        b.fillStyle = "rgba(0,0,0,0.35)";
        b.fillRect(x + TILE - 2, y, 2, TILE);
        b.fillRect(x, y + TILE - 2, TILE, 2);
        if (hash(c, r, 2) > 0.5) b.fillRect(x, y + 18, TILE, 2);
        else b.fillRect(x + 18, y, 2, TILE);

        // Small specks for texture
        for (let i = 0; i < 4; i++) {
            const px = x + Math.floor(hash(c, r, 10 + i) * 9) * 4;
            const py = y + Math.floor(hash(c, r, 20 + i) * 9) * 4;
            b.fillStyle = hash(c, r, 30 + i) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.18)";
            b.fillRect(px, py, 4, 4);
        }
        // A crack now and then
        if (hash(c, r, 3) > 0.82) {
            b.fillStyle = "rgba(0,0,0,0.45)";
            let cx = x + 8 + Math.floor(hash(c, r, 4) * 4) * 4, cy = y + 6;
            for (let i = 0; i < 6; i++) {
                b.fillRect(cx, cy, 2, 4);
                cx += hash(c, r, 40 + i) > 0.5 ? 2 : -2;
                cy += 4;
            }
        }
    };

    const drawLairTile = function(c, r) {
        const x = c * TILE, y = r * TILE;
        b.fillStyle = rgb([50, 22, 24], 0.85 + hash(c, r, 5) * 0.25);
        b.fillRect(x, y, TILE, TILE);
        b.fillStyle = "rgba(0,0,0,0.4)";
        b.fillRect(x + TILE - 2, y, 2, TILE);
        b.fillRect(x, y + TILE - 2, TILE, 2);
        b.fillStyle = "rgba(255,120,60,0.06)";
        b.fillRect(x + 2, y + 2, TILE - 6, 2);
    };

    const drawWallTile = function(c, r) {
        const x = c * TILE, y = r * TILE;
        const shade = 0.9 + hash(c, r, 6) * 0.15;
        const below = GameMap.get(c, r + 1);
        const frontVisible = r + 1 < ROWS && below !== "W" && below !== "P";
        const topH = frontVisible ? 26 : TILE;

        // Top of the wall with bricks
        b.fillStyle = rgb([86, 90, 106], shade);
        b.fillRect(x, y, TILE, topH);
        b.fillStyle = "rgba(0,0,0,0.28)";
        for (let by = 0; by < topH; by += 10) {
            b.fillRect(x, y + by, TILE, 2);
            const offset = (Math.floor(by / 10) + c) % 2 === 0 ? 10 : 30;
            b.fillRect(x + offset, y + by, 2, 10);
        }
        b.fillStyle = "rgba(255,255,255,0.06)";
        b.fillRect(x, y, TILE, 2);

        // Front of the wall (visible when there is floor below)
        if (frontVisible) {
            b.fillStyle = rgb([50, 52, 64], shade);
            b.fillRect(x, y + topH, TILE, TILE - topH);
            b.fillStyle = "rgba(255,255,255,0.12)";
            b.fillRect(x, y + topH, TILE, 2);
            b.fillStyle = "rgba(0,0,0,0.3)";
            b.fillRect(x + 12 + (c % 2) * 14, y + topH + 2, 2, TILE - topH - 2);
            b.fillStyle = "rgba(0,0,0,0.35)";
            b.fillRect(x, y + TILE, TILE, 8);
        }
    };

    const drawPillar = function(c, r) {
        const x = c * TILE, y = r * TILE;
        drawLairTile(c, r);
        b.fillStyle = "rgba(0,0,0,0.4)";
        b.fillRect(x + 6, y + 30, 30, 8);
        b.fillStyle = "#3b3e4b";
        b.fillRect(x + 6, y + 26, 28, 8);
        b.fillStyle = "#6a6f82";
        b.fillRect(x + 10, y + 4, 20, 24);
        b.fillStyle = "#8a8fa3";
        b.fillRect(x + 12, y + 4, 4, 24);
        b.fillStyle = "#4a4e5e";
        b.fillRect(x + 24, y + 4, 4, 24);
        b.fillStyle = "#7b8094";
        b.fillRect(x + 6, y, 28, 6);
    };

    const drawPedestal = function(c, r) {
        const x = c * TILE, y = r * TILE;
        b.fillStyle = "rgba(0,0,0,0.35)";
        b.fillRect(x + 6, y + 28, 30, 6);
        b.fillStyle = "#4b4f60";
        b.fillRect(x + 6, y + 22, 28, 8);
        b.fillStyle = "#6c7186";
        b.fillRect(x + 8, y + 18, 24, 6);
        b.fillStyle = "#8b90a5";
        b.fillRect(x + 8, y + 18, 24, 2);
    };

    const drawSpawnSigil = function(c, r, colour) {
        const { x, y } = GameMap.tileCenter(c, r);
        b.strokeStyle = colour;
        b.globalAlpha = 0.55;
        b.lineWidth = 2;
        [16, 10].forEach(radius => {
            b.beginPath();
            b.arc(x, y, radius, 0, Math.PI * 2);
            b.stroke();
        });
        b.globalAlpha = 1;
    };

    // Build the static background
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
            if ("LDCB".includes(GameMap.get(c, r))) drawLairTile(c, r);
            else drawFloorTile(c, r);
        }
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
            const t = GameMap.get(c, r);
            if (t === "W") drawWallTile(c, r);
            else if (t === "P") drawPillar(c, r);
            else if (t === "S") drawPedestal(c, r);
            else if (t === "1") drawSpawnSigil(c, r, "#3d7bff");
            else if (t === "2") drawSpawnSigil(c, r, "#ff4d4d");
        }

    // Lava cracks in the lair floor
    const cracks = [];
    GameMap.find("L").concat(GameMap.find("D")).forEach(({ c, r }) => {
        const n = 1 + Math.floor(hash(c, r, 7) * 2);
        for (let i = 0; i < n; i++) {
            let x = c * TILE + 4 + Math.floor(hash(c, r, 50 + i) * 8) * 4;
            let y = r * TILE + 4;
            const points = [];
            for (let k = 0; k < 7; k++) {
                points.push({ x, y });
                x += hash(c, r, 60 + i * 10 + k) > 0.5 ? 4 : -4;
                y += 4;
            }
            cracks.push(points);
        }
    });

    // Torches on the walls
    const torches = [
        { c: 4, r: 0 }, { c: 14, r: 0 }, { c: 4, r: 12 }, { c: 14, r: 12 },
        { c: 0, r: 3 }, { c: 18, r: 3 }, { c: 0, r: 9 }, { c: 18, r: 9 }
    ];

    // This function draws the floor, walls and lava cracks.
    const drawBase = function(ctx, time) {
        ctx.drawImage(bg, 0, 0);
        const pulse = 0.55 + 0.45 * Math.sin(time / 500);
        ctx.fillStyle = "rgba(255," + Math.round(90 + 60 * pulse) + ",20," + (0.5 + 0.4 * pulse) + ")";
        cracks.forEach(points => points.forEach(p => ctx.fillRect(p.x, p.y, 2, 4)));
    };

    // This function draws the light of the torches, the braziers and the dragon,
    // the torch flames and the dark vignette. It is drawn on top of everything.
    // - `extraLights` - a list of tiles that also give light, e.g. the braziers
    const drawLighting = function(ctx, time, extraLights) {
        const pulse = 0.55 + 0.45 * Math.sin(time / 500);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        torches.concat(extraLights).forEach(t => {
            const flick = 0.85 + 0.15 * Math.sin(time / 70 + t.c * 3 + t.r);
            const { x, y } = GameMap.tileCenter(t.c, t.r);
            const g = ctx.createRadialGradient(x, y, 2, x, y, 110 * flick);
            g.addColorStop(0, "rgba(255,160,60,0.28)");
            g.addColorStop(1, "rgba(255,120,40,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x - 120, y - 120, 240, 240);
        });
        const dx = 9 * TILE + TILE / 2, dy = 6 * TILE + TILE / 2;
        const lg = ctx.createRadialGradient(dx, dy, 10, dx, dy, 190);
        lg.addColorStop(0, "rgba(255,80,20," + (0.22 * pulse + 0.08) + ")");
        lg.addColorStop(1, "rgba(255,60,20,0)");
        ctx.fillStyle = lg;
        ctx.fillRect(dx - 200, dy - 200, 400, 400);
        ctx.restore();

        // Torch flames
        torches.forEach(t => {
            const x = t.c * TILE + 16, y = t.r * TILE + 8;
            const h = 8 + Math.round(3 * Math.abs(Math.sin(time / 80 + t.c)));
            ctx.fillStyle = "#3a2a1c";
            ctx.fillRect(x + 1, y + 10, 6, 10);
            ctx.fillStyle = "#ff6a1a";
            ctx.fillRect(x, y + 10 - h, 8, h);
            ctx.fillStyle = "#ffd36b";
            ctx.fillRect(x + 2, y + 12 - h * 0.6, 4, h * 0.6 - 2);
        });

        // Dark vignette around the edges
        const w = COLS * TILE, h = ROWS * TILE;
        const v = ctx.createRadialGradient(w / 2, h / 2, 180, w / 2, h / 2, 470);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);
    };

    // This function draws a grid with tile coordinates (useful when designing).
    const drawGrid = function(ctx) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.font = "7px 'Press Start 2P', monospace";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) {
                ctx.strokeRect(c * TILE + 0.5, r * TILE + 0.5, TILE, TILE);
                ctx.fillText(c + "," + r, c * TILE + 3, r * TILE + 3);
            }
        ctx.restore();
    };

    return { drawBase, drawLighting, drawGrid };
})();
