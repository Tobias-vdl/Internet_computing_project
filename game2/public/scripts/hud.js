// This module handles the game UI: the timer, a Dragon HP bar for each
// player and the arrow counts.
// - `maxArrows` - The maximum number of arrows a player can hold
// - `dragonMaxHp` - The starting dragon HP of each player
// - `iAmHost` - Whether this client is player 1 (host, blue); otherwise red
const Hud = function(maxArrows, dragonMaxHp, iAmHost) {

    // The host is always blue and the other player is always red,
    // so both clients see the same colours on the same sides.
    const myColor = iAmHost ? "blue" : "red";
    const otherColor = iAmHost ? "red" : "blue";

    // Build the HP bar segments and arrow pips for both players
    for (const color of ["blue", "red"]) {
        const bar = $("#hp-" + color).empty();
        for (let i = 0; i < dragonMaxHp; i++) {
            bar.append($("<div>").addClass("hp-segment"));
        }

        const pips = $("#pips-" + color).empty();
        for (let i = 0; i < maxArrows; i++) {
            pips.append($("<span>").addClass("pip"));
        }
    }

    const setHp = function(color, hp) {
        $("#hp-" + color + " .hp-segment").each(function(i) {
            $(this).toggleClass("hp-empty", i >= hp);
        });
    };

    const setArrows = function(color, name, isMe, arrows) {
        $("#name-" + color).text(name + (isMe ? " (you)" : ""));
        $("#pips-" + color + " .pip").each(function(i) {
            $(this).toggleClass("full", i < arrows);
        });
        $("#pips-" + color).attr("title", arrows + "/" + maxArrows + " arrows");
    };

    // - `myHp` - The remaining dragon HP on this player's bar
    // - `otherHp` - The remaining dragon HP on the other player's bar
    const updateDragonHp = function(myHp, otherHp) {
        setHp(myColor, myHp);
        setHp(otherColor, otherHp);
    };

    const updateArrows = function(myName, myArrows, otherName, otherArrows) {
        setArrows(myColor, myName, true, myArrows);
        setArrows(otherColor, otherName, false, otherArrows);
    };

    // - `time` - The remaining time in seconds
    const updateTime = function(time) {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        $("#time-remaining")
            .text(mins + ":" + String(secs).padStart(2, "0"))
            .toggleClass("low", time <= 30);
    };

    // The methods are returned as an object here.
    return {
        updateDragonHp: updateDragonHp,
        updateArrows: updateArrows,
        updateTime: updateTime
    };
};