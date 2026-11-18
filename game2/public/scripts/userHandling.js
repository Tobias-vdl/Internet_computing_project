const UserHandling = (function() {

    let socket = null;
    let currentUser = null;
    let intentionalDisconnect = false;

    let menuMessageTimer = null;

    const disconnectSocket = function() {
        if (socket == null) return;
        intentionalDisconnect = true;
        socket.disconnect();
        socket = null;
    }

    const resetToMenu = function(message) {
        disconnectSocket();

        $("#connect-page").hide();
        $("#lobby").hide();
        $("#game").hide();
        $("#register-page").hide();
        $("#signin-page").hide();
        $("#game-over").hide();
        $("#main-menu").show();

        if (message) {
            setMenuMessage(message);
        }
    }

    const setMenuMessage = function(message) {
        clearTimeout(menuMessageTimer);

        $("#menu-message").stop(true, true);
        $("#menu-message").text(message);
        $("#menu-message").show();
        menuMessageTimer = setTimeout(() => { 
            $("#menu-message").fadeOut(1000, () => $("#menu-message").text(""));
        }, 2000);
    }

    const toggleButtonsOnSignedInStatus = function(signedIn) {
        // Change which buttons are available
        if (signedIn) {
            $("#join-button").show();
            $("#signout-button").show();
            $("#menu-register-button").hide();
            $("#menu-signin-button").hide();
        } else {
            $("#join-button").hide();
            $("#signout-button").hide();
            $("#menu-register-button").show();
            $("#menu-signin-button").show();
        }       
    }

    const updateLobby = function(players) {
        const ids = Object.keys(players);
        const waitingForPlayers = ids.length < 2;

        // List the players in the lobby
        $("#lobby-players").empty();
        for (const id of ids) {
            const player = players[id];
            const name = (id == socket.id) ? player.username + " (you)" : player.username;
            const status = player.ready ? " - Ready" : "";

            $("#lobby-players").append($("<div>").text(name + status));
        }

        $("#lobby-message").text(waitingForPlayers ? "Waiting for another player to join..." : "");
    }

    const initConnection = function() {
        // Connect to the Socket.IO socket
        socket = io();

        // Show the connection error from Socket.IO
        socket.on("connect_error", (error) => {
            $("#connect-message").text(error.message);
        });

        // Once connected, show the lobby and send the join event
        socket.on("connect", () => {
            $("#connect-page").hide();
            $("#lobby").show();

            $("#lobby-players").empty();
            $("#ready-button").prop("disabled", true);

            socket.emit("join", currentUser);
        });

        // Go back to the menu if the join was rejected
        socket.on("joinError", (message) => {
            resetToMenu(message);
        });

        // Update the lobby whenever the player list changes
        socket.on("updatePlayers", updateLobby);

        // The server tells us when enough players have joined to ready up
        socket.on("lobbyReady", (ready) => {
            $("#ready-button").prop("disabled", !ready);
        });

        // Enter the game once both players are ready
        socket.on("gameStart", (hostId, players) => {
            $("#lobby").hide();
            $("#game").show();
            Game.init(socket, hostId == socket.id, players);
        });

        // Show the game over screen with the statistics
        socket.on("gameEnd", (result) => {
            Game.stopGame();

            // Drop the socket (intentionally, so no reload) => 
            // so this client can no longer receive events for games it is not part of
            disconnectSocket();

            $("#game").hide();
            $("#game-over").show();

            const names = {};
            for (const id in result.players) {
                names[id] = result.players[id].username;
            }

            if (result.winner != null) {
                $("#winner-message").text((names[result.winner]) + " slew the dragon and wins!");
            } else if (result.disconnectId != null) {
                $("#winner-message").text("A player was disconnected. Game Terminated!");
            } else {
                $("#winner-message").text("None managed to defeat the dragon. It is a draw!");
            }

            if (result.gameTime != null) {
                const mins = Math.floor(result.gameTime / 60);
                const secs = Math.floor(result.gameTime % 60);
                $("#elapsed-time").text(
                    "Time elapsed: " + (mins > 0 ? (mins + "min ") : "") + secs + "sec"
                );
            } else {
                // a disconnect
                $("#elapsed-time").text("");
            }

            const table = $("#stats-table").empty();
            table.append($("<tr>").append(
                $("<th>").text("Player"),
                $("<th>").text("Arrows Fired"),
                $("<th>").text("Arrows Hit"),
                $("<th>").text("Accuracy"),
                $("<th>").text("Damage to Dragon"),
                $("<th>").text("Deaths"),
                $("<th>").text("Kills")
            ));
            for (const id in result.stats) {
                const s = result.stats[id];
                table.append($("<tr>").append(
                    $("<td>").text(names[id] + (id == result.disconnectId ? " (Disconnected)" : "")),
                    $("<td>").text(s.arrowsFired),
                    $("<td>").text(s.arrowsHit),
                    $("<td>").text(s.accuracy + "%"),
                    $("<td>").text(s.dragonHit),
                    $("<td>").text(s.deaths),
                    $("<td>").text(s.kills)
                ));
            }
        });

        // Go back to front page if disconnected unexpectedly
        socket.on("disconnect", () => {
            if (intentionalDisconnect) {
                intentionalDisconnect = false;
                return;
            }

            // Reload the page
            window.location.reload();
        });
    }

    const joinGame = function() {
        // Show the connecting page until the websocket is established
        $("#main-menu").hide();
        $("#connect-page").show();
        $("#connect-message").text("");

        if (!socket) {
            initConnection();
        }
    }

    const init = function() {
        $("#menu-register-button").on("click", function() {
            // Show the register page
            $("#main-menu").hide();
            $("#register-page").show();
            $("#register-form").get(0).reset();
            $("#register-message").text("");
        });

        $("#menu-signin-button").on("click", function() {
            // Show the signin page
            $("#main-menu").hide();
            $("#signin-page").show();
            $("#signin-form").get(0).reset();
            $("#signin-message").text("");
        });

        $(".back-to-menu").on("click", function() {
            // Show the start page
            resetToMenu();
        });

        $("#register-button").on("click", function(e) {
            // Do not submit the form
            e.preventDefault();

            // Get the input fields
            const username = $("#register-username").val().trim();
            const password = $("#register-password").val().trim();
            const repeatPassword = $("#register-password-repeat").val().trim();

            // Password and confirmation does not match
            if (password != repeatPassword) {
                $("#register-message").text("Passwords do not match!");
                return;
            }
            
            // Create the JSON data
            const json = JSON.stringify({ username, password });

            // Send a register request
            fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: json
            })
                .then((res) => res.json())
                .then((json) => {
                    // Processing any error returned by the server
                    if ("error" in json) {
                        $("#register-message").text(json.error);
                        return;
                    }

                    // Register successful

                    // Reset form
                    $("#register-form").get(0).reset();

                    // Go back to menu
                    $("#main-menu").show();
                    $("#register-page").hide();

                    currentUser = json.user.username;

                    toggleButtonsOnSignedInStatus(true);

                    $("#welcome-username").text("Welcome, " + currentUser);
                    $("#welcome-username").show();
                    setMenuMessage("Your account has been successfully registered and you have been logged in!");
                })
                .catch((error) => {
                    $("#register-message").text(error);
                });
        });

        $("#signin-button").on("click", function(e) {
            // Do not submit the form
            e.preventDefault();

            // Get the input fields
            const username = $("#signin-username").val().trim();
            const password = $("#signin-password").val().trim();

            // Create the JSON data
            const json = JSON.stringify({ username, password });
            
            // Send a signin request
            fetch("/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: json
            })
                .then((res) => res.json())
                .then((json) => {
                    // Processing any error returned by the server
                    if ("error" in json) {
                        $("#signin-message").text(json.error);
                        return;
                    }

                    // Sign-in successful

                    // Reset form
                    $("#signin-form").get(0).reset();

                    // Go back to menu
                    $("#main-menu").show();
                    $("#signin-page").hide();

                    currentUser = json.user.username;

                    // Change which buttons are available
                    toggleButtonsOnSignedInStatus(true);

                    $("#welcome-username").text("Welcome, " + currentUser);
                    $("#welcome-username").show();
                    setMenuMessage("Your have been successfully signed in!");
                })
                .catch((error) => {
                    $("#signin-message").text(error);
                });
        });

        // Click event for the signout button
        $("#signout-button").on("click", function(e) {
            // Do not submit the form
            e.preventDefault();

            // Send a signout request
            fetch("/signout")
                .then((res) => res.json())
                .then((json) => {
                    if ("error" in json) {
                        setMenuMessage(json.error);
                        return;
                    }

                    currentUser = null;

                    $("#welcome-username").text("");
                    $("#welcome-username").hide();
                    setMenuMessage("You have been successfully signed out!");
                    // Change which buttons are available
                    toggleButtonsOnSignedInStatus(false);
                })
                .catch((error) => {
                    setMenuMessage(error);
                });
        });

        // Click event for the join button
        $("#join-button").on("click", function() {
            joinGame();
        });

        // Click event for the ready button
        $("#ready-button").on("click", function() {
            $("#ready-button").prop("disabled", true);
            socket.emit("ready");
        });

        // Click event for the play again button
        $("#play-again-button").on("click", function() {
            $("#game-over").hide();
            joinGame();
        });
    }
    
    const validate = function() {
        // Send a validate request
        fetch("/validate")
            .then((res) => res.json())
            .then((json) => {
                if ("user" in json) {
                    currentUser = json.user.username;
                    toggleButtonsOnSignedInStatus(true);
                } else {
                    toggleButtonsOnSignedInStatus(false);
                }
            })
            .catch((error) => {
                setMenuMessage(error);
            });
    }

    return { init, validate };
})();