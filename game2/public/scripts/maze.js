// This module defines the dungeon maze and everything tied to the tiles.
// - `context` - A canvas context for the background drawing
// - `cv` - The game canvas, used to size the pre-rendered background
const Maze = function(context, cv) {

    // The dungeon maze: '#' wall, '.' floor, 'A' arrow spawn spot,
    // 'D' dragon, '1'/'2' player start positions
    // 21x12 (not counting outer walls: 19x10)
    const MAP = [
        "#####################",
        "#....A..##D##..A....#",
        "#.##....#...#....##.#",
        "#...................#",
        "#...##.........##...#",
        "#.A.##....#....##.A.#",
        "#.........#.........#",
        "#...................#",
        "#.###...#####...###.#",
        "#.1....A..#..A....2.#",
        "#...................#",
        "#####################"
    ];

    const TILE = 40;

    const tileCenter = function(col, row) {
        return {
            x: col * TILE + TILE / 2,
            y: row * TILE + TILE / 2
        };
    }

    const tileCoords = function(px, py) {
        return {
            col: Math.floor((px) / TILE),
            row: Math.floor((py) / TILE)
        };
    }

    const getCell = function(col, row) {
        return MAP[row].charAt(col);
    }

    // This function checks whether a point is inside a wall tile
    const isWall = function(px, py) {
        const { col, row } = tileCoords(px, py);
        const cell = getCell(col, row);
        return cell == "#";
    }

    const isEmptySpace = function(col, row) {
        const cell = getCell(col, row);
        return cell == ".";
    }

    const randomEmptyTile = function() {
        while (true) {
            const col = Math.floor(Math.random() * MAP[0].length);
            const row = Math.floor(Math.random() * MAP.length);
            if (isEmptySpace(col, row)) return { col, row };
        }
    };

    // The knight cannot walk into walls - the corners of a shrunken
    // bounding box are checked against the maze tiles
    const canMove = function(x, y) {
        return !isWall(x - 10, y - 10) && !isWall(x + 10, y - 10) &&
               !isWall(x - 10, y + 10) && !isWall(x + 10, y + 10);
    }

    /* Scan the map for the start positions, arrow spawn spots and the dragon */
    const spawnSpots = [];
    let start1 = null;
    let start2 = null;
    let dragonPos = null;
    for (let row = 0; row < MAP.length; row++) {
        for (let col = 0; col < MAP[row].length; col++) {
            const cell = getCell(col, row);
            if (cell == "1") start1 = tileCenter(col, row);
            if (cell == "2") start2 = tileCenter(col, row);
            if (cell == "A") spawnSpots.push(tileCenter(col, row));
            if (cell == "D") dragonPos = tileCenter(col, row);
        }
    }

    function loadImage(img, src) {
        img.src = src;
        return img.decode();
    }

    /* Pre-render the dungeon background (floor + walls) once */
    const bg = document.createElement("canvas");
    bg.width = cv.width;
    bg.height = cv.height;
    const bgContext = bg.getContext("2d");
    const floorImage = new Image();
    const wallImage = new Image();
    const bgReady = Promise.all([
        loadImage(floorImage, "resources/dungeon_bg.png"),
        loadImage(wallImage, "resources/wall_tile.png")
    ]).then(() => {
        bgContext.drawImage(floorImage, 0, 0);
        for (let row = 0; row < MAP.length; row++) {
            for (let col = 0; col < MAP[row].length; col++) {
                if (getCell(col, row) == "#") {
                    bgContext.drawImage(wallImage, col * TILE, row * TILE, TILE, TILE);
                }
            }
        }
    }).catch((error) => {
        console.log(error);
    });

    // The methods are returned as an object here.
    return {
        TILE: TILE,
        rows: MAP.length,
        cols: MAP[0].length,
        tileCenter: tileCenter,
        isWall: isWall,
        randomEmptyTile: randomEmptyTile,
        canMove: canMove,
        getBackground: function() { return bg; },
        ready: bgReady,
        getSpawnSpots: function() { return spawnSpots; },
        getStart: function(playerNum) { return playerNum == 1 ? start1 : start2; },
        getDragon: function() { return { x: dragonPos.x, y: dragonPos.y }; }
    };
};
