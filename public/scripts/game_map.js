// This module contains the dungeon map of the game.
// It is used by the browser and can also be loaded by the server with require().
//
// Only the top-left quarter of the map is written below; the rest is mirrored,
// so the map is symmetric and fair for both players.
//   W = wall          . = floor          S = arrow spawn     P = pillar
//   L = lair floor    D = dragon         C = princess cage   B = brazier
//   1 = player 1 spawn                   2 = player 2 spawn
const GameMap = (function() {
    const TILE = 40;    // Size of one tile in pixels
    const COLS = 19;    // Number of columns
    const ROWS = 13;    // Number of rows

    const quarter = [
        "WWWWWWWWWW",
        "W.........",
        "W.WW.WWW..",
        "W.WS......",
        "W...W..PLL",
        "W.W.W..LDD",
        "WS.....LDD"
    ];

    // Build the full grid by mirroring the quarter horizontally and vertically
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const qr = r <= 6 ? r : 12 - r;
            const qc = c <= 9 ? c : 18 - c;
            row.push(quarter[qr][qc]);
        }
        grid.push(row);
    }
    // Things that are not symmetric
    grid[1][9] = "1";       // Player 1 spawn (top)
    grid[11][9] = "2";      // Player 2 spawn (bottom)
    grid[4][9] = "C";       // The princess cage behind the dragon
    grid[8][9] = "B";       // Braziers in front of and beside the dragon
    grid[6][7] = "B";
    grid[6][11] = "B";

    // This function returns the tile type at (c, r); outside the map is a wall.
    const get = function(c, r) {
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return "W";
        return grid[r][c];
    };

    // This function returns true if an arrow stops when it reaches the tile.
    const blocksArrow = function(c, r) {
        return "WPCB".includes(get(c, r));
    };

    // This function returns true if a player can stand on the tile.
    const isWalkable = function(c, r) {
        return ".S12L".includes(get(c, r));
    };

    // This function returns the tile containing the pixel position (x, y).
    const tileAt = function(x, y) {
        return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
    };

    // This function returns the centre of a tile in pixels.
    const tileCenter = function(c, r) {
        return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
    };

    // This function checks whether a player standing at (x, y) fits on the map.
    // The player's feet are a small box below the sprite's centre.
    const canStand = function(x, y) {
        const points = [[x - 9, y + 8], [x + 9, y + 8], [x - 9, y + 18], [x + 9, y + 18]];
        return points.every(([px, py]) => {
            const t = tileAt(px, py);
            return isWalkable(t.c, t.r);
        });
    };

    // This function returns all tiles of a given type, e.g. find("S").
    const find = function(type) {
        const result = [];
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (grid[r][c] === type) result.push({ c, r });
        return result;
    };

    return { TILE, COLS, ROWS, get, blocksArrow, isWalkable, tileAt, tileCenter, canStand, find };
})();

// Allow the server to use the same map with require()
if (typeof module !== "undefined") module.exports = GameMap;
