'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const run=(expression)=>new Runtime(parse('.Main = () :run() = { return '+expression+'; };')).invoke('Main');
test('scroll arithmetic respects precedence',()=>assert.equal(run('2 + 3 * 4'),14));
test('scroll parentheses group expressions',()=>assert.equal(run('(2 + 3) * 4'),20));
test('scroll comparisons and booleans',()=>assert.equal(run('2 * 3 >= 6 && !false'),true));
test('scroll variables participate in expressions',()=>{
 const runtime=new Runtime(parse('.Main = () $base = 5; :run($delta) = { return $base + $delta; };'));
 assert.equal(runtime.invoke('Main','run',[3]),8);
});
test('scroll nested agent expressions',()=>{
 const source='.Worker = () :run($n) = { return $n * 2; }; .Main = () I imports = Worker; &worker = Worker(); :run() = { return worker.run(3) + 1; };';
 assert.equal(new Runtime(parse(source)).invoke('Main'),7);
});
test('invalid operator is rejected',()=>assert.throws(()=>parse('.Main = () :run() = { return 2 ^ 3; };'),SyntaxError));
