"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {parseClasses,loadDefinition,createAgentRunner,createOpenAIAdapter}=require("../runtime/agent-executor");
const base=fs.readFileSync(path.join(__dirname,"../examples/packages/agentkit/main.scroll"),"utf8");
const team=fs.readFileSync(path.join(__dirname,"../examples/agents/havabyte-team.scroll"),"utf8");
const spec=()=>loadDefinition({source:team,imports:{agentkit:base},name:"HavabyteResearch"});
const call=(name,id="c1",args="{}")=>({role:"assistant",content:null,tool_calls:[{id,type:"function",function:{name,arguments:args}}]});
test("native class syntax inherits and overrides the definition fields",()=>{
  const agent=spec();
  assert.equal(agent.name,"HavabyteResearch");
  assert.match(agent.mission,/Havabyte/);
  assert.match(agent.role,/market researcher/);
  assert.match(agent.workflow,/verify sources/);
  assert.equal(parseClasses(base).size,6);
});
test("unresolved imports and inheritance cycles fail closed",()=>{
  assert.throws(()=>loadDefinition({source:team,imports:{},name:"HavabyteResearch"}),/Unresolved import/);
  assert.throws(()=>loadDefinition({source:'.A = (B)\n break;\n.B = (A)\n break;',name:"A"}),/cycle/);
});
test("rejects code injection and unknown class fields",()=>{
  assert.throws(()=>parseClasses('.Agent = ()\n $ role = process.exit();\n break;'),/Unsupported/);
  assert.throws(()=>parseClasses('.Agent = ()\n $ secret = "bad";\n break;'),/Unsupported/);
});
test("returns final response without running tools",async()=>{
  const runner=createAgentRunner({model:async()=>({role:"assistant",content:"Done"})});
  const r=await runner.run({agent:spec(),task:"Say hi"});
  assert.equal(r.state,"succeeded");assert.equal(r.result,"Done");assert.equal(r.events.length,0);
  assert.equal(runner.getRun(r.id),r);
});
test("explicit tool allowlist executes and returns evidence",async()=>{
  const seen=[];let turn=0;
  const runner=createAgentRunner({
    model:async ({messages,tools})=>{
      turn++;seen.push({messages,tools});
      return turn===1?call("inspect","t1",JSON.stringify({path:"README.md"})):{role:"assistant",content:"Verified"};
    },
    tools:[{name:"inspect",execute:async args=>({read:args.path})}],
    allowedTools:["inspect"]
  });
  const r=await runner.run({agent:spec(),task:"Read README"});
  assert.equal(r.state,"succeeded");
  assert.deepEqual(r.events,[{kind:"tool",tool:"inspect",success:true}]);
  assert.equal(seen[1].messages.at(-1).content,'{"read":"README.md"}');
});
test("unapproved tool call never invokes implementation",async()=>{
  let executed=false;
  const runner=createAgentRunner({
    model:async()=>call("delete"),
    tools:[{name:"delete",execute:async()=>{executed=true;}}],
    allowedTools:[]
  });
  const r=await runner.run({agent:spec(),task:"Delete"});
  assert.equal(r.state,"failed");assert.equal(executed,false);
});
test("sensitive tool returns approval-required without execution",async()=>{
  let executed=false;
  const runner=createAgentRunner({
    model:async()=>call("publish"),
    tools:[{name:"publish",requiresApproval:true,execute:async()=>{executed=true;}}],
    allowedTools:["publish"]
  });
  const r=await runner.run({agent:spec(),task:"Publish"});
  assert.equal(r.state,"awaiting_approval");assert.equal(r.pending.tool,"publish");
  assert.equal(executed,false);
});
test("explicit per-run approval permits sensitive tool",async()=>{
  let step=0;let n=0;
  const runner=createAgentRunner({
    model:async()=>++step===1?call("publish"):{role:"assistant",content:"Published"},
    tools:[{name:"publish",requiresApproval:true,execute:async()=>{n++;return {ok:true};}}],
    allowedTools:["publish"]
  });
  const r=await runner.run({agent:spec(),task:"Publish",approvedTools:["publish"]});
  assert.equal(r.state,"succeeded");assert.equal(n,1);
});
test("step and tool-call budgets prevent runaway agents",async()=>{
  let next=0;
  const step=createAgentRunner({model:async()=>call("noop","noop"+(++next)),tools:[{name:"noop",execute:async()=>null}],allowedTools:["noop"],maxSteps:2});
  assert.match((await step.run({agent:spec(),task:"Loop"})).error,/Step budget exceeded/);
  const budget=createAgentRunner({model:async()=>call("noop"),tools:[{name:"noop",execute:async()=>null}],allowedTools:["noop"],maxToolCalls:0});
  assert.match((await budget.run({agent:spec(),task:"Loop"})).error,/Tool call budget exceeded/);
});
test("invalid tool arguments and thrown tool errors fail the run",async()=>{
  const broken=createAgentRunner({model:async()=>call("inspect","x","{bad"),tools:[{name:"inspect",execute:async()=>null}],allowedTools:["inspect"]});
  assert.match((await broken.run({agent:spec(),task:"Read"})).error,/Invalid tool arguments/);
  const failure=createAgentRunner({model:async()=>call("inspect"),tools:[{name:"inspect",execute:async()=>{throw Error("backend unavailable");}}],allowedTools:["inspect"]});
  assert.match((await failure.run({agent:spec(),task:"Read"})).error,/backend unavailable/);
});
test("OpenAI adapter uses HTTPS and validates provider response",async()=>{
  let request;
  const model=createOpenAIAdapter({apiKey:"test",fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({choices:[{message:{role:"assistant",content:"hi"}}]})};}});
  const result=await model({messages:[{role:"user",content:"Hi"}],tools:[]});
  assert.equal(result.content,"hi");assert.match(request.url,/\/chat\/completions$/);
  assert.equal(request.options.method,"POST");
  assert.throws(()=>createOpenAIAdapter({apiKey:"x",baseUrl:"http://example.com"}),/HTTPS/);
});

