'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {OpenAIProvider}=require('../agents/openai-provider');
const {MemoryStore}=require('../agents/memory');
const {Workflow}=require('../agents/workflow');
const {ToolRegistry}=require('../agents/tools');
test('OpenAI adapter parses mock HTTP response without live charges',async()=>{
 let request;
 const provider=new OpenAIProvider({apiKey:'test',fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({model:'mock',output:[{content:[{type:'output_text',text:'hello'}]}],usage:{input_tokens:3,output_tokens:1}})};}});
 const result=await provider.generate({prompt:'hi'});assert.equal(result.text,'hello');assert.equal(result.usage.inputTokens,3);assert.match(request.url,/responses$/);
});
test('memory namespaces values',async()=>{
 const memory=new MemoryStore();await memory.set('agentA','topic',{name:'hello'});assert.deepEqual(await memory.get('agentA','topic'),{name:'hello'});assert.equal(await memory.get('agentB','topic'),undefined);
});
test('parallel DAG workflow and dependencies',async()=>{
 const tools=new ToolRegistry().register('echo',async x=>x);
 const workflow=new Workflow({tools});
 const result=await workflow.run([{id:'a',type:'identity',value:'$input'},{id:'b',type:'identity',value:'other'},{id:'c',type:'tool',tool:'echo',args:'$a',dependsOn:['a','b']}],{input:'hello',permissions:['echo']});
 assert.equal(result.results.c,'hello');assert.equal(result.events.length,3);
});
test('cycle detection',async()=>{
 const workflow=new Workflow();
 await assert.rejects(()=>workflow.run([{id:'a',type:'identity',value:'x',dependsOn:['b']},{id:'b',type:'identity',value:'y',dependsOn:['a']}]),/cycle/);
});
test('denied tools',async()=>{
 const workflow=new Workflow({tools:new ToolRegistry().register('echo',x=>x)});
 await assert.rejects(()=>workflow.run([{id:'a',type:'tool',tool:'echo',args:'hi'}]),/Permission denied/);
});
