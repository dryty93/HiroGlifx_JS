"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),http=require("node:http");
const {runWorkflow}=require("../scripts/run-agent-workflow");
const {workflowEvent,createStudioClient}=require("../runtime/agent-studio");
const {createProcessRunStore}=require("../runtime/agent-process-store");

function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-studio-"));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
async function studio(t,{budgetStatus=201,eventFailure=false}={}){
  const requests=[],events=new Map();let failed=false;
  const server=http.createServer((req,res)=>{let text="";req.on("data",v=>text+=v);req.on("end",()=>{
    const body=JSON.parse(text);requests.push({route:req.url,body,auth:req.headers.authorization,producer:req.headers["x-studio-producer"]});
    res.setHeader("Content-Type","application/json");
    if(req.url.endsWith("reservations/")){res.statusCode=budgetStatus;res.end(JSON.stringify({ok:budgetStatus<400,reservation_id:body.reservation_id,amount_microusd:body.amount_microusd}));}
    else if(req.url.endsWith("events/")){
      if(eventFailure&&!failed){failed=true;res.statusCode=503;res.end('{}');return;}
      const old=events.get(body.event_id);
      if(old&&old!==text){res.statusCode=409;res.end('{}');return;}
      events.set(body.event_id,text);res.end(JSON.stringify({ok:true,event_id:body.event_id,run_id:body.run_id,created:!old}));
    }else res.end(JSON.stringify({ok:true,reservation_id:body.reservation_id,outcome:body.outcome}));
  });});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  return {baseUrl:`http://127.0.0.1:${server.address().port}`,requests,events};
}
function configuration(t,remote){
  const root=fixture(t),counter=path.join(root,"count"),worker=path.join(root,"worker.js");
  fs.writeFileSync(worker,`require('node:fs').appendFileSync(${JSON.stringify(counter)},'run\\n');console.log(JSON.stringify({state:'prepared',run_id:'job-2026-11-23-fixture',prepared_count:1,queue_delivered:1,artifact_delivered:0,delivery_verified:false,submitted:0}));`);
  process.env.HIRO_STUDIO_TEST_TOKEN="x".repeat(40);t.after(()=>delete process.env.HIRO_STUDIO_TEST_TOKEN);
  return {counter,config:{stateDirectory:path.join(root,"state"),studio:{baseUrl:remote.baseUrl,producer:"job-worker",tokenEnv:"HIRO_STUDIO_TEST_TOKEN",allowHttpLoopback:true},
    workflows:{JobPreparation:{executable:process.execPath,args:[worker],cwd:root,envNames:[],providerSpendMode:"none",reservationMicrousd:0}}}};
}

test("native preparation records actual pending delivery; exact repeat never reruns application command",async t=>{
  const remote=await studio(t),{counter,config}=configuration(t,remote);
  const first=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  const second=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  assert.equal(first.state,"succeeded");assert.equal(first.delivery.delivery_verified,false);assert.equal(first.studio_sync.state,"verified");
  assert.equal(first.run_id,second.run_id);assert.equal(fs.readFileSync(counter,"utf8"),"run\n");assert.equal(remote.events.size,1);
  const event=JSON.parse([...remote.events.values()][0]);assert.equal(event.state,"prepared");assert.deepEqual(event.counts,{delivered:0,prepared:1,submitted:0});
  assert.equal(event.receipt.delivery.queue_delivered,1);
  assert.equal(event.run_id,"job-2026-11-23-fixture");assert.equal(event.receipt.run_id,first.run_id);
  assert.equal(remote.requests[0].route,"/api/agent-studio/ingest/reservations/");
  assert.ok(remote.requests.every(r=>r.auth==="Bearer "+"x".repeat(40)&&r.producer==="job-worker"));
});

test("central budget refusal happens before the worker executes",async t=>{
  const remote=await studio(t,{budgetStatus:402}),{counter,config}=configuration(t,remote);
  await assert.rejects(runWorkflow({config,name:"JobPreparation",day:"2026-11-23"}),/HTTP 402/);
  assert.equal(fs.existsSync(counter),false);assert.equal(remote.events.size,0);
});

test("unconfirmed telemetry can be replayed without repeating application effects",async t=>{
  const remote=await studio(t,{eventFailure:true}),{counter,config}=configuration(t,remote);
  const first=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  assert.equal(first.state,"succeeded");assert.equal(first.studio_sync.state,"unconfirmed");
  const second=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  assert.equal(second.run_id,first.run_id);assert.equal(second.studio_sync.state,"verified");assert.equal(fs.readFileSync(counter,"utf8"),"run\n");
});

test("unknown provider cost cannot be silently reserved or reported as zero",async t=>{
  const remote=await studio(t),{counter,config}=configuration(t,remote);
  delete config.workflows.JobPreparation.providerSpendMode;
  await assert.rejects(runWorkflow({config,name:"JobPreparation",day:"2026-11-23"}),/explicit provider-spend/);
  assert.equal(fs.existsSync(counter),false);assert.equal(remote.requests.length,0);
});

