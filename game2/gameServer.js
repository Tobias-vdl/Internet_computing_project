const express = require("express");
const argon2 = require("argon2");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Create the Socket.IO server
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

// Use the session middleware to maintain sessions
const gameSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});
app.use(gameSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// ------------------------------------------------ Account HTTP endpoints

// Handle the /register endpoint
app.post("/register", async (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    // Reading the users.json file
    const users = JSON.parse(fs.readFileSync("data/users.json"));
    
    // Checking for the user data correctness
    if (username == "") {
        res.json({ error: "Username can't be empty!" });
        return;
    }
    if (password == "") {
        res.json({ error: "Password can't be empty!" });
        return;
    }
    if (!containWordCharsOnly(username)) {
        res.json({ error: "Username can only contain underscores, letters, or numbers" });
        return;
    }
    if (Object.hasOwn(users, username) ) {
        res.json({ error: "Username already taken!" });
        return;
    }

    // Adding the new user account
    // Hash the password
    const hash = await argon2.hash(password);
    users[username] = { password: hash }

    // Saving the users.json file
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, "  "));

    req.session.user = { username };

    // Sending a success response to the browser
    res.json({ user: req.session.user });
});

// Handle the /signin endpoint
app.post("/signin", async (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    // Reading the users.json file
    const users = JSON.parse(fs.readFileSync("data/users.json"));

    // Checking for username/password
    if (!(username in users)) {
        res.json({ error: "Incorrect username/password." });
        return;
    }

    const user = users[username];

    // If password is incorrect, return an error
    const verified = await argon2.verify(user.password, password);
    if (!verified) {
        res.json({ error: "Incorrect username/password." });
        return;
    }

    // Sending a success response with the user account
    req.session.user = { username };

    res.json({ user: req.session.user });
});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

    // Getting req.session.user
    if (!("user" in req.session)) {
        res.json({});
        return;
    }

    // Sending a success response with the user account
    res.json({ user: req.session.user });
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {
    // Delete the session information
    if ("user" in req.session) {
        delete req.session.user;
    }

    // Sending a success response
    res.json({ success: true });
});

// ---------------------------------------------------------- Game state

// A JavaScript object storing the players
let players = {}

// A JavaScript object storing the statistics of the current game
let stats = {}

// Indicate whether the game has started
let gameStarted = false;

io.on("connection", (socket) => {

    // -------------------------------------------------- Lobby events

    // Player joins the game
    socket.on("join", (username) => {
        if (socket.id in players) return;

        // Check if game already started
        if (gameStarted) {
            socket.emit("joinError", "Game Already Started");
            return;
        }

        // If lobby already full
        if (Object.keys(players).length == 2) {
            socket.emit("joinError", "Game Lobby Already Full!");
            return;
        }

        // Check if player with same name already in game
        for (const id in players) {
            const player = players[id];
            if (player.username == username) {
                socket.emit("joinError", "Same Account can't play itself!");
                return;
            }
        }

        // Put the player in the players object and start their statistics
        players[socket.id] = { username, ready: false };
        stats[socket.id] = { arrowsFired: 0, arrowsHit: 0, deaths: 0, kills: 0, dragonHit: 0 };

        // Tell the browsers whether the lobby has enough players
        if (Object.keys(players).length == 2) {
            io.emit("lobbyReady", true);
        }

        io.emit("updatePlayers", players);
    });

    socket.on("ready", () => {
        if (players[socket.id] == null) return;
        // Mark player as ready
        players[socket.id].ready = true;

        io.emit("updatePlayers", players);

        // Check if all players ready
        let allReady = Object.keys(players).length == 2;
        for (const id in players) {
            const p = players[id];

            if (!p.ready) {
                allReady = false;
                break;
            }
        }
        if (allReady) {
            gameStarted = true;

            // Both players are ready, send them into the game
            // The first player in the players object becomes the host
            // Targeted at the participants so clients outside this game
            // (e.g. still on a previous game-over screen) never receive it
            io.to(Object.keys(players)).emit("gameStart", Object.keys(players)[0], players);
        }
    });

    // ------------------------------------------- In-game event relays
    // The host client simulates the game; these events keep the other
    // client in sync and update the statistics

    socket.on("playerMove", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("playerMove", data);
    });

    socket.on("playerStop", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("playerStop", data);
    });

    socket.on("dragonHit", (data) => {
        if (!gameStarted) return;
        stats[data.playerId].arrowsHit++;
        stats[data.playerId].dragonHit++;
        socket.broadcast.emit("dragonHit", data);
    });

    socket.on("arrowHitWall", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("arrowHitWall", data);
    })

    socket.on("requestShoot", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("requestShoot", data);
    });

    socket.on("shootArrow", (data) => {
        if (!gameStarted) return;
        stats[data.playerId].arrowsFired++;
        socket.broadcast.emit("shootArrow", data);
    });

    socket.on("spawnFire", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("spawnFire", data);
    });

    socket.on("pickupArrow", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("pickupArrow", data);
    });

    socket.on("playerDied", (data) => {
        if (!gameStarted) return;
        stats[data.victimId].deaths++;
        if (data.killerId != null) {
            stats[data.killerId].kills++;
            stats[data.killerId].arrowsHit++;
        }
        socket.broadcast.emit("playerDied", data);
    });

    socket.on("toggleGodMode", (data) => {
        if (!gameStarted) return;
        socket.broadcast.emit("toggleGodMode", data);
    });

    // ------------------------------------------------------ Game over

    const endGame = function(winnerId, gameTime, disconnectId) {
        if (!gameStarted) return;
        // Compute the accuracy of every player
        for (const id in stats) {
            const s = stats[id];
            s.accuracy = s.arrowsFired > 0 ? Math.round((s.arrowsHit / s.arrowsFired) * 100) : 0;
        }

        // Targeted at the participants so stale clients (e.g. a player
        // still viewing a previous game's statistics) keep their screen
        io.to(Object.keys(players)).emit("gameEnd", { players, stats, winner: winnerId, gameTime, disconnectId });

        // Reset the game
        players = {};
        stats = {};
        gameStarted = false;
    };

    socket.on("dragonDefeated", (data) => {
        endGame(data.playerId, data.gameTime, null);    
    });

    socket.on("timeRanOut", (data) => {
        endGame(null, data.gameTime, null);
    });

    // -------------------------------------------------- Disconnection

    socket.on("disconnect", () => {
        if (socket.id in players) {
            if (!gameStarted) {
                delete players[socket.id];
                delete stats[socket.id];
                // Reset readiness of the remaining players while still in the lobby
                for (const id in players) {
                    players[id].ready = false;
                }
                io.emit("lobbyReady", false);
                io.emit("updatePlayers", players);
            } else {
                endGame(null, null, socket.id);
            }
        }
    });
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game server has started...");
});