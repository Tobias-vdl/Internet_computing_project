# Project Details – Dragon's Lair Duel

## 1. Title of the Game

**Dragon's Lair**

---

## 2. Game Home Page
- **Game description and instructions**
  - Short introduction to the game.
  - The controls and how to win.
  - How swords, fireballs and respawning work.
- **Player registration**
  - New players create an account with a username, and password.
- **Player sign-in**
  - Players sign in with their username and password.
- **After sign_in**
  - Register button gone.
  - Sign-in button gone.
  - Players can sign out.
  - Players can click on join-game-button to find a match.

---

## 3. Game Play Page

### Description

Dragon's Lair is a real-time, two-player competitive dungeon game.

- The map is a tile-based dungeon with stone walls forming corridors and chambers.
- A dragon sits in the centre of the dungeon and constantly spits fireballs.
- Both players are trying to slay the dragon, but only one of them can do it and get the rewards the follows.
- Players can pickup arrows for their bows which they can use to damage the dragon or kill each other.
- Killing another player will result in the player being dead and respawning after a short while. 

### Things in the Game

- **Players:** two different animated knight sprites, one per player.
- **Dragon:** an animated boss in the centre, with a separate HP bar for each player.
- **Fireballs**
  - The dragon launches fireballs that land on random tiles.
  - A warning marker appears on the target tile shortly before impact.
  - A landed fireball burns on that tile for some time before disappearing.
  - A player who walks into a burning tile dies.
- **Arrows**
  - Arrows spawn only at fixed spawn points.
  - Can only hold a maximum of three arrows pr. player.
- **Walls:** stone walls that block movement and shape the dungeon.

### How to Play

- Move with the **arrow keys** or **WASD**.
- Attack with **Space**.
- Pick up a arrow by walking onto it.
- Each attack uses an arrow (if holding any) shooting it in the directiong the player is looking in.
- An arrow hitting:
  - **The dragon:** the attack damages the dragon's HP bar for *you*.
  - **The opponent:** the attack kills the opponent.
- **Dying and respawning**
  - A player who dies from a fireball or from the opponent loses all their arrows.
  - The player respawns at their start position after a short while.
- The dragon becomes more aggressive as its HP drops and launches more fireballs at once.

### How to Win / Lose

- The dragon has a separate HP bar for each player.
- The first player to reduce *their* dragon HP bar to zero slays the dragon and **wins**. The other player **loses**.
- A normal game lasts around 3 minutes.
- If the dragon has not been slain after **3 minutes**, the player who has dealt the most damage to the dragon wins.

---

## 4. Game Over Page

When the dragon is slain or the time runs out, both players are shown the game over page. It contains:

- **The winner** of the game.
- The **Time** elapsed (or if time ran out => say so)
- **Statistics for each player:**
  - damage dealt to the dragon
  - arrows collected
  - arrows hit
  - arrows fired
  - accuracy (hit/fired)
  - opponent kills
  - deaths (by fireball / by opponent / total)
- **Buttons**
  - **Play Again** starts a rematch against the same opponent.
  - **Back to Home** returns to the lobby.

---

## 5. Cheating

- Pressing the **G** key ("God Mode") toggles the cheat mode **on and off**.
- In "God Mode" the cheating player can't die.
