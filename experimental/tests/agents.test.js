'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {MockProvider,ModelRegistry}=require('../agents/provider');
const {ToolRegistry}=require('../agents/tools');
const {Orchestrator}=require('../agents/orchestrator');
test('model adapter with deterministic mock',async()=>{
 const mock=new MockProvider({hello:'world'});const models=new ModelRegistry().register('mock',mock);
 assert.equal((await models.generate('mock',{prompt:'hello'})).text,'world');
 assert.equal(mock.calls.length,1);
});
test('tool registry enforces allowlist',async()=>{
 const tools=new ToolRegistry().register('echo',x=>x);
 await assert.rejects(()=>tools.call('echo','x'),/Permission denied/);
 assert.equal(await tools.call('echo','x',{allowed:['echo']}),'x');
});
test('orchestrator executes bounded sequential plan',async()=>{
 const tools=new ToolRegistry().register('echo',x=>x);
 const o=new Orchestrator({toolRegistry:tools});
 const out=await o.execute([{id:'a',type:'transform',operation:'identity',value:'$input'},{id:'b',type:'tool',tool:'echo',args:'$a'}],{input:'ok',permissions:['echo']});
 assert.equal(out.result,'ok');assert.equal(out.events.length,2);
});
test('orchestrator rejects step overrun',async()=>{
 const o=new Orchestrator({maxSteps:0});
 await assert.rejects(()=>o.execute([{id:'a',type:'transform',operation:'identity',value:'x'}]),/step budget/);
});
