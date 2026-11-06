'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../studio/editor-core');
const {Runtime,parse}=require('../runtime');
const {start}=require('../studio/server');

test('formatter preserves valid nested block program semantics',()=>{
 const source=[
 '.Counter = ($start)',
 '    :add($n):',
 '        if $n > 0:',
 '            return $start + $n',
 '        else:',
 '            return $start',
 '',
 '.Main = ()',
 '    I imports = Counter',
 '    &c = Counter(4)',
 '    :run():',
 '        return c.add(3)'
 ].join('\n');
 assert.equal(core.format(source),source);
 assert.equal(new Runtime(parse(core.format(source))).invoke('Main'),7);
});

test('formatter corrects tabs, trailing whitespace, missing block colon',()=>{
 const source='.Main = ()\n\t:run()\n\t\tif true\n\t\t\treturn 4  ';
 const result=core.format(source);
 assert.match(result,/    :run\(\):/);
 assert.match(result,/        if true:/);
 assert.match(result,/            return 4$/);
 assert.equal(new Runtime(parse(result)).invoke('Main'),4);
});

test('formatter supports multiline object literal and block dedent',()=>{
 const source=[
 '.Main = ()',
 '    :run():',
 '        $record = {',
 '            label: "hello",',
 '            values: [1, 2]',
 '        }',
 '        if true:',
 '            return $record.values[1]',
 '        else:',
 '            return 0'
 ].join('\n');
 assert.equal(new Runtime(parse(core.format(source))).invoke('Main'),2);
});

test('explicit quick fixes do not change source until applied',()=>{
 const source='.Main = ()\n    :run()\n        retrun 1';
 const fixes=core.quickFixes(source);
 assert.equal(fixes.length,2);
 assert.match(core.applyFix(source,fixes[0]),/:run\(\):/);
 assert.match(source,/:run\(\)\n/);
});

test('completion suggestions include source-defined names',()=>{
 const source='.Researcher = ()\n    :summarize($text):\n        return $text\n.Res';
 assert.equal(core.complete(source,source.length).some(x=>x.label==='Researcher'),true);
});

test('assist endpoint reports parser diagnostics and supplies corrections without running source',async()=>{
 const server=start({port:0});await new Promise(resolve=>server.once('listening',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const broken='.Main = ()\n    :run():\n        return $missing +';
  const resp=await fetch(base+'/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:broken})});
  assert.equal(resp.status,200);
  const payload=await resp.json();
  assert.equal(payload.diagnostic.severity,'error');
  const format=await fetch(base+'/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'.Main = ()\n\t:run()\n\t\treturn 3',format:true})});
  assert.equal(format.status,200);
  const formatted=(await format.json()).formatted;
  assert.equal(new Runtime(parse(formatted)).invoke('Main'),3);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
