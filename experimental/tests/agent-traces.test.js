'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
test('records successful async agent lifecycle',async()=>{
 const rt=new Runtime(parse('.Main = () :run() = { return "ok"; };'));
 assert.equal(await rt.invokeAsync('Main'),'ok');
 assert.equal(rt.trace.some(e=>e.event==='start'&&e.agent==='Main'),true);
 assert.equal(rt.trace.some(e=>e.event==='complete'&&e.durationMs>=0),true);
});
test('records failed async agent lifecycle',async()=>{
 const rt=new Runtime(parse('.Main = () :run() = { return $missing; };'));
 await assert.rejects(()=>rt.invokeAsync('Main'),/Undefined variable/);
 assert.equal(rt.trace.some(e=>e.event==='failed'&&e.errorName==='Error'),true);
});
