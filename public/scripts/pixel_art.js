// This module contains helper functions for drawing pixel art in canvas.
// Pixel art is written as rows of text, where every character is one pixel
// and the palette tells which colour each character uses ("." is transparent).
const PixelArt = (function() {

    // This function returns a deterministic "random" number from 0 to 1,
    // so that e.g. every floor tile always looks the same.
    const hash = function(x, y, seed) {
        let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };

    // This function returns an rgb() colour string scaled by a factor.
    const rgb = function(colour, factor) {
        return "rgb(" + Math.round(colour[0] * factor) + "," +
                        Math.round(colour[1] * factor) + "," +
                        Math.round(colour[2] * factor) + ")";
    };

    // This function mirrors the left half of each row to make a symmetric picture.
    const mirrorRows = function(rows) {
        return rows.map(row => row + row.split("").reverse().join(""));
    };

    // This function draws pixel art rows at (x, y) with the given scale.
    // - `filter` - an optional function deciding which characters are drawn
    const draw = function(ctx, rows, palette, x, y, scale, filter) {
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                const ch = rows[r][c];
                if (ch === "." || !palette[ch]) continue;
                if (filter && !filter(ch)) continue;
                ctx.fillStyle = palette[ch];
                ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
            }
        }
    };

    return { hash, rgb, mirrorRows, draw };
})();