test("uncertain effect retains its full reservation with null actual cost",async t=>{
  const remote=await studio(t),{counter,config}=configuration(t,remote);
  fs.writeFileSync(config.workflows.JobPreparation.args[0],`require('node:fs').appendFileSync(${JSON.stringify(counter)},'attempt\\n');process.exit(1);`);
  const first=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  assert.equal(first.state,"needs_review");assert.equal(first.studio_sync.state,"verified");
  const settlement=remote.requests.find(r=>r.route.endsWith("settlements/")).body;
  assert.equal(settlement.outcome,"uncertain");assert.equal(settlement.actual_microusd,null);
  const second=await runWorkflow({config,name:"JobPreparation",day:"2026-11-23"});
  assert.equal(second.run_id,first.run_id);assert.equal(fs.readFileSync(counter,"utf8"),"attempt\n");
});

test("state events have stable identities per observed state and preserve unknown outcome counts",()=>{
  const base={id:"a",state:"needs_review",createdAt:"2026-11-23T12:00:00Z",updatedAt:"2026-11-23T12:01:00Z",error:"Unknown effect"};
  const input={result:base,agent:"JobPreparation",workflow:"job_preparation",day:"2026-11-23",producer:"job-worker"};
  const event=workflowEvent(input);assert.equal(event.state,"uncertain");assert.deepEqual(event.counts,{});
  assert.equal(event.event_id,workflowEvent(input).event_id);
  assert.notEqual(event.event_id,workflowEvent({...input,result:{...base,state:"running"}}).event_id);
  assert.equal(workflowEvent({...input,result:{...base,state:"created"}}).state,"scheduled");
});

test("Studio secrets cannot be sent to arbitrary HTTP or credential-bearing URLs",()=>{
  process.env.HIRO_STUDIO_TEST_TOKEN="x".repeat(40);
  try{for(const baseUrl of ["http://example.com","https://u:p@example.com","https://example.com/path","https://example.com/?token=x"])
    assert.throws(()=>createStudioClient({baseUrl,producer:"job-worker",tokenEnv:"HIRO_STUDIO_TEST_TOKEN"}),/explicit HTTPS/);
  }finally{delete process.env.HIRO_STUDIO_TEST_TOKEN;}
});

test("process store uses fixed program and environment, rejects malformed bridge receipts",t=>{
  const root=fixture(t),helper=path.join(root,"store.js"),trace=path.join(root,"trace");
  fs.writeFileSync(helper,`let x='';process.stdin.on('data',d=>x+=d);process.stdin.on('end',()=>{const q=JSON.parse(x);require('node:fs').appendFileSync(${JSON.stringify(trace)},JSON.stringify({operation:q.operation,namespace:q.namespace,secret:process.env.HIRO_SECRET||null})+'\\n');console.log(JSON.stringify({schema_version:'hiro-process-store-v1',ok:true,result:q.operation==='initialize'?true:null}));});`);
  process.env.HIRO_SECRET="must-not-pass";t.after(()=>delete process.env.HIRO_SECRET);
  const store=createProcessRunStore({executable:process.execPath,args:[helper],cwd:root,envNames:[],namespace:"jobs-unit"});
  assert.equal(store.load("abc"),null);
  const calls=fs.readFileSync(trace,"utf8").trim().split("\n").map(JSON.parse);assert.deepEqual(calls.map(x=>x.operation),["initialize","load"]);assert.ok(calls.every(x=>x.secret===null&&x.namespace==="jobs-unit"));
  fs.writeFileSync(helper,"console.log('{}')");assert.throws(()=>store.load("abc"),/rejected operation/);
  assert.throws(()=>createProcessRunStore({executable:"sh",cwd:root,namespace:"x"}),/Absolute store executable/);
});

test("private content import preserves the server's existing owner decision without granting publication",async t=>{
  process.env.HIRO_STUDIO_TEST_TOKEN="x".repeat(40);t.after(()=>delete process.env.HIRO_STUDIO_TEST_TOKEN);
  let requested;
  const client=createStudioClient({baseUrl:"https://studio.example",producer:"content-operator",tokenEnv:"HIRO_STUDIO_TEST_TOKEN",fetchImpl:async(url,options)=>{
    requested={url,body:JSON.parse(options.body)};
    return {ok:true,text:async()=>JSON.stringify({schema_version:"agent-review-receipt-v1",state:"draft_ready",created:false,package_id:7,run_id:4,approval:"accepted",published:false})};
  }});
  const payload={schema_version:"crealytes-review-package-v1",campaign_id:"CL-20261123",approval:"pending"};
  const receipt=await client.importReview(payload);
  assert.equal(requested.url,"https://studio.example/api/agent-studio/ingest/review-packages/");
  assert.deepEqual(requested.body,payload);assert.equal(receipt.approval,"accepted");assert.equal(receipt.published,false);
  const event=workflowEvent({result:{id:"native-run",state:"succeeded",createdAt:"2026-11-23T12:00:00Z"},agent:"CrealytesReview",workflow:"crealytes_review",day:"2026-11-23",producer:"content-operator",delivery:receipt});
  assert.equal(event.state,"accepted");assert.deepEqual(event.counts,{});
});
