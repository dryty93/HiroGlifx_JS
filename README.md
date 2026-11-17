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

**Rule:** `bounce(hero, 900);` plays at once. `& intro = bounce(hero, 900);` creates a reusable controller, but doesn't play until `intro.play()` is called. Symbol meanings: `#` number, `# HiroGlifx

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

 string, `?` boolean, `&` object.

To test: run `python3 -m http.server 8000 --bind 127.0.0.1`, then open [canonical-playground.html](canonical-playground.html) locally. Alternatively replace your `app.scroll` with canonical `.Main = ()` code and run `node hiro.js check my-app` and `node hiro.js dev my-app`; the dev server now dispatches to the corresponding runtime.

This is a **restricted migration foundation** rather than full parser unification. Legacy `.Main = [ ... ]` pages, blueprint methods, packages, and creative-game scripts retain their existing runtimes. Canonical classes, events and backend/game object adapters require further work; see [canonical syntax specification](docs/canonical-syntax.md).

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
