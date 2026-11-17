# Riftfall production-readiness track (unsigned, no Steam publishing)

This track deliberately excludes platform signing/notarization and Steamworks partner-account or publishing operations. Those steps require external credentials and approval and are not attempted here.

## Implemented in code

- Region-bounded **Havok static collider streaming** with atomic creation, removal, restoration and duplicate-dispose prevention. All authored terrain and geometry remains available to Recast and A*; actual physics aggregates are resident only near the hero.
- Streamed procedural world art: glowing crystals, rune rings, region lanterns and stone ruins; mesh/material/light cleanup occurs when the associated region unloads. The existing original skinned glTF rig still supplies hero motion. This art is *stylized procedural prototype art*, not professionally commissioned or final AAA content.
- Player sword attacks now use **HiroGlifx-authored animation hit windows** with windup, impact and recovery, alongside existing parry, evade, and enemy telegraphs.
- A bounded **frame profiler** captures real wall-frame deltas, p50/p95/p99, resident meshes, Havok aggregates and route requests. The offline browser test refuses external URLs and logs the actual graphics/performance snapshot.
- Pinned npm browser distributions copied locally: `babylonjs@9.37.0`, `babylonjs-loaders@9.37.0`, `@babylonjs/havok@1.3.14`, and `recast-detour@1.6.4`. Havok's actual WASM is syntax-validated and hashed; the selected browser `recast.js` is the pure JavaScript build, **not** a separate Recast WASM binary. Vendor fingerprints are recorded in `vendor/vendor-lock.json`.
- Offline asset staging plus an unsigned Electron developer application and optional host-specific builder targets: macOS ZIP, Windows NSIS, Linux AppImage.

## Get validated local vendor assets

Run from the repository root using Node.js 22+:

```bash
npm install --no-save --ignore-scripts --package-lock=false --no-audit \
  babylonjs@9.37.0 babylonjs-loaders@9.37.0 @babylonjs/havok@1.3.14 recast-detour@1.6.4
node scripts/vendor-riftfall-engine.js
node scripts/prepare-riftfall-desktop.js
node scripts/stage-riftfall-desktop-app.js
```

Then verify the `dist/riftfall` bundle with a real browser. To perform the Playwright offline smoke:

```bash
npm install --no-save --ignore-scripts --package-lock=false --no-audit \
  babylonjs@9.37.0 babylonjs-loaders@9.37.0 @babylonjs/havok@1.3.14 recast-detour@1.6.4 playwright@1.56.1
npx playwright install chromium
node scripts/vendor-riftfall-engine.js
node scripts/prepare-riftfall-desktop.js
node e2e/riftfall-offline-smoke.js
```

The offline integration test blocks every browser request except the loopback origin, checks real Havok and original skinned glTF load, validates the streaming state, and records latency percentiles. This test **must pass on actual installed npm files** before the offline bundle is called verified.

## Unsigned desktop builds

With staged local resources:

```bash
npm install --no-save electron@43.8.10 electron-builder@26.18.0
node scripts/build-riftfall-unsigned.js
```

Build on the target host OS. The output is an **unsigned development artifact only**, not a public installer. It can trigger normal operating-system security prompts. No signing, notarization, Steamworks uploads or store publishing are included.

## Important technical limitations

1. Terrain has only three authored environments; physical collider streaming scales the existing world geometry but does not yet procedurally generate an infinite terrain or stream a fully dynamic Recast navmesh.
2. Shader/material improvements and procedural landmarks do not replace production-quality character/creature models, professionally directed animation, audio and environmental artwork.
3. Browser benchmarks on headless software rendering are regression indicators rather than universal minimum-spec performance guarantees; profile on representative Windows, Linux and macOS GPUs.
4. Desktop WASM pairings are verified by the blocked-network Chromium job, not by existence or checksum alone. End-to-end unsigned Electron installers need host-OS exercise; source configuration is not evidence that the binaries were actually produced or launched.
5. A strict production Content Security Policy, native controller QA, accessibility audit and extended campaign playtesting remain future release gates.
