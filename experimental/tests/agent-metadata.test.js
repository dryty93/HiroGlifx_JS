'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
test('agent blueprint metadata parsed and validated',()=>{
 const src='.Researcher = () @model = "gpt-6"; @role = "Research specialist"; @tools = [web.search,web.read]; :run($topic) = { return $topic; };';
 const r=new Runtime(parse(src));assert.equal(r.configuration('Researcher').model,'gpt-6');
 assert.deepEqual(r.configuration('Researcher').tools,['web.search','web.read']);
 assert.equal(r.invoke('Researcher','run',['topic']),'topic');
});
test('reject dynamic model metadata',()=>assert.throws(()=>new Runtime(parse('.Main = () @model = $dynamic; :run() = { return "x"; };')),/static values/));
test('reject unknown annotations',()=>assert.throws(()=>new Runtime(parse('.Main = () @unknown = "x"; :run() = { return "x"; };')),/Unknown agent annotation/));
test('reject non-array tools',()=>assert.throws(()=>new Runtime(parse('.Main = () @tools = "web.search"; :run() = { return "x"; };')),/@tools must/));
