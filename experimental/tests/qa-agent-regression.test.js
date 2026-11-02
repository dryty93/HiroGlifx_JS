'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const {ToolRegistry}=require('../agents/tools');
const {MemoryStore}=require('../agents/memory');
test('qa includes permission-checked scroll tool invocation',async()=>{
 const rt=new Runtime(parse('.Main = () @tools = [echo]; :run() = { return tool.call("echo","ok"); };'));
 const tools=new ToolRegistry().register('echo',x=>x);
 assert.equal(await rt.invokeAsync('Main','run',[],{tools,permissions:['echo']}),'ok');
 await assert.rejects(()=>rt.invokeAsync('Main','run',[],{tools}),/Permission denied/);
});
test('qa includes session memory',async()=>{
 const rt=new Runtime(parse('.Main = () @memory = session; :run() = { $x = memory.set("a","b"); return memory.get("a"); };'));
 assert.equal(await rt.invokeAsync('Main','run',[],{memory:new MemoryStore()}),'b');
});
test('shared async step budget applies to child agents',async()=>{
 const src='.Worker = () :run() = { $a = 1; $b = 2; return $a + $b; }; .Main = () I imports = Worker; &w = Worker(); :run() = { return w.run(); };';
 await assert.rejects(()=>new Runtime(parse(src),{maxSteps:3}).invokeAsync('Main'),/Maximum execution steps/);
});
