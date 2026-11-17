# HiroGlifx

**A tiny, extensible language for interactive web apps, animations, and browser workflows.**

HiroGlifx is a JavaScript-powered experimental language with a legacy symbolic VM and a newer beginner-friendly scroll runtime. It is a **local development preview**, not a production-hardened framework.

## Quick start

Requires Node.js 20+.

~~~bash
git clone https://github.com/dryty93/HiroGlifx_JS.git
cd HiroGlifx_JS
node hiro.js init my-app
node hiro.js dev my-app
~~~

Open **http://127.0.0.1:3000**. Editing my-app/app.scroll automatically reloads the browser. Add pages/about.scroll for the /about route. The CLI also supports **node hiro.js check my-app** to validate scroll parsing. The new UI CLI has no external dependencies.

## Canonical variable syntax — Phase 13

The **new canonical-expression subset** brings typed variable declarations back to HiroGlifx's symbolic `.Main = ()` style. A shorthand may execute immediately or return a reusable object:

```scroll
.Main = ()
    # speed = 5;
    $ title = "HiroGlifx";
    ? active = true;
    & hero = box("hero", 90, 90, "blue");
    & intro = bounce(hero, 900);
    intro.loop();
    intro.play();
    intro.pause();
    intro.reverse();
    spin(hero, 500);
    break;
```

**Rule:** `bounce(hero, 900);` plays immediately. `& intro = bounce(hero, 900);` saves an animation controller and waits for `intro.play()`. Symbols: `#` number, `$` string, `?` boolean, `&` object.

To test: run `python3 -m http.server 8000 --bind 127.0.0.1`, then open [canonical-playground.html](canonical-playground.html) locally. Alternatively replace your `app.scroll` with canonical `.Main = ()` code and run `node hiro.js check my-app` and `node hiro.js dev my-app`; the dev server now dispatches to the corresponding runtime.

This is a **restricted migration foundation** rather than full parser unification. Legacy `.Main = [ ... ]` pages, blueprint methods, packages, and creative-game scripts retain their existing runtimes. Canonical classes, events and backend/game object adapters require further work; see [canonical syntax specification](docs/canonical-syntax.md).

## Full HiroGlifx gameplay: all six Arcade games (Phase 20)

**Pong, Snake, Breakout, Star Defense, Chess, and Tic-Tac-Toe now implement their game rules and drawing directly in `.scroll`**, not JavaScript launchers. The browser host uses the shared [game-script interpreter](runtime/scroll-game-runtime.js) for input, mathematics, collections, control flow, and Canvas 2D output. Each selected game displays its *entire executable source* in [HiroGlifx Arcade](arcade.html). Switch to **JavaScript runtime** to inspect the generic interpreter separately.

### Complete playable `.scroll` programs

| Game | Full HiroGlifx source | Mechanics in `.scroll` |
| --- | --- | --- |
| Pong | [pong.scroll](examples/arcade/pong.scroll) | Paddle controls, opponent AI, scoring and collisions |
| Snake | [snake.scroll](examples/arcade/snake.scroll) | Direction, food spawning, growth, self/wall collisions |
| Breakout | [breakout.scroll](examples/arcade/breakout.scroll) | Paddle, ball, bricks, lives, win/loss |
| Star Defense | [star-defense.scroll](examples/arcade/star-defense.scroll) | Enemy movement, projectiles, hits, scoring |
| Chess | [chess.scroll](examples/arcade/chess.scroll) | King safety, legal moves, castling, en passant, promotions, mate, stalemate, undo and automatic draw rules |
| Tic-Tac-Toe | [tic-tac-toe.scroll](examples/arcade/tic-tac-toe.scroll) | 3×3 grid, turn handling, legal placement and win/draw detection |

Run locally:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/arcade.html
```

### Language features added

```scroll
.Main = ()
    & items = array(5, 7, 9);
    # score = 0;
    : sumItems() = [
        let total = 0;
        for i from 0 to len(items) [
            total = total + get(items, i);
        ]
        return total;
    ]
    : tick(dt) = [
        score = sumItems();
    ]
    : draw() = [
        clear("#0b1730");
        text("SCORE " + score, 400, 260, 32, "#e6f7ff");
    ]
    break;
