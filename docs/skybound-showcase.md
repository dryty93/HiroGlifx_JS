# Skybound Obby — HiroGlifx Flagship Browser Demo

Skybound is an original browser obstacle game built with HiroGlifx canonical variables, blueprints, events and Babylon.js rendering. The purpose is to test whether HiroGlifx can power an experience that looks and feels like a game rather than a technical example.

## Launch

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/showcase.html
# http://127.0.0.1:8000/skybound.html
```

Babylon.js requires internet access for its CDN script. Chrome, Firefox and Safari capabilities vary; verify on your device. There is no Roblox runtime, account, or server integration.

## Play

WASD/arrows: movement. Space: jump. R: checkpoint respawn. Esc: pause. Mobile: directional and jump buttons. Optional Web Audio feedback has a mute toggle. Each stage has a distinctive color and challenge. The browser stores a personal best time in localStorage where available; no times or personal data are transmitted.

## Course

| Stage | Mechanic |
| --- | --- |
| 1. Cloud Steps | Introductory jumps over safe floating platforms |
| 2. Lava Run | Choose a safe lateral route around hazardous platforms |
| 3. Moving Skies | Platforms slide side-to-side and carry the player |
| 4. Vanishing Path | Platforms disappear temporarily after landing |
| 5. Final Ascent | Moving spinner hazards and a gold finish gate |

`examples/skybound-course.scroll` defines platforms through canonical HiroGlifx calls: `obby_tile`, `obby_moving`, `obby_vanish`, `obby_spinner`, `obby_player`, and `obby_event`. `Runner` inherits from `Actor` and exposes jump and dash methods through the safe blueprint runtime.

## Architecture

- `runtime/skybound-world.js`: five-stage state, deterministic platform movement, vanishing timers, spinner paths, jump buffering, coyote time and progress summaries.
- `runtime/obby-world.js`: foundational collisions, score, gravity, jump, and checkpoint events.
- `runtime/obby-canonical.js`: canonical factories for placing platforms and constructing game objects.
- `runtime/obby-babylon.js`: third-person Babylon renderer, color themes, mesh synchronization and smooth camera follow.
- `skybound.html`: responsive game UI, keyboard/touch controls, sounds and best times.
- `obby-playground.html`: the editable HiroGlifx source preview, loading the same flagship course.
- `showcase.html`: browse working HiroGlifx demos; starting point for a portfolio.

## Game-quality verification plan

1. Confirm the full course can be traversed by a human at default movement speed and jump height without impossible gaps.
2. Check collision stability at 30, 60 and 120 FPS, especially carrying on moving tiles and disappearing-tile transitions.
3. Check desktop keyboard capture/focus behavior, mobile portrait landscape touch input and game pause on window blur.
4. Measure GPU frame times and memory on low-end devices; tune Babylon hardware scaling and platform count.
5. Create browser Playwright tests with browser screenshots and recorded short gameplay demos, in addition to the existing deterministic Node physics tests.
6. Add configurable control mapping, accessibility, camera sensitivity, sound/music volume and character skins.

## Current limitations

This is a flagship **prototype**, not yet Roblox-quality in breadth or polish. It is single-player and local-browser oriented. The collision model uses platform top checks rather than a full rigid-body engine. There is no network multiplayer, avatar editor, rich art asset pipeline, saved accounts, UGC marketplace, or production hosting. Best times are browser-local only. This phase does not claim live browser E2E or human playtesting.

## Portfolio direction

The showcase page links to real HiroGlifx demos only. Future projects should be added after a deployment/build produces a verified browser demo, video, screenshot and code link. A later manifest-driven portfolio could handle project details, filtering, contact information, and deployment status without requiring hard-coded cards.
