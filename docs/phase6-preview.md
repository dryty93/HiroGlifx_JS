# Phase 6 — Sandboxed visual playground

From the project root, serve the static files:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/playground-sandboxed.html` and click **Run preview**. The left editor executes a narrow subset of HiroGlifx commands in the right-hand preview frame.

The preview iframe uses `sandbox="allow-scripts"` **without** `allow-same-origin`. The parent sends code using postMessage, checks message sender and a per-run nonce; the isolated frame validates commands before passing them to `AppRuntime`. Browser automation, data, routes, and arbitrary JavaScript are explicitly excluded, and source/command limits apply.

**This is not yet a public multi-tenant untrusted-code sandbox.** The iframe can still load trusted scripts and potentially make network requests. For hosted use, add strict CSP, an isolated preview origin, network controls, and real-browser integration tests. Run only trusted examples until those defenses are audited.

```bash
node --test tests/*.test.js
```
