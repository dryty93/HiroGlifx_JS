'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CheckpointStore}=require('../agents/checkpoints');
const {DurableRunner}=require('../agents/durable-runner');
const {ToolRegistry}=require('../agents/tools');
test('approval gate pauses before executing tool and resumes with approval',async()=>{
 const store=new CheckpointStore();let calls=0;
 const tools=new ToolRegistry().register('publish',()=>{calls++;return 'published';});
 const runner=new DurableRunner({store,tools});
 const plan=[{id:'publish1',type:'tool',tool:'publish',args:'draft',approvalRequired:true}];
 const paused=await runner.run('article',plan,{input:'draft',permissions:['publish']});
 assert.equal(paused.status,'awaiting_approval');assert.equal(paused.waitingFor,'publish1');assert.equal(calls,0);
 assert.equal((await store.load('article')).status,'awaiting_approval');
 const resumed=await runner.run('article',plan,{input:'draft',permissions:['publish'],approvals:['publish1']});
 assert.equal(resumed.status,'completed');assert.equal(resumed.results.publish1,'published');assert.equal(calls,1);
});
test('unrelated approval does not authorize tool',async()=>{
 const store=new CheckpointStore(),tools=new ToolRegistry().register('publish',()=>{throw Error('must not run');});
 const result=await new DurableRunner({store,tools}).run('article',[{id:'publish1',type:'tool',tool:'publish',approvalRequired:true}],{input:'x',permissions:['publish'],approvals:['other']});
 assert.equal(result.status,'awaiting_approval');
});
