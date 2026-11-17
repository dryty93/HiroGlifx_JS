"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {PostgresStore,fields,name}=require("../runtime/postgres-store");
test("collection names validated, owner fields protected",()=>{
 assert.equal(name("todos"),"todos");
 assert.throws(()=>name("todos; DROP TABLE users"),/Invalid/);
 assert.deepEqual(fields({title:"A",id:"fake",owner_id:"someone"}),{title:"A"});
 assert.throws(()=>fields([]),/object/);
});
test("database operations use parameter placeholders and owner constraint",async()=>{
 const queries=[];
 const pool={query:async(sql,params=[])=>{
   queries.push({sql,params});
   if(sql.startsWith("SELECT id"))return {rows:[]};
   if(sql.startsWith("DELETE"))return {rows:[{id:"abc"}]};
   if(sql.startsWith("SELECT 1"))return {rows:[{one:1}]};
   if(sql.startsWith("INSERT INTO hg_records"))return {rows:[{id:params[0],payload:JSON.parse(params[3]),created_at:"2026-11-16"}]};
   return {rows:[]};
 }};
 const store=new PostgresStore(pool);
 await store.migrate();
 await store.create("todos");
 assert.equal(await store.exists("todos"),true);
 const row=await store.insert("todos","alice",{title:"Hello",owner_id:"bob"});
 assert.equal(row.title,"Hello");
 assert.equal(await store.list("todos","alice").then(r=>r.length),0);
 assert.equal(await store.delete("todos","alice",row.id),true);
 assert.equal(queries.filter(q=>q.sql.includes("hg_records")&&q.params.length>0).every(q=>q.sql.includes("$1")),true);
 assert.equal(queries.filter(q=>q.sql.startsWith("DELETE")).every(q=>q.sql.includes("owner_id = $2")),true);
});
