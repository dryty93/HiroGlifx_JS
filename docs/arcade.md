# HiroGlifx Arcade and source transparency

## Play six games

Open `arcade.html` using a local HTTP server, such as `python3 -m http.server 8000 --bind 127.0.0.1`, then visit `http://127.0.0.1:8000/arcade.html`.

Arcade includes: **Pong** (player vs computer), **Snake**, **Breakout**, **Star Defense** (an original Galaga-style fixed-screen shooter), **Chess** (local two-player, not an AI opponent), and **Tic-Tac-Toe** (local two-player). These are compact prototype games, not licensed ports with external copyrighted assets.

Each game has an inspectable `examples/arcade/<id>.scroll` source file. Selecting another game loads and executes that exact canonical HiroGlifx program:

```scroll
.Main = ()
    $ title = "Pong";
    & game = arcade_game("pong");
    break;
```

The `arcade_game` factory is registered by the trusted browser host in `runtime/arcade-canonical.js`, returning a reusable model from `runtime/arcade-games.js` or `runtime/arcade-chess.js`. This is a proof of HiroGlifx's **extensibility** and symbolic variables; the underlying game mechanics remain JavaScript host implementations, not yet pure `.scroll` gameplay loops. The viewer points to the source file and shared engines to make that distinction clear.

## Controls

| Game | Controls |
| --- | --- |
| Pong | W/S, Up/Down or pointer movement |
| Snake | Arrow keys or WASD |
| Breakout | A/D, Left/Right or pointer movement |
| Star Defense | A/D or Left/Right to move, Space to fire |
| Chess | Click a piece and then a destination, press Q/R/B/N to select promotion; local two-player |
| Tic-Tac-Toe | Click or tap an empty square; local two-player |

All games feature restart controls; real browser game sessions can be paused. Chess supports castling, en passant, legal promotions, checks, checkmate, stalemate and common automatic draw conditions. It does not implement an AI or a complete online chess service.

## Blockhaven source viewer

`blockhaven.html` now displays the actual `examples/blockhaven.scroll` file in an expandable code panel, with copy functionality and links to the voxel world and Babylon renderer modules. The source is fetched, not reconstructed or fabricated.

## Engineering structure

- `runtime/arcade-games.js`: independent deterministic game state and Canvas rendering for five small genres
- `runtime/arcade-chess.js`: rules-aware local two-player chess model
- `runtime/arcade-canonical.js`: factory and typed HiroGlifx object methods
- `examples/arcade/*.scroll`: six executable canonical HiroGlifx programs
- `arcade.html`: game selector, controls, source viewer and visual game host
- `tests/arcade-games.test.js`: model and legal chess tests
- `e2e/arcade-smoke.js`: real Chromium user interactions and visual snapshots

## Next steps

Build reusable `.scroll` game components, event handling, stateful methods and a genuine scriptable scene model; then introduce computer chess, enhanced mobile controls, sound and gamepad support. For larger games, separate rendering and simulation and measure performance across devices. Small-game showcases are a useful language regression suite but are not a replacement for an integrated compiler.
