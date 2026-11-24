"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const {createAgentRunner}=require("../runtime/agent-executor");
const {createFileRunStore}=require("../runtime/agent-store");
const {createCommandTool}=require("../runtime/agent-command");
const {easternDay}=require("../scripts/run-agent-workflow");
const agent={name:"Review",role:"Reviewer",mission:"Review",workflow:"prepare, verify",rules:"Require evidence",output:"Receipt",requireToolEvidence:true};
const call=(name,id,args={})=>({id,type:"function",function:{name,arguments:JSON.stringify(args)}});
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-agent-state-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return root;
}

test("a process restart resumes one exact approval without replaying earlier actions",async t=>{
  const root=fixture(t); let reads=0,writes=0;
  const tools=[{name:"inspect",execute:async()=>{reads++;return {inspected:true};}},
    {name:"deliver",requiresApproval:true,parameters:{type:"object",properties:{id:{type:"string",enum:["package-7"]}},required:["id"],additionalProperties:false},
      execute:async(args,context)=>{writes++;assert.equal(context.callId,"write-1");return {id:args.id,delivered:true};}}];
  const runner=createAgentRunner({store:createFileRunStore(root),tools,allowedTools:["inspect","deliver"],
    model:async()=>({tool_calls:[call("inspect","read-1"),call("deliver","write-1",{id:"package-7"})]})});
  const initial=await runner.run({agent,task:"Deliver package",idempotencyKey:"day-1"});
  assert.equal(initial.state,"awaiting_approval");assert.equal(reads,1);assert.equal(writes,0);
  const fresh=createAgentRunner({store:createFileRunStore(root),tools,allowedTools:["inspect","deliver"],model:async()=>({content:"Delivered"})});
  await assert.rejects(fresh.resume({runId:initial.id,callId:"different-call",decision:"approve"}),/does not match/);
  const final=await fresh.resume({runId:initial.id,callId:"write-1",decision:"approve"});
  assert.equal(final.state,"succeeded");assert.equal(reads,1);assert.equal(writes,1);
  assert.equal((await fresh.run({agent,task:"Same day",idempotencyKey:"day-1"})).id,initial.id);
  assert.equal(writes,1);
  await assert.rejects(fresh.resume({runId:initial.id,callId:"write-1",decision:"approve"}),/not awaiting/);
  if(process.platform!=="win32")assert.equal(fs.statSync(path.join(root,initial.id+".json")).mode&0o777,0o600);
});

test("approval applies to one call and rejection ends the queued actions",async t=>{
  let writes=0;
  const tools=[{name:"deliver",requiresApproval:true,execute:async()=>({count:++writes})}];
  const runner=createAgentRunner({store:createFileRunStore(fixture(t)),tools,allowedTools:["deliver"],
    model:async()=>({tool_calls:[call("deliver","first"),call("deliver","second")]})});
  const initial=await runner.run({agent,task:"Two deliveries"});
  const resumed=await runner.resume({runId:initial.id,callId:"first",decision:"approve"});
  assert.equal(resumed.state,"awaiting_approval");assert.equal(resumed.pending.callId,"second");assert.equal(writes,1);
  const rejected=await runner.resume({runId:initial.id,callId:"second",decision:"reject"});
  assert.equal(rejected.state,"rejected");assert.equal(writes,1);
});

test("uncertain external outcome blocks duplicate runs after a restart",async t=>{
  const root=fixture(t);let writes=0;
  const make=()=>createAgentRunner({store:createFileRunStore(root),tools:[{name:"deliver",sideEffecting:true,execute:async()=>{writes++;throw Error("Receipt unavailable");}}],
    allowedTools:["deliver"],model:async()=>({tool_calls:[call("deliver","delivery")]})});
  const initial=await make().run({agent,task:"Deliver",idempotencyKey:"day"});
  assert.equal(initial.state,"needs_review");assert.equal(writes,1);
  const second=await make().run({agent,task:"Retry",idempotencyKey:"day"});
  assert.equal(second.state,"needs_review");assert.equal(second.id,initial.id);assert.equal(writes,1);
});

