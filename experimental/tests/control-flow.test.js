'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {Runtime,parse}=require('../runtime');
const run=(src,options)=>new Runtime(parse(src),options).invoke('Main');
test('if then branch',()=>assert.equal(run('.Main = () :run() = { if (3 > 2) { return "yes"; } else { return "no"; } };'),'yes'));
test('if else branch',()=>assert.equal(run('.Main = () :run() = { if (false) { return "no"; } else { return "yes"; } };'),'yes'));
test('while updates variable',()=>assert.equal(run('.Main = () :run() = { $n = 0; while ($n < 3) { $n = $n + 1; } return $n; };'),3));
test('return propagates from nested block',()=>assert.equal(run('.Main = () :run() = { while (true) { if (true) { return 7; } } };'),7));
test('infinite loop is bounded',()=>assert.throws(()=>run('.Main = () :run() = { while (true) { $x = 1; } };',{maxSteps:10}),/Maximum execution steps/));
