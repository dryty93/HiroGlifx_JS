# HiroGlifx Packages — Phase 11

Packages are local declarative `.scroll` libraries that supply reusable UI classes and abilities, without editing the interpreter.

## Install and import

```bash
node hiro.js init my-app
node hiro.js package add my-app examples/packages/sparkfx
node hiro.js package list my-app
node hiro.js check my-app
node hiro.js dev my-app
```

Add `import sparkfx` to the beginning of `my-app/app.scroll`, then `use PartyCard first` inside `.Main`. The dev server resolves imports before sending source to the browser.

## Author a library

Each source folder contains `hiro-package.json` (name, exact x.y.z version, and `main.scroll` entry) and a `main.scroll` file. Library source can contain `.Component = [ ... ]`, `extends Child Parent`, `ability ... => ...`, and `import otherpackage`. No `.Main` declarations, executable top-level commands, network fetching, installer hooks, or JavaScript evaluation.

Installed packages are copied into `packages/<name>` under the project. The `hiro.lock.json` lockfile records version and SHA-256 of the copied `.scroll` file. Imports are checked against those hashes each time before compilation.

Dependencies must already be installed locally. Circular imports and duplicate class/ability names fail with clear errors. Package removals fail when another installed package requires the removed package.

```bash
node hiro.js package remove my-app sparkfx
```

**Security:** The hash checks integrity against the lockfile, not publisher identity or code safety. Installing a package is a trusted local developer operation. Review its source. Do not accept unreviewed packages from strangers. This MVP has no public registry, dependency resolution solver, signature verification, permissions manifest, or native extension execution.

## Next capabilities

Named exports and namespace aliases, package version ranges, a declarative permissions system, signed packages, a reviewable registry, and a visual gallery generated from actual examples.
