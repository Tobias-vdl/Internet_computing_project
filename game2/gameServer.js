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

// Every pair of players plays in its own room, so several games can run at
// the same time. A room looks like this:
//   { id, players: { socketId: { username, ready } }, stats: { socketId: {...} }, gameStarted }
const rooms = {};

// The room of every socket that has joined a game: { socketId: roomId }
const socketRoom = {};

// A counter for creating unique room ids
let roomCounter = 0;

// This function finds a room waiting for a second player, or creates a new one
const findOrCreateRoom = function() {
    for (const id in rooms) {
        const room = rooms[id];
        if (!room.gameStarted && Object.keys(room.players).length < 2) return room;
    }
    const id = "room" + roomCounter++;
    rooms[id] = { id, players: {}, stats: {}, gameStarted: false };
    return rooms[id];
};

// This function returns true if the username is already in a lobby or a game
const isUserPlaying = function(username) {
    for (const id in rooms) {
        for (const socketId in rooms[id].players) {
            if (rooms[id].players[socketId].username == username) return true;
        }
    }
    return false;
};

// ------------------------------------------------------------ Ranking

// This function updates data/rankings.json with the result of a finished game
// and returns the overall ranking (top 10)
const updateRanking = function(room, winnerId, gameTime) {
    let rankings = {};
    if (fs.existsSync("data/rankings.json")) {
        rankings = JSON.parse(fs.readFileSync("data/rankings.json"));
    }

    // Add the result of every player of the game
    for (const id in room.players) {
        const username = room.players[id].username;
        const s = room.stats[id];
        if (!(username in rankings)) {
            rankings[username] = { games: 0, wins: 0, draws: 0, losses: 0, dragonDamage: 0, kills: 0, deaths: 0, fastestWin: null };
        }
        const r = rankings[username];
        r.games++;
        if (winnerId == null) r.draws++;
        else if (winnerId == id) r.wins++;
        else r.losses++;
        r.dragonDamage += s.dragonHit;
        r.kills += s.kills;
        r.deaths += s.deaths;
        if (winnerId == id && gameTime != null && (r.fastestWin == null || gameTime < r.fastestWin)) {
            r.fastestWin = gameTime;
        }
    }
    fs.writeFileSync("data/rankings.json", JSON.stringify(rankings, null, "  "));

    return getRanking(rankings);
};

// This function sorts the players: most wins, then most dragon damage, then fastest win
const getRanking = function(rankings) {
    return Object.keys(rankings)
        .map(username => ({
            username, ...rankings[username],
            // The average number of kills per game, with one decimal
            avgKills: Math.round(10 * rankings[username].kills / rankings[username].games) / 10
        }))
        .sort((a, b) =>
            (b.wins - a.wins) ||
            (b.dragonDamage - a.dragonDamage) ||
            ((a.fastestWin ?? Infinity) - (b.fastestWin ?? Infinity)))
        .slice(0, 10);
};

