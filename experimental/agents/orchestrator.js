'use strict';
class Orchestrator {
 constructor({modelRegistry,toolRegistry,maxSteps=32}={}){this.models=modelRegistry;this.tools=toolRegistry;this.maxSteps=maxSteps;this.events=[];}
 async execute(plan,{input,permissions=[]}={}){
  if(!Array.isArray(plan)||plan.length>this.maxSteps)throw Error('Invalid plan or step budget exceeded');
  const values=new Map([['input',input]]);const ids=new Set();
  for(const step of plan){
   if(!step.id||ids.has(step.id))throw Error('Duplicate or missing step id');
   ids.add(step.id);
   const resolve=v=>typeof v==='string'&&v.startsWith('$')?values.get(v.slice(1)):v;
   let output;
   if(step.type==='model'){if(!this.models)throw Error('No model registry');output=await this.models.generate(step.provider,{model:step.model,prompt:resolve(step.prompt)});}
   else if(step.type==='tool'){if(!this.tools)throw Error('No tool registry');output=await this.tools.call(step.tool,resolve(step.args),{allowed:permissions});}
   else if(step.type==='transform'){if(step.operation!=='identity')throw Error('Unsupported transform');output=resolve(step.value);}
   else throw Error('Unknown step type '+step.type);
   values.set(step.id,output);this.events.push({step:step.id,type:step.type,status:'completed'});
  }
  return {result:values.get(plan.at(-1)?.id),events:[...this.events]};
 }
}
module.exports={Orchestrator};
