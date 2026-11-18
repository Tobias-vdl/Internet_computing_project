// This function defines the Player module.
// - `ctx` - A canvas context for drawing
// - `x` - The initial x position of the player
// - `y` - The initial y position of the player
// - `gameArea` - The bounding box of the game area
// - `playerNum` - The number of the player (1 or 2), used to pick the sprite colour
// - `canMove` - Optional function returning whether the player can stand at (x, y)
const Player = function(ctx, x, y, gameArea, playerNum, maxArrows, canMoveFn) {

    // This is the sprite sequences of the player facing different directions.
    // It contains the idling sprite sequences `idleLeft`, `idleUp`, `idleRight` and `idleDown`,
    // and the moving sprite sequences `moveLeft`, `moveUp`, `moveRight` and `moveDown`.
    const sequences = {
        /* Idling sprite sequences for facing different directions */
        idleLeft:  { x: 0, y: 25, width: 24, height: 25, count: 3, timing: 2000, loop: false },
        idleUp:    { x: 0, y: 50, width: 24, height: 25, count: 3, timing: 2000, loop: false },
        idleRight: { x: 0, y: 75, width: 24, height: 25, count: 3, timing: 2000, loop: false },
        idleDown:  { x: 0, y:  0, width: 24, height: 25, count: 3, timing: 2000, loop: false },

        /* Moving sprite sequences for facing different directions */
        moveLeft:  { x: 0, y: 125, width: 24, height: 25, count: 10, timing: 50, loop: true },
        moveUp:    { x: 0, y: 150, width: 24, height: 25, count: 10, timing: 50, loop: true },
        moveRight: { x: 0, y: 175, width: 24, height: 25, count: 10, timing: 50, loop: true },
        moveDown:  { x: 0, y: 100, width: 24, height: 25, count: 10, timing: 50, loop: true }
    };

    // This is the sprite object of the player created from the Sprite module.
    const sprite = Sprite(ctx, x, y);

    const spriteSheet = "resources/" + (playerNum == 1 ? "archer_blue.png" : "archer_red.png");

    // The sprite object is configured for the player sprite here.
    sprite.setSequence(sequences.idleDown)
          .setScale(2)
          .setShadowScale({ x: 0.75, y: 0.20 })
          .useSheet(spriteSheet);

    // This is the moving direction, which can be a number from 0 to 4:
    // - `0` - not moving
    // - `1` - moving to the left
    // - `2` - moving up
    // - `3` - moving to the right
    // - `4` - moving down
    let direction = 0;

    // This is the moving speed (pixels per second) of the player
    let speed = 150;

    // Timestamp of the previous update, used for delta-time movement
    let lastUpdateTime = 0;

    // This is the last direction the player faced, kept even after stopping
    let facing = 2;

    // Walls block the player - fall back to allowing everything
    const canMove = canMoveFn || function() { return true; };

    // Maximum number of arrows allowed to hold at a time
    const MAX_ARROWS = maxArrows;

    // Number of arrows in the players inventory
    let numArrows = 0;

    // Cooldown between shots in ms
    const SHOOT_COOLDOWN = 1000;

    // Last time the player shot
    let lastShot = 0;

    const spawnX = x;
    const spawnY = y;
    let alive = true;
    const RESPAWN_DELAY = 3000;
    let reviveTimeout = null;
    let godMode = false;

    // This function sets the player's moving direction.
    // - `dir` - the moving direction (1: Left, 2: Up, 3: Right, 4: Down)
    const move = function(dir) {
        if (alive) {
            if (dir >= 1 && dir <= 4 && dir != direction) {
                switch (dir) {
                    case 1: sprite.setSequence(sequences.moveLeft); break;
                    case 2: sprite.setSequence(sequences.moveUp); break;
                    case 3: sprite.setSequence(sequences.moveRight); break;
                    case 4: sprite.setSequence(sequences.moveDown); break;
                }
                direction = dir;
                facing = dir;
            }
        }
    };

    // This function stops the player from moving.
    // - `dir` - the moving direction when the player is stopped (1: Left, 2: Up, 3: Right, 4: Down)
    const stop = function(dir) {
        if (alive) {
            if (direction == dir) {
                switch (dir) {
                    case 1: sprite.setSequence(sequences.idleLeft); break;
                    case 2: sprite.setSequence(sequences.idleUp); break;
                    case 3: sprite.setSequence(sequences.idleRight); break;
                    case 4: sprite.setSequence(sequences.idleDown); break;
                }
                direction = 0;
            }
        }
    };

    // This function updates the player depending on his movement.
    // - `time` - The timestamp when this function is called
    const update = function(time, move) {
        if (lastUpdateTime == 0) lastUpdateTime = time;

        /* Distance moved since the previous frame, capped so a throttled
           or paused tab cannot make anything jump through walls */
        const dist = speed * Math.min(time - lastUpdateTime, 100) / 1000;
        lastUpdateTime = time;

        /* Update the player if the player is moving */
        if (direction != 0 && move) {
            let { x, y } = sprite.getXY();

            if (direction == 1 || direction == 3) {
                const nx = x + (direction == 1 ? -dist : dist);
                if (canMove(nx, y) && gameArea.isPointInBox(nx, y)) {
                    sprite.setXY(nx, y);
                }
            } else {
                const ny = y + (direction == 2 ? -dist : dist);
                if (canMove(x, ny) && gameArea.isPointInBox(x, ny)) {
                    sprite.setXY(x, ny);
                }
            }
        }

        /* Update the sprite object */
        sprite.update(time);
    };

    const draw = function() {
        if (alive) {
            sprite.draw();
        }
    };

    const canPickupArrow = function(force) {
        return ((force || alive) && numArrows < MAX_ARROWS); 
    }

    const pickupArrow = function(force) {
        if (canPickupArrow(force)) numArrows++;
    };

    const canShoot = function(time, force) {
        return (force || (alive && ((numArrows > 0) || godMode) && (time - lastShot >= SHOOT_COOLDOWN)));
    }

    const shoot = function(time, force) {
        if (canShoot(time, force)) {
            lastShot = time;
            numArrows = godMode ? numArrows : --numArrows; 
            return true;
        }

        return false;
    }

    const toggleGodMode = function() {
        godMode = godMode ? false : true;
    }

    const revivePlayer = function() {
        if (!alive) {
            alive = true;
            sprite.setXY(spawnX, spawnY);
        }
    }

    const killPlayer = function(force) {
        if (force || (!godMode && alive)) {
            stop(direction);
            alive = false;
            if (reviveTimeout != null) clearTimeout(reviveTimeout);
            reviveTimeout = setTimeout(revivePlayer, RESPAWN_DELAY);
            numArrows = 0;
            return true;
        }

        return false;
    }

    // The methods are returned as an object here.
    return {
        move: move,
        stop: stop,
        getBoundingBox: sprite.getBoundingBox,
        draw: draw,
        update: update,
        getXY: sprite.getXY,
        setXY: sprite.setXY,
        getDirection: function() { return direction; },
        getFacing: function() { return facing; },
        canPickupArrow: canPickupArrow,
        pickupArrow: pickupArrow,
        canShoot: canShoot,
        shoot: shoot,
        getArrowCount: function() { return numArrows; },
        killPlayer: killPlayer,
        isPlayerAlive: function() { return alive; },
        toggleGodMode: toggleGodMode
    };
};
