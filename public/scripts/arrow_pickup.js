// This function defines the ArrowPickup module: an arrow lying on a pedestal.
// - `ctx` - A canvas context for drawing
// - `c`, `r` - The tile of the pedestal
const ArrowPickup = function(ctx, c, r) {
    const { x, y } = GameMap.tileCenter(c, r);

    // The pickup belongs to the left or the right side of the dungeon
    const side = c < GameMap.COLS / 2 ? "left" : "right";

    // This is true when the arrow is lying on the pedestal.
    let available = false;

    // This is the time when a taken arrow comes back.
    let respawnAt = 0;

    const getTile = function() {
        return { c, r };
    };
    const getSide = function() {
        return side;
    };
    const isAvailable = function() {
        return available;
    };

    // This function puts an arrow on the pedestal or removes it.
    const setAvailable = function(value) {
        available = value;
        respawnAt = 0;
    };

    // This function takes the arrow; it comes back after `delay` milliseconds.
    const take = function(time, delay) {
        available = false;
        respawnAt = time + delay;
    };

    // This function puts the arrow back when its time has come.
    const update = function(time) {
        if (!available && respawnAt > 0 && time >= respawnAt) {
            available = true;
            respawnAt = 0;
        }
    };

    // This function draws a glowing, floating arrow.
    const draw = function(time) {
        if (!available) return;
        const float = Math.sin(time / 350 + c) * 2;
        const g = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 26);
        g.addColorStop(0, "rgba(200,220,255,0.55)");
        g.addColorStop(1, "rgba(200,220,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 26, y - 34, 52, 52);
        Arrow.drawShape(ctx, x, y - 10 + float, -0.6, 22);
    };

    return { getTile, getSide, isAvailable, setAvailable, take, update, draw };
};
