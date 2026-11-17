# Extending HiroGlifx into Minecraft and other games

HiroGlifx cannot directly read or modify a Minecraft world. Game logic requires a **host adapter** that translates typed HiroGlifx commands into a game's sanctioned API and returns sanitized events/results.

## Three integration pathways

**Minecraft Java — Mineflayer bot.** Mineflayer exposes a high-level JavaScript bot API (movement, inventory, events, chat, block queries). A Node host can register a narrow set of commands such as game.say or game.look and forward to an authorized bot on a server you control or have permission to automate.

**Minecraft Java — Fabric mod.** A Fabric mod implements game-side commands and subscribes to relevant game events. A secured network bridge sends validated messages from HiroGlifx to the mod. Requires a Fabric mod and version-compatible build.

**Minecraft Bedrock — Script API add-on.** An add-on using the official @minecraft/server module handles events and entity/world operations. A tightly scoped bridge can expose those to HiroGlifx; network access varies by runtime and platform.

## Minimal host example (no Minecraft connection by itself)

~~~js
const { ExpressiveRuntime } = require("../runtime/expressive-runtime");
const runtime = new ExpressiveRuntime();

// This bot is passed in by a trusted, authenticated host.
function registerGame(runtime, bot) {
  runtime.registerCapability("game", {
    say: ({args}) => {
      const message = args.join(" ").trim();
      if (message.length === 0 || message.length > 100) throw new Error("Invalid chat length");
      return bot.chat(message);
    },
    position: () => {
      const {x,y,z} = bot.entity.position;
      return {x,y,z};
    }
  });
}
~~~

A scroll program then uses:

~~~scroll
game.say "Hello from HiroGlifx"
~~~

For serious integrations, define per-command permissions, ownership of game servers/worlds, rate limits, audit logs, network isolation, and timeouts. Do not expose arbitrary game console commands or an open socket to anonymous users. Allow users to define their own scroll abilities that combine the granted commands, while the trusted host still controls which commands are available.

An example of a game-side macro:

~~~scroll
ability greet target => game.say "Hello from HiroGlifx"
do greet player
~~~

**Compatibility:** The game adapter and its tests are future work. This repository currently implements only capability registration, not an installed Minecraft connector, Fabric mod, Mineflayer bot, or Bedrock add-on.

Other games can use the same design via sanctioned APIs: Unity with an authorized local development plugin, Godot with a trusted socket bridge, Roblox through supported scripting tools, or other mod-friendly games.
