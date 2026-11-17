"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),http=require("node:http");
const {PostgresStore}=require("../runtime/postgres-store");
const {UserStore}=require("../runtime/auth-server");
const {OwnedApiServer}=require("../runtime/owned-api-server");
test("real PostgreSQL: schema, user isolation and API permissions",{skip:!process.env.HIRO_TEST_DATABASE_URL},async()=>{
  const {Pool}=require("pg");
  const pool=new Pool({connectionString:process.env.HIRO_TEST_DATABASE_URL});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-realpg-"));
  let server;
  try{
    const store=new PostgresStore(pool);
    await store.migrate();
    const collection="test_"+Date.now().toString(36);
    await store.create(collection);
    const users=new UserStore(path.join(dir,"users.json"));
    users.add("alice","very-long-testing-password","writer");
    users.add("bobby","another-test-password-123","writer");
    users.add("readerr","read-only-password-123","reader");
    const app=new OwnedApiServer({postgres:store,users});
    server=http.createServer((req,res)=>Promise.resolve(app.handler(req,res)).catch(e=>{
      console.error(e);
      if(!res.headersSent){res.writeHead(500);res.end("Error");}
    }));
    await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
    const root="http://127.0.0.1:"+server.address().port;
    const login=async(user,password)=>{
      const response=await fetch(root+"/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:user,password})});
      assert.equal(response.status,200);
      return (await response.json()).token;
    };
    const alice=await login("alice","very-long-testing-password");
    const bob=await login("bobby","another-test-password-123");
    const reader=await login("readerr","read-only-password-123");
    const bearer=t=>({authorization:"Bearer "+t});
    const url=root+"/api/"+collection;
    const created=await fetch(url,{method:"POST",headers:{...bearer(alice),"content-type":"application/json"},body:JSON.stringify({title:"Private",owner_id:"bobby"})});
    assert.equal(created.status,201);
    const item=await created.json();
    assert.equal(item.title,"Private");
    assert.equal((await (await fetch(url,{headers:bearer(bob)})).json()).length,0);
    assert.equal((await fetch(url+"/"+item.id,{method:"DELETE",headers:bearer(bob)})).status,404);
    assert.equal((await fetch(url,{method:"POST",headers:{...bearer(reader),"content-type":"application/json"},body:'{"title":"No"}'})).status,403);
    assert.equal((await fetch(url,{method:"POST",headers:{...bearer(alice),"content-type":"application/json"},body:"[]"})).status,400);
    assert.equal((await (await fetch(url,{headers:bearer(alice)})).json()).length,1);
    assert.equal((await fetch(url+"/"+item.id,{method:"DELETE",headers:bearer(alice)})).status,200);
    assert.equal((await (await fetch(url,{headers:bearer(alice)})).json()).length,0);
  }finally{
    if(server)await new Promise(ok=>server.close(ok));
    await pool.end();
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
