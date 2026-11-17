/* HiroGlifx Phase 2: structured blocks, reusable components and reactive UI.
 * Additive runtime: does not modify the original symbolic VM.
 */
(function(root, factory) {
  const base = typeof module === "object" && module.exports
    ? require("./scroll-runtime")
    : root.HiroGlifxRuntime;
  const exported = factory(base);
  if (typeof module === "object" && module.exports) module.exports = exported;
  else root.HiroGlifxApp = exported;
})(typeof globalThis !== "undefined" ? globalThis : this, function(base) {
  "use strict";
  const { Runtime, tokenize } = base;
  const identifier = /^[a-zA-Z][\w-]*$/;
  const templateRegex = /\{([a-zA-Z][\w-]*)\}/g;
  function parseProgram(source) {
    const components = new Map();
    const main = [];
    let block = null;
    String(source).split(/\r?\n/).forEach((raw, index) => {
      let line = raw.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) return;
      // Modern .Main blocks are a supported subset of the symbolic language.
      const start = line.match(/^\.([a-zA-Z][\w-]*)\s*=\s*\[$/);
      if (start) {
        if (block) throw new SyntaxError("Line " + (index + 1) + ": nested blocks are not supported");
        block = { name:start[1], statements:[] }; return;
      }
      if (line === "]" || line === "];" || line === "break;" || line === "end") {
        if (!block) throw new SyntaxError("Line " + (index + 1) + ": unexpected block close");
        if (block.name === "Main") main.push(...block.statements);
        else {
          if (components.has(block.name)) throw new SyntaxError("Duplicate component: " + block.name);
          components.set(block.name, block.statements);
        }
        block = null; return;
      }
      // Optional semicolon after a command, never treated as code.
      if (line.endsWith(";")) line = line.slice(0, -1).trimEnd();
      const words = tokenize(line);
      if (!words.length) return;
      const node = { command:words[0].toLowerCase(), args:words.slice(1), line:index + 1 };
      (block ? block.statements : main).push(node);
    });
    if (block) throw new SyntaxError("Unclosed block: " + block.name);
    return { components, main };
  }
  function scoped(node, prefix) {
    const args = [...node.args], command = node.command;
    if (["text","button","box","input","label","bind"].includes(command) && args.length) {
      if (command === "bind") { if (args.length > 1) args[1] = prefix + "-" + args[1]; }
      else args[0] = prefix + "-" + args[0];
    }
    if (command === "on" && args.length >= 2) {
      args[1] = prefix + "-" + args[1];
      if (args[3] === "color" || args[3] === "animate" || args[3] === "center") {
        if (args[4]) args[4] = prefix + "-" + args[4];
      }
    }
    if (["center","color","animate"].includes(command) && args.length) args[0] = prefix + "-" + args[0];
    return { ...node, args };
  }
  function expand(program) {
    const output = [];
    function visit(nodes, depth, prefix) {
      if (depth > 8) throw new Error("Component nesting exceeds 8 levels");
      for (const node of nodes) {
        if (node.command !== "use") { output.push(prefix ? scoped(node, prefix) : node); continue; }
        if (node.args.length !== 2) throw new Error("Line " + node.line + ": use requires component name and instance id");
        const [name, id] = node.args;
        if (!identifier.test(id)) throw new Error("Invalid instance id: " + id);
        const statements = program.components.get(name);
        if (!statements) throw new Error("Unknown component: " + name);
        visit(statements, depth + 1, prefix ? prefix + "-" + id : id);
      }
    }
    visit(program.main, 0, "");
    return output;
  }
  class AppRuntime extends Runtime {
    constructor(options = {}) {
      super(options);
      this.state = new Map();
      this.bindings = [];
    }
    value(text) {
      return String(text).replace(templateRegex, (_, key) => this.state.has(key) ? String(this.state.get(key)) : "");
    }
    refresh() {
      for (const entry of this.bindings) {
        const element = this.element(entry.id);
        if (entry.kind === "text") element.textContent = this.value(entry.template);
        else if (entry.kind === "input" && element.value !== String(this.state.get(entry.key) ?? ""))
          element.value = String(this.state.get(entry.key) ?? "");
      }
    }
    setState(key, value) {
      if (!identifier.test(key)) throw new Error("Invalid state key");
      this.state.set(key, value);
      this.refresh();
    }
    async execute(source) {
      const statements = expand(parseProgram(source));
      for (const node of statements) {
        try { await this.run(node.command, node.args); }
        catch (error) { throw new Error("Line " + node.line + ": " + error.message, { cause:error }); }
      }
      return this;
    }
    async run(command, args) {
      switch(command) {
        case "state": {
          if (args.length < 2) throw new Error("state needs a key and initial value");
          if (!identifier.test(args[0])) throw new Error("Invalid state key");
          const raw = args.slice(1).join(" ");
          let value = raw;
          if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
          if (raw === "true") value = true;
          if (raw === "false") value = false;
          this.setState(args[0], value); return;
        }
        case "set": {
          if (args.length < 2 || !this.state.has(args[0])) throw new Error("set requires an existing state key and value");
          this.setState(args[0], args.slice(1).join(" ")); return;
        }
        case "increment": {
          if (args.length < 1 || !this.state.has(args[0])) throw new Error("increment requires an existing state key");
          const current = this.state.get(args[0]);
          if (typeof current !== "number") throw new Error("increment requires numeric state");
          const step = args[1] === undefined ? 1 : Number(args[1]);
          if (!Number.isFinite(step)) throw new Error("Invalid increment step");
          this.setState(args[0], current + step); return;
        }
        case "input": {
          if (args.length < 2 || !this.document || !this.mount) throw new Error("input needs an id, placeholder and DOM");
          const id = args[0];
          if (!identifier.test(id) || this.elements.has(id)) throw new Error("Invalid or duplicate element id");
          const el = this.document.createElement("input");
          el.id = id; el.placeholder = args.slice(1).join(" ");
          el.setAttribute("aria-label", el.placeholder);
          this.mount.appendChild(el); this.elements.set(id, el); return;
        }
        case "bind": {
          if (args.length < 3) throw new Error("bind requires text/input, element id and template/state key");
          const [kind,id,...rest] = args;
          this.element(id);
          if (kind === "text") this.bindings.push({kind,id,template:rest.join(" ")});
          else if (kind === "input") {
            if (!this.state.has(rest[0])) throw new Error("Unknown state: " + rest[0]);
            this.bindings.push({kind,id,key:rest[0]});
          } else throw new Error("bind supports text or input");
          this.refresh(); return;
        }
        case "on": {
          const [event,id,arrow,action,...params] = args;
          if (arrow === "=>" && (
            (event === "click" && ["increment","set"].includes(action)) ||
            (event === "input" && action === "set" && params[1] === "@value")
          )) {
            const el = this.element(id);
            if (!["click","input"].includes(event)) throw new Error("Event not allowed");
            const handler = () => {
              try {
                if (event === "input") {
                  if (!this.state.has(params[0])) throw new Error("Unknown state");
                  this.setState(params[0], el.value);
                } else {
                  // set may contain a state template; increment must be numeric.
                  this.run(action, action === "set" ? [params[0], this.value(params.slice(1).join(" "))] : params);
                }
              } catch(error) { console.error(error); }
            };
            el.addEventListener(event, handler);
            this.listeners.push([el,event,handler]); return;
          }
          return super.run(command,args);
        }
        default: return super.run(command,args);
      }
    }
    dispose() {
      super.dispose();
      this.bindings = [];
      this.state.clear();
    }
  }
  return { AppRuntime, parseProgram, expand };
});
