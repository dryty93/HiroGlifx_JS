# HiroGlifx-authored gameplay in Skybound and Blockhaven

These two browser games now use **executable native HiroGlifx gameplay rules**, in addition to their existing `.scroll` level and world configuration. This is a substantial migration beyond a three-line setup launcher. It is **not** a claim that Babylon.js, generic collision detection, rigid-body contact, voxel storage, rendering or browser input are written in HiroGlifx.

## Skybound

- [Game level and blueprint source](../examples/skybound-course.scroll): all five stages, platform types, checkpoints, player setup, and initial game objects
- [Executable gameplay rules](../examples/skybound-gameplay.scroll): reward scoring, combo bonus, death penalty, finish victory bonus, per-stage run speed and jump tuning, moving-platform offsets, spinning hazard paths, vanish timing and reappearance delay
- [Browser game](../skybound.html) displays the actual full gameplay and course sources; the Babylon adapter calls the script before physics updates, while ObbyWorld remains the generic physical simulation and contact/respawn engine.

The script's `: tick(dt)` method changes world physics parameters through an explicitly registered `world_configure(speed,jumpForce)` service. Level events call authored `: onStage`, `: onCheckpoint`, `: onRespawn`, `: onJump`, and `: onFinish` methods. Dynamic platforms query `: movingOffset`, `: spinnerX`, `: spinnerZ`, `: shouldVanish` and `: respawnDelay` inside the game loop. Modify this `.scroll` file to change game feel without editing JavaScript.

## Blockhaven

- [World setup](../examples/blockhaven.scroll): world seed, generation and spawned player
- [Executable gameplay rules](../examples/blockhaven-gameplay.scroll): terrain height function, surface materials, tree generation decisions, mining rewards, block placement rules, builder score, time and stamina
- [Browser game](../blockhaven.html) shows both real source files in the expandable panel; changing the terrain functions changes the actual generated voxel terrain. Mining and placing invoke the scripted rules. The engine retains generic block storage, raycast input, AABB/gravity movement, saving and Babylon 3D rendering.

The terrain generator is parameterized by HiroGlifx callbacks and refuses invalid height/material/tree values. The basic game rules do not have arbitrary filesystem, DOM or networking access. `WorldRules` enforces a whitelist of registered `world_...` host services and will reject undeclared services.

## Why a JavaScript engine remains

A programming language doesn't need to rewrite its 3D hardware renderer or reusable physics engine. The important distinction is **who defines the game rules**. The authored gameplay/level rules are now in .scroll, and JavaScript offers general-purpose physics, world storage, and Babylon APIs. We haven't yet moved every historical per-game behavior into .scroll: collision contact resolution, fall/respawn triggers, and default voxel movement remain in the existing generic engines.

## Verify

Run:

```bash
node --test tests/native-3d-game-rules.test.js
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/skybound.html
# open http://127.0.0.1:8000/blockhaven.html
```

The Chromium smoke suite asserts that the actual native rule programs loaded and that gameplay interactions continue to work. This is a migration milestone, not a finished fully unified HiroGlifx game compiler.
