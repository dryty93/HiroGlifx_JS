'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {Environment}=require('../language/environment');
test('lexical environment inherits and shadows',()=>{
 const root=new Environment();root.define('name','root');const child=root.child();
 assert.equal(child.get('name'),'root');child.define('name','child');
 assert.equal(child.get('name'),'child');assert.equal(root.get('name'),'root');
});
test('assignment updates nearest binding',()=>{
 const root=new Environment();root.define('count',1);const child=root.child();
 child.assign('count',2);assert.equal(root.get('count'),2);
});
test('undefined and duplicate bindings fail',()=>{
 const env=new Environment();assert.throws(()=>env.get('missing'),/Undefined/);
 env.define('a',1);assert.throws(()=>env.define('a',2),/Duplicate/);
});
