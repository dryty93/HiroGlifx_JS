'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {Runtime,parse}=require('../runtime');
test('two instances keep independent state across calls',()=>{
 const src='.Counter = () $n = 0; :increment() = { $n = $n + 1; return $n; }; .Main = () I imports = Counter; &a = Counter(); &b = Counter(); :run() = { $first = a.increment(); $second = a.increment(); return b.increment(); };';
 const runtime=new Runtime(parse(src));assert.equal(runtime.invoke('Main'),1);
 assert.deepEqual(runtime.trace.map(x=>x.agent),['Main','Counter','Counter','Counter']);
});
test('instance state persists through repeated invocation',()=>{
 const src='.Counter = () $n = 0; :increment() = { $n = $n + 1; return $n; }; .Main = () I imports = Counter; &a = Counter(); :run() = { $x = a.increment(); return a.increment(); };';
 assert.equal(new Runtime(parse(src)).invoke('Main'),2);
});
