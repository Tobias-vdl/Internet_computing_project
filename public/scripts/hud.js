// This module draws the HUD at the top of the canvas:
// the dragon HP bar and arrows of each player, the timer and the active arrow side.
const HUD = (function() {
    const HEIGHT = 48;

    const drawBar = function(ctx, x, y, w, value, colour) {
        ctx.fillStyle = "#0a0b0f";
        ctx.fillRect(x, y, w, 12);
        ctx.fillStyle = "#b3261e";
        ctx.fillRect(x + 2, y + 2, (w - 4) * value, 8);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(x + 2, y + 2, (w - 4) * value, 2);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, w + 2, 14);
    };

    const drawArrows = function(ctx, x, y, count, max, align) {
        for (let i = 0; i < max; i++) {
            const ax = align === "left" ? x + i * 14 : x - i * 14;
            ctx.save();
            ctx.globalAlpha = i < count ? 1 : 0.2;
            Arrow.drawShape(ctx, ax, y, -Math.PI / 2, 16);
            ctx.restore();
        }
    };

    // This function draws the HUD.
    // - `state.players` - [{ name, colour, hp (0-1), arrows, maxArrows, god }, ...]
    // - `state.timeLeft` - seconds left of the game
    // - `state.side` - "left" or "right": where the arrows are
    const draw = function(ctx, width, state) {
        ctx.fillStyle = "#14151c";
        ctx.fillRect(0, 0, width, HEIGHT);
        ctx.fillStyle = "#2a2d3a";
        ctx.fillRect(0, HEIGHT - 3, width, 3);

        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.textBaseline = "middle";

        state.players.forEach((p, i) => {
            const left = i === 0;
            ctx.textAlign = left ? "left" : "right";
            ctx.fillStyle = p.colour;
            ctx.fillText(p.name, left ? 14 : width - 14, 16);
            ctx.fillStyle = p.god ? "#f2c14e" : "#9a958a";
            ctx.fillText(p.god ? "GOD MODE" : "DRAGON HP", left ? 50 : width - 50, 16);
            drawBar(ctx, left ? 14 : width - 194, 26, 180, p.hp, p.colour);
            drawArrows(ctx, left ? 214 : width - 214, 26, p.arrows, p.maxArrows, left ? "left" : "right");
        });

        const t = Math.max(0, Math.ceil(state.timeLeft));
        const mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, "0");
        ctx.textAlign = "center";
        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillStyle = t <= 30 ? "#ff6b5a" : "#e6e2d8";
        ctx.fillText(mm + ":" + ss, width / 2, 18);
        ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillStyle = "#c9d2e0";
        ctx.fillText("ARROWS: " + (state.side === "left" ? "◀ LEFT" : "RIGHT ▶"), width / 2, 36);
    };

    return { HEIGHT, draw };
})();
