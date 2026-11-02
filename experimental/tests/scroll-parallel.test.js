'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
test('parallel delegates to multiple imported agents',async()=>{
 const src='.Worker = () :run($value) = { return $value * 2; }; .Main = () I imports = Worker; &first = Worker(); &second = Worker(); :run() = { return agents.parallel([{agent:"first",method:"run",args:[2]},{agent:"second",method:"run",args:[3]}]); };';
 const result=await new Runtime(parse(src)).invokeAsync('Main');assert.deepEqual(result,[4,6]);
});
test('parallel rejects unknown child instance',async()=>{
 const src='.Main = () :run() = { return agents.parallel([{agent:"missing",method:"run",args:[]}]); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main'),/Unknown agent instance/);
});
test('parallel rejects oversized batch',async()=>{
 const tasks=Array.from({length:9},()=>'{agent:"worker",method:"run",args:[]}').join(',');
 const src='.Main = () :run() = { return agents.parallel(['+tasks+']); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main'),/Parallel agent limit/);
});
