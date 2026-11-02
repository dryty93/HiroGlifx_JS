'use strict';
const {CheckpointStore}=require('./checkpoints');
const {createHash}=require('node:crypto');
class DurableRunner {
 constructor({store=new CheckpointStore(),maxSteps=100,tools}={}){this.store=store;this.maxSteps=maxSteps;this.tools=tools;}
 async run(runId,steps,{input,signal,permissions=[],approvals=[]}={}){
  if(!Array.isArray(steps)||steps.length>this.maxSteps)throw Error('Invalid workflow step budget');
  const ids=new Set();
  for(const s of steps){if(!s.id||ids.has(s.id)||!['identity','tool'].includes(s.type))throw Error('Invalid durable step');ids.add(s.id);}
  for(const s of steps)for(const dep of s.dependsOn||[])if(!ids.has(dep))throw Error('Missing dependency '+dep);
  const planHash=createHash('sha256').update(JSON.stringify(steps)).digest('hex');
  const prior=await this.store.load(runId);
  if(prior&&prior.planHash!==planHash)throw Error('Workflow definition changed since checkpoint');
  if(prior&&JSON.stringify(prior.input)!==JSON.stringify(input))throw Error('Run input mismatch');
  if(prior?.inFlight)throw Error('Uncertain external side effect; manual reconciliation required for '+prior.inFlight);
  const results=Object.assign(Object.create(null),prior?.results||{});
  if(!prior)results.input=input;
  const completed=new Set(prior?.completed||[]);
  let inFlight=null,waitingFor=null;
  const save=()=>this.store.save(runId,{version:1,planHash,input,results,completed:[...completed],inFlight,waitingFor,status:waitingFor?'awaiting_approval':completed.size===steps.length?'completed':'running'});
  if(!prior)await save();
  while(completed.size<steps.length){
   if(signal?.aborted)throw Error('Workflow cancelled');
   const step=steps.find(s=>!completed.has(s.id)&&(s.dependsOn||[]).every(d=>completed.has(d)));
   if(!step)throw Error('Dependency cycle detected');
   if(step.type==='tool'&&step.approvalRequired&&!approvals.includes(step.id)){
    waitingFor=step.id;await save();
    return {results,completed:[...completed],status:'awaiting_approval',waitingFor};
   }
   const value=step.type==='tool'?step.args:step.value;
   const resolved=typeof value==='string'&&value.startsWith('
   results[step.id]=output;completed.add(step.id);
   await save();
  }
  return {results,completed:[...completed],status:'completed'};
 }
}
module.exports={DurableRunner};
)?results[value.slice(1)]:value;
   if(typeof value==='string'&&value.startsWith('
   results[step.id]=output;completed.add(step.id);
   await save();
  }
  return {results,completed:[...completed],status:'completed'};
 }
}
module.exports={DurableRunner};
)&&!Object.hasOwn(results,value.slice(1)))throw Error('Unresolved reference '+value);
   let output=resolved;
   if(step.type==='tool'){
    if(!this.tools)throw Error('Tool registry required');
    if(!permissions.includes(step.tool))throw Error('Permission denied for tool '+step.tool);
    inFlight=step.id;await save();
    output=await this.tools.call(step.tool,resolved,{allowed:permissions});
    inFlight=null;
   }
   results[step.id]=output;completed.add(step.id);
   await save();
  }
  return {results,completed:[...completed],status:'completed'};
 }
}
module.exports={DurableRunner};
