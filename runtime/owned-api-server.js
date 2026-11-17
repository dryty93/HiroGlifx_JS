"use strict";
/** Phase 8: authenticated owner-isolated PostgreSQL JSON API. */
const {AuthServer}=require("./auth-server");
const {name,fields}=require("./postgres-store");
function send(res,status,value) {
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(JSON.stringify(value));
}
async function readJSON(req) {
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers["content-type"]||""))) {
    const err=new Error("Expected application/json");err.status=415;throw err;
  }
  let bytes=0,parts=[];
  for await(const part of req) {
    bytes+=part.length;
    if(bytes>16384){const err=new Error("Request exceeds 16 KB");err.status=413;throw err;}
    parts.push(part);
  }
  try {return JSON.parse(Buffer.concat(parts).toString("utf8"));}
  catch {const err=new Error("Malformed JSON");err.status=400;throw err;}
}
class OwnedApiServer extends AuthServer {
  constructor({postgres,users,...options}={}) {
    if(!postgres||!users)throw new Error("PostgresStore and UserStore required");
    // AuthServer only uses this.store for legacy data routes; all /api/ routes are intercepted.
    super({store:postgres,users,...options});
    this.postgres=postgres;
  }
  async run(command,args) {
    if(command==="data.collection") {
      if(args.length!==1)throw new Error("data.collection requires one collection name");
      return this.postgres.create(name(args[0]));
    }
    if(command==="data.seed")throw new Error("data.seed is disabled on multi-user databases");
    return super.run(command,args);
  }
  async handler(req,res) {
    const url=new URL(req.url,"http://localhost");
    if(!url.pathname.startsWith("/api/"))return super.handler(req,res);
    const user=this.authenticate(req);
    if(!user)return send(res,401,{error:"Authentication required"});
    const match=url.pathname.match(/^\/api\/([a-zA-Z][\w-]{0,63})(?:\/([0-9a-f-]{36}))?$/i);
    if(!match)return send(res,404,{error:"Not found"});
    const collection=name(match[1]),id=match[2];
    try {
      if(!await this.postgres.exists(collection))return send(res,404,{error:"Unknown collection"});
      if(req.method==="GET"&&!id)return send(res,200,await this.postgres.list(collection,user.name));
      if(req.method==="POST"&&!id){
        if(user.role==="reader")return send(res,403,{error:"Write permission required"});
        const payload=fields(await readJSON(req));
        return send(res,201,await this.postgres.insert(collection,user.name,payload));
      }
      if(req.method==="DELETE"&&id){
        if(user.role==="reader")return send(res,403,{error:"Write permission required"});
        const deleted=await this.postgres.delete(collection,user.name,id);
        return send(res,deleted?200:404,{deleted});
      }
      return send(res,405,{error:"Method not allowed"});
    }catch(error) {
      if(error.status)return send(res,error.status,{error:error.message});
      if(error.message==="Record must be an object"||error.message==="Record too large"||error.message==="Forbidden property")
        return send(res,400,{error:error.message});
      console.error("Owned API error:",error);
      return send(res,500,{error:"Internal server error"});
    }
  }
}
module.exports={OwnedApiServer,readJSON};