test("a timed out effect is marked for reconciliation, not silently retried",async()=>{
  const runner=createAgentRunner({toolTimeoutMs:15,model:async()=>({tool_calls:[call("deliver","delivery")]}),
    tools:[{name:"deliver",sideEffecting:true,execute:async()=>new Promise(()=>{})}],allowedTools:["deliver"]});
  const result=await runner.run({agent,task:"Deliver"});
  assert.equal(result.state,"needs_review");assert.match(result.error,/timed out/);
});

test("all batch arguments are validated before the first action",async()=>{
  let writes=0;
  const runner=createAgentRunner({model:async()=>({tool_calls:[call("deliver","good"),call("deliver","bad",{command:"rm"})]}),
    tools:[{name:"deliver",parameters:{type:"object",properties:{},additionalProperties:false},execute:async()=>{writes++;}}],allowedTools:["deliver"]});
  assert.equal((await runner.run({agent,task:"Deliver"})).state,"failed");assert.equal(writes,0);
});

test("workflow command runs in a separate process with only declared environment and a verified receipt",async t=>{
  const root=fixture(t),script=path.join(root,"worker.js");
  fs.writeFileSync(script,'console.log(JSON.stringify({state:"succeeded",delivery_verified:true,submitted:0,hasSecret:process.env.HIRO_UNDECLARED_TEST_SECRET!==undefined,run:process.env.HIRO_AGENT_RUN_ID,args:process.argv.slice(2)}))');
  process.env.HIRO_UNDECLARED_TEST_SECRET="must-not-pass";
  t.after(()=>delete process.env.HIRO_UNDECLARED_TEST_SECRET);
  const tool=createCommandTool({name:"deliver",executable:process.execPath,args:[script,"literal;$(not-a-shell)"],cwd:root,
    requiredReceipt:{delivery_verified:true,submitted:0}});
  let step=0;
  const runner=createAgentRunner({tools:[tool],allowedTools:["deliver"],model:async()=>++step===1?{tool_calls:[call("deliver","delivery")]}:{content:"Complete"}});
  const result=await runner.run({agent,task:"Run worker"});
  assert.equal(result.state,"succeeded");
  const receipt=await tool.execute({}, {runId:"test",callId:"one",idempotencyKey:"test:one"});
  assert.equal(receipt.hasSecret,false);assert.deepEqual(receipt.args,["literal;$(not-a-shell)"]);
  assert.equal(tool.verifyResult({...receipt,delivery_verified:false}),false);
});

test("native workflow CLI delivers once across separate processes, without an LLM",t=>{
  const root=fixture(t),worker=path.join(root,"worker.js"),count=path.join(root,"count"),configPath=path.join(root,"workflows.json");
  fs.writeFileSync(worker,`const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(count)},'delivered\\n');console.log(JSON.stringify({state:'succeeded',prepared_count:1,queue_delivered:true,delivery_verified:true,submitted:0}));`);
  fs.writeFileSync(configPath,JSON.stringify({stateDirectory:path.join(root,"state"),workflows:{JobApplications:{executable:process.execPath,args:[worker],cwd:root,envNames:[]}}}),{mode:0o600});
  const script=path.resolve(__dirname,"../scripts/run-agent-workflow.js");
  const invoke=()=>JSON.parse(execFileSync(process.execPath,[script,"--config",configPath,"--agent","JobApplications"],{encoding:"utf8"}));
  const first=invoke(),second=invoke();
  assert.equal(first.state,"succeeded");assert.equal(first.delivery.delivery_verified,true);
  assert.equal(second.run_id,first.run_id);assert.equal(fs.readFileSync(count,"utf8"),"delivered\n");
});

test("Eastern day boundaries preserve the intended daily deduplication",()=>{
  assert.equal(easternDay(new Date("2026-11-24T02:00:00Z")),"2026-11-23");
  assert.equal(easternDay(new Date("2026-07-02T03:00:00Z")),"2026-07-01");
});
