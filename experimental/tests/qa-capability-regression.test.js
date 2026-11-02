'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const {ToolRegistry}=require('../agents/tools');
test('sequential child cannot escalate tool grants',async()=>{
 const src='.Worker = () @tools = [echo]; :run() = { return tool.call("echo","ok"); }; .Main = () I imports = Worker; &w = Worker(); :run() = { return w.run(); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main','run',[],{tools:new ToolRegistry().register('echo',x=>x),permissions:['echo']}),/Permission denied/);
});
test('explicit parent and child grants permit tool',async()=>{
 const src='.Worker = () @tools = [echo]; :run() = { return tool.call("echo","ok"); }; .Main = () @tools = [echo]; I imports = Worker; &w = Worker(); :run() = { return w.run(); };';
 assert.equal(await new Runtime(parse(src)).invokeAsync('Main','run',[],{tools:new ToolRegistry().register('echo',x=>x),permissions:['echo']}),'ok');
});
