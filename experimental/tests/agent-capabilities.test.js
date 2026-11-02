'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
const {ToolRegistry}=require('../agents/tools');
const tools=new ToolRegistry().register('echo',x=>x);
test('child cannot gain tool capability denied by parent',async()=>{
 const src='.Worker = () @tools = [echo]; :run() = { return tool.call("echo","hello"); }; .Main = () I imports = Worker; &worker = Worker(); :run() = { return worker.run(); };';
 await assert.rejects(()=>new Runtime(parse(src)).invokeAsync('Main','run',[],{tools,permissions:['echo']}),/Permission denied/);
});
test('child can use tool explicitly granted by parent and runtime',async()=>{
 const src='.Worker = () @tools = [echo]; :run() = { return tool.call("echo","hello"); }; .Main = () @tools = [echo]; I imports = Worker; &worker = Worker(); :run() = { return worker.run(); };';
 assert.equal(await new Runtime(parse(src)).invokeAsync('Main','run',[],{tools,permissions:['echo']}),'hello');
});