```

Arrays, indexed operations, nested bounded `for`/`while` loops, custom methods, local variables, `return`, click/key events, and safe math/string/collection functions are now part of the **game-script interpreter**. A per-frame instruction and loop budget prevents unbounded execution. The interpreter does not use `eval` or expose arbitrary JavaScript. This is an expanding canonical-style subset; it has not yet been fully unified with every older HiroGlifx syntax/runtime.

**Chess is local human-vs-human** (no chess AI or network play). These six games remain browser prototypes, with their complete game behavior now authored in HiroGlifx. See [Native game syntax](docs/native-game-scripts.md) and [Arcade documentation](docs/arcade.md).

**Blockhaven's source viewer** continues to show its actual `.scroll` initialization, but the voxel game logic is still in host JavaScript; it has *not* been ported to native `.scroll` game scripts.


## Polymorphism: import a complex HiroGlifx game library

The new [Polymorphism Lab](polymorphism.html) runs two complete `.scroll` games that import a reusable [enemykit](examples/packages/enemykit/main.scroll) package. The library defines `.Enemy = (Unit)`, `.Scout = (Enemy)`, `.Brute = (Enemy)`, and `.Medic = (Enemy)`, with typed fields and different behavior overrides.

A short application can declare `.Boss = (Brute)` and override only `: update(self,dt)`. A single `send(enemy,"update",dt)` dynamically selects the correct inherited or overridden implementation. This is true runtime polymorphism, not a JavaScript switch over enemy types. The [Arena](examples/polymorphism/arena.scroll) and [Phantom Gauntlet](examples/polymorphism/gauntlet.scroll) both import the same complex library.

```bash
node hiro.js init my-arena
node hiro.js package add my-arena examples/packages/enemykit
cp examples/polymorphism/arena.scroll my-arena/app.scroll
node hiro.js check my-arena
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/polymorphism.html
```

The package is SHA-256 lockfile-verified. The generic `hiro dev` page renderer does not yet host these Canvas game scripts. See [polymorphism documentation](docs/polymorphism.md) for details and limitations.

## Native HiroGlifx gameplay rules for both 3D games (Phase 22)

Skybound and Blockhaven now load **executable, game-specific HiroGlifx `.scroll` rules**, not only the world-building initialization:

- [Skybound's complete native gameplay](examples/skybound-gameplay.scroll): stage scores and bonuses, per-stage movement and jump tuning, moving-platform and spinner motion, disappearing/reappearing platform timing, death and victory rewards. Its existing [level source](examples/skybound-course.scroll) places the full obstacle course.
- [Blockhaven's native gameplay](examples/blockhaven-gameplay.scroll): terrain height equations, biomes/surface materials, deterministic tree placement, mining and placing policies, and builder score. Its [world setup](examples/blockhaven.scroll) initializes the voxel engine.

The game pages provide **source viewers for both the gameplay rules and the level/world setup**. JavaScript continues to supply the reusable 3D renderer, world storage, and physical collision/input primitives. This is a meaningful game-rules migration, **not a claim that the underlying physics or Babylon/voxel engines themselves are HiroGlifx source**. See [implementation details and tests](docs/native-3d-game-rules.md).

## Blockhaven — original 3D voxel sandbox (browser)

**[Play Blockhaven](blockhaven.html)** to explore a finite, procedurally generated world, mine and place blocks, switch materials and save the world in your browser. It uses Babylon.js for first-person WebGL rendering and canonical HiroGlifx variables to create the world.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/blockhaven.html
```

```scroll
.Main = ()
    & world = voxel_world(42);
    & terrain = voxel_generate(world, 10);
    & explorer = voxel_player(world, 0, 0);
    break;
```

Use WASD/arrows, Space to jump, mouse look, left click to mine, right click to place, and 1–7 to select a material. Local save/load uses browser storage. The original game has no connection to Minecraft or Mojang. The limited world and per-voxel meshes are an initial creative sandbox, **not** a feature-complete survival/crafting game or an optimized chunked voxel renderer. See [Blockhaven docs](docs/blockhaven.md).

## Skybound Obby — flagship browser experience

