'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const {ModelRegistry,MockProvider}=require('../agents/provider');
test('scroll ai.reason uses model registry and metadata',async()=>{
 const src='.Researcher = () @model = "mock-model"; :run($topic) = { return ai.reason($topic); };';
 const mock=new MockProvider({hello:'response'}),models=new ModelRegistry().register('mock',mock);
 const runtime=new Runtime(parse(src));
 assert.equal(await runtime.invokeAsync('Researcher','run',['hello'],{models}),'response');
 assert.equal(mock.calls[0].model,'mock-model');
 assert.equal(runtime.trace.some(x=>x.method==='ai.reason'),true);
});
test('nested async agents delegate to child',async()=>{
 const src='.Researcher = () :run($topic) = { return ai.reason($topic); }; .Main = () I imports = Researcher; &r = Researcher(); :run() = { return r.run("topic"); };';
 const models=new ModelRegistry().register('mock',new MockProvider({topic:'result'}));
 assert.equal(await new Runtime(parse(src)).invokeAsync('Main','run',[],{models}),'result');
});
test('missing model registry fails closed',async()=>{
 const src='.Main = () :run() = { return ai.reason("topic"); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main'),/Model registry required/);
});
