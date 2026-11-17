# HiroGlifx web/runtime MVP

This is an **additive experimental command runtime**, not a replacement for the original symbolic parser and VM. The old `.scroll` syntax and `HG_VM.js` stay intact. The new runtime intentionally supports one command per line and is designed to grow toward a full-stack application framework.

## Visual web apps

Open `playground.html` in a browser. Edit the scroll source, click **Run scroll**, and interact with the result. The preview runs in the page, so only run trusted scrolls; future work should isolate previews in sandboxed iframes.

```scroll
page "My App"
background "#101827"
text welcome "Hello from HiroGlifx"
box square 90 90 blue
center square
animate square bounce 1300 infinite
button trigger "Spin"
on click trigger => animate square spin 700
```

Supported commands: `page`, `background`, `text`, `box`, `button`, `center`, `color`, `animate`, and `on`. Animation presets: `bounce`, `spin`, `fade`, `pulse`, `slide`. Animation durations are in milliseconds. Event handlers are restricted to `color`, `center`, or `animate`.

## Browser automation

Install Playwright separately in the embedding project. Pass an authenticated/authorized Page into the adapter; HiroGlifx does not automatically log in or bypass site protections.

```js
const { chromium } = require("playwright");
const { Runtime } = require("./runtime/scroll-runtime");
const { createPlaywrightAdapter } = require("./runtime/playwright-adapter");
const browser = await chromium.launch();
const page = await browser.newPage();
const runtime = new Runtime({browser: createPlaywrightAdapter(page)});
await runtime.execute('browser.open "https://example.com"\nbrowser.wait "h1"\nbrowser.screenshot "example.png"');
await browser.close();
```

Commands: `browser.open`, `browser.click`, `browser.type`, `browser.wait`, `browser.screenshot`. URL navigation only permits HTTP(S). The host application must enforce user permissions, domain allowlists, and approval for consequential actions. Screenshots must use a relative PNG path.

## Backend API

Requires Node 18+ (Node 20+ recommended).

```bash
node runtime/run-server.js examples/api.scroll 3000
curl http://127.0.0.1:3000/health
node --test tests/runtime.test.js
```

```scroll
route GET /health json '{"ok":true}'
```

Only literal GET/POST JSON routes are supported. This is a starting HTTP adapter, **not** yet a general backend, database layer, authentication system, router, or production deployment solution. The example server listens on 127.0.0.1 by default.

## Next iterations

1. Shared AST and compiler that integrate these commands with symbolic `.Main`/blueprint syntax.
2. Isolated preview iframe and component state, data binding, lists, forms, responsive layouts.
3. Backend functions, parameterized routes, request body validation, persistent storage, authentication.
4. A permissions model for browser automation with per-domain scopes and approval for consequential operations.
5. CLI, packaging, hot reload, cross-runtime integration tests and production deployment templates.

This initial runtime deliberately does not interpret arbitrary JavaScript supplied by a scroll file.
