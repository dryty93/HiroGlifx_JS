'use strict';
const {setTimeout:delay}=require('node:timers/promises');
class Workflow {
 constructor({models,tools,maxSteps=100,maxParallel=4}={}){this.models=models;this.tools=tools;this.maxSteps=maxSteps;this.maxParallel=maxParallel;}
 async run(steps,{input,permissions=[],signal}={}){
  if(!Array.isArray(steps)||steps.length>this.maxSteps)throw Error('Workflow step budget exceeded');
  const nodes=new Map();
  for(const step of steps){if(!step.id||nodes.has(step.id))throw Error('Invalid or duplicate step ID');nodes.set(step.id,step);}
  for(const step of steps)for(const dependency of step.dependsOn||[])if(!nodes.has(dependency))throw Error('Missing dependency '+dependency);
  const results=new Map([['input',input]]),events=[],pending=new Set(nodes.keys()),completed=new Set(),running=new Map();
  const execute=async step=>{
   const resolve=value=>typeof value==='string'&&value.startsWith('$')?results.get(value.slice(1)):value;
   const retries=step.retries||0;if(!Number.isInteger(retries)||retries<0||retries>5)throw Error('Invalid retry count');
   for(let attempt=0;attempt<=retries;attempt++){
    if(signal?.aborted)throw Error('Workflow cancelled');
    try{
     let result;
     if(step.type==='model'){if(!this.models)throw Error('Missing model registry');result=await this.models.generate(step.provider,{model:step.model,prompt:resolve(step.prompt)});}
     else if(step.type==='tool'){if(!this.tools)throw Error('Missing tool registry');result=await this.tools.call(step.tool,resolve(step.args),{allowed:permissions});}
     else if(step.type==='identity')result=resolve(step.value);
     else throw Error('Unsupported step '+step.type);
     return result;
    }catch(error){if(attempt===retries)throw error;await delay(Math.min(100*2**attempt,1000),undefined,{signal});}
   }
  };
  while(pending.size||running.size){
   if(signal?.aborted)throw Error('Workflow cancelled');
   for(const id of [...pending]){
    if(running.size>=this.maxParallel)break;
    const step=nodes.get(id);
    if(!(step.dependsOn||[]).every(dep=>completed.has(dep)))continue;
    pending.delete(id);
    const promise=execute(step).then(result=>({id,result}),error=>({id,error}));
    running.set(id,promise);
   }
   if(!running.size)throw Error('Dependency cycle detected');
   const settled=await Promise.race(running.values());running.delete(settled.id);
   if(settled.error){events.push({step:settled.id,status:'failed'});throw settled.error;}
   results.set(settled.id,settled.result);completed.add(settled.id);events.push({step:settled.id,status:'completed'});
  }
  return {results:Object.fromEntries(results),events};
 }
}
module.exports={Workflow};