**[Play Skybound](skybound.html)** or explore the **[HiroGlifx Showcase](showcase.html)** to discover browser projects. Skybound is an original five-stage single-player obstacle course made with canonical `.Main = ()` HiroGlifx classes and a Babylon.js renderer, and includes a polished UI with a timer, deaths, checkpoint feedback, personal bests, sound cues, touch buttons and restart.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/showcase.html
# or http://127.0.0.1:8000/skybound.html
```

Gameplay systems include a moving-platform stage, temporary disappearing platforms, rotating moving lava hazards, a five-stage progression model, and basic buffered/coyote jumps. The game source is `examples/skybound-course.scroll`, and [Obby Builder](obby-playground.html) opens the same course for editing.

**Current scope:** This is a refined browser prototype, not a claim of Roblox-level production polish, multiplayer, account persistence or an advanced physics controller. It still needs real-device usability and frame-rate testing, character animation, gamepad accessibility, full asset/audio pipelines, deterministic replays, and hosted performance verification. See [Skybound Showcase guide](docs/skybound-showcase.md).

## Build a Roblox-style obstacle course — Browser Obby Builder

The new [Obby Builder](obby-playground.html) demonstrates a single-player Babylon.js tile obstacle game written in the **canonical `.Main = ()` syntax**. It includes platform jumps, hazards, checkpoints, finish detection, and a live course editor. It is an original browser game, not an integration with Roblox.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/obby-playground.html
```

```scroll
.Runner = ()
    # speed = 6;
    : leap = self.jump();
    break;
.Main = ()
    & world = obby_world();
    & ground = obby_tile(world, "start", 0, 0, 0, 4, "solid");
    & end = obby_tile(world, "end", 5, 0, 0, 3, "finish");
    & hero = obby_player(world, "hero", 0, 2, 0);
    & runner = bp_create("Runner", hero);
    @ win = obby_event(world, "finish");
    break;
```

Blueprints now support basic typed defaults, one-parent inheritance and explicitly whitelisted single-expression methods. Typed `@` references can track game events through `.count()` and `.occurred()`. This is a restricted canonical game-oriented subset, not full object-oriented language parity. See [Obby Builder documentation](docs/obby-builder.md).

## Browser games, 3D scenes and video — Creative Studio

Open `creative-studio.html` from a local static server to experiment with simple playable scenes, animation tracks and browser-recorded WebM videos. Choose **Canvas 2D**, **Phaser 4**, or **Babylon.js 3D**. The latter two are real browser engines loaded on demand.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/creative-studio.html
```

2D game example:

```scroll
scene 640 360 "#101827"
sprite player 30 165 42 42 "#60a5fa"
sprite coin 550 165 35 35 "#facc15"
control ArrowRight player 20 0
control ArrowLeft player -20 0
goal player coin
tween coin y 70 2000 0
```

3D scene example:

```scroll
world 3d #101827
cube hero 0 0 0 3 #60a5fa
rotate hero y 1.5
```

Use **Play**, **Pause**, or scrub the timeline; **Record WebM** uses the browser's MediaRecorder API when available. This is an extensible foundation—not yet a complete game production pipeline, physics engine, multiplayer platform, cinematic editor or MP4 encoder. See [Creative Studio documentation](docs/creative-studio.md).

## Reusable `.scroll` packages (Phase 11)

Developers can now distribute **pure HiroGlifx classes and abilities** as local libraries—no core compiler edits or JavaScript plugin code needed.

```bash
node hiro.js init my-app
node hiro.js package add my-app examples/packages/sparkfx
node hiro.js package list my-app
node hiro.js check my-app
node hiro.js dev my-app
```

Use the library from any `.scroll` page:

```scroll
import sparkfx

