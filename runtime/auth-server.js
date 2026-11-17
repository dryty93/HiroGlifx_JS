"use strict";
/** Phase 4: limited local authentication/authorization for data routes.
 * Bearer tokens are ephemeral and never written to disk.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {DataServer} = require("./data-server");
const USER_RE=/^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/;
const roles=new Set(["reader","writer","admin"]);
class UserStore {
  constructor(filename) {
    this.filename=path.resolve(filename);
    this.users=Object.create(null);
    if (fs.existsSync(this.filename)) {
      const users=JSON.parse(fs.readFileSync(this.filename,"utf8"));
      if (!users || typeof users !== "object" || Array.isArray(users)) throw new Error("Invalid users file");
      for(const [name,user] of Object.entries(users)) {
        if (!USER_RE.test(name) || !roles.has(user.role) || !/^[a-f0-9]{32}$/.test(user.salt) || !/^[a-f0-9]{128}$/.test(user.hash))
          throw new Error("Invalid stored user");
        this.users[name]=user;
      }
    }
  }
  add(name,password,role="reader") {
    if (!USER_RE.test(name) || !roles.has(role)) throw new Error("Invalid name or role");
    if (typeof password!=="string" || password.length<12 || password.length>256) throw new Error("Password must be 12–256 characters");
    if (Object.hasOwn(this.users,name)) throw new Error("User exists");
    const salt=crypto.randomBytes(16).toString("hex");
    const hash=crypto.scryptSync(password,salt,64).toString("hex");
    this.users[name]={salt,hash,role};
    this.save();
  }
  save() {
    fs.mkdirSync(path.dirname(this.filename),{recursive:true});
    const temp=this.filename+"."+crypto.randomUUID()+".tmp";
    try {
      fs.writeFileSync(temp,JSON.stringify(this.users,null,2),{mode:0o600,flag:"wx"});
      fs.renameSync(temp,this.filename);
    }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  }
  verify(name,password) {
    const user=this.users[name];
    // Equal-cost verification for unknown users (name enumeration resistance).
    const salt=user?.salt || "00000000000000000000000000000000";
    const expected=user ? Buffer.from(user.hash,"hex") : Buffer.alloc(64);
    const actual=crypto.scryptSync(String(password),salt,64);
    if(!crypto.timingSafeEqual(actual,expected) || !user) return null;
    return {name,role:user.role};
  }
}
async function body(req) {
  const chunks=[];let total=0;
  for await(const chunk of req) {
    total+=chunk.length;
    if(total>8192) throw new Error("Request too large");
    chunks.push(chunk);
  }
  const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Expected object");
  return value;
}
class AuthServer extends DataServer {
  constructor({users,tokenLifetime=3600000,...options}={}) {
    super(options);
    if(!users) throw new Error("UserStore required");
    this.users=users;
    this.tokens=new Map();
    this.tokenLifetime=tokenLifetime;
  }
  authenticate(req) {
    const auth=String(req.headers.authorization || "");
    const match=auth.match(/^Bearer ([0-9a-f]{64})$/);
    if(!match) return null;
    const session=this.tokens.get(match[1]);
    if(!session) return null;
    if(session.expires<Date.now()) {this.tokens.delete(match[1]);return null;}
    return session.user;
  }
  async handler(req,res) {
    const url=new URL(req.url,"http://localhost");
    const send=(code,value)=>{
      res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
      res.end(JSON.stringify(value));
    };
    if(url.pathname==="/auth/login" && req.method==="POST") {
      if(!String(req.headers["content-type"] || "").startsWith("application/json")) return send(415,{error:"Expected application/json"});
      let payload;
      try {payload=await body(req);}
      catch {return send(400,{error:"Invalid request"});}
      if(typeof payload.username!=="string" || typeof payload.password!=="string" || payload.password.length>256) return send(400,{error:"Invalid request"});
      const user=this.users.verify(payload.username,payload.password);
      if(!user) return send(401,{error:"Invalid credentials"});
      const token=crypto.randomBytes(32).toString("hex");
      this.tokens.set(token,{user,expires:Date.now()+this.tokenLifetime});
      return send(200,{token,expiresIn:this.tokenLifetime/1000,role:user.role});
    }
    if(url.pathname.startsWith("/auth/") || /^\/api\//.test(url.pathname)) {
      const user=this.authenticate(req);
      if(!user) return send(401,{error:"Authentication required"});
      if(url.pathname==="/auth/me" && req.method==="GET") return send(200,user);
      if(url.pathname==="/auth/logout" && req.method==="POST") {
        const token=req.headers.authorization.slice(7);
        this.tokens.delete(token);return send(200,{loggedOut:true});
      }
      if(url.pathname.startsWith("/auth/")) return send(404,{error:"Not found"});
      if(user.role==="reader" && req.method!=="GET") return send(403,{error:"Write permission required"});
      return super.handler(req,res);
    }
    return super.handler(req,res);
  }
}
module.exports={UserStore,AuthServer};
