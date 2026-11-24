"use strict";
const crypto=require("node:crypto");

function canonical(value) {
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  return JSON.stringify(value);
}
function stableId(...parts){return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");}

/** Narrow telemetry/budget client; it cannot submit applications or publish content. */
function createStudioClient({baseUrl,producer,tokenEnv="AGENT_STUDIO_TOKEN",allowHttpLoopback=false,timeoutMs=15000,fetchImpl=globalThis.fetch}) {
  const origin=new URL(baseUrl);
  const loopback=["localhost","127.0.0.1","[::1]"].includes(origin.hostname);
  if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=="/"||!(origin.protocol==="https:"||(allowHttpLoopback&&loopback&&origin.protocol==="http:")))throw Error("Studio requires an explicit HTTPS origin");
  if(typeof producer!=="string"||!/^[a-z][a-z0-9_-]{0,63}$/.test(producer))throw Error("Invalid Studio producer");
  if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(tokenEnv))throw Error("Invalid Studio token environment key");
  const token=process.env[tokenEnv];
  if(typeof token!=="string"||token.length<32||/[\r\n]/.test(token))throw Error("Missing or invalid Studio producer credential");
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw Error("Invalid Studio timeout");
  async function post(route,payload,{requireOk=true}={}) {
    const body=canonical(payload);
    if(Buffer.byteLength(body)>60000)throw Error("Studio payload exceeds limit");
    let response;
    try {response=await fetchImpl(origin.origin+"/api/agent-studio/ingest/"+route+"/",{
      method:"POST",redirect:"error",headers:{"Authorization":"Bearer "+token,"X-Studio-Producer":producer,"Content-Type":"application/json"},body,signal:AbortSignal.timeout(timeoutMs)
    });}catch{throw Error("Studio request outcome unknown; reconcile or replay identical telemetry only");}
    if(!response.ok)throw Error("Studio HTTP "+response.status);
    const text=await response.text();
    if(Buffer.byteLength(text)>64000)throw Error("Studio response exceeds limit");
    let result;try{result=JSON.parse(text);}catch{throw Error("Invalid Studio receipt");}
    if(requireOk&&result.ok!==true)throw Error("Studio did not confirm receipt");
    return result;
  }
  return {
    producer,
    async reserve({reservation_id,workflow,amount_microusd}) {
      if(!Number.isSafeInteger(amount_microusd)||amount_microusd<0)throw Error("Invalid workflow cost reservation");
      const value=await post("reservations",{schema_version:"studio-budget-reservation-v1",reservation_id,workflow,amount_microusd});
      if(value.reservation_id!==reservation_id||value.amount_microusd!==amount_microusd)throw Error("Studio reservation receipt mismatch");
      return value;
    },
    async event(payload) {
      const value=await post("events",{schema_version:"studio-run-event-v1",...payload,source:producer});
      if(value.event_id!==payload.event_id||value.run_id!==payload.run_id)throw Error("Studio event receipt mismatch");
      return value;
    },
    async settle({reservation_id,actual_microusd,outcome}) {
      const value=await post("settlements",{schema_version:"studio-budget-settlement-v1",reservation_id,actual_microusd,outcome});
      if(value.reservation_id!==reservation_id)throw Error("Studio settlement receipt mismatch");
      return value;
    },
    async importReview(payload) {
      if(payload?.schema_version!=="crealytes-review-package-v1")throw Error("Invalid private review package schema");
      const value=await post("review-packages",payload,{requireOk:false});
      if(value.schema_version!=="agent-review-receipt-v1"||value.state!=="draft_ready"||value.published!==false||
         !["pending","accepted","rejected","revise"].includes(value.approval)||!value.package_id)throw Error("Studio did not confirm private review delivery");
      return value;
    }
  };
}

function workflowEvent({result,agent,workflow,day,producer,delivery}) {
  const canonicalRun=workflow==="job_preparation"&&typeof delivery?.run_id==="string"?delivery.run_id:result.id;
  const event={event_id:stableId("hiro-state-v1",producer,workflow,result.id,result.state,result.updatedAt||result.createdAt),workflow,run_id:canonicalRun,
    occurred_at:result.updatedAt||result.createdAt,source:producer,
    state:result.state==="needs_review"?"uncertain":result.state==="created"?"scheduled":result.state,
    counts:{},summary:agent+" execution for "+day,
    receipt:{schema_version:"hiro-workflow-receipt-v1",run_id:result.id,agent,day,state:result.state}};
  if(delivery){
    event.receipt.delivery=delivery;
    for(const [dest,src] of [["discovered","discovered"],["prepared","prepared_count"],["delivered","artifact_delivered"],["submitted","submitted"]]) {
      if(Number.isSafeInteger(delivery[src])&&delivery[src]>=0)event.counts[dest]=delivery[src];
    }
    if(result.state==="succeeded"&&delivery.state==="prepared")event.state=delivery.delivery_verified?"delivered":"prepared";
    if(result.state==="succeeded"&&delivery.state==="draft_ready")event.state=delivery.approval==="pending"?"awaiting_approval":delivery.approval;
  }
  if(result.error)event.error_code=result.state==="needs_review"?"ExternalOutcomeNeedsReview":"WorkflowFailed";
  return event;
}
module.exports={createStudioClient,workflowEvent,canonical,stableId};
