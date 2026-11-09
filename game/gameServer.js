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
    if (username in users) {
        res.json({ error: "Username already taken!" });
        return;
    }

    // Adding the new user account
    // Hash the password
    const hash = await argon2.hash(password);
    users[username] = { password: hash }

    // Saving the users.json file
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, "  "));

    // Sending a success response to the browser
    res.json({ success: true });
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

// A JavaScript object storing the players
let players = {}

// Indicate whether a game has started
let gameStarted = false;

io.on("connection", (socket) => {

    // Player joins the game
    socket.on("join", (username) => {
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

        // Put the player in the players object
        players[socket.id] = { username, ready: false };

        socket.emit("joinSuccess");

        io.emit("updatePlayers", players);
    });

    const startGame = function() {
        io.emit("gameStart");

        gameStarted = true;
    };

    socket.on("ready", () => {
        // Mark player as ready
        players[socket.id].ready = true;

        io.emit("updatePlayers", players);

        // Check if all players ready
        let allReady = true;
        for (const id in players) {
            const p = players[id];

            if (!p.ready) {
                allReady = false;
                break;
            }
        }
        if (allReady) {
            startGame();
        }
    });

    const endGame = function() {
        io.emit("gameEnd", players);

        // Reset the game
        players = {};
        gameStarted = false;
    };

    socket.on("disconnect", () => {
        // Remove the player from the game
        if (socket.id in players) {
            delete players[socket.id];

            // Broadcast the players to the connected browsers
            io.emit("updatePlayers", players);
        }
    });
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game server has started...");
});
