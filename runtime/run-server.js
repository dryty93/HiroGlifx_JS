"use strict";
const fs = require("node:fs");
const http = require("node:http");
const { Runtime } = require("./scroll-runtime");
async function start(file, port = 3000) {
  if (!file) throw new Error("Usage: node runtime/run-server.js <scroll-file> [port]");
  const number = Number(port);
  if (!Number.isInteger(number) || number < 0 || number > 65535) throw new Error("Invalid port");
  const runtime = new Runtime();
  await runtime.execute(fs.readFileSync(file, "utf8"));
  const server = http.createServer((req, res) => runtime.handler(req, res));
  await new Promise(resolve => server.listen(number, "127.0.0.1", resolve));
  return server;
}
if (require.main === module) start(process.argv[2], process.argv[3] || 3000)
  .then(server => console.log("HiroGlifx API listening on http://127.0.0.1:" + server.address().port))
  .catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { start };
