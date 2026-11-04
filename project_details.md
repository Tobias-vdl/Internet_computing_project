# Project Details – Dragon's Lair Duel

## 1. Title of the Game

**Dragon's Lair Duel**

---

## 2. Game Home Page

The home page is the entry point of the game and contains:

- **Game description and instructions**
  - A short introduction to the game.
  - The controls and how to win.
  - How swords, fireballs and respawning work.
- **Player registration**
  - New players create an account with a username, display name, avatar and password.
  - The form validates the input:
    - No field may be empty.
    - The username may only contain letters, numbers and underscores.
    - The username must not already exist.
  - Passwords are hashed on the server before they are stored.
- **Player sign-in**
  - Players sign in with their username and password.
  - Wrong credentials show an error message.
  - The login session is kept with a server-side session, so reloading the page keeps the player signed in.
  - Players can sign out.
- **Player pair-up (lobby)**
  - After signing in, players see a lobby with the online players and a "Find Match" button.
  - A player who clicks it is placed in a waiting queue, and a "Waiting for opponent…" indicator is shown.
  - When a second player joins, the two are paired into their own game room and both browsers move to the game play page.
  - Several pairs can play at the same time in separate rooms.

---

## 3. Game Play Page

### Description

Dragon's Lair Duel is a real-time, two-player competitive dungeon game drawn on an HTML canvas.

- The map is a tile-based dungeon with stone walls forming corridors and chambers.
- A dragon sits in the centre of the dungeon and constantly spits fireballs.
- Both players are trying to slay the dragon, but only one of them can do it, so they compete against each other in real time.
- All interactions are synchronised through WebSocket (Socket.IO), so both players see each other's movements, attacks and deaths almost instantly.

### Things in the Game

- **Players:** two animated knight sprites, one per player.
- **Dragon:** an animated boss in the centre, with a separate HP bar for each player.
- **Fireballs**
  - The dragon launches fireballs that land on random tiles.
  - A warning marker appears on the target tile shortly before impact.
  - A landed fireball burns on that tile for about 4 seconds.
  - A player who walks into a burning tile dies.
- **Swords**
  - Swords spawn only at fixed spawn points.
  - The active spawn side alternates between the left and the right side of the dungeon. This forces both players into the same area and creates confrontations.
  - A sword can be used for 3 attacks.
- **Walls:** stone walls that block movement and shape the dungeon.

### How to Play

- Move with the **arrow keys** or **WASD**.
- Attack with **Space**.
- Pick up a sword by walking onto it.
- Each attack uses one of the sword's 3 uses. An attack can be used in one of two ways:
  - **Next to the dragon:** the attack damages the dragon's HP bar for *you*.
  - **Next to the opponent:** the attack kills the opponent.
- **Dying and respawning**
  - A player who dies from a fireball or from the opponent drops their sword, with its remaining attacks, on the floor.
  - The player respawns at their start position after 5 seconds.
  - After respawning, the player is briefly invulnerable.
- The dragon becomes more aggressive as its HP drops and launches more fireballs at once.

### How to Win / Lose

- The dragon has a separate HP bar for each player.
- The first player to reduce *their* dragon HP bar to zero slays the dragon and **wins**. The other player **loses**.
- A normal game lasts around 2–3 minutes.
- If the dragon has not been slain after **3 minutes**, the player who has dealt the most damage to the dragon wins.

### Graphics and Sound

- The game uses sprite sheets drawn on an HTML canvas.
- Sound effects:
  - fireball impact
  - sword pickup
  - sword hit
  - player death
  - victory
- Background music plays during the game.

---

## 4. Game Over Page

When the dragon is slain or the time runs out, both players are shown the game over page. It contains:

- **The winner** of the game.
- **Statistics for each player:**
  - damage dealt to the dragon
  - swords collected
  - attacks used
  - opponent kills
  - deaths (by fireball / by opponent)
  - total time played
- **Overall player ranking**
  - A leaderboard stored on the server across all games.
  - Players are ranked by number of wins.
  - The leaderboard also shows each player's fastest win time and total dragon damage.
- **Buttons**
  - **Play Again** starts a rematch against the same opponent.
  - **Back to Home** returns to the lobby.

---

## 5. Cheating

- Pressing the **G** key ("Ghost mode") toggles the cheat mode **on and off**.
- **While cheat mode is on**
  - The player can **walk through walls**.
  - The player can therefore reach sword spawns and the dragon much faster than the opponent, and win easily.
  - A "GHOST MODE ON" label is shown on the cheating player's screen.
- **Disabling:** pressing **G** again turns the cheat mode off, and walls block the player again.
