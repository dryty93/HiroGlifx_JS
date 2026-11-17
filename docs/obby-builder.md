# HiroGlifx Phase 14 — Browser Obby Builder

**Purpose:** build a Roblox-style 3D tile obstacle course **inside the browser** using canonical HiroGlifx variables, blueprint inheritance and approved methods. This is an original single-player obstacle course, not a Roblox experience or Roblox Studio integration.

## Play and edit

```bash
git pull origin main
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/obby-playground.html
```

Requires internet to load Babylon.js from its public CDN. Edit the `.scroll` course in the left pane, then click **Build & play**. Use WASD/arrow keys to move, Space to jump, and R to respawn. On touchscreens, use the on-screen directional buttons and Jump.

## Canonical syntax

```scroll
.Actor = ()
    # speed = 6;
    : leap = self.jump();
    break;

.Runner = (Actor)
    # speed = 8;
    : dash = self.move(1, 0);
    break;

.Main = ()
    & world = obby_world();
    & ground = obby_tile(world, "start", 0, 0, 0, 4, "solid");
    & finish = obby_tile(world, "finish", 5, 0, 0, 3, "finish");
    & player = obby_player(world, "hero", 0, 2, 0);
    & runner = bp_create("Runner", player);
    @ won = obby_event(world, "finish");
    break;
```

## Blueprint and event semantics

Blueprints declare typed default values using `#`/`$`/`?` and one-expression methods using `: method = expression;`. Child blueprints use `.Child = (Parent)` and may override inherited defaults and methods. `self` represents the blueprint instance in method expressions. `bp_create` wraps an existing host game object. Only whitelisted `jump`, `move`, `reset`, `value`, `set` and explicitly declared blueprint methods are callable; arbitrary JS reflection remains unavailable.

`@ won = obby_event(world,"finish")` creates an event reference with `.count()` and `.occurred()`. These are observable event handles, not arbitrary callbacks or a full game scripting event loop. Supported game events: `land`, `fall`, `checkpoint`, `finish`, `respawn`.

## Tile types

| Kind | Effect |
| --- | --- |
| `solid` | Safe standing platform |
| `lava` | Respawn at latest checkpoint |
| `checkpoint` | Saves a new respawn position |
| `finish` | Completes the course |

Tiles are axis-aligned squares with center X/Y/Z and size. Physics is a small deterministic tile-contact model with gravity, jumping and AABB landings, **not a full rigid-body physics engine**. The rendering adapter uses real Babylon.js for 3D meshes, materials, lighting and a third-person follow camera.

## What makes an obby engaging

A basic course benefits from distinct stages, readable gaps, a few riskier jumps, frequent checkpoints, visually obvious hazards, time-trial feedback and a satisfying goal. Roblox's own Classic Obby template uses checkpoints, hazards and movement pads as useful established mechanics, but the HiroGlifx example is an independent implementation.

### Future game features

1. Moving and rotating platforms with deterministic collision and replay
2. Per-stage timing, personal bests, unlocks and save slots
3. Real physics engine adapter and character-controller support
4. Drag-and-drop tile editor and tile-layout generator
5. Textures, character skins, particles, sounds, camera effects and mobile joystick
6. Multiplayer/server authority, anti-cheat and shareable browser deployment
7. Shared canonical AST across web, games, video, package imports and existing symbolic VM

## Honest compatibility scope

The blueprint grammar is a limited `.Class = (Parent)` subset, not every historical symbolic feature. Classes are not JavaScript constructors. Blueprint methods currently take no arguments, apart from values baked into their expression bodies. Event references are typed handles, not user-authored listener functions. The obby is single-player, browser-only, and not connected to Roblox's engine or services.

Run `node --test tests/obby-canonical.test.js` and the full test suite to validate the model and adapter.
