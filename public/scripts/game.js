// This is the main code of the game play page.
//
// NOTE: This is a LOCAL PROTOTYPE where both players share one keyboard.
// The rules below (arrows, fireballs, damage, deaths) will later move to the
// server (game/room.js), and the browser will only send input with Socket.IO
// and draw the state it receives from the server.
const Game = (function() {

    // ===================== Settings =====================
    const GAME_TIME = 180;              // Seconds in a game
    const DRAGON_HP = 100;              // HP of the dragon for each player
    const ARROW_DAMAGE = 10;            // Damage of one arrow
    const MAX_ARROWS = 3;               // A player can hold at most this many arrows
    const PICKUP_RESPAWN_TIME = 5000;   // A taken arrow comes back after this time
    const SIDE_SWITCH_TIME = 20000;     // The arrow side switches after this time
    const RESPAWN_TIME = 5000;          // A dead player respawns after this time
    const INVULNERABLE_TIME = 1500;     // Protection after respawning
    const SHOOT_COOLDOWN = 300;         // Time between two shots
    const FIRE_INTERVAL_MAX = 1400;     // Time between fireballs at full HP...
    const FIRE_INTERVAL_MIN = 700;      // ...and when the dragon is almost dead

    const TILE = GameMap.TILE;
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // ===================== Game objects =====================
    const dragon = Dragon(ctx);
    const princess = Princess(ctx);
    const braziers = GameMap.find("B").map(t => Brazier(ctx, t.c, t.r));
    const pickups = GameMap.find("S").map(t => ArrowPickup(ctx, t.c, t.r));
    let fireballs = [];
    let arrows = [];
    let damageTexts = [];

    // This function returns the start position of a player standing on a tile.
    const standingPosition = function(tile) {
        return { x: tile.c * TILE + TILE / 2, y: tile.r * TILE + 12 };
    };

    const createPlayer = function(id, colour, sheet, spawnType, facing, keys) {
        const spawn = GameMap.find(spawnType)[0];
        const pos = standingPosition(spawn);
        return {
            id, colour, name: "P" + id, spawn, startFacing: facing, keys,
            sprite: Player(ctx, pos.x, pos.y, sheet),
            hp: DRAGON_HP, arrows: 0, alive: true, god: false,
            respawnAt: 0, invulnerableUntil: 0, lastShot: 0,
            stats: null
        };
    };

    // Directions use the same numbers as the Player module (1 Left, 2 Up, 3 Right, 4 Down)
    const players = [
        createPlayer(1, "#3d7bff", "images/archer_blue.png", "1", 4,
            { KeyA: 1, KeyW: 2, KeyD: 3, KeyS: 4, shoot: "Space", god: "KeyG" }),
        createPlayer(2, "#ff4d4d", "images/archer_red.png", "2", 2,
            { ArrowLeft: 1, ArrowUp: 2, ArrowRight: 3, ArrowDown: 4, shoot: "Enter", god: "KeyM" })
    ];

    // ===================== Game state =====================
    let startTime = null;
    let lastTime = 0;
    let lastFire = 0;
    let side = null;
    let over = null;        // { winner, reason, elapsed } when the game is over
    let showGrid = false;

    const restart = function() {
        players.forEach(p => {
            const pos = standingPosition(p.spawn);
            p.sprite.reset(pos.x, pos.y, p.startFacing);
            Object.assign(p, {
                hp: DRAGON_HP, arrows: 0, alive: true, god: false,
                respawnAt: 0, invulnerableUntil: 0, lastShot: 0,
                stats: { damage: 0, collected: 0, fired: 0, hits: 0, kills: 0, deathsFire: 0, deathsArrow: 0 }
            });
        });
        fireballs = [];
        arrows = [];
        damageTexts = [];
        startTime = null;
        side = null;
        over = null;
        princess.setFreed(false);
    };

    // ===================== Game rules =====================
    // This function returns the tile under a player's feet.
    const feetTile = function(p) {
        const { x, y } = p.sprite.getXY();
        return GameMap.tileAt(x, y + 14);
    };

    const kill = function(p, cause, time) {
        if (!p.alive || p.god || time < p.invulnerableUntil) return false;
        p.alive = false;
        p.arrows = 0;
        p.respawnAt = time + RESPAWN_TIME;
        if (cause === "fire") p.stats.deathsFire++;
        else p.stats.deathsArrow++;
        return true;
    };

    const respawn = function(p, time) {
        const pos = standingPosition(p.spawn);
        p.sprite.reset(pos.x, pos.y, p.startFacing);
        p.alive = true;
        p.invulnerableUntil = time + INVULNERABLE_TIME;
    };

    const shoot = function(p, time) {
        if (!p.alive || p.arrows === 0 || time - p.lastShot < SHOOT_COOLDOWN) return;
        const dir = p.sprite.getFacing();
        const { x, y } = p.sprite.getXY();
        const offset = [[0, 0], [-18, 4], [0, -14], [18, 4], [0, 20]][dir];
        arrows.push(Arrow(ctx, x + offset[0], y + offset[1], dir, p));
        p.arrows--;
        p.lastShot = time;
        p.stats.fired++;
    };

    const damageDragon = function(p, x, y, time) {
        p.hp = Math.max(0, p.hp - ARROW_DAMAGE);
        p.stats.damage += ARROW_DAMAGE;
        p.stats.hits++;
        dragon.hit(time);
        damageTexts.push({ x, y, colour: p.colour, text: "-" + ARROW_DAMAGE, t0: time });
        if (p.hp === 0) endGame(p, "dragon", time);
    };

    const endGame = function(winner, reason, time) {
        over = { winner, reason, elapsed: (time - startTime) / 1000 };
        if (winner) princess.setFreed(true);
    };

    const update = function(time, dt) {
        if (startTime === null) startTime = time;
        const elapsed = time - startTime;

        // Time is up: the player with the most damage wins
        if (elapsed / 1000 >= GAME_TIME) {
            const [a, b] = players;
            const winner = a.stats.damage === b.stats.damage ? null : (a.stats.damage > b.stats.damage ? a : b);
            endGame(winner, "time", time);
            return;
        }

        // The arrow side switches between left and right
        const newSide = Math.floor(elapsed / SIDE_SWITCH_TIME) % 2 === 0 ? "left" : "right";
        if (newSide !== side) {
            side = newSide;
            pickups.forEach(pk => pk.setAvailable(pk.getSide() === side));
        }
        pickups.forEach(pk => { if (pk.getSide() === side) pk.update(time); });

        // Players: respawn, movement and picking up arrows
        players.forEach(p => {
            if (!p.alive) {
                if (time >= p.respawnAt) respawn(p, time);
                return;
            }
            p.sprite.update(time);
            const t = feetTile(p);
            pickups.forEach(pk => {
                const pt = pk.getTile();
                if (pk.isAvailable() && pt.c === t.c && pt.r === t.r && p.arrows < MAX_ARROWS) {
                    pk.take(time, PICKUP_RESPAWN_TIME);
                    p.arrows++;
                    p.stats.collected++;
                }
            });
        });

        // The dragon spits more fireballs when it gets weaker
        const weakest = Math.min(...players.map(p => p.hp)) / DRAGON_HP;
        const interval = FIRE_INTERVAL_MIN + (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN) * weakest;
        if (time - lastFire > interval) {
            const free = GameMap.find(".").filter(f =>
                !fireballs.some(fb => fb.getTile().c === f.c && fb.getTile().r === f.r));
            const target = free[Math.floor(Math.random() * free.length)];
            fireballs.push(Fireball(ctx, target.c, target.r, time, dragon.getMouth()));
            lastFire = time;
        }
        fireballs = fireballs.filter(fb => !fb.isOver(time));

        // Burning tiles kill the players standing on them
        fireballs.forEach(fb => {
            if (!fb.isBurning(time)) return;
            const ft = fb.getTile();
            players.forEach(p => {
                const t = feetTile(p);
                if (p.alive && t.c === ft.c && t.r === ft.r) kill(p, "fire", time);
            });
        });

        // Arrows: hit walls, the dragon or the other player
        arrows = arrows.filter(a => {
            a.update(dt);
            const tip = a.getTip();
            const t = GameMap.tileAt(tip.x, tip.y);
            if (dragon.containsTile(t.c, t.r)) {
                if (!over) damageDragon(a.getOwner(), tip.x, tip.y, time);
                return false;
            }
            if (GameMap.blocksArrow(t.c, t.r)) return false;
            for (const p of players) {
                if (p === a.getOwner() || !p.alive) continue;
                const { x, y } = p.sprite.getXY();
                if (Math.abs(tip.x - x) < 11 && tip.y > y - 16 && tip.y < y + 20) {
                    const owner = a.getOwner();
                    owner.stats.hits++;
                    if (kill(p, "arrow", time)) owner.stats.kills++;
                    return false;
                }
            }
            return true;
        });

        damageTexts = damageTexts.filter(d => time - d.t0 < 800);
    };

    // ===================== Drawing =====================
    const drawPlayers = function(time) {
        players.slice().sort((a, b) => a.sprite.getXY().y - b.sprite.getXY().y).forEach(p => {
            if (!p.alive) {
                // Countdown on the spawn tile
                const c = GameMap.tileCenter(p.spawn.c, p.spawn.r);
                ctx.font = "10px 'Press Start 2P', monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = p.colour;
                ctx.fillText(Math.ceil((p.respawnAt - time) / 1000), c.x, c.y);
                return;
            }
            const { x, y } = p.sprite.getXY();
            if (p.god) {
                const g = ctx.createRadialGradient(x, y + 6, 4, x, y + 6, 26);
                g.addColorStop(0, "rgba(242,193,78,0.5)");
                g.addColorStop(1, "rgba(242,193,78,0)");
                ctx.fillStyle = g;
                ctx.fillRect(x - 26, y - 20, 52, 52);
            }
            ctx.save();
            if (time < p.invulnerableUntil && Math.floor(time / 100) % 2 === 0) ctx.globalAlpha = 0.35;
            p.sprite.draw();
            ctx.restore();
        });
    };

    const drawDamageTexts = function(time) {
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        damageTexts.forEach(d => {
            const age = time - d.t0;
            ctx.save();
            ctx.globalAlpha = 1 - age / 800;
            ctx.fillStyle = d.colour;
            ctx.fillText(d.text, d.x + 14, d.y - age / 25);
            ctx.restore();
        });
    };

    // A preview of the game over page
    const drawGameOver = function() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = "rgba(8,8,12,0.82)";
        ctx.fillRect(0, 0, w, h);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let title = "DRAW!";
        if (over.winner) title = over.winner.name + " FREES THE PRINCESS!";
        ctx.font = "18px 'Press Start 2P', monospace";
        ctx.fillStyle = over.winner ? over.winner.colour : "#e6e2d8";
        ctx.fillText(title, w / 2, 90);

        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "#9a958a";
        const mm = Math.floor(over.elapsed / 60), ss = String(Math.floor(over.elapsed % 60)).padStart(2, "0");
        ctx.fillText(over.reason === "time" ? "TIME RAN OUT – MOST DAMAGE WINS" : "DRAGON SLAIN IN " + mm + ":" + ss, w / 2, 124);

        const rows = [
            ["DAMAGE TO DRAGON", s => s.damage],
            ["ARROWS COLLECTED", s => s.collected],
            ["ARROWS FIRED", s => s.fired],
            ["ARROWS HIT", s => s.hits],
            ["ACCURACY", s => s.fired ? Math.round(100 * s.hits / s.fired) + "%" : "-"],
            ["OPPONENT KILLS", s => s.kills],
            ["DEATHS BY FIREBALL", s => s.deathsFire],
            ["DEATHS BY OPPONENT", s => s.deathsArrow],
            ["DEATHS TOTAL", s => s.deathsFire + s.deathsArrow]
        ];
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = players[0].colour;
        ctx.fillText("P1", w / 2 + 110, 170);
        ctx.fillStyle = players[1].colour;
        ctx.fillText("P2", w / 2 + 200, 170);
        rows.forEach(([label, get], i) => {
            const y = 200 + i * 28;
            ctx.textAlign = "left";
            ctx.fillStyle = "#c9d2e0";
            ctx.fillText(label, w / 2 - 260, y);
            ctx.textAlign = "center";
            ctx.fillStyle = "#e6e2d8";
            ctx.fillText(get(players[0].stats), w / 2 + 110, y);
            ctx.fillText(get(players[1].stats), w / 2 + 200, y);
        });

        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = "#f2c14e";
        ctx.fillText("PRESS R TO PLAY AGAIN", w / 2, h - 40);
    };

    const draw = function(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // The map is drawn below the HUD
        ctx.save();
        ctx.translate(0, HUD.HEIGHT);
        Dungeon.drawBase(ctx, time);
        pickups.forEach(pk => pk.draw(time));
        fireballs.forEach(fb => fb.draw(time));
        princess.draw(time);
        braziers.forEach(b => b.draw(time));
        dragon.draw(time);
        drawPlayers(time);
        arrows.forEach(a => a.draw());
        drawDamageTexts(time);
        Dungeon.drawLighting(ctx, time, braziers.map(b => b.getTile()));
        if (showGrid) Dungeon.drawGrid(ctx);
        ctx.restore();

        HUD.draw(ctx, canvas.width, {
            players: players.map(p => ({
                name: p.name, colour: p.colour, hp: p.hp / DRAGON_HP,
                arrows: p.arrows, maxArrows: MAX_ARROWS, god: p.god
            })),
            timeLeft: startTime === null ? GAME_TIME : GAME_TIME - ((over ? startTime + over.elapsed * 1000 : time) - startTime) / 1000,
            side: side || "left"
        });

        if (over) drawGameOver();
    };

    // ===================== Game loop =====================
    const doFrame = function(time) {
        const dt = Math.min(0.05, (time - lastTime) / 1000);
        lastTime = time;
        if (!over) update(time, dt);
        draw(time);
        requestAnimationFrame(doFrame);
    };

    // ===================== Keyboard =====================
    document.addEventListener("keydown", e => {
        if (over) {
            if (e.code === "KeyR") restart();
            return;
        }
        players.forEach(p => {
            if (p.keys[e.code]) {
                if (p.alive) p.sprite.move(p.keys[e.code]);
                e.preventDefault();
            }
            if (e.code === p.keys.shoot && !e.repeat) {
                shoot(p, performance.now());
                e.preventDefault();
            }
            if (e.code === p.keys.god && !e.repeat) p.god = !p.god;
        });
    });
    document.addEventListener("keyup", e => {
        players.forEach(p => {
            if (p.keys[e.code]) p.sprite.stop(p.keys[e.code]);
        });
    });

    const start = function() {
        restart();
        requestAnimationFrame(doFrame);
    };

    const setShowGrid = function(value) {
        showGrid = value;
    };

    return { start, setShowGrid };
})();
