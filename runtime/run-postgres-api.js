"use strict";
const fs=require("node:fs");
const http=require("node:http");
const {UserStore}=require("./auth-server");
const {PostgresStore}=require("./postgres-store");
const {OwnedApiServer}=require("./owned-api-server");
async function start(scroll,port=3000) {
  if(!scroll||!process.env.DATABASE_URL||!process.env.HIROGLIFX_USERS_FILE)
    throw new Error("Usage: DATABASE_URL=... HIROGLIFX_USERS_FILE=... node runtime/run-postgres-api.js <file.scroll> [port]");
  const number=Number(port);
  if(!Number.isInteger(number)||number<1||number>65535)throw new Error("Invalid port");
  const {Pool}=require("pg");
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10});
  try{
    const pg=new PostgresStore(pool);
    await pg.migrate();
    const app=new OwnedApiServer({postgres:pg,users:new UserStore(process.env.HIROGLIFX_USERS_FILE)});
    await app.execute(fs.readFileSync(scroll,"utf8"));
    const server=http.createServer((req,res)=>Promise.resolve(app.handler(req,res)).catch(error=>{
      console.error(error);
      if(!res.headersSent){res.writeHead(500,{"Content-Type":"application/json"});res.end('{"error":"Internal server error"}');}
    }));
    await new Promise(resolve=>server.listen(number,"127.0.0.1",resolve));
    return {server,pool};
  }catch(error){await pool.end();throw error;}
}
if(require.main===module)start(process.argv[2],process.argv[3]||3000)
 .then(({server})=>console.log("HiroGlifx PostgreSQL API on http://127.0.0.1:"+server.address().port))
 .catch(error=>{console.error(error);process.exitCode=1;});
module.exports={start};
