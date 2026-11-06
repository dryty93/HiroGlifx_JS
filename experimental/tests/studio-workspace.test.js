'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../studio/workspace-core');
const {start}=require('../studio/server');

test('search next, wrap and reverse and case-insensitive',()=>{
 const source='Agent agent Agent';
 assert.deepEqual(core.findNext(source,'agent',0),{from:0,to:5});
 assert.deepEqual(core.findNext(source,'agent',5),{from:6,to:11});
 assert.deepEqual(core.findNext(source,'agent',source.length),{from:0,to:5});
 assert.deepEqual(core.findNext(source,'agent',6,{backwards:true}),{from:0,to:5});
 assert.equal(core.findNext(source,'missing'),null);
});
test('replace all is literal and case-insensitive',()=>{
 const output=core.replaceAll('Agent AGENT','agent','Worker');
 assert.deepEqual(output,{source:'Worker Worker',count:2});
 assert.equal(core.replaceAll('hello','','x').count,0);
});
test('local file names cannot include directory traversal',()=>{
 assert.equal(core.safeFilename('../../project.scroll'),'project.scroll');
 assert.equal(core.safeFilename('my sketch'),'my_sketch.scroll');
});
test('symbol navigation finds blueprint and method declaration',()=>{
 const source='.Main = ()\n    :run():\n        return 10';
 assert.equal(core.symbolLine(source,'Main'),1);
 assert.equal(core.symbolLine(source,'run','method'),2);
 assert.equal(core.symbolLine(source,'missing'),null);
});
test('studio serves find, local file and outline assets',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const html=await (await fetch(base)).text();
  for(const id of ['open-file','download-file','find-bar','find-query','outline-filter','run-history'])
   assert.match(html,new RegExp('id="'+id+'"'));
  for(const asset of ['/workspace.js','/workspace-core.js']){
   const response=await fetch(base+asset);assert.equal(response.status,200);
   assert.match(response.headers.get('content-type'),/javascript/);
  }
  const assist=await fetch(base+'/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'.Main = ()\n    :run():\n        return 1'})});
  const data=await assist.json();
  assert.equal(data.outline[0].name,'Main');
  assert.deepEqual(data.outline[0].methods,['run']);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
