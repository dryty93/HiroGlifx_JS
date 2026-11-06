'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {start}=require('../studio/server');
test('studio serves HTML and analyzes source',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const page=await fetch(base);assert.equal(page.status,200);const pageHTML=await page.text();assert.match(pageHTML,/HiroGlifx Studio/);assert.match(pageHTML,/:add\(\$value\):/);
  const res=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'.Main = () :run() = { return 42; };',run:true})});
  assert.equal(res.status,200);const body=await res.json();assert.equal(body.result,42);assert.equal(body.blueprints[0].name,'Main');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('studio rejects invalid code',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'not scroll'})});assert.equal(res.status,400);}
 finally{await new Promise(resolve=>server.close(resolve));}
});

test('studio analyzes and executes indentation-style source',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const source=[
   '.Calculator = ($base)',
   '    :add($n):',
   '        return $base + $n',
   '.Main = ()',
   '    I imports = Calculator',
   '    &calc = Calculator(11)',
   '    :run():',
   '        return calc.add(9)'
  ].join('\n');
  const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/analyze',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,run:true})
  });
  assert.equal(res.status,200);
  const body=await res.json();assert.equal(body.result,20);
  assert.equal(body.blueprints[1].instances[0].name,'calc');
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('studio serves smart editor assets and IDE controls',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const page=await (await fetch(base)).text();
  for(const id of ['format-code','fix-code','completions','problems','line-numbers','cursor-status','autoformat'])
   assert.match(page,new RegExp('id="'+id+'"'));
  const ide=await fetch(base+'/ide.js');assert.equal(ide.status,200);
  const code=await ide.text();assert.match(code,/smartEnter/);assert.match(code,/formatDocument/);
  const helper=await fetch(base+'/editor-core.js');assert.equal(helper.status,200);
  assert.match(await helper.text(),/quickFixes/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
