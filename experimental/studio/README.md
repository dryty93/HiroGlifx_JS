# HiroGlifx Browser Studio — Local MVP

Run from the repository root:

```bash
node experimental/studio/server.js
```

Open http://127.0.0.1:8787 in a browser.

Features: edit a single `.scroll` source, analyze blueprint/import/instance relationships, execute the deterministic `Main.run()` entrypoint, and inspect output/trace.

Security: binds to loopback only by default, uses no external packages, and does not expose AI credentials or external tools. This is **not a secure sandbox for untrusted code** and must not be deployed publicly. The execution endpoint is synchronous and cannot forcibly interrupt CPU-bound infinite loops; use only trusted source until execution is isolated in a worker process. Multi-file browser editing, AI execution, graph visualization, and live debugging are future work.
