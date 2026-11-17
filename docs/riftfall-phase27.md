# Riftfall Phase 27 — RPG progression, crafting, quests, saves, sound and combat effects

**Play:** `http://127.0.0.1:8000/riftfall.html` after `python3 -m http.server 8000 --bind 127.0.0.1`.

## Complete HiroGlifx source

- [Combat/encounter rules](../examples/steam-rpg-combat.scroll): attack damage, stamina cost, aggro, combos, win condition
- [Game content](../examples/riftfall-content.scroll): full item catalog, crafting recipes, branching dialogue and four quests
- [Engine-independent item/quest service](../runtime/game-progression.js) and [HiroGlifx content loader](../runtime/game-content.js)

All authored item and quest data is actually loaded from `.scroll`; JavaScript does not disguise hard-coded item lists as HiroGlifx. The native interpreter requires nested `array()` and function expressions on single lines today.

## Inventory and crafting

Open Inventory using **I** or its toolbar button. Riftfall now gives a Traveler's Sword, two healing potions, a timber, and herbs. Defeating raiders yields Rift Shards or herbs. Craft at the Forge with **C**: Riftsteel Blade (2 shards + timber), Healing Potion (2 herbs + a shard), or Guardian Mail (4 shards + 2 timber). Equipment feeds into the generic combat engine for damage and armor; potions heal 45 HP.

All inventories are capacity- and weight-limited, item definitions are validated, and crafting is atomic. Failed crafts leave the inventory unchanged.

## Quests and dialogue

The Quest Journal (**Q**) tracks objectives, XP and rewards; quests can be claimed once completed. Keeper Nara near the starting area offers branching dialogue (**E**) and can assign objectives. Quest progression includes defeating raiders, crafting a blade, and reaching the watchtower. Rewards and prerequisite requirements are defined in the content `.scroll`, not UI code.

## Save/load

**Save**/**Load** or **F5/F9** operate on a local browser save slot. Auto saves occur on certain milestones. Saved data includes the hero's position, health/stamina, defeated raiders, XP/quest progress and inventory/equipment. Saves use a versioned schema, length limits and a checksum for detecting accidental corruption—not encryption or secure tamper resistance.

No external account or cloud synchronization is involved. Browser localStorage space is limited, and private browsing may prevent saving. Import/export is available through the generic save API but not yet a game-page file picker.

## Audio and effects

The Web Audio service synthesizes original melee, hit, loot, heal, quest and death cues with optional ambient tones. Browser audio is unlocked only after explicit play input. A mute control is available. The Babylon VFX service pools a bounded number of hit sparks and transient damage feedback. Sound/music are deliberately lightweight procedural prototypes, not a licensed soundtrack.

## Reusability and limitations

The modules are reusable outside Riftfall: `game-progression.js`, `game-content.js`, `game-save.js`, `game-audio.js`, `game-fx.js`, `riftfall-campaign.js`, and `riftfall-ui.js`. Visual assets are still prototype-quality. A single arena and three-enemy encounter remain in this milestone; richer chapter progression and actual live Recast navigation are next. Desktop packaging requires all engine/WASM assets to be vendored and security hardened.

## Verification

```bash
node --test tests/riftfall-progression.test.js
node e2e/riftfall-smoke.js   # requires installed Playwright Chromium
```

The browser test exercises the inventory/quests/dialogue/source views, local save/load, real Havok movement, glTF animation loading, and existing game regressions.
