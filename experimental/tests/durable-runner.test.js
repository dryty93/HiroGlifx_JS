'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CheckpointStore}=require('../agents/checkpoints');
const {DurableRunner}=require('../agents/durable-runner');
const {createHash}=require('node:crypto');
test('checkpointed deterministic workflow resumes completed steps',async()=>{
 const store=new CheckpointStore();
 const plan=[{id:'a',type:'identity',value:'$input'},{id:'b',type:'identity',value:'$a',dependsOn:['a']}];
 const planHash=createHash('sha256').update(JSON.stringify(plan)).digest('hex');
 await store.save('job',{version:1,planHash,input:'hello',results:{input:'hello',a:'hello'},completed:['a'],status:'running'});
 const runner=new DurableRunner({store});
 const out=await runner.run('job',plan,{input:'hello'});
 assert.equal(out.results.b,'hello');assert.deepEqual(out.completed,['a','b']);
 assert.equal((await store.load('job')).status,'completed');
});
test('resume rejects changed input',async()=>{
 const store=new CheckpointStore(),runner=new DurableRunner({store});
 await runner.run('job',[{id:'a',type:'identity',value:1}],{input:'one'});
 await assert.rejects(()=>runner.run('job',[{id:'a',type:'identity',value:1}],{input:'two'}),/input mismatch/);
});
test('durable tool requires explicit registry and permission',async()=>{
 await assert.rejects(()=>new DurableRunner().run('job',[{id:'x',type:'tool',tool:'send'}]),/Tool registry required/);
});

test('reject changed workflow definition on resume',async()=>{
 const store=new CheckpointStore(),runner=new DurableRunner({store});
 await runner.run('job',[{id:'a',type:'identity',value:1}],{input:'x'});
 await assert.rejects(()=>runner.run('job',[{id:'a',type:'identity',value:2}],{input:'x'}),/definition changed/);
});

test('uncertain external side effect cannot be replayed after failure',async()=>{
 const {ToolRegistry}=require('../agents/tools');
 const store=new CheckpointStore();let calls=0;
 const tools=new ToolRegistry().register('charge',()=>{calls++;throw Error('network lost');});
 const runner=new DurableRunner({store,tools});
 const plan=[{id:'charge1',type:'tool',tool:'charge',args:{amount:1}}];
 await assert.rejects(()=>runner.run('payment',plan,{input:null,permissions:['charge']}),/network lost/);
 assert.equal((await store.load('payment')).inFlight,'charge1');
 await assert.rejects(()=>runner.run('payment',plan,{input:null,permissions:['charge']}),/manual reconciliation/);
 assert.equal(calls,1);
});
test('successful tool is checkpointed and not replayed',async()=>{
 const {ToolRegistry}=require('../agents/tools');
 const store=new CheckpointStore();let calls=0;
 const tools=new ToolRegistry().register('send',()=>{calls++;return 'sent';});
 const runner=new DurableRunner({store,tools}),plan=[{id:'send1',type:'tool',tool:'send',args:'hi'}];
 await runner.run('mail',plan,{input:null,permissions:['send']});
 await runner.run('mail',plan,{input:null,permissions:['send']});
 assert.equal(calls,1);
});
