# HiroGlifx Arcade — Complete native .scroll gameplay

HiroGlifx `.scroll` source now implements the complete rules and drawing for all six Arcade examples: Pong, Snake, Breakout, Star Defense, Chess, and Tic-Tac-Toe. JavaScript still implements the **generic language interpreter** and browser Canvas/input integration; game-specific rules are no longer executed from the older `runtime/arcade-games.js` or `runtime/arcade-chess.js` modules.

## Source is always available

The [Arcade](../arcade.html) loads the real `examples/arcade/<game>.scroll` file and renders the complete source alongside gameplay. The *JavaScript runtime* tab fetches `runtime/scroll-game-runtime.js` to distinguish the implementation of the language from the game authored in the language.

Full authored game sources:

- [Pong](../examples/arcade/pong.scroll) — physics, paddles, opponent AI and scoring
- [Snake](../examples/arcade/snake.scroll) — arrays, food, collision, grid logic
- [Breakout](../examples/arcade/breakout.scroll) — bricks, ball, bounce and lives
- [Star Defense](../examples/arcade/star-defense.scroll) — bullets, enemy formations and shooting
- [Chess](../examples/arcade/chess.scroll) — a 64-square board, legal moves, check, checkmate, castling, en passant, promotions, stalemate, insufficient material, automatic draw conditions, undo
- [Tic-Tac-Toe](../examples/arcade/tic-tac-toe.scroll) — click handling, turns, and win/draw detection

## Interpreter capabilities

Start with `.Main = ()` and end with `break;`. Declare typed globals using `#` number, `$` string, `?` boolean, and `&` array. Define `: tick(dt) = [ ... ]` and `: draw() = [ ... ]`. Optional methods: `: init()`, `: click(x, y)`, `: keyEvent(code, pressed)`, and custom `: method(arg1, ...)` methods. Every method has a bounded instruction budget; recursive calls are depth-limited.

Control flow: `if condition [ ... ]`, `for i from start to end [ ... ]` (exclusive end), `while condition [ ... ]` (bounded), `let local = expr;`, global or local assignment, `return value;`, `break;` in a loop, and expression statements that call functions.

Expressions: finite numbers, strings, booleans, arithmetic, comparisons, logic, calls and parentheses. There are **no dynamic JavaScript properties, eval, Function, imports, direct DOM access, or arbitrary browser navigation**.

Built-in functions: numeric `abs`, `min`, `max`, `clamp`, `floor`, `ceil`, `round`, `sign`, `sqrt`, `sin`, `cos`; arrays `array`, `filled`, `chars`, `get`, `set`, `len`, `clone`, `push`, `unshift`, `pop`, `shift`, `removeAt`, `char`, `indexOf`; strings `lower`, `upper`; seeded `random`; input `key(name)` and `pointer("x"|"y")`. Canvas draw-only calls: `clear`, `rect`, `circle`, and `text`.

## Chess scope

The rules are *implemented in Chess's `.scroll` file*, including king safety during move validation, castling through non-attacked squares, en passant, all four promotion types and endgames. The example is local two-player, with an Undo control. It has no chess AI, clocks, PGN export, online multiplayer, or full claim-based draw interface. This is a chess demo and game-language stress test, not a replacement for an established chess engine.

## Validation

Run `node --test tests/native-arcade-all.test.js tests/scroll-game-runtime.test.js` to check real native gameplay, including chess special moves and safety budgets. `e2e/arcade-smoke.js` plays through browser input, verifies code provenance and captures screenshots. The standard project checker can validate game scripts; hosting a new game requires a Canvas game host similar to `arcade.html`.

## Important distinction for the wider platform

Skybound and Blockhaven still have JavaScript game-specific rules and a HiroGlifx `.scroll` object configuration layer. The *Arcade's six games* are genuinely authored in `.scroll`; that architecture is the template for moving more gameplay systems into the language. Reuse the generic native interpreter rather than making one JavaScript factory per game.
