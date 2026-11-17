"use strict";
const fs = require("node:fs");
const http = require("node:http");
const { JsonStore, DataServer } = require("./data-server");
async function start(scrollPath, storagePath = "./data/hiro.json", port = 3000) {
  if (!scrollPath) throw new Error("Usage: node runtime/run-data-server.js <scroll> [storage.json] [port]");
  const number = Number(port);
  if (!Number.isInteger(number) || number < 0 || number > 65535) throw new Error("Invalid port");
  const runtime = new DataServer({store:new JsonStore(storagePath)});
  await runtime.execute(fs.readFileSync(scrollPath,"utf8"));
  const server = http.createServer((req,res)=>runtime.handler(req,res).catch(error=>{
    if (!res.headersSent) {res.writeHead(500,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"Internal server error"}));}
    console.error(error);
  }));
  await new Promise(resolve=>server.listen(number,"127.0.0.1",resolve));
  return server;
}
if (require.main === module) start(process.argv[2], process.argv[3], process.argv[4] || 3000)
  .then(server=>console.log("HiroGlifx data server http://127.0.0.1:"+server.address().port))
  .catch(e=>{console.error(e);process.exitCode=1;});
module.exports={start};
