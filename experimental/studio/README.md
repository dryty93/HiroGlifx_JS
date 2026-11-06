# HiroGlifx Browser Studio — Local MVP

Run from the repository root:

```bash
node experimental/studio/server.js
```

Open http://127.0.0.1:8787 in a browser.

## New syntax

Indentation-first .scroll is the default editing example. Use 4 spaces per level,
a colon after method/if/else/while headers, and one statement per line. Existing
brace-based programs also work. See ../SYNTAX.md for examples.

## Features

- Edit a single .scroll source in the browser.
- Tab inserts four spaces; Enter copies line indentation and adds one level after a colon.
- Command/Control + Enter runs Main.run(). Analyze checks syntax without running.
- Blueprint/import/instance explorer with deterministic result and trace output.
- Local browser draft autosave, with a confirm-before-replace sample button.

## Important limitations

- The Studio is **local-only** by default: it listens on 127.0.0.1.
- It is **not a secure sandbox for untrusted code**. The synchronous interpreter can
  block the Node event loop. Do not expose this server publicly; isolate user
  code in worker processes before public hosting.
- No built-in AI provider keys, remote tool execution, cloud persistence, or
  multi-file editing. The sample uses deterministic methods only.
- Source saved in your browser's localStorage is not backed up to disk. Copy
  your code into a .scroll file for durable storage; clearing browser storage
  removes the local draft.
- Run Main invokes Main.run() with no arguments. Parameterized methods should
  be called from that wrapper.

## Roadmap

1. Multi-file workspace, file explorer, inline diagnostics, syntax highlighting.
2. Visual agent-dependency graph and navigation from graph nodes to code.
3. Isolated execution runner, breakpoints, variable inspection and trace replay.
4. Capability approval UI, model provider configuration and usage budgets.
5. Authenticated project storage, GitHub sync and sharing.
