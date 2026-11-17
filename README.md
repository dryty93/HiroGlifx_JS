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