io.on("connection", (socket) => {

    // -------------------------------------------------- Lobby events

    // Player joins the game
    socket.on("join", (username) => {
        if (socket.id in socketRoom) return;

        // Check if player with same name already in a lobby or a game
        if (isUserPlaying(username)) {
            socket.emit("joinError", "Same Account can't play itself!");
            return;
        }

        // Put the player in a room waiting for a second player (or a new room)
        const room = findOrCreateRoom();
        socket.join(room.id);
        socketRoom[socket.id] = room.id;

        // Put the player in the players object and start their statistics
        room.players[socket.id] = { username, ready: false };
        room.stats[socket.id] = { arrowsFired: 0, arrowsHit: 0, deaths: 0, kills: 0, dragonHit: 0 };

        // Tell the browsers in the room whether the lobby has enough players
        if (Object.keys(room.players).length == 2) {
            io.to(room.id).emit("lobbyReady", true);
        }

        io.to(room.id).emit("updatePlayers", room.players);
    });

    socket.on("ready", () => {
        const room = rooms[socketRoom[socket.id]];
        if (room == null || room.players[socket.id] == null) return;
        // Mark player as ready
        room.players[socket.id].ready = true;

        io.to(room.id).emit("updatePlayers", room.players);

        // Check if all players ready
        let allReady = Object.keys(room.players).length == 2;
        for (const id in room.players) {
            if (!room.players[id].ready) {
                allReady = false;
                break;
            }
        }
        if (allReady) {
            room.gameStarted = true;

            // Both players are ready, send them into the game
            // The first player in the players object becomes the host
            io.to(room.id).emit("gameStart", Object.keys(room.players)[0], room.players);
        }
    });

    // ------------------------------------------- In-game event relays
    // The host client simulates the game; these events keep the other
    // client of the same room in sync and update the statistics

    // This function returns the room of this socket if its game is running
    const runningRoom = function() {
        const room = rooms[socketRoom[socket.id]];
        return (room != null && room.gameStarted) ? room : null;
    };

    // This function sends an event to the other player in the room
    const relay = function(event, data) {
        const room = runningRoom();
        if (room == null) return null;
        socket.to(room.id).emit(event, data);
        return room;
    };

    socket.on("playerMove", (data) => relay("playerMove", data));

    socket.on("dragonHit", (data) => {
        const room = relay("dragonHit", data);
        if (room == null || room.stats[data.playerId] == null) return;
        room.stats[data.playerId].arrowsHit++;
        room.stats[data.playerId].dragonHit++;
    });

    socket.on("arrowHitWall", (data) => relay("arrowHitWall", data));

    socket.on("requestShoot", (data) => relay("requestShoot", data));

    socket.on("shootArrow", (data) => {
        const room = relay("shootArrow", data);
        if (room == null || room.stats[data.playerId] == null) return;
        room.stats[data.playerId].arrowsFired++;
    });

    socket.on("spawnFire", (data) => relay("spawnFire", data));

    socket.on("pickupArrow", (data) => relay("pickupArrow", data));

    socket.on("playerDied", (data) => {
        const room = relay("playerDied", data);
        if (room == null || room.stats[data.victimId] == null) return;
        room.stats[data.victimId].deaths++;
        if (data.killerId != null && room.stats[data.killerId] != null) {
            room.stats[data.killerId].kills++;
            room.stats[data.killerId].arrowsHit++;
        }
    });

    socket.on("toggleGodMode", (data) => relay("toggleGodMode", data));

    // ------------------------------------------------------ Game over

    const endGame = function(room, winnerId, gameTime, disconnectId) {
        if (room == null || !room.gameStarted) return;
        room.gameStarted = false;

        // Compute the accuracy of every player
        for (const id in room.stats) {
            const s = room.stats[id];
            s.accuracy = s.arrowsFired > 0 ? Math.round((s.arrowsHit / s.arrowsFired) * 100) : 0;
        }

        // Update the overall ranking (a game ended by a disconnection does not count)
        let ranking;
        if (disconnectId == null) {
            ranking = updateRanking(room, winnerId, gameTime);
        } else {
            ranking = getRanking(fs.existsSync("data/rankings.json") ?
                JSON.parse(fs.readFileSync("data/rankings.json")) : {});
        }

        io.to(room.id).emit("gameEnd", {
            players: room.players, stats: room.stats, winner: winnerId, gameTime, disconnectId, ranking
        });

        // Remove the room
        for (const id in room.players) {
            delete socketRoom[id];
            const s = io.sockets.sockets.get(id);
            if (s) s.leave(room.id);
        }
        delete rooms[room.id];
    };

    socket.on("dragonDefeated", (data) => {
        endGame(runningRoom(), data.playerId, data.gameTime, null);
    });

    socket.on("timeRanOut", (data) => {
        endGame(runningRoom(), null, data.gameTime, null);
    });

    // -------------------------------------------------- Disconnection

    socket.on("disconnect", () => {
        const room = rooms[socketRoom[socket.id]];
        if (room == null) return;

        if (!room.gameStarted) {
            delete room.players[socket.id];
            delete room.stats[socket.id];
            delete socketRoom[socket.id];

            // Remove an empty room
            if (Object.keys(room.players).length == 0) {
                delete rooms[room.id];
                return;
            }

            // Reset readiness of the remaining players while still in the lobby
            for (const id in room.players) {
                room.players[id].ready = false;
            }
            io.to(room.id).emit("lobbyReady", false);
            io.to(room.id).emit("updatePlayers", room.players);
        } else {
            endGame(room, null, null, socket.id);
        }
    });
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game server has started...");
});