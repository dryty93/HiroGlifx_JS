'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {start}=require('../studio/server');
test('studio serves HTML and analyzes source',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/HiroGlifx Studio/);
  const res=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'.Main = () :run() = { return 42; };',run:true})});
  assert.equal(res.status,200);const body=await res.json();assert.equal(body.result,42);assert.equal(body.blueprints[0].name,'Main');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('studio rejects invalid code',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'not scroll'})});assert.equal(res.status,400);}
 finally{await new Promise(resolve=>server.close(resolve));}
});
