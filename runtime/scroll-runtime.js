/* HiroGlifx command runtime, isolated from the legacy symbolic VM.
 * Works in a browser through window.HiroGlifxRuntime or in Node via require().
 * Commands use one statement per line; quoted arguments preserve spaces.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HiroGlifxRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function tokenize(line) {
    const tokens = [];
    let word = "", quoted = false, quote = "", active = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === "\\" && i + 1 < line.length && (line[i+1] === quote || line[i+1] === "\\")) word += line[++i];
        else if (ch === quote) quoted = false;
        else word += ch;
      } else if (ch === "'" || ch === '"') { quoted = true; quote = ch; active = true; }
      else if (/\s/.test(ch)) { if (active) { tokens.push(word); word = ""; active = false; } }
      else if (ch === "#" && !active && !tokens.length) break;
      else { word += ch; active = true; }
    }
    if (quoted) throw new SyntaxError("Unclosed string");
    if (active) tokens.push(word);
    return tokens;
  }
  function parse(source) {
    return String(source).split(/\r?\n/).flatMap((line, index) => {
      const args = tokenize(line.trim());
      return args.length ? [{ command: args[0].toLowerCase(), args: args.slice(1), line: index + 1 }] : [];
    });
  }
  function requireArgs(args, count, command) {
    if (args.length < count) throw new Error(command + " needs at least " + count + " argument(s)");
  }
  function safeColor(value) {
    if (!/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgb\([0-9%,.\s]+\)|rgba\([0-9%,.\s]+\))$/.test(value)) throw new Error("Invalid color");
    return value;
  }
  function safeId(value) {
    if (!/^[a-zA-Z][\w-]*$/.test(value)) throw new Error("Invalid element id: " + value);
    return value;
  }
  function safeDuration(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 120000) throw new Error("Invalid duration (milliseconds)");
    return number;
  }
  function safeUrl(value) {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http(s) URLs are allowed");
    return parsed.href;
  }
  const effects = {
    bounce: [{ transform: "translateY(0)" }, { transform: "translateY(-35px)" }, { transform: "translateY(0)" }],
    spin: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    fade: [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }],
    pulse: [{ transform: "scale(1)" }, { transform: "scale(1.13)" }, { transform: "scale(1)" }],
    slide: [{ transform: "translateX(-60px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }]
  };
  class Runtime {
    constructor(options = {}) {
      this.document = options.document || null;
      this.mount = options.mount || (this.document && this.document.body);
      this.browser = options.browser || null;
      this.routes = new Map();
      this.elements = new Map();
      this.animations = [];
      this.listeners = [];
    }
    element(id) {
      const element = this.elements.get(id);
      if (!element) throw new Error("Unknown element: " + id);
      return element;
    }
    async execute(source) {
      for (const instruction of parse(source)) {
        try { await this.run(instruction.command, instruction.args); }
        catch (error) { throw new Error("Line " + instruction.line + ": " + error.message, { cause: error }); }
      }
      return this;
    }
    async run(command, args) {
      const doc = this.document;
      const mount = this.mount;
      switch (command) {
        case "page":
          requireArgs(args, 1, command); if (!doc) throw new Error("Requires DOM");
          doc.title = args.join(" "); return;
        case "background":
          requireArgs(args, 1, command); if (!mount) throw new Error("Requires DOM");
          mount.style.background = safeColor(args[0]); return;
        case "text":
        case "button":
        case "box": {
          requireArgs(args, command === "box" ? 4 : 2, command);
          if (!doc || !mount) throw new Error("Requires DOM");
          const id = safeId(args[0]);
          if (this.elements.has(id)) throw new Error("Duplicate element id: " + id);
          const element = doc.createElement(command === "text" ? "p" : command === "button" ? "button" : "div");
          element.id = id;
          if (command === "box") {
            const width = safeDuration(args[1]), height = safeDuration(args[2]);
            element.style.width = width + "px"; element.style.height = height + "px";
            element.style.background = safeColor(args[3]);
            element.style.borderRadius = "12px";
          } else element.textContent = args.slice(1).join(" ");
          mount.appendChild(element); this.elements.set(id, element); return;
        }
        case "color":
          requireArgs(args, 2, command);
          this.element(args[0]).style.background = safeColor(args[1]); return;
        case "center":
          requireArgs(args, 1, command);
          this.element(args[0]).style.marginInline = "auto"; return;
        case "animate": {
          requireArgs(args, 3, command);
          const element = this.element(args[0]);
          const keyframes = effects[args[1]];
          if (!keyframes) throw new Error("Unknown animation: " + args[1]);
          if (typeof element.animate !== "function") throw new Error("Web Animations API unavailable");
          const animation = element.animate(keyframes, {
            duration: safeDuration(args[2]), iterations: args[3] === "infinite" ? Infinity : 1,
            easing: "ease-in-out", fill: "forwards"
          });
          this.animations.push(animation); return animation;
        }
        case "on": {
          requireArgs(args, 5, command);
          const [event, id, arrow, action, ...params] = args;
          if (arrow !== "=>") throw new Error("Expected =>");
          if (!["click", "mouseenter", "mouseleave"].includes(event)) throw new Error("Event not allowed");
          if (!["animate", "color", "center"].includes(action)) throw new Error("Event action not allowed");
          const element = this.element(id);
          const handler = () => { Promise.resolve(this.run(action, params)).catch(err => console.error(err)); };
          element.addEventListener(event, handler);
          this.listeners.push([element, event, handler]); return;
        }
        case "browser.open":
        case "browser.click":
        case "browser.type":
        case "browser.wait":
        case "browser.screenshot": {
          if (!this.browser) throw new Error("Browser adapter required");
          const action = command.split(".")[1];
          requireArgs(args, action === "type" ? 2 : 1, command);
          if (typeof this.browser[action] !== "function") throw new Error("Browser method unavailable: " + action);
          if (action === "open") args[0] = safeUrl(args[0]);
          return this.browser[action](...args);
        }
        case "route": {
          requireArgs(args, 4, command);
          const [method, path, format, ...body] = args;
          if (!["GET", "POST"].includes(method)) throw new Error("Only GET/POST routes supported");
          if (!/^\/[a-zA-Z0-9_/-]*$/.test(path)) throw new Error("Invalid route");
          if (format !== "json") throw new Error("Only json routes supported");
          let data; try { data = JSON.parse(body.join(" ")); } catch { throw new Error("Invalid route JSON"); }
          this.routes.set(method + " " + path, data); return;
        }
        default: throw new Error("Unknown command: " + command);
      }
    }
    handler(request, response) {
      const path = new URL(request.url, "http://localhost").pathname;
      const key = request.method + " " + path;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      if (!this.routes.has(key)) { response.statusCode = 404; response.end(JSON.stringify({error:"Not found"})); return; }
      response.statusCode = 200;
      response.end(JSON.stringify(this.routes.get(key)));
    }
    dispose() {
      for (const animation of this.animations) animation.cancel();
      for (const [element, event, handler] of this.listeners) element.removeEventListener(event, handler);
      this.animations = []; this.listeners = [];
    }
  }
  return { Runtime, parse, tokenize, effects };
});
