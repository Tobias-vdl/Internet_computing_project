// This function defines the Arrow module: an arrow flying through the dungeon.
// - `ctx` - A canvas context for drawing
// - `x`, `y` - The start position
// - `dir` - The direction (1: Left, 2: Up, 3: Right, 4: Down), like the Player module
// - `owner` - The player who shot the arrow
const Arrow = function(ctx, x, y, dir, owner) {
    const SPEED = 480;  // Pixels per second
    const LENGTH = 24;

    const dx = [0, -1, 0, 1, 0][dir];
    const dy = [0, 0, -1, 0, 1][dir];
    const angle = Math.atan2(dy, dx);

    // This function moves the arrow.
    // - `dt` - The time since the last frame in seconds
    const update = function(dt) {
        x += dx * SPEED * dt;
        y += dy * SPEED * dt;
    };

    // This function returns the position of the arrow's tip.
    const getTip = function() {
        return { x: x + dx * LENGTH / 2, y: y + dy * LENGTH / 2 };
    };

    const getOwner = function() {
        return owner;
    };

    const draw = function() {
        Arrow.drawShape(ctx, x, y, angle, LENGTH);
    };

    return { update, getTip, getOwner, draw };
};

// This function draws an arrow shape (shaft, head and fletching).
// It is also used for the arrow pickups and the HUD.
Arrow.drawShape = function(ctx, x, y, angle, length) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(-length / 2, -1, length, 2);
    ctx.fillStyle = "#d8dde6";
    ctx.beginPath();
    ctx.moveTo(length / 2 + 5, 0);
    ctx.lineTo(length / 2 - 1, -4);
    ctx.lineTo(length / 2 - 1, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e04a3a";
    ctx.fillRect(-length / 2 - 1, -4, 5, 3);
    ctx.fillRect(-length / 2 - 1, 1, 5, 3);
    ctx.restore();
};
