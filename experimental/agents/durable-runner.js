'use strict';
const {CheckpointStore}=require('./checkpoints');
class DurableRunner {
 constructor({store=new CheckpointStore(),maxSteps=100}={}){this.store=store;this.maxSteps=maxSteps;}
 async run(runId,steps,{input,signal}={}){
  if(!Array.isArray(steps)||steps.length>this.maxSteps)throw Error('Invalid workflow step budget');
  const ids=new Set();
  for(const s of steps){if(!s.id||ids.has(s.id)||s.type!=='identity')throw Error('Only unique identity steps supported in durable v0');ids.add(s.id);}
  for(const s of steps)for(const dep of s.dependsOn||[])if(!ids.has(dep))throw Error('Missing dependency '+dep);
  const prior=await this.store.load(runId);
  if(prior&&JSON.stringify(prior.input)!==JSON.stringify(input))throw Error('Run input mismatch');
  const results=Object.assign(Object.create(null),prior?.results||{});
  if(!prior)results.input=input;
  const completed=new Set(prior?.completed||[]);
  const save=()=>this.store.save(runId,{version:1,input,results,completed:[...completed],status:completed.size===steps.length?'completed':'running'});
  if(!prior)await save();
  while(completed.size<steps.length){
   if(signal?.aborted)throw Error('Workflow cancelled');
   const step=steps.find(s=>!completed.has(s.id)&&(s.dependsOn||[]).every(d=>completed.has(d)));
   if(!step)throw Error('Dependency cycle detected');
   const value=step.value;
   const output=typeof value==='string'&&value.startsWith('$')?results[value.slice(1)]:value;
   if(typeof value==='string'&&value.startsWith('$')&&!Object.hasOwn(results,value.slice(1)))throw Error('Unresolved reference '+value);
   results[step.id]=output;completed.add(step.id);
   await save();
  }
  return {results,completed:[...completed],status:'completed'};
 }
}
module.exports={DurableRunner};
