# HiroGlifx polymorphism — real imported game library

**Playable example:** [Polymorphism Lab](../polymorphism.html), with source at [enemykit](../examples/packages/enemykit/main.scroll), [Arena](../examples/polymorphism/arena.scroll), and [Phantom Gauntlet](../examples/polymorphism/gauntlet.scroll).

## What the import removes

The package contains all reusable fields and mechanics for `.Unit`, `.Enemy = (Unit)`, `.Scout = (Enemy)`, `.Brute = (Enemy)` and `.Medic = (Enemy)`: typed health and speed, movement behavior, damage, armour, healing and rendering. The game imports it with **`import enemykit`** and declares only its own overrides, roster, player interaction, and game loop.

```scroll
import enemykit
.Boss = (Brute)
    # health = 400;
    # maxHealth = 400;
    : update(self, dt) = [
        put(self, "x", field(self, "x") + field(self, "speed") * dt);
    ]
    break;
.Main = ()
    & roster = array();
    : init() = [
        push(roster, spawn("Scout"));
        push(roster, spawn("Brute"));
        push(roster, spawn("Boss"));
    ]
    : tick(dt) = [
        for i from 0 to len(roster) [
            send(get(roster,i), "update", dt);
        ]
    ]
    : draw() = [
        clear("#0b1730");
        for i from 0 to len(roster) [
            send(get(roster,i), "draw");
        ]
    ]
    break;
```

**This is true runtime polymorphism**: an object whose actual type is `Scout`, `Brute`, or `Boss` receives a distinct method implementation from the same `send(entity,"update",dt)` expression. A Boss can inherit Brute's armoured `takeDamage` override while replacing `update`. Overrides of inherited typed fields must keep the original type.

## Installation and running

```bash
node hiro.js init my-arena
node hiro.js package add my-arena examples/packages/enemykit
cp examples/polymorphism/arena.scroll my-arena/app.scroll
node hiro.js check my-arena
python3 -m http.server 8000 --bind 127.0.0.1
# open http://127.0.0.1:8000/polymorphism.html
```

The package manager verifies SHA-256 integrity of the installed package and checks its `.scroll` definitions. The browser demo loads the library from the same local origin; it does not fetch arbitrary executable JavaScript. The generic `hiro dev` UI renderer **does not yet** support polymorphic Canvas game hosting; use the supplied lab until the game host and normal development server are unified.

## How it works

`runtime/scroll-game-classes.js` parses imported class definitions and resolves inheritance and method owners. `PolymorphicGame` extends the safe bounded game interpreter: `spawn(type)` creates typed instances, `field` reads a declared property, `put` type-checks writes, and `send` resolves and invokes the most-derived method. Methods, AI and gameplay live in `.scroll`; JavaScript implements only dynamic dispatch, instance storage and browser rendering primitives. There is no `eval`, dynamic JavaScript property access in HiroGlifx, or arbitrary imports.

**Limits:** one parent, explicit `self` parameter, primitive typed instance fields, no interfaces/generics/traits yet, and no automatic `super` call syntax. Class definitions and imports belong to the new game-script subset, not the older expressive UI components.
