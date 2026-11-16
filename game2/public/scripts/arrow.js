// This function defines the Arrow module.
const ArrowGround = function(ctx, x, y) {
    // This is the sprite sequences of the arrow
    const sequence = {
        x: 0, y: 48, width: 16, height: 16, count: 1, timing: 0, loop: false 
    };

    const sprite = Sprite(ctx, x, y);

    // The sprite object is configured for the arrow sprite here.
    sprite.setSequence(sequence)
          .setScale(2)
          .setShadowScale({ x: 0.75, y: 0.2 })
          .useSheet("resources/object_sprites.png");

    // The base y position that the arrow bobs around
    const baseY = y;

    // If the arrow is still available for pickup
    let hasArrow = true;

    const ARROW_RESPAWN_RATE = 4000;
    let arrowTimer = null;

    // This function bobs the arrow a little up and down.
    // - `now` - The timestamp when this function is called
    const update = function(now) {
        sprite.setXY(x, baseY + Math.sin(now / 250) * 3);
    };

    const pickupArrow = function(force) {
        if (force || hasArrow) {
            hasArrow = false;
            if (arrowTimer != null) clearTimeout(arrowTimer);
            arrowTimer = setTimeout(() => {hasArrow = true}, ARROW_RESPAWN_RATE);
            return true;
        }

        return false;
    }

    const draw = function() {
        if (hasArrow) {
            sprite.draw();
        }
    };

    // The methods are returned as an object here.
    return {
        getXY: sprite.getXY,
        setXY: sprite.setXY,
        draw: draw,
        update: update,
        pickupArrow: pickupArrow,
        getBoundingBox: sprite.getBoundingBox,
        canPickupArrow: function(force) { return force || hasArrow; }
    };
}

const ArrowProjectile = function(ctx, x, y, direction) {

    // This is the sprite sequences of the arrow
    const sequence = {
        x: 16, y: 112, width: 16, height: 16, count: 1, timing: 0, loop: false 
    };

    // This is the rotation matching each direction.
    const ANGLES = { 1: Math.PI, 2: -Math.PI / 2, 3: 0, 4: Math.PI / 2 };

    // This is the sprite object of the arrow created from the Sprite module.
    const sprite = Sprite(ctx, x, y);

    // The sprite object is configured for the arrow sprite here.
    sprite.setSequence(sequence)
          .setScale(2)
          .setShadowScale({ x: 0.75, y: 0.2 })
          .useSheet("resources/object_sprites.png");

    // This is the moving speed (pixels per second) of the arrow
    let speed = 200;

    // Timestamp of the previous update, used for delta-time movement
    let lastUpdateTime = 0;

    const draw = function() {
        const { x, y } = sprite.getXY();

        /* Rotate the canvas around the center of the arrow so the
           sprite points in its direction */
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ANGLES[direction] || 0);
        ctx.translate(-x, -y);
        sprite.draw();
        ctx.restore();
    }

    const update = function(time) {
        if (lastUpdateTime == 0) lastUpdateTime = time;

        /* Distance moved since the previous frame, capped so a throttled
           or paused tab cannot make the arrow skip over walls */
        const dist = speed * Math.min(time - lastUpdateTime, 100) / 1000;
        lastUpdateTime = time;

        let { x, y } = sprite.getXY();

        if (direction == 1) {
            sprite.setXY(x - dist, y);
        } else if (direction == 2) {
            sprite.setXY(x, y - dist);
        } else if (direction == 3) {
            sprite.setXY(x + dist, y);
        } else if (direction == 4) {
            sprite.setXY(x, y + dist);
        }
    };

    // The methods are returned as an object here.
    return {
        getXY: sprite.getXY,
        setXY: sprite.setXY,
        getDirection: function() { return direction; },
        draw: draw,
        update: update
    };
};
