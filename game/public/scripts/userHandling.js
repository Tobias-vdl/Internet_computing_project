const UserHandling = (function() {

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
            $("#main-menu").show();
            $("#register-page").hide();
            $("#signin-page").hide();
            $("#lobby").hide();
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

                    toggleButtonsOnSignedInStatus(true);

                    $("#menu-message").text("Your account has been successfully registered and you have been logged in.");
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

                    // Change which buttons are available
                    toggleButtonsOnSignedInStatus(true);

                    $("#menu-message").text("Your have been successfully signed in!");
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
                        $("#menu-message").text(json.error);
                        return;
                    }

                    // Change which buttons are available
                    toggleButtonsOnSignedInStatus(false);
                })
                .catch((error) => {
                    $("#menu-message").text(error);
                });
        });

        $("#join-button").on("click", function() {
            // Show the start page
            $("#lobby").show();
            $("#main-menu").hide();
        });
    }
    
    const validate = function() {
        // Send a validate request
        fetch("/validate")
            .then((res) => res.json())
            .then((json) => {
                toggleButtonsOnSignedInStatus(true);
            })
            .catch((error) => {
                $("#menu-message").text(error);
            });
    }

    return { init, validate };
})();
