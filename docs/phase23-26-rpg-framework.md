# HiroGlifx Phases 23–26 — Action RPG engine foundations

**Browser prototype:** [Riftfall](../riftfall.html) · [HiroGlifx source rules](../examples/steam-rpg-combat.scroll) · [Original animated glTF avatar](../assets/hero.gltf).

These phases add real reusable capabilities for more complicated browser games. They are **not** a finished Steam release, networking engine, character creator, survival RPG or full production asset pipeline.

## Phase 23 — Havok Physics V2 and third-person character controller

`runtime/game-physics.js` creates and manages real Babylon Physics V2/Havok bodies through the initialized Havok WASM module. It offers static/dynamic box colliders, a `PhysicsCharacterController` capsule, velocity-based movement, jump buffering/coyote time and a ray-based camera-occlusion helper. Riftfall **uses the real Havok controller** and does not silently replace it with hand-coded platform physics if Havok initialization fails.

Browser prototype dependencies: Babylon UMD, Babylon glTF loader, and `HavokPhysics_umd.js`. These are used as CDN development dependencies; for distribution you must pin and self-host engine code and WASM. Havok requires WebAssembly SIMD (older mobile platforms may not support it). Grounded movement/camera collision and dynamic bodies should be further playtested across hardware.

The existing Skybound and Blockhaven games are unchanged in this phase—they keep their old custom character controllers until a deliberate separate migration.

## Phase 24 — glTF asset pipeline and animation states

`runtime/game-assets.js` enforces bounded **same-origin** `./assets/**/*.glb|gltf` paths, loads assets through `BABYLON.SceneLoader.ImportMeshAsync`, caches and disposes meshes/animation groups, and manages idle/walk/run/jump/attack/death through `AnimationGraph`. Animation crossfade weights progress over time. The repository includes a minimal *original*, self-contained glTF hero with six authored animation clips in `assets/hero.gltf` so there is no third-party model license dependency.

The bundled hero is deliberately simple block-out art, not a professional skinned character. The loader can accept sophisticated rigged third-party assets, but licensing, content ingestion, retargeting, asset budgets, and animation QA need a future pipeline.

## Phase 25 — reusable combat and equipment

`runtime/game-combat.js`: reusable actor registry, health/stamina, team-based filtering, damage mitigation/armor, range checks, melee hit events, weapon/armor equipment, cooldowns, status effects, stamina regeneration, defeat events, and snapshots. Riftfall's game-specific damage, combo bonuses, range, cooldown, NPC damage and win conditions are authored in `examples/steam-rpg-combat.scroll` and executed with `WorldRules`, while the combat subsystem implements generic calculations.

Missing for release: authoritative networking, animation hit-frame validation, hit reaction, sound/particles, projectile physics, combo charts, shields, player customization, inventory UI, persistence, progression and achievements.

## Phase 26 — pathfinding and AI decision making

`runtime/game-ai.js`: collision-aware A* grid navigation, path-following agents, selectors, sequences, conditions, actions, running/failure/success result types, and cooldown decorators with bounded searches. Riftfall uses these enemies to chase the hero around arena obstacles or attack at close range. Range and aggression thresholds come from HiroGlifx `.scroll` policy functions.

`runtime/game-navmesh.js`: optional adapter for **actual** Babylon Recast-Detour navigation meshes, path queries and crowds, requiring an initialized Recast dependency. The playable Riftfall demo currently uses the *grid A* implementation*, not Recast navmeshes. Recast runtime initialization/build and true crowd gameplay integration remain future work.

## Run

```bash
cd HiroGlifx_JS
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/riftfall.html
```

On desktop: WASD to move, Space to jump, J to attack. Drag to rotate camera, or use the touch controls on mobile. The HiroGlifx source panel shows the real `.scroll` combat and enemy AI rules. Enemy health, armor, combat cooldowns and navigation are not hard-coded into the page.

## Validation

```bash
node --test tests/steam-game-foundations.test.js tests/steam-game-advanced.test.js
```

`e2e/riftfall-smoke.js` runs a real Chromium browser and asserts Havok initialization, animation loading, player movement, combat input, and mobile display, uploading actual screenshots in CI. The underlying Babylon, Havok and Recast modules are external runtime dependencies.

**Maturity:** reusable engine foundation / playable vertical slice, not commercial-grade Steam shipping readiness. Next increments: complex animation retargeting, melee hitboxes and impact feedback, navigation mesh agents in a live level, save/load, dialogue/quests, audio and profiling.
