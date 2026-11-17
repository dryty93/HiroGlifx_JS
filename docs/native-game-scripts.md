# HiroGlifx Native Game Scripting — Phase 19

## What is HiroGlifx and what is JavaScript?

The .scroll files are the authored programming language. The JavaScript interpreter executes this language and the browser supplies Canvas 2D rendering. In earlier Arcade examples, the source was just an entrypoint that launched a JavaScript implementation of the game. That is **not** enough to say the game itself is written in HiroGlifx.

**Pong is the first fully game-scripted example.** Its full logic now lives in [`examples/arcade/pong.scroll`](../examples/arcade/pong.scroll). It defines all simulation variables, computer paddle logic, wall and paddle collision, scoring, victory checks, and complete rendering calls. The host (`runtime/scroll-game-runtime.js`) does not contain Pong's rules.

## Supported executable syntax

- `.Main = ()` begins the program; `break;` finishes it
- `# number = 1;`, `$ label = "text";`, `? active = true;` declare typed state
- `: tick(dt) = [ ... ]` is called once per game frame
- `: draw() = [ ... ]` describes the Canvas display
- `variable = expression;` modifies already-declared state with type checking
- `if expression [ ... ]` branches; conditions may nest, bounded to eight levels
- Arithmetic: `+ - * / %`; comparisons: `< > <= >= == !=`; logic: `&& || !`
- Safe built-ins: `abs`, `min`, `max`, `clamp`, `floor`, `ceil`, `round`, `sign`, `sqrt`, `key(name)`, `pointer(axis)`
- Canvas drawing actions are restricted to `draw()`: `clear`, `rect`, `circle`, and `text`

No JavaScript evaluation, dynamic property access, unbounded loop statements, reflective constructors, arbitrary networking or filesystem access. The interpreter enforces a maximum program length and instruction budget for each frame. This is a first language subset, not full canonical compiler unification.

## How to try the real source

Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root, then open `http://127.0.0.1:8000/arcade.html?game=pong`. On the right, the source viewer shows **every executable line** of the HiroGlifx Pong program.

Changes to the `examples/arcade/pong.scroll` file will load on a page refresh. Change `# winningScore = 7` to `# winningScore = 3`, or modify `# paddleSpeed = 420`, to alter gameplay without changing JavaScript.

## Other games

Snake, Breakout, Star Defense, Chess, and Tic-Tac-Toe still have JavaScript-backed mechanics in `runtime/arcade-games.js` or `runtime/arcade-chess.js`; their `.scroll` files currently instantiate these adapters. The source viewer labels these honestly. Migrating those games requires state containers (arrays/grids), loops, event handlers, and a richer object model. Chess also needs complex legal-move generation and would benefit from implementing list/board abstractions first.

## Tests

Run `node --test tests/scroll-game-runtime.test.js`. Browser coverage is in `e2e/arcade-smoke.js`. The tests verify that Pong's movement, computer paddle, collision, scoring and renderer are executed from .scroll state and methods.
