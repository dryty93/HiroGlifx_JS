# HiroGlifx Creative Studio — Browser games, animation and video

Use a web browser to author **simple 2D games, 3D scenes, animation timelines and WebM recordings** with readable commands. This phase adds an extensible engine-adapter foundation, not a complete AAA game engine or nonlinear video editor.

## Start

From the repository root, serve files locally:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/creative-studio.html`, choose Canvas, Phaser 4, or Babylon.js, edit the commands and press **Build scene**. Phaser and Babylon require CDN access; Canvas works without an external game-engine script.

## 2D game language

```scroll
scene 640 360 "#101827"
sprite hero 30 165 42 42 "#60a5fa"
sprite prize 550 165 35 35 "#facc15"
control ArrowRight hero 20 0
control ArrowLeft hero -20 0
goal hero prize
tween prize y 60 2500 0
```

Use arrow keys or touch buttons to move. Collision with the goal increments the score. Sprite coordinates and timelines are engine-independent scene data; the browser can render 2D scenes using either Canvas or the injected Phaser 4 adapter.

## Babylon.js 3D language

```scroll
world 3d #101827
camera 0 6 -16
light 0 10 -5
cube hero 0 0 0 3 #60a5fa
cube satellite 4 1 0 1 #a78bfa
rotate hero y 1.5
```

This 3D subset supports boxes, colors, camera, lighting and deterministic rotations. Gameplay physics, character controllers, textures, sound, 3D collisions and importing 3D models are future tasks.

## Videos

The timeline uses millisecond positioning and can be scrubbed or played. **Record WebM** uses `canvas.captureStream()` and `MediaRecorder`, if supported by the user's browser; recordings are saved locally as `.webm`. It records real-time canvas output, not an offline frame-perfect encoder. Browser support varies (particularly Safari), and audio mixing or MP4 output are not implemented.

## Architecture

- `runtime/creative-scene.js`: 2D model with sprites, movement, collision goals, keyboard mapping and tween data
- `runtime/phaser-adapter.js`: Phaser 4 browser renderer and scene synchronization (engine injected by host)
- `runtime/babylon-adapter.js`: Babylon.js 3D world model, renderer and camera
- `creative-studio.html`: web editor, engine selector, preview, timeline controls and WebM recording

The creative engine is intentionally separate from the older `.Main` application runtime. The next phase should unify scene declarations with class inheritance, package imports and engine-specific capabilities, then add actual game entities, events, input mapping, sound, asset management, animation tracks and export profiles.

### Engine dependencies

Phaser is currently loaded from the pinned **Phaser 4.2.1** jsDelivr URL. Babylon is loaded from the official Babylon.js CDN; a production build should pin and self-host a tested version with integrity validation. Never assume third-party CDNs are appropriate for offline or secure deployments.

### Limits

Browser only; no desktop editor and no Minecraft integration. No gameplay physics in the supplied adapters. The repo's `hiro` CLI still launches its existing web-app server rather than packaging or deploying creative games. Use trusted `.scroll` sources.

Run `node --test tests/creative-engines.test.js` for engine model and mocked-renderer checks.