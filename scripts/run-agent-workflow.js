#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {loadDefinition,createAgentRunner}=require("../runtime/agent-executor");
const {createFileRunStore}=require("../runtime/agent-store");
const {createCommandTool}=require("../runtime/agent-command");

const WORKFLOWS={
  JobApplications:{tool:"prepare_job_applications",successStates:["prepared","succeeded"],requiredReceipt:{delivery_verified:true,submitted:0}},
  CrealytesReview:{tool:"prepare_crealytes_review",successStates:["draft_ready"],requiredReceipt:{approval:"pending",published:false}}
};
function argument(argv,name) { const index=argv.indexOf("--"+name); return index<0?undefined:argv[index+1]; }
function easternDay(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
async function main(argv=process.argv.slice(2)) {
  if(argv.includes("--help")) {
    console.log("Usage: node scripts/run-agent-workflow.js --config /private/workflows.json --agent JobApplications|CrealytesReview\nRuns a fixed host command once per Eastern day. No model call, shell, or social publication.");
    return;
  }
  const configPath=argument(argv,"config"),name=argument(argv,"agent"),workflow=WORKFLOWS[name];
  const day=easternDay();
  if(!configPath||!path.isAbsolute(configPath)||!workflow)throw Error("Invalid workflow arguments; use --help");
  const stat=fs.statSync(configPath);
  if(stat.size>40000||(process.platform!=="win32"&&(stat.mode&0o077)))throw Error("Workflow config must be a small private file (mode 0600)");
  const config=JSON.parse(fs.readFileSync(configPath,"utf8")),binding=config.workflows?.[name];
  if(!binding)throw Error("Workflow has no host command binding");
  const root=path.resolve(__dirname,"..");
  const agent=loadDefinition({source:fs.readFileSync(path.join(root,"examples/agents/havabyte-team.scroll"),"utf8"),
    imports:{agentkit:fs.readFileSync(path.join(root,"examples/packages/agentkit/main.scroll"),"utf8")},name});
  const tool=createCommandTool({...binding,name:workflow.tool,successStates:workflow.successStates,requiredReceipt:workflow.requiredReceipt});
  // The workflow is deterministic: use the native definition's required capability, then its verified receipt.
  const model=async({messages})=>{
    const receipt=messages.find(m=>m.role==="tool");
    return receipt?{content:receipt.content}:{content:null,tool_calls:[{id:"delivery",type:"function",function:{name:agent.requiredTool,arguments:"{}"}}]};
  };
  const runner=createAgentRunner({model,tools:[tool],allowedTools:[workflow.tool],maxSteps:2,maxToolCalls:1,
    toolTimeoutMs:binding.timeoutMs??180000,store:createFileRunStore(config.stateDirectory)});
  const result=await runner.run({agent,task:"Prepare and deliver the private review package for "+day,idempotencyKey:day});
  const receipt={schema_version:"hiro-workflow-receipt-v1",run_id:result.id,agent:name,day,state:result.state};
  if(result.state==="succeeded")receipt.delivery=JSON.parse(result.result);
  else receipt.error=result.error??"Run is already active or requires operator review";
  console.log(JSON.stringify(receipt));
  if(result.state!=="succeeded")process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main,easternDay};
