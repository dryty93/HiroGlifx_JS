'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {Runtime,parse}=require('../runtime');
test('constructor binds initial instance state',()=>{
 const src='.Greeter = ($name) :run() = { return $name; }; .Main = () I imports = Greeter; &a = Greeter("Alice"); :run() = { return a.run(); };';
 assert.equal(new Runtime(parse(src)).invoke('Main'),'Alice');
});
test('instances have independent constructor values',()=>{
 const src='.Identity = ($name) :run() = { return $name; }; .Main = () I imports = Identity; &a = Identity("A"); &b = Identity("B"); :run() = { return b.run(); };';
 assert.equal(new Runtime(parse(src)).invoke('Main'),'B');
});
test('constructor arity is enforced',()=>{
 const src='.Identity = ($name) :run() = { return $name; }; .Main = () I imports = Identity; &a = Identity(); :run() = { return a.run(); };';
 assert.throws(()=>new Runtime(parse(src)).invoke('Main'),/Constructor argument count/);
});
