"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {UserStore}=require("../runtime/auth-server");
const {OwnedApiServer}=require("../runtime/owned-api-server");
test("authenticates, validates writes, and isolates records by user",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-owned-"));
 const users=new UserStore(path.join(dir,"users.json"));
 users.add("alice","a-password-long-enough","writer");
 users.add("bobbb","another-long-password","writer");
 const records=[];
 const pg={
   create:async()=>{},exists:async()=>true,
   list:async(_,owner)=>records.filter(x=>x.owner===owner).map(x=>({id:x.id,...x.data})),
   insert:async(_,owner,data)=>{const item={id:"123e4567-e89b-42d3-a456-426614174000",owner,data};records.push(item);return{id:item.id,...data};},
   delete:async(_,owner,id)=>{const i=records.findIndex(x=>x.id===id&&x.owner===owner);if(i<0)return false;records.splice(i,1);return true;}
 };
 const app=new OwnedApiServer({postgres:pg,users});
 await app.execute("data.collection tasks");
 const server=http.createServer((req,res)=>app.handler(req,res));
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const root="http://127.0.0.1:"+server.address().port;
 const login=async(username,password)=>{
   const response=await fetch(root+"/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});
   assert.equal(response.status,200);
   return (await response.json()).token;
 };
 try {
  const alice=await login("alice","a-password-long-enough");
  const bob=await login("bobbb","another-long-password");
  const auth=token=>({authorization:"Bearer "+token});
  assert.equal((await fetch(root+"/api/tasks")).status,401);
  const create=await fetch(root+"/api/tasks",{method:"POST",headers:{...auth(alice),"content-type":"application/json"},body:JSON.stringify({title:"private",owner_id:"bobbb"})});
  assert.equal(create.status,201);
  const id=(await create.json()).id;
  assert.deepEqual(await (await fetch(root+"/api/tasks",{headers:auth(bob)})).json(),[]);
  assert.equal((await fetch(root+"/api/tasks/"+id,{method:"DELETE",headers:auth(bob)})).status,404);
  assert.equal((await fetch(root+"/api/tasks",{method:"POST",headers:{...auth(alice),"content-type":"application/json"},body:"[]"})).status,400);
  assert.equal((await fetch(root+"/api/tasks/"+id,{method:"DELETE",headers:auth(alice)})).status,200);
 }finally{await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true});}
});
