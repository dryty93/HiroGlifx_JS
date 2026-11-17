# Phase 13 — Canonical typed expressions (migration foundation)

This feature introduces a **restricted executable subset** of HiroGlifx's original symbolic style. It does **not** replace `HG_VM.js` or transparently unify all previous command-based and game-specific grammars.

Run the browser demo from the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/canonical-playground.html
```

## Syntax

```scroll
.Main = ()
    # speed = 5;
    $ title = "My Animation";
    ? active = true;
    & hero = box("hero", 90, 90, "blue");
    & intro = bounce(hero, 900);
    intro.loop();
    intro.play();
    intro.pause();
    intro.reverse();
    spin(hero, 500);
    break;
```

The `#`, `$`, `?`, and `&` characters explicitly type a number, string, boolean, and object reference, respectively. Expressions support literals, variable references, whitelisted factory calls, and the approved animation-controller methods. No `eval`, dynamic reflection, arbitrary object property access or JavaScript evaluation.

**Semantics:** `bounce(hero, 900)` as a standalone statement starts immediately. `& intro = bounce(hero, 900)` creates an animation controller without starting it; `intro.play()` starts it. The controller supports `play`, `pause`, `reverse`, `loop` and `cancel`. `animate(hero, "fade", 500)` also returns a controller.

Built-in factories: `box(id, width, height, color)`, `animate(target, preset, milliseconds)`, and animation preset names from `runtime/scroll-runtime.js`. With a provided HiroGlifx `Scene`, the runtime also supports `sprite(id,x,y,width,height,color)` and `move(sprite,dx,dy)`. Browser document and mount are injected by the host. Extension factories must be registered by trusted host code using an underscored namespace, e.g. `fx_glow`.

## Current limitations

- This is a **first canonical executable subset**. Full blueprint methods, scope inheritance, events, multi-line function bodies, and `@` callback declarations are **not** implemented by this parser.
- The older `.Main = [ ... ]` and line-based creative-game syntax continue to work in their existing runtimes and are **not automatically compiled here**.
- Only one `.Main` block is supported; declarations currently use single-line expressions, with no arithmetic operators.
- Animation controllers currently target browser DOM elements, not Phaser sprites, Babylon meshes, or video timelines.
- Controller objects are runtime handles and are not serializable to the project lockfile.
- Full compiler convergence requires a shared AST schema, typed class/method definitions, package imports and backend adapters.

## Testing

```bash
node --test tests/canonical-runtime.test.js
```
