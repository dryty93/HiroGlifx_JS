# Blockhaven — HiroGlifx browser voxel sandbox

Blockhaven is an **original voxel building and exploration prototype**, not Minecraft or a Mojang product.

Run from the repository root with a local HTTP server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/blockhaven.html`. Babylon.js loads from its CDN and requires internet access.

The canonical `.scroll` world lives in `examples/blockhaven.scroll`:

```scroll
.Main = ()
    & world = voxel_world(42);
    & terrain = voxel_generate(world, 10);
    & explorer = voxel_player(world, 0, 0);
    break;
```

WASD or arrows move, Space jumps, 1–7 select blocks, mouse looks around, left click mines and right click places. Browser pointer lock may require a click and permission. Mobile controls include movement and action buttons. Saves are local to your browser (localStorage) and are never sent to a server.

This is a bounded creative-mode prototype: finite procedural terrain, typed blocks, placed/removed voxel meshes, first-person Babylon camera and local persistence. It does **not** currently include crafting, survival health, hostile mobs, multiplayer, chunk streaming, lighting propagation, inventories with quantities, or a production voxel mesher. Each exposed voxel is a Babylon mesh, which is suitable for small worlds but will need greedy meshing/chunking to scale.

There is no Minecraft integration and no use of Minecraft assets. Test in a modern browser with WebGL support. Automated tests cover deterministic terrain, editing, save/load and browser smoke checks.
