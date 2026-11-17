# Riftfall Desktop — Offline Packaging Prototype

Riftfall can be staged and packaged as a **desktop game** for Windows, macOS or Linux using Electron. This is a distribution foundation, **not** a signed, notarized, published or Steam-approved release.

## What ships offline

The staged application contains its own copies of Babylon.js, Babylon glTF loaders, the Havok UMD script and Havok WASM, all Riftfall JavaScript engine modules, the authored `.scroll` content and quests, and the original seven-bone skinned glTF. The browser app's inline code is moved into a locally staged script and the page receives a restrictive Content Security Policy. Remote script sources are removed.

Recast-Detour is intentionally **not** included in this offline build yet: desktop NPC navigation explicitly uses the proven `A* GRID` fallback, and the HUD reports that correctly. Online browser Riftfall still attempts genuine Recast. No external game requests are necessary.

Current fixed dependencies (tested only when CI stages the game):

| Dependency | Version |
| --- | --- |
| Electron | 45.3.3 |
| electron-builder | 26.18.0 |
| babylonjs / babylonjs-loaders | 9.37.0 |
| @babylonjs/havok | 1.3.14 |

## Build locally

```bash
cd desktop
npm install
npm run stage
npm run validate
npm run dev
```

The staging step fails if pinned vendor dependencies are missing, versions mismatch, or the expected web app scripts change. The desktop host uses a `hiro-game://app` secure custom protocol and keeps Node.js disabled in its renderer. External navigations, new windows and permission requests are denied.

To package a local **unsigned** build:

```bash
npm run package
# or for native-platform installer targets (Windows NSIS, macOS DMG/ZIP, Linux AppImage):
npm run dist
```

Unsigned packages may be blocked by operating-system warnings. Building native installers on their native OS is recommended. Packaging CI verifies staging, not Apple notarization, Microsoft signing, SteamPipe upload or customer hardware compatibility.

## Prepare for Steam

Steam requires a developer onboarding agreement, a Steam AppID and other account-specific setup. Do not place Steam credentials in the repo. Use `desktop/steam_app_build.vdf.example` as a reference and replace placeholders only within your private Steamworks environment. SteamPipe, achievements, overlay, networking, cloud saves, DLC, gamepad certification and a Steam store page have **not** been configured.

Before publishing: provide original/licensed professional art, accessibility testing, real sound/music, a full performance and security review, code signing/notarization, Steamworks registration and QA on Windows/macOS/Linux. The current desktop build is an indie game prototype, not a commercial release.

## Verify staged assets

Run `node --test desktop/tests/*.test.js` from repository root (or `npm run validate` inside desktop). GitHub Actions also runs a **network-blocked Chromium smoke test** over the staged web directory. The stage manifest records SHA-256 digests to detect accidental asset changes. The manifest is not a digital signature or DRM.

## Browser vs desktop

Online development: `python3 -m http.server 8000`, open `/riftfall.html`.

Offline desktop: `cd desktop && npm install && npm run dev`, and all necessary Riftfall assets load from the local custom protocol. The application is designed to run offline, but native installer distribution and graphics-driver compatibility require additional QA.
