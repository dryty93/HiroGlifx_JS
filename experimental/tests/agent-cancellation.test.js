'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
test('pre-aborted agent is rejected',async()=>{
 const controller=new AbortController();controller.abort();
 const rt=new Runtime(parse('.Main = () :run() = { return "ok"; };'));
 await assert.rejects(()=>rt.invokeAsync('Main','run',[],{signal:controller.signal}),/cancelled/);
});
test('expired execution deadline blocks work',async()=>{
 const rt=new Runtime(parse('.Main = () :run() = { while (true) { $x = 1; } };'),{maxSteps:100000});
 await assert.rejects(()=>rt.invokeAsync('Main','run',[],{timeoutMs:-1}),/deadline exceeded/);
});
test('normal agent execution works with deadline',async()=>{
 const rt=new Runtime(parse('.Main = () :run() = { return "ok"; };'));
 assert.equal(await rt.invokeAsync('Main','run',[],{timeoutMs:5000}),'ok');
});
