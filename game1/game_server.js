const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

// The same map module as in the browser
const GameMap = require("./public/scripts/game_map.js");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// TODO: Add the session middleware and the /register, /signin,
//       /validate and /signout endpoints from lab 5 here

// Create the Socket.IO server on top of the Express app
const httpServer = createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket) => {
    // TODO: Pair up players and run each game in its own room (game/room.js)
    console.log("A browser has connected:", socket.id);
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The game server has started...");
    console.log("The map has " + GameMap.find("S").length + " arrow spawns.");
});
