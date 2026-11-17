"use strict";
/** Phase 3: file-backed JSON collections, intended for local development.
 * Single server process only. Production should use a transactional DB.
 */
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { AppRuntime } = require("./app-runtime");
const VALID = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const validate = name => { if (!VALID.test(name)) throw new Error("Invalid collection name"); return name; };
function plainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
class JsonStore {
  constructor(filename) {
    if (!filename || typeof filename !== "string") throw new Error("Storage file required");
    this.filename = path.resolve(filename);
    this.collections = Object.create(null);
    if (fs.existsSync(this.filename)) {
      const disk = JSON.parse(fs.readFileSync(this.filename, "utf8"));
      if (!plainObject(disk)) throw new Error("Invalid datastore format");
      for (const [key, rows] of Object.entries(disk)) {
        validate(key);
        if (!Array.isArray(rows)) throw new Error("Invalid collection: " + key);
        this.collections[key] = rows;
      }
    }
  }
  create(name) {
    name = validate(name);
    if (!Object.hasOwn(this.collections, name)) {
      this.collections[name] = [];
      this.persist();
    }
  }
  list(name) {
    name = validate(name);
    if (!Object.hasOwn(this.collections, name)) return null;
    return structuredClone(this.collections[name]);
  }
  insert(name, data) {
    validate(name);
    if (!Object.hasOwn(this.collections, name)) throw new Error("Unknown collection");
    if (!plainObject(data) || Object.keys(data).length > 50) throw new Error("Expected a JSON object of up to 50 fields");
    // Prevent user input from controlling system-generated IDs.
    const { id: _discard, ...fields } = data;
    const row = { ...fields, id: randomUUID() };
    this.collections[name].push(row);
    this.persist();
    return structuredClone(row);
  }
  delete(name, id) {
    validate(name);
    if (!Object.hasOwn(this.collections, name)) return false;
    const rows = this.collections[name];
    const index = rows.findIndex(row => row.id === id);
    if (index < 0) return false;
    rows.splice(index, 1);
    this.persist();
    return true;
  }
  persist() {
    fs.mkdirSync(path.dirname(this.filename), { recursive:true });
    const temporary = this.filename + "." + randomUUID() + ".tmp";
    try {
      fs.writeFileSync(temporary, JSON.stringify(this.collections, null, 2), { mode:0o600, flag:"wx" });
      fs.renameSync(temporary, this.filename);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
}
async function readBody(req, maxBytes = 16384) {
  const chunks=[]; let length=0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxBytes) { req.destroy(); throw new Error("Request body too large"); }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Invalid JSON"); }
}
class DataServer extends AppRuntime {
  constructor({ store, ...options } = {}) {
    super(options);
    if (!store) throw new Error("JsonStore required");
    this.store = store;
  }
  async run(command, args) {
    if (command === "data.collection") {
      if (args.length !== 1) throw new Error("data.collection requires a name");
      this.store.create(args[0]);
      return;
    }
    if (command === "data.seed") {
      if (args.length !== 2) throw new Error("data.seed requires collection and JSON object");
      const rows = this.store.list(args[0]);
      if (rows === null) throw new Error("Unknown collection");
      // Seed is idempotent, safe across server restarts.
      if (!rows.length) this.store.insert(args[0], JSON.parse(args[1]));
      return;
    }
    return super.run(command, args);
  }
  async handler(req, res) {
    const url = new URL(req.url, "http://localhost");
    const match = url.pathname.match(/^\/api\/([a-zA-Z][\w-]{0,63})(?:\/([0-9a-f-]{36}))?$/);
    if (!match) return super.handler(req, res);
    const [_, collection, id] = match;
    const headers = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff" };
    const send = (status, body) => { res.writeHead(status, headers); res.end(JSON.stringify(body)); };
    try {
      const rows = this.store.list(collection);
      if (rows === null) return send(404, {error:"Unknown collection"});
      if (req.method === "GET" && !id) return send(200, rows);
      if (req.method === "POST" && !id) {
        if (!String(req.headers["content-type"] || "").startsWith("application/json")) return send(415,{error:"Expected application/json"});
        const data = await readBody(req);
        return send(201, this.store.insert(collection, data));
      }
      if (req.method === "DELETE" && id) { const deleted = this.store.delete(collection, id); return send(deleted ? 200 : 404, {deleted}); }
      return send(405,{error:"Unsupported method"});
    } catch(error) {
      if (res.destroyed) return;
      return send(error.message === "Invalid JSON" ? 400 : error.message.includes("Expected") ? 400 : 500, {error:error.message});
    }
  }
}
module.exports = { JsonStore, DataServer };