.Main = [
  use PartyCard hero;
  button play "Celebrate";
  on click play => animate hero-badge spin 750;
]
```

A package contains `hiro-package.json` and `main.scroll`, containing reusable `extends`, `ability`, and component definitions. HiroGlifx copies it to your project's `packages/` directory, pins version and SHA-256 in `hiro.lock.json`, and resolves transitive imports with collision and cycle checks. The local dev server compiles those imports before rendering.

Run `node hiro.js package remove my-app sparkfx` to uninstall (unless another package depends on it). **This phase is local-only; it is not an npm/public registry or a signed/publisher-verified ecosystem.** Packages may contain UI actions and are treated as trusted source code. See [package documentation](docs/package-system.md).

## Build animated interfaces in a few commands

~~~scroll
.Main = [
  page "My HiroGlifx App";
  box logo 96 96 blue;
  center logo;
  float logo 1200 infinite;
  button celebrate "Celebrate";
  when click celebrate => spin logo 700;
  link about "About" /about;
]
~~~

Easy animation presets: **bounce, spin, pulse, fade, slide, shake, flip, float, pop, swing, zoom**. Durations are milliseconds, with optional infinite repetition. These compile to the Web Animations API; no arbitrary JavaScript evaluation is needed.

## Extend classes directly in HiroGlifx

Component classes can extend another component. A descendant may replace an inherited element declaration with the same command and ID.

~~~scroll
extends FancyCard Card

.Main = [
  use FancyCard first;
  use FancyCard second;
]

.Card = [
  text heading "Basic card";
  box badge 70 70 blue;
  center badge;
]

.FancyCard = [
  text heading "Custom card";
  pulse badge 1200 infinite;
]
~~~

The instances get independent IDs such as first-badge and second-badge. Inheritance supports one parent, detects cycles, and has a bounded expansion depth. This is component inheritance, not complete general-purpose object-oriented programming.

### Define simple reusable abilities

~~~scroll
ability celebrate target => spin {target} 700 | color {target} purple

.Main = [
  box badge 90 90 blue;
  do celebrate badge;
]
~~~

Abilities are command recipes written in HiroGlifx itself. Separate actions with a vertical bar. They execute in order, but animation playback may overlap. There is no arbitrary source-code eval.

## Simplified browser actions

~~~scroll
web.open "https://example.com"
web.wait "h1"
web.read "h1"
web.snap "example.png"
~~~

| Command | Operation |
| --- | --- |
| web.open URL | Navigate |
| web.click selector | Click |
| web.fill selector value | Fill an input |
| web.wait selector | Wait for visible element |
| web.hover selector | Hover |
| web.press selector Enter | Press key |
| web.scroll selector | Scroll into view |
| web.read selector | Extract text |
| web.snap file.png | Screenshot |

Browser commands require an injected Playwright adapter. The permissioned adapter provides domain allowlisting and approval for clicks, fills, and keypresses; it is not a complete network sandbox. The visual playground does not allow browser actions.

## Extend the runtime from trusted host integrations

External tools, libraries and game adapters can be registered under a namespaced command. For example:

~~~javascript
const { ExpressiveRuntime } = require("./runtime/expressive-runtime");
const runtime = new ExpressiveRuntime();
runtime.registerCapability("game", {
  say: ({args}) => console.log("Game:", args.join(" "))
});
await runtime.execute('game.say "Hello"');
~~~

A scroll cannot execute arbitrary JavaScript: the host must deliberately provide any new capability.

## Minecraft and other games

HiroGlifx could integrate through three separate adapters:

- **Minecraft Java + Fabric:** A Fabric mod listens for game events and forwards authorized commands to a controlled bridge.
- **Minecraft Bedrock:** An add-on using the official Minecraft Script API implements game-side actions, with an appropriately secured bridge.
- **Minecraft Java bot:** Mineflayer can control an authorized bot on a supported server; a HiroGlifx extension could offer game.chat or game.follow commands.

These are design paths, **not Minecraft functionality currently implemented**. They require game-version-specific adapters, permissions, authentication and integration tests.

## Repository structure

| File | Purpose |
| --- | --- |
| hiro.js | init, dev, check CLI |
| runtime/dev-server.js | Local page routing and live reload |
| runtime/expressive-runtime.js | Class inheritance, abilities, shortcuts, extension registry |
| runtime/app-runtime.js | State, forms and components |
| runtime/scroll-runtime.js | UI and animations |
| runtime/browser-policy.js | Browser approvals and audit |
| runtime/postgres-store.js | PostgreSQL storage |
| runtime/owned-api-server.js | Authenticated user-owned records |
| playground-sandboxed.html | Restricted visual playground |
| HG_VM.js / Parser.js | Original symbolic runtime |

## Development and limitations

~~~bash
node --test tests/*.test.js
~~~

The CLI serves trusted local scroll files and supports full-page route navigation; it is not a production backend launcher. Reloads reset in-memory UI state. The new application syntax is a narrow subset of the original VM, which remains intact. Production use still requires hardened identity, rate limiting, backup/restore, strict browser network isolation and deployment testing.

See the deployment checklist at docs/phase9-deployment-readiness.md.

License: Apache-2.0 (see LICENSE).
