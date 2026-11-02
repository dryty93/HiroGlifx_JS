'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CheckpointStore}=require('../agents/checkpoints');
const {DurableRunner}=require('../agents/durable-runner');
test('checkpointed deterministic workflow resumes completed steps',async()=>{
 const store=new CheckpointStore();
 await store.save('job',{version:1,input:'hello',results:{input:'hello',a:'hello'},completed:['a'],status:'running'});
 const runner=new DurableRunner({store});
 const out=await runner.run('job',[{id:'a',type:'identity',value:'$input'},{id:'b',type:'identity',value:'$a',dependsOn:['a']}],{input:'hello'});
 assert.equal(out.results.b,'hello');assert.deepEqual(out.completed,['a','b']);
 assert.equal((await store.load('job')).status,'completed');
});
test('resume rejects changed input',async()=>{
 const store=new CheckpointStore(),runner=new DurableRunner({store});
 await runner.run('job',[{id:'a',type:'identity',value:1}],{input:'one'});
 await assert.rejects(()=>runner.run('job',[{id:'a',type:'identity',value:1}],{input:'two'}),/input mismatch/);
});
test('durable v0 refuses side-effecting steps',async()=>{
 await assert.rejects(()=>new DurableRunner().run('job',[{id:'x',type:'tool',tool:'send'}]),/Only unique identity/);
});
