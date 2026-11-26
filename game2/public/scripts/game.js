/* This module runs the match on both clients.
 *
 * The host client runs the authoritative simulation: it spawns arrows and
 * fire, checks all collisions, and broadcasts every event. The other client
 * mirrors what it receives. Most handlers below take an `emit` flag:
 * - `true`  - this client detected the event, apply it and broadcast it
 * - `false` - the event arrived from the other client, apply it locally only
 */
const Game = (function() {

    /* ------------------------------------------------------ Sound effects */

    const sounds = {
        arrowFired:  new Audio("resources/arrowFired.mp3"),
        dragonHit:   new Audio("resources/dragonHit.mp3"),
        playerDeath: new Audio("resources/playerDeath.mp3"),
        music:       new Audio("resources/backgroundMusic.mp3")
    };
    sounds.music.loop = true;

    /* -------------------------------------------------------- Game state */

    // Connection, host flag and shared objects
    let playerData = null;
    let socket = null;
    let context = null;
    let hud = null;
    let host = null;
    let maze = null;
    let gameArea = null;

    // Socket ids of this client and the opponent
    let myId = null;
    let otherId = null;

    // Entities of the current game
    const players = {};
    const arrowsFlying = {};
    const arrowsGround = {};
    let dragon = null;
    let goldenDuck = null;
    const dragonHP = {};
    const fires = {};

    // Tuning constants
    const MAX_ARROWS = 3;
    const DRAGON_MAX_HP = 7;
    const TOTAL_GAME_TIME = 200;

    // Loop and timer handles
    let timeRemaining = TOTAL_GAME_TIME;
    let running = false;
    let playerMovementUpdateInterval = null;
    let frameId = null;
    let countdownTimer = null;

    // Dragon fire attack (driven by the host)
    const WARNING_DURATION = 1000;
    const FIRE_DURATION = 5000;
    const SPIT_INTERVAL = 3000;   // base time between fireballs
    const SPIT_NOISE = 1500;      // +/- random offset
    let nextSpitAt = 0;
    let fireIdCounter = 0;

    // Id counters for the entities created above
    let arrowIdCounter = 0;

    /* ------------------------------------------------------- HUD helpers */

    const playSound = function(name) {
        const s = sounds[name].cloneNode();
        s.play();
    };

    const updateHudArrows = function() {
        hud.updateArrows(
            playerData[myId].username, players[myId].getArrowCount(),
            playerData[otherId].username, players[otherId].getArrowCount()
        )
    };

    const updateHudDragonHp = function() {
        hud.updateDragonHp(dragonHP[myId], dragonHP[otherId]);
    }

    /* ---------------------------------------------------------- God mode */

    const toggleGodMode = function(playerId, emit) {
        players[playerId].toggleGodMode();
        if (emit) socket.emit("toggleGodMode", { playerId });
    }

    /* ------------------------------------------------------ Dragon fire */

    const spawnFire = function(fireId, col, row) {
        const { x, y } = maze.tileCenter(col, row);
        fires[fireId] = {
            col, row,
            spawnedAt: performance.now(),
            fire: Fire(context, x, y)
        };
        dragon.spit();
        setTimeout(dragon.idle, 600);
    };

    // Host only: pick a random empty tile, spawn the fire and broadcast it
    const spitFire = function(now) {
        if (!host) return;

        const { col, row } = maze.randomEmptyTile();
        const fireId = "fire_" + fireIdCounter++;
        spawnFire(fireId, col, row);
        socket.emit("spawnFire", { fireId, col, row });
        nextSpitAt = now + SPIT_INTERVAL + (Math.random() * 2 - 1) * SPIT_NOISE;
    };

    const updateFires = function(now) {
        for (const id in fires) {
            const f = fires[id];
            const age = now - f.spawnedAt;
            if (age >= WARNING_DURATION + FIRE_DURATION) {
                delete fires[id];
            } else if (age >= WARNING_DURATION) {
                f.fire.update(now);
            }
        }
    };

    const drawFires = function(now) {
        const T = maze.TILE;
        for (const id in fires) {
            const f = fires[id];
            const age = now - f.spawnedAt;
            if (age < WARNING_DURATION) {
                context.save();
                context.fillStyle = "rgba(255, 0, 0, " + (0.3 + 0.2 * Math.sin(age / 100)) + ")";
                context.fillRect(f.col * T, f.row * T, T, T);
                context.restore();
            } else {
                f.fire.draw();
            }
        }
    };

    /* ------------------------------------------------------ Player death */

    const killPlayer = function(victimId, killerId, arrowId, emit) {
        let status = players[victimId].killPlayer(!emit);
        if (!status) return;

        playSound("playerDeath");
        delete arrowsFlying[arrowId];

        if (emit) socket.emit("playerDied", { victimId, killerId, arrowId });

        updateHudArrows();
    }

    /* ------------------------------------------------------------ Arrows */

    const pickupArrow = function(playerId, spot, emit) {
        if (!arrowsGround[spot].canPickupArrow(!emit) ||
            !players[playerId].canPickupArrow(!emit)) return

        players[playerId].pickupArrow(!emit);
        arrowsGround[spot].pickupArrow(!emit);
        updateHudArrows();

        if (emit) socket.emit("pickupArrow", { playerId, spot });
    }

    // Create the arrow on this client. Used for both local and remote shots.
    const spawnArrow = function(playerId, x, y, dir, arrowId) {
        players[playerId].shoot(performance.now(), true);
        arrowsFlying[arrowId] = {
            ownerId: playerId,
            arrow: ArrowProjectile(context, x, y, dir)
        };
        updateHudArrows();
        playSound("arrowFired");
    };

    // Host only: validate, assign the ID, spawn, broadcast
    const hostShoot = function(playerId, x, y, dir) {
        if (!players[playerId].canShoot(performance.now(), false)) return;

        const arrowId = playerId + "_" + arrowIdCounter++;
        spawnArrow(playerId, x, y, dir, arrowId);

        socket.emit("shootArrow", { playerId, x, y, dir, arrowId });
    };

    const hitDragon = function(playerId, arrowId, emit) {
        dragonHP[playerId] > 0 ? dragonHP[playerId]-- : 0;
        updateHudDragonHp();
        playSound("dragonHit");
        delete arrowsFlying[arrowId];

        if (emit) {
            socket.emit("dragonHit", { playerId, arrowId });

            if (dragonHP[playerId] == 0) {
                socket.emit("dragonDefeated", { playerId, gameTime: (TOTAL_GAME_TIME - timeRemaining) });
            }
        }
    }

    const arrowHitWall = function(arrowId, emit) {
        delete arrowsFlying[arrowId];

        if (emit) socket.emit("arrowHitWall", { arrowId });
    }

    /* --------------------------------- Host-only collision & pickup checks */

    const checkArrowPickup = function() {
        if (!host) return;

        for (const playerId in players) {
            const player = players[playerId];
            const { x, y } = player.getXY();

            const box = player.getBoundingBox();
            for (const spot in arrowsGround) {
                const arrow = arrowsGround[spot];

                if (box.intersect(arrow.getBoundingBox())) {
                    pickupArrow(playerId, spot, true);
                    break;
                }
            }
        }
    }

    const checkFireHits = function(now) {
        if (!host) return;

        for (const id in fires) {
            const f = fires[id];
            if (now - f.spawnedAt < WARNING_DURATION) continue;   // still just a warning

            const { x, y } = f.fire.getXY();
            for (const playerId in players) {
                const player = players[playerId];
                if (player.getBoundingBox().isPointInBox(x, y)) {
                    killPlayer(playerId, null, null, true);
                }
            }
        }
    };

    // Host checks all flying arrows for collisions
    const checkArrowHits = function() {
        if (!host) return;

        for (const arrowId in arrowsFlying) {
            const a = arrowsFlying[arrowId];
            const { x, y } = a.arrow.getXY();

            /* Hit the dragon */
            if (dragon.getBoundingBox().isPointInBox(x, y)) {
                hitDragon(a.ownerId, arrowId, true);
                continue;
            }

            /* Hit one of the players */
            let playerHit = false;
            for (const playerId in players) {
                const player = players[playerId];

                if (player.isPlayerAlive() && player.getBoundingBox().isPointInBox(x, y)) {
                    if (playerId != a.ownerId) {
                        killPlayer(playerId, a.ownerId, arrowId, true);
                        playerHit = true;
                        break;
                    }

                }
            }
            if (playerHit) continue;

            /* Arrows hitting walls or the bounding box do nothing */
            if (maze.isWall(x, y) || !gameArea.isPointInBox(x, y)) {
                arrowHitWall(arrowId, true);
            }
        }
    }

    /* ----------------------------------------------- Countdown & clean-up */

    const countdown = function() {
        // Decrease the remaining time
        timeRemaining--;

        // Continue the countdown if there is still time;
        // each tick stores its own timer so cleanUp can cancel the chain
        if (running && timeRemaining > 0) {
            hud.updateTime(timeRemaining);
            countdownTimer = setTimeout(countdown, 1000);
        } else {
            if (running && host) {
                socket.emit("timeRanOut", { gameTime: TOTAL_GAME_TIME });
            }
        }
    }

    const cleanUp = function() {
        running = false;

        // Disable keyboard events
        $(document).off(".game");

        // Stop the render loop and timers
        cancelAnimationFrame(frameId);
        clearInterval(playerMovementUpdateInterval);
        clearTimeout(countdownTimer);

        // Delete all created objects
        for (const k in players) delete players[k];
        for (const k in arrowsFlying) delete arrowsFlying[k];
        for (const k in arrowsGround) delete arrowsGround[k];
        for (const k in fires) delete fires[k];
        arrowIdCounter = 0;
        fireIdCounter = 0;

        // Kill listeners as not to initiate again
        // (must match the socket.on registrations in init)
        const events = [
            "playerMove","shootArrow","playerDied",
            "dragonHit","arrowHitWall","pickupArrow",
            "spawnFire", "requestShoot", "toggleGodMode"
        ];
        if (socket) for (const ev of events) socket.off(ev);

        sounds.music.pause();
        sounds.music.currentTime = 0;
    }

    /* -------------------------------------------------- Input & game init */

    const setKeyEvents = function(playerId) {
        const player = players[playerId];

        $(document).on("keydown.game", function(event) {
            switch (event.keyCode) {
                // Left (A)
                case 65:
                    player.move(1);
                    break;

                // Up (W)
                case 87:
                    player.move(2);
                    break;

                // Right (D)
                case 68:
                    player.move(3);
                    break;

                // Down (S)
                case 83:
                    player.move(4);
                    break;

                // Spacebar => shoot
                case 32:
                    event.preventDefault();
                    const { x, y } = player.getXY();
                    const dir = player.getFacing();
                    if (host) {
                        hostShoot(playerId, x, y, dir);
                    } else if (player.canShoot(performance.now(), false)) {
                        socket.emit("requestShoot", { playerId, x, y, dir });
                    }
                    break;

                // GodMode (G)
                case 71:
                    toggleGodMode(playerId, true);
                    break;
            }
        });

        /* Handle the keyup of arrow keys and spacebar */
        $(document).on("keyup.game", function(event) {
            switch (event.keyCode) {
                // Left (A)
                case 65:
                    player.stop(1);
                    break;

                // Up (W)
                case 87:
                    player.stop(2);
                    break;

                // Right (D)
                case 68:
                    player.stop(3);
                    break;

                // Down (S)
                case 83:
                    player.stop(4);
                    break;
            }
        });
    }

    const init = async function(soc, isHost, playerD) {
        cleanUp();
        socket = soc;
        playerData = playerD;
        host = isHost;

        myId = soc.id;
        for (const id in playerData) {
            if (id != myId) {
                otherId = id;
                break;
            }
        }

        /* Get the canvas and 2D context */
        const cv = $("#game canvas").get(0);
        context = cv.getContext("2d");

        // Set image smoothing to false
        context.imageSmoothingEnabled = false;

        /* The dungeon maze and the game area */
        maze = Maze(context, cv);
        await maze.ready;
        gameArea = BoundingBox(context, 0, 0, maze.rows * maze.TILE, maze.cols * maze.TILE);

        const spawnSpots = maze.getSpawnSpots();

        sounds.music.play();

        /* Create the sprites in the game */
        // Player characters - the host is player 1 (blue)
        let myNum = host ? 1 : 2;
        let otherNum = host ? 2 : 1;
        players[myId] = Player(context,
            maze.getStart(myNum).x, maze.getStart(myNum).y,
            gameArea, myNum, MAX_ARROWS, maze.canMove
        );
        players[otherId] = Player(context,
            maze.getStart(otherNum).x, maze.getStart(otherNum).y,
            gameArea, otherNum, MAX_ARROWS, maze.canMove
        );

        // Dragon - drawn a little lower in its alcove, so the golden
        // rubber duck on its pedestal is visible on the wall behind it
        const { x, y } = maze.getDragon();
        dragon = Dragon(context, x, y + 20);
        goldenDuck = GoldenDuck(context, x, y - 22);
        dragonHP[myId] = DRAGON_MAX_HP;
        dragonHP[otherId] = DRAGON_MAX_HP;

        /* Ground arrows - one sprite per spawn spot, drawn when present */
        let spotCounter = 0;
        for (const spot of spawnSpots) {
            arrowsGround["spot" + spotCounter++] = ArrowGround(context, spot.x, spot.y);
        }

        /* The game UI */
        hud = Hud(MAX_ARROWS, DRAGON_MAX_HP, host);

        /* Game state */
        timeRemaining = TOTAL_GAME_TIME;
        running = true;

        /* Player names for the UI */
        hud.updateTime(TOTAL_GAME_TIME);
        updateHudDragonHp();
        updateHudArrows();

        nextSpitAt = performance.now() + SPIT_INTERVAL;

        // Interval running to update player position - as not to desync players
        playerMovementUpdateInterval = setInterval(() => {
            const myPlayer = players[myId];
            const { x, y } = myPlayer.getXY();
            socket.emit("playerMove", {
                x, y,
                direction: myPlayer.getDirection(),
                facing: myPlayer.getFacing()
            });
        }, 20);

        /* Socket event handlers - mirror what the other client reports. */
        socket.on("playerMove", (data) => {
            const otherPlayer = players[otherId];
            otherPlayer.setXY(data.x, data.y);
            if (data.direction) {
                otherPlayer.move(data.direction);
            } else {
                otherPlayer.stop(data.facing);
            }
        });

        socket.on("requestShoot", (data) => {
            if (host) hostShoot(data.playerId, data.x, data.y, data.dir);
        });

        socket.on("shootArrow", (data) => {
            spawnArrow(data.playerId, data.x, data.y, data.dir, data.arrowId);
        });

        socket.on("spawnFire", (data) => {
            spawnFire(data.fireId, data.col, data.row)
        });

        socket.on("playerDied", (data) => {
            killPlayer(data.victimId, data.killerId, data.arrowId, false);
        });

        socket.on("dragonHit", (data) => {
            hitDragon(data.playerId, data.arrowId, false);
        });

        socket.on("arrowHitWall", (data) => {
            arrowHitWall(data.arrowId, false);
        });

        socket.on("pickupArrow", (data) => {
            pickupArrow(data.playerId, data.spot, false);
        });

        socket.on("toggleGodMode", (data) => {
            toggleGodMode(data.playerId, false);
        })

        // Start countdown
        countdownTimer = setTimeout(countdown, 1000);

        /* --- Game loop --- */
        const doFrame = function(now) {
            if (!running) return;

            /* Update the sprites */
            for (const playerId in players) {
                // Don't move player twice - player moved though update loop
                if (playerId == myId) {
                    players[playerId].update(now, true);
                } else {
                    players[playerId].update(now, false);
                }
            }
            dragon.update(now);
            for (const spot in arrowsGround) arrowsGround[spot].update(now);
            for (const arrowId in arrowsFlying) arrowsFlying[arrowId].arrow.update(now);
            updateFires(now);

            // Host simulates
            if (host) {
                // Dragon spits fire
                if (now >= nextSpitAt) spitFire(now);

                // Check Fire hits
                checkFireHits(now);

                // Check arrow pickup
                checkArrowPickup();

                // Check Arrow hits
                checkArrowHits();
            }

            /* Clear the screen and draw the dungeon */
            context.clearRect(0, 0, cv.width, cv.height);
            context.drawImage(maze.getBackground(), 0, 0);
            for (const playerId in players) players[playerId].draw();
            goldenDuck.draw(now);
            dragon.draw();
            for (const spot in arrowsGround) arrowsGround[spot].draw();
            for (const arrowId in arrowsFlying) arrowsFlying[arrowId].arrow.draw();
            drawFires(now);

            /* Process the next frame */
            frameId = requestAnimationFrame(doFrame);
        }

        /* Handle the keydown of arrow keys and spacebar */
        setKeyEvents(myId);

        /* Start the game */
        frameId = requestAnimationFrame(doFrame);
    }

    return { init , stopGame: cleanUp };
})();
