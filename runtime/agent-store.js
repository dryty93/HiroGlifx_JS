"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function validId(id) {
  if (typeof id !== "string" || !ID.test(id)) throw Error("Invalid run id");
  return id;
}
function validKey(key) {
  if (typeof key !== "string" || !key.trim() || key.length > 240) throw Error("Invalid idempotency key");
  return key;
}

function createMemoryRunStore() {
  const values = new Map(), claims = new Map(), locks = new Set();
  return {
    load(id) { return values.get(validId(id)) || null; },
    save(snapshot) { values.set(validId(snapshot.record.id), snapshot); },
    claim(key, id) {
      validKey(key); validId(id);
      if (!claims.has(key)) claims.set(key, id);
      return claims.get(key);
    },
    lock(id) {
      validId(id);
      if (locks.has(id)) throw Error("Run is already active");
      locks.add(id);
      return () => locks.delete(id);
    }
  };
}

/** Private, single-host store. Use a persistent disk, never a public/static directory. */
function createFileRunStore(directory) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) throw Error("Absolute state directory required");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const root = fs.realpathSync(directory);
  const stat = fs.statSync(root);
  if (!stat.isDirectory() || (process.platform !== "win32" && (stat.mode & 0o077)))
    throw Error("State directory must be private (mode 0700)");
  function read(filename) {
    let fd;
    try {
      fd = fs.openSync(path.join(root, filename), fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      if (fs.fstatSync(fd).size > 4000000) throw Error("Run state exceeds limit");
      return JSON.parse(fs.readFileSync(fd, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    } finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  function writeExclusive(filename, value) {
    const fd = fs.openSync(path.join(root, filename), "wx", 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  }
  function syncDirectory() {
    if (process.platform === "win32") return;
    const fd = fs.openSync(root, "r");
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  return {
    load(id) { return read(validId(id) + ".json"); },
    save(snapshot) {
      const id = validId(snapshot.record.id);
      const tmp = id + "." + crypto.randomUUID() + ".tmp";
      writeExclusive(tmp, snapshot);
      try { fs.renameSync(path.join(root, tmp), path.join(root, id + ".json")); syncDirectory(); }
      finally { try { fs.unlinkSync(path.join(root, tmp)); } catch (e) { if (e.code !== "ENOENT") throw e; } }
    },
    claim(key, id) {
      const name = "claim-" + crypto.createHash("sha256").update(validKey(key)).digest("hex") + ".json";
      validId(id);
      try { writeExclusive(name, { id }); syncDirectory(); return id; }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        const claimed = read(name);
        return validId(claimed?.id);
      }
    },
    lock(id) {
      const name = validId(id) + ".lock";
      try { writeExclusive(name, { pid: process.pid, createdAt: new Date().toISOString() }); }
      catch (error) { if (error.code === "EEXIST") throw Error("Run is active or interrupted; inspect its private ledger before recovery"); throw error; }
      return () => { fs.unlinkSync(path.join(root, name)); syncDirectory(); };
    }
  };
}

module.exports = { createMemoryRunStore, createFileRunStore };
