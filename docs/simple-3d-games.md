# Simple 3D Games with HiroGlifx

Build a **real playable third-person 3D obstacle course** by writing readable directions in a `.scroll` file. No JavaScript, shader code, physics loops, WebGL boilerplate, or manual scene setup is needed to author a game.

This is an **original example inspired by the gameplay style** in the supplied short video, not a recreation of the game's copyrighted assets or exact design.

## Play and edit in one command

From the repository root:

```bash
node hiro.js game 8000
```

Open **http://127.0.0.1:8000/simple-obby.html**. The browser requires internet access to load the Babylon.js rendering engine from its CDN. The game has an integrated text editor; change the course, then click **Build & Play My Game**. Changes take effect in the actual 3D physics world. They stay in the editor until you save them elsewhere.

The original course is `examples/simple-obby/soda-splash.scroll`. To validate a file:

```bash
node hiro.js game check examples/simple-obby/soda-splash.scroll
node hiro.js game new my-first-game.scroll
```

`game new` writes a new editable starter without overwriting existing files. You can paste its contents into the browser editor or edit the project's sample course file.

## The whole game is simple directions

```scroll
game "Soda Splash"
theme soda
speed 7
jump 10
player at 0 2 0

stage 1 "BUBBLE RUN"
platform start at 0 0 0 size 5
platform ice1 at 4.5 0 0 size 3.5
checkpoint safe at 9 0 0 size 4

stage 2 "MOVING ICE"
moving glide at 14 0 0 size 3 axis z range 1.2 period 3
vanishing flash at 18 0 0 size 3 delay 1.5
spinner blade at 22 0 0 size 2 range 1.3 period 3
finish goal at 27 0 0 size 5
```

The compiler recognizes:

| Direction | Purpose |
| --- | --- |
| `game "Title"` | Name your game |
| `theme sky/soda/candy/neon/ice` | Choose a predefined world palette |
| `speed 7` and `jump 10` | Tune player control and jumps |
| `player at X Y Z` | Set the starting location |
| `stage 1 "Title"` | Start a course stage (1–5 consecutive stages) |
| `platform ID at X Y Z size S` | Solid walkable surface |
| `lava ID at X Y Z size S` | Hazard that sends the player to checkpoint |
| `checkpoint ID at X Y Z size S` | Save progress on contact |
| `moving ID at X Y Z size S axis z range R period T` | Moving platform with predictable oscillation |
| `vanishing ID at X Y Z size S delay T` | Platform that temporarily disappears |
| `spinner ID at X Y Z size S range R period T` | Moving hazard |
| `finish ID at X Y Z size S` | Finish line and victory event |

The names are unique IDs consisting of letters, numbers and underscores. Coordinates are in world units. Valid ranges are checked with precise source line errors. Maximum 100 course objects. Game directives do not accept JS, file paths, network calls, arbitrary code or executable strings.

## What is native and what is reused

- **Your course:** the source game, theme, level titles, positions, size, movement ranges and timing are all described in readable HiroGlifx.
- **Compiler:** `runtime/simple-obby.js` parses and validates the directions and emits native canonical HiroGlifx `.Main = ()` definitions using `obby_world`, `obby_tile`, `obby_moving`, `obby_vanish`, `obby_spinner` and `obby_player`.
- **Actual mechanics:** `runtime/skybound-world.js` and `runtime/obby-world.js` provide frame-rate independent movement, collision, jumps, moving platform carry, vanishing hazards, checkpoints, reset, and victory handling.
- **3D renderer:** `runtime/obby-babylon.js` provides the shared Babylon.js canvas renderer, a stylized 3D avatar, animation and third-person follow camera. Its new theme palette is reusable by other HiroGlifx games.
- **The browser host:** `simple-obby.html` supplies an editor, sound effects, keyboard and touch controls, score and timer.

The output is a playable prototype, **not a claim of Roblox-equivalent production quality**. Platform collision is based on top-surface checks, not a full general rigid-body system. There is no mesh asset importer, multiplayer session, immersive first-person controller, procedural voice ASMR generator, cloud publishing or visual drag/drop authoring. The player geometry and themed 3D platforms are stylized primitives; you can change the game shape and difficulty through .scroll.

## Verification

```bash
node --test tests/simple-obby.test.js
node --test tests/*.test.js
```

The tests validate canonical compilation, actual runtime physics objects, all supported course operations, user input validation and game page wiring. Browser smoke and screenshots are handled by `e2e/simple-obby-smoke.js` when Playwright/Chromium is installed.
