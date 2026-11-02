'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const {ToolRegistry}=require('../agents/tools');
const {MemoryStore}=require('../agents/memory');
test('approved tool callable from scroll',async()=>{
 const src='.Main = () @tools = [echo]; :run() = { return tool.call("echo","hello"); };';
 const tools=new ToolRegistry().register('echo',x=>x);
 assert.equal(await new Runtime(parse(src)).invokeAsync('Main','run',[],{tools,permissions:['echo']}),'hello');
});
test('tool denied when missing runtime grant',async()=>{
 const src='.Main = () @tools = [echo]; :run() = { return tool.call("echo","hello"); };';
 const tools=new ToolRegistry().register('echo',x=>x);
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main','run',[],{tools}),/Permission denied/);
});
test('tool denied when missing blueprint grant',async()=>{
 const src='.Main = () :run() = { return tool.call("echo","hello"); };';
 const tools=new ToolRegistry().register('echo',x=>x);
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main','run',[],{tools,permissions:['echo']}),/Permission denied/);
});
test('session memory roundtrip',async()=>{
 const src='.Main = () @memory = session; :run() = { $value = memory.set("topic","hello"); return memory.get("topic"); };';
 const memory=new MemoryStore();
 assert.equal(await new Runtime(parse(src)).invokeAsync('Main','run',[],{memory}),'hello');
});
test('memory requires blueprint opt-in',async()=>{
 const src='.Main = () :run() = { return memory.get("topic"); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main','run',[],{memory:new MemoryStore()}),/Memory access denied/);
});
