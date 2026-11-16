// This function defines the Fireball module.
// A fireball first shows a warning marker while it flies from the dragon's
// mouth, then it burns on its target tile for a while.
// - `ctx` - A canvas context for drawing
// - `c`, `r` - The target tile
// - `startTime` - The time when the dragon spits the fireball
// - `from` - The start position {x, y} (the dragon's mouth)
const Fireball = function(ctx, c, r, startTime, from) {
    const WARN_TIME = 1000;     // Flying / warning time in milliseconds
    const BURN_TIME = 4000;     // Burning time in milliseconds
    const { x: cx, y: cy } = GameMap.tileCenter(c, r);
    const x = c * GameMap.TILE, y = r * GameMap.TILE;

    const getTile = function() {
        return { c, r };
    };

    // This function returns true while the tile is burning (deadly).
    const isBurning = function(time) {
        const age = time - startTime;
        return age >= WARN_TIME && age < WARN_TIME + BURN_TIME;
    };

    // This function returns true when the fireball is completely gone.
    const isOver = function(time) {
        return time - startTime >= WARN_TIME + BURN_TIME;
    };

    const draw = function(time) {
        const age = time - startTime;

        if (age < WARN_TIME) {
            // Warning: a pulsing red ring on the target tile
            const p = age / WARN_TIME;
            ctx.strokeStyle = "rgba(255,60,40," + (0.5 + 0.5 * Math.sin(age / 60)) + ")";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 6 + 12 * p, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(255,60,40,0.18)";
            ctx.fillRect(x + 2, y + 2, 36, 36);

            // The fireball flies in an arc from the dragon's mouth
            const bx = from.x + (cx - from.x) * p;
            const by = from.y + (cy - from.y) * p - Math.sin(p * Math.PI) * 90;
            const g = ctx.createRadialGradient(bx, by, 1, bx, by, 14);
            g.addColorStop(0, "#fff3b0");
            g.addColorStop(0.4, "#ff9a1a");
            g.addColorStop(1, "rgba(255,60,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(bx - 14, by - 14, 28, 28);
        } else if (isBurning(time)) {
            // A burning tile that fades out at the end
            const b = age - WARN_TIME;
            ctx.save();
            ctx.globalAlpha = b > BURN_TIME - 500 ? (BURN_TIME - b) / 500 : 1;
            ctx.fillStyle = "rgba(255,90,20,0.35)";
            ctx.fillRect(x + 2, y + 2, 36, 36);
            for (let k = 0; k < 4; k++) {
                const fx = x + 6 + k * 8;
                const h = 14 + 8 * Math.abs(Math.sin(time / 90 + k * 1.7 + c));
                const base = y + 34;
                ctx.fillStyle = "#c2260f";
                ctx.fillRect(fx, base - h, 8, h);
                ctx.fillStyle = "#ff8a1a";
                ctx.fillRect(fx + 2, base - h + 4, 4, h - 4);
                ctx.fillStyle = "#ffe27a";
                ctx.fillRect(fx + 2, base - h * 0.45, 4, h * 0.45);
            }
            for (let k = 0; k < 3; k++) {
                const ey = (time / 8 + k * 37 + r * 13) % 30;
                ctx.fillStyle = "#ffd36b";
                ctx.fillRect(x + 8 + k * 11, y + 30 - ey, 2, 2);
            }
            ctx.restore();
        }
    };

    return { getTile, isBurning, isOver, draw };
};
