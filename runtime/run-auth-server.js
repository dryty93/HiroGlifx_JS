"use strict";
const fs=require("node:fs");
const http=require("node:http");
const {JsonStore}=require("./data-server");
const {UserStore,AuthServer}=require("./auth-server");
async function start(scrollPath,dir="./data",port=3000) {
  if(!scrollPath) throw new Error("Usage: node runtime/run-auth-server.js <scroll> [data-dir] [port]");
  const number=Number(port);
  if(!Number.isInteger(number)||number<0||number>65535)throw new Error("Invalid port");
  const runtime=new AuthServer({store:new JsonStore(dir+"/collections.json"),users:new UserStore(dir+"/users.json")});
  await runtime.execute(fs.readFileSync(scrollPath,"utf8"));
  const server=http.createServer((req,res)=>Promise.resolve(runtime.handler(req,res)).catch(err=>{
    console.error(err);
    if(!res.headersSent){res.writeHead(500,{"Content-Type":"application/json"});res.end(JSON.stringify({error:"Internal server error"}));}
  }));
  await new Promise(resolve=>server.listen(number,"127.0.0.1",resolve));
  return server;
}
if(require.main===module)start(process.argv[2],process.argv[3],process.argv[4]||3000)
  .then(server=>console.log("Authorized HiroGlifx API http://127.0.0.1:"+server.address().port))
  .catch(err=>{console.error(err);process.exitCode=1;});
module.exports={start};
