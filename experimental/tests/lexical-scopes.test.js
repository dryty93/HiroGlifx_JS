'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const run=s=>new Runtime(parse(s)).invoke('Main');
test('branch-local variable does not escape',()=>assert.throws(()=>run('.Main = () :run() = { if (true) { $temp = 3; } return $temp; };'),/Undefined variable/));
test('outer binding updated from nested block',()=>assert.equal(run('.Main = () :run() = { $x = 1; if (true) { $x = 4; } return $x; };'),4));
test('method parameters do not overwrite blueprint fields',()=>{
 const src='.Main = () $name = "field"; :run($name) = { return $name; }; :get() = { return $name; };';
 const runtime=new Runtime(parse(src));assert.equal(runtime.invoke('Main','run',['argument']),'argument');assert.equal(runtime.invoke('Main','get'),'field');
});
test('loop locals are recreated each iteration',()=>assert.equal(run('.Main = () :run() = { $i = 0; while ($i < 3) { $scratch = $i; $i = $i + 1; } return $i; };'),3));