test("native class compiler accepts agentkit imports and subclass declarations",()=>{
  const {compile}=require("../runtime/scroll-game-classes");
  const input=team+"\n.Main = ()\n : tick(dt) = [\n ]\n : draw() = [\n ]\n break;\n";
  const compiled=compile(input,{agentkit:base});
  assert.ok(compiled);
});
test("agentkit is a valid installable HiroGlifx package",()=>{
  const os=require("node:os");
  const {installLocal}=require("../runtime/package-manager");
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-agentkit-"));
  try {
    const installed=installLocal(folder,path.join(__dirname,"../examples/packages/agentkit"));
    assert.equal(installed.name,"agentkit");
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test("typed agent constraints inherit, cap host limits, and compile with native classes",async()=>{
  const operator=loadDefinition({source:team,imports:{agentkit:base},name:"CrealytesReview"});
  assert.equal(operator.maxSteps,5);assert.equal(operator.maxToolCalls,3);
  assert.equal(operator.requireToolEvidence,true);assert.equal(operator.schedule,"daily");
  const runner=createAgentRunner({model:async()=>({content:"I published it"}),tools:[{name:"prepare_crealytes_review",execute:async()=>({id:"1"})}],allowedTools:["prepare_crealytes_review"]});
  assert.equal((await runner.run({agent:operator,task:"Post"})).state,"failed");
  const {compile}=require("../runtime/scroll-game-classes");
  assert.ok(compile(team+"\n.Main = ()\n : tick(dt) = [\n ]\n : draw() = [\n ]\n break;\n",{agentkit:base}));
});
test("host verified required action succeeds only after tool receipt",async()=>{
  let i=0;
  const operator=loadDefinition({source:team,imports:{agentkit:base},name:"CrealytesReview"});
  const runner=createAgentRunner({model:async()=>++i===1?call("prepare_crealytes_review","x",'{"id":"a"}'):{content:"Done"},
    tools:[{name:"prepare_crealytes_review",parameters:{type:"object",properties:{id:{type:"string",enum:["a"]}},required:["id"],additionalProperties:false},execute:async()=>({mediaId:"123"}),verifyResult:r=>/^\d+$/.test(r.mediaId)}],allowedTools:["prepare_crealytes_review"]});
  assert.equal((await runner.run({agent:operator,task:"Post"})).state,"succeeded");
});
test("tool schema rejects missing, extra, and invalid arguments before action",async()=>{
  for(const args of ['{}','{"id":"b"}','{"id":"a","extra":true}']){
    let executed=false;
    const runner=createAgentRunner({model:async()=>call("publish","x",args),tools:[{name:"publish",parameters:{type:"object",properties:{id:{type:"string",enum:["a"]}},required:["id"],additionalProperties:false},execute:async()=>{executed=true;}}],allowedTools:["publish"]});
    assert.equal((await runner.run({agent:spec(),task:"Post"})).state,"failed");assert.equal(executed,false);
  }
});
test("host result verifier rejects false receipts",async()=>{
  const runner=createAgentRunner({model:async()=>call("publish"),tools:[{name:"publish",execute:async()=>({ok:false}),verifyResult:r=>r.ok===true}],allowedTools:["publish"]});
  assert.match((await runner.run({agent:spec(),task:"Post"})).error,/verification/);
});
test("scroll limits cannot raise host step limits",async()=>{
  const runner=createAgentRunner({model:async()=>call("noop"),tools:[{name:"noop",execute:async()=>null}],allowedTools:["noop"],maxSteps:1});
  assert.match((await runner.run({agent:{...spec(),maxSteps:5},task:"Loop"})).error,/Step budget/);
});
