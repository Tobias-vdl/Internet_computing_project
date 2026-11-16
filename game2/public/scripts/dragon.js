// This function defines the Dragon module.
// The dragon only faces one way - toward the players.
// - `ctx` - A canvas context for drawing
// - `x` - The initial x position of the dragon
// - `y` - The initial y position of the dragon
const Dragon = function(ctx, x, y) {

    // This is the sprite sequences of the dragon:
    // an idling loop and a short animation for spitting a fireball.
    const sequences = {
        idle: { x: 0, y:  0, width: 48, height: 48, count: 4, timing: 250, loop: true },
        spit: { x: 192, y: 0, width: 48, height: 48, count: 4, timing: 150, loop: false }
    };

    // This is the sprite object of the dragon created from the Sprite module.
    const sprite = Sprite(ctx, x, y);

    // The sprite object is configured for the dragon sprite here.
    sprite.setSequence(sequences.idle)
          .setScale(2)
          .setShadowScale({ x: 0.8, y: 0.25 })
          .useSheet("resources/dragon.png");

    // This function plays the fire spitting animation.
    const spit = function() { sprite.setSequence(sequences.spit); };

    // This function returns the dragon to its idling animation.
    const idle = function() { sprite.setSequence(sequences.idle); };

    // The methods are returned as an object here.
    return {
        getXY: sprite.getXY,
        setXY: sprite.setXY,
        getBoundingBox: sprite.getBoundingBox,
        draw: sprite.draw,
        update: sprite.update,
        spit: spit,
        idle: idle
    };
};
