# Riftfall Phase 32 — offline desktop preflight (not a Steam release)

The browser version of Riftfall still uses development third-party CDN scripts. This phase introduces an **explicitly gated, local-only desktop staging workflow**. It refuses to create a supposedly offline package until engine dependencies have been supplied locally.

## What is implemented

- `scripts/prepare-riftfall-desktop.js` checks all required HiroGlifx game assets plus Babylon, Havok and Recast vendor resources, copies a portable static tree under `dist/riftfall`, replaces external script URLs and writes SHA-256 file hashes in `manifest.json`.
- `desktop/server.cjs` serves that directory over an ephemeral, loopback-only HTTP origin (not file://) so same-origin .scroll, glTF and WASM requests can work.
- `desktop/main.cjs` runs the packaged assets in an Electron preview with sandbox, context isolation, Node integration disabled, and external navigation blocked.
- Node tests validate the preflight blockers, output script rewrites and local server path boundaries.

## Supply redistributable vendor builds

Put **officially sourced and license-reviewed** copies in a local `vendor/` directory:

- `babylon.js`
- `babylonjs.loaders.min.js`
- `HavokPhysics_umd.js`
- `HavokPhysics.wasm`
- `recast.js`
- `recast.wasm`

The builder **does not download or include these third-party binaries**. Check the applicable redistribution rights and actual compatibility; file existence and checksums alone do not validate licensing or that WASM initialization works. Current browser Recast integration references `recast-detour@1.6.4`. Dependency versions and initialization paths must be pinned and actually verified during an offline browser test.

## Use

```bash
node --test tests/desktop-readiness.test.js
node scripts/prepare-riftfall-desktop.js
npm install --no-save electron
npx electron desktop/main.cjs
```

Provide a non-default local vendor directory with `--vendor-root /absolute/path`.

The `dist/riftfall` folder is a **preview asset bundle**, not a signed macOS or Windows installer. Do not upload it to Steam as a final build.

## Required before public release

1. Vendor and validate the exact Babylon/Havok/Recast WASM pairings; verify no runtime network requests in a disconnected desktop test.
2. Rework the current inline-script architecture for a strict Content Security Policy and tighten external-resource handling.
3. Add installer/build targets, macOS signing and notarization, Windows signing, and automatic update strategy.
4. Test performance, controller/keyboard/touch, GPU/WASM, minimum system requirements, save schema migration and error recovery across target machines.
5. Finish production-grade level art, combat animations, world streaming, sound, accessibility and broad gameplay QA.
6. Integrate Steamworks SDK only once distribution requirements are established; obtain and protect app-specific credentials.

The Phase 32 code is therefore **release preparation**, not proof that Riftfall is commercially ready or available on Steam.
