'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {Runtime,parse}=require('../runtime');
test('nested agent composition',()=>{const p=parse(fs.readFileSync(path.join(__dirname,'../examples/newsroom.scroll'),'utf8'));const r=new Runtime(p);assert.equal(r.invoke('Main'),'Agent composition works');assert.deepEqual(r.trace.map(x=>x.agent),['Main','Journalist','Researcher','Writer']);});
test('invalid import fails',()=>assert.throws(()=>new Runtime(parse('.Main = () I imports = Missing; :run() = { return "ok"; };')).invoke('Main'),/Missing import/));
test('malformed source fails',()=>assert.throws(()=>parse('.Main = () :run() = { return "oops";'),SyntaxError));
test('depth limit',()=>{const r=new Runtime(parse('.Loop = () &self = Loop(); :run() = { return self.run(); };'),{maxDepth:3});assert.throws(()=>r.invoke('Loop'),/depth/);});
