# Riftfall Phase 28 — Expanded three-chapter world and skinned glTF hero

Riftfall's previous single arena has been expanded into three contiguous regions defined by [full HiroGlifx level source](../examples/riftfall-levels.scroll). All region geometry, obstacles, enemy stats and spawn positions are authored in `.scroll`, not only the initial `.Main` launcher.

## Playable chapter progression

| Chapter | Region | Encounter |
| --- | --- | --- |
| 1 | Ashen Clearing | Three introductory Rift raiders, including an armored captain |
| 2 | The Fallen Forge | Three tougher enemies in a ruined-forge region |
| 3 | Obsidian Gate | One Rift Guardian boss |

The source's `: waveThreshold` and `: chapterTitle` methods determine progression. The combat rules now require seven defeats before declaring victory. Additional regions use real Havok static collision meshes; NPCs spawn only after their chapter unlocks. The quest `rift-guardian` now requires seven defeats and awards the Sunstone.

Save/load includes the current chapter and previously spawned raider states; loading a later chapter reconstructs its enemies before restoring their health and positions. The existing XP, inventory, crafting and quest state is preserved.

## Original skinned hero

`assets/hero-rig.gltf` is **original procedural low-poly 3D art** with seven joints, valid inverse bind matrices, a weighted vertex-colored mesh, and six authored bone-animation clips: idle, walk, run, jump, attack and death. It replaces the earlier non-skinned block-out avatar. The generic glTF loader/animation state graph supports imported skinned assets from licensed creators later.

This is *not* professional AAA character art. Additional hand-authored topology, detailed materials, facial animation, quality motion capture and animation retargeting are still needed for a commercial presentation. Do not confuse 'skinned and animated' with 'finished character production'.

## Navigation

The browser attempts to load a pinned `recast-detour@1.6.4` runtime and construct a genuine Babylon Recast navmesh from the authored level meshes. If Recast initializes, the NPC navigation agents query Recast paths. If Recast cannot load or generate a mesh, the game explicitly falls back to its existing collision-aware A* grid. The HUD shows **RECAST NAVMESH** or **A* GRID**.

The host distinguishes the modes—no Recast claim is made when the fallback is active. For Steam/production builds, the engine and Recast WASM/JS must be vendored, pinned and profiled rather than loaded from learning CDNs.

## Validation

```bash
node --test tests/rigged-avatar.test.js tests/riftfall-world-chapters.test.js
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/riftfall.html
```

GitHub Actions tests glTF skin/animation metadata and the actual browser loading, initial encounter and navigation movement, plus all other existing game regressions.

## Known gaps

This is still a vertical-slice-sized world; the level is not an indefinitely streamable open world. There is no multiplayer, LOD terrain streaming, high-quality retargeted animation pack, character customization, or production release build. The completed user-visible work here is a more complex chapter campaign with script-defined content and a real skinned avatar, not a finished Steam product.
