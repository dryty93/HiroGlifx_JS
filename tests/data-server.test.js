"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {JsonStore,DataServer}=require("../runtime/data-server");
test("persists collections across store instances with stable IDs",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-data-"));
  try {
    const file=path.join(dir,"store.json");
    const store=new JsonStore(file);
    store.create("notes");
    const note=store.insert("notes",{title:"first",id:"user-supplied"});
    assert.notEqual(note.id,"user-supplied");
    assert.deepEqual(new JsonStore(file).list("notes"),[note]);
    assert.equal(store.delete("notes",note.id),true);
    assert.deepEqual(new JsonStore(file).list("notes"),[]);
    assert.throws(()=>store.create("../bad"),/Invalid/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("REST GET, POST, DELETE and default route work",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-server-"));
  const runtime=new DataServer({store:new JsonStore(path.join(dir,"data.json"))});
  await runtime.execute("data.collection notes\nroute GET /health json '{\"ok\":true}'");
  const server=http.createServer((req,res)=>runtime.handler(req,res));
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const root="http://127.0.0.1:"+server.address().port;
  try {
    const initial=await fetch(root+"/api/notes");
    assert.deepEqual(await initial.json(),[]);
    const created=await fetch(root+"/api/notes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"Hello"})});
    assert.equal(created.status,201);
    const row=await created.json();
    assert.equal(row.title,"Hello");
    const list=await (await fetch(root+"/api/notes")).json();
    assert.equal(list.length,1);
    const deleted=await fetch(root+"/api/notes/"+row.id,{method:"DELETE"});
    assert.equal(deleted.status,200);
    assert.equal((await (await fetch(root+"/api/notes")).json()).length,0);
    assert.deepEqual(await (await fetch(root+"/health")).json(),{ok:true});
    assert.equal((await fetch(root+"/api/missing")).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
