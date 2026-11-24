#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {loadDefinition,createAgentRunner}=require("../runtime/agent-executor");
const {createFileRunStore}=require("../runtime/agent-store");
const {createCommandTool}=require("../runtime/agent-command");
const {createProcessRunStore}=require("../runtime/agent-process-store");
const {createStudioClient,workflowEvent,stableId}=require("../runtime/agent-studio");

const WORKFLOWS={
  JobPreparation:{tool:"prepare_job_queue",slug:"job_preparation",successStates:["prepared"],requiredReceipt:{submitted:0},queueOnly:true},
  JobApplications:{tool:"prepare_job_applications",slug:"job_preparation",successStates:["prepared","succeeded"],requiredReceipt:{delivery_verified:true,submitted:0}},
  CrealytesReview:{tool:"prepare_crealytes_review",slug:"crealytes_review",successStates:["draft_ready"],requiredReceipt:{published:false},reviewOnly:true}
};
function argument(argv,name) { const index=argv.indexOf("--"+name); return index<0?undefined:argv[index+1]; }
function easternDay(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
async function main(argv=process.argv.slice(2)) {
  if(argv.includes("--help")) {
    console.log("Usage: node scripts/run-agent-workflow.js --config /private/workflows.json --agent JobPreparation|JobApplications|CrealytesReview\nRuns a fixed host command once per Eastern day. No model call, shell, or social publication.");
    return;
  }
  const configPath=argument(argv,"config"),name=argument(argv,"agent"),workflow=WORKFLOWS[name];
  const day=easternDay();
  if(!configPath||!path.isAbsolute(configPath)||!workflow)throw Error("Invalid workflow arguments; use --help");
  const stat=fs.statSync(configPath);
  if(stat.size>40000||(process.platform!=="win32"&&(stat.mode&0o077)))throw Error("Workflow config must be a small private file (mode 0600)");
  const config=JSON.parse(fs.readFileSync(configPath,"utf8"));
  const receipt=await runWorkflow({config,name,day});
  console.log(JSON.stringify(receipt));
  if(receipt.state!=="succeeded"||receipt.studio_sync?.state==="unconfirmed")process.exitCode=1;
}
async function runWorkflow({config,name,day=easternDay()}) {
  const workflow=WORKFLOWS[name],binding=config.workflows?.[name];
  if(!workflow)throw Error("Unknown native workflow");
  if(!binding)throw Error("Workflow has no host command binding");
  const root=path.resolve(__dirname,"..");
  const agent=loadDefinition({source:fs.readFileSync(path.join(root,"examples/agents/havabyte-team.scroll"),"utf8"),
    imports:{agentkit:fs.readFileSync(path.join(root,"examples/packages/agentkit/main.scroll"),"utf8")},name});
  const tool=createCommandTool({...binding,name:workflow.tool,successStates:workflow.successStates,requiredReceipt:workflow.requiredReceipt});
  if(workflow.queueOnly){
    const verify=tool.verifyResult;
    tool.verifyResult=receipt=>verify(receipt)&&Number.isSafeInteger(receipt.prepared_count)&&receipt.prepared_count>=0&&
      Number.isSafeInteger(receipt.queue_delivered)&&receipt.queue_delivered===receipt.prepared_count&&typeof receipt.delivery_verified==="boolean"&&
      typeof receipt.run_id==="string"&&receipt.run_id.length>0&&receipt.run_id.length<=160;
  }
  if(workflow.reviewOnly){
    const verify=tool.verifyResult;
    tool.verifyResult=receipt=>verify(receipt)&&["pending","accepted","rejected","revise"].includes(receipt.approval);
  }
  const store=config.processStore?createProcessRunStore(config.processStore):createFileRunStore(config.stateDirectory);
  const studio=config.studio?createStudioClient(config.studio):null;
  const reservationId=stableId("hiro-reservation-v1",config.processStore?.namespace||config.stateDirectory,workflow.slug,day);
  const reservation=binding.reservationMicrousd??0;
  const knownZero=binding.providerSpendMode==="none";
  if(studio&&(!Number.isSafeInteger(reservation)||reservation<0||(!knownZero&&reservation===0)||(knownZero&&reservation!==0)))
    throw Error("Studio workflow requires an explicit provider-spend reservation; zero needs providerSpendMode none");
  if(studio)await studio.reserve({reservation_id:reservationId,workflow:workflow.slug,amount_microusd:reservation});
  // The workflow is deterministic: use the native definition's required capability, then its verified receipt.
  const model=async({messages})=>{
    const receipt=messages.find(m=>m.role==="tool");
    return receipt?{content:receipt.content}:{content:null,tool_calls:[{id:"delivery",type:"function",function:{name:agent.requiredTool,arguments:"{}"}}]};
  };
  const runner=createAgentRunner({model,tools:[tool],allowedTools:[workflow.tool],maxSteps:2,maxToolCalls:1,
    toolTimeoutMs:binding.timeoutMs??180000,store});
  const result=await runner.run({agent,task:"Prepare and deliver the private review package for "+day,idempotencyKey:day});
  const receipt={schema_version:"hiro-workflow-receipt-v1",run_id:result.id,agent:name,day,state:result.state};
  if(result.state==="succeeded")receipt.delivery=JSON.parse(result.result);
  else receipt.error=result.error??"Run is already active or requires operator review";
  if(studio){
    try{
      const event=workflowEvent({result,agent:name,workflow:workflow.slug,day,producer:studio.producer,delivery:receipt.delivery});
      const posted=await studio.event(event);
      // No-model workflows have no provider spend. A nonzero cap is retained until
      // verified accounting is supplied; never infer an actual provider bill.
      if(["succeeded","failed","needs_review","rejected"].includes(result.state)){
        const outcome=knownZero&&result.state==="succeeded"?"succeeded":knownZero&&["failed","rejected"].includes(result.state)?"failed":"uncertain";
        await studio.settle({reservation_id:reservationId,actual_microusd:outcome==="uncertain"?null:0,outcome});
      }
      receipt.studio_sync={state:"verified",event_id:posted.event_id};
    }catch{
      receipt.studio_sync={state:"unconfirmed",error_code:"StudioSyncNeedsReview"};
    }
  }
  return receipt;
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main,easternDay,runWorkflow,WORKFLOWS};
