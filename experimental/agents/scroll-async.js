'use strict';
const {validate}=require('./contracts');
// Asynchronous scroll evaluator for model-backed agent calls.
// Only explicitly supported expressions are executable.
class AsyncRuntime {
 constructor(runtime,{models,provider='mock',tools,permissions=[],memory}={}){
  this.runtime=runtime;this.models=models;this.provider=provider;this.tools=tools;this.permissions=permissions;this.memory=memory;this.steps=0;this.active=0;
 }
 async invoke(name,method='run',args=[],depth=0,instance=null){
  const rt=this.runtime;const started=Date.now();rt.trace.push({event:'start',agent:name,method,depth});if(++this.steps>rt.maxSteps)throw Error('Maximum execution steps exceeded');if(depth>=rt.maxDepth)throw Error('Maximum agent call depth exceeded');
  const bp=rt.blueprints.get(name);if(!bp)throw Error('Unknown blueprint '+name);
  const config=rt.configuration(name),vars=instance?.vars||new Map(),instances=instance?.instances||new Map();
  const lookup=(env,key)=>{for(let e=env;e;e=e.parent)if(e.values.has(key))return e.values.get(key);throw Error('Undefined variable '+key);};
  const assign=(env,key,value)=>{for(let e=env;e;e=e.parent)if(e.values.has(key)){e.values.set(key,value);return;}env.values.set(key,value);};
  const root={values:vars,parent:null};
  const evalExpr=async (node,env)=>{
   switch(node.type){
    case 'Literal':return node.value;
    case 'Variable':return lookup(env,node.name);
    case 'Name':return node.name;
    case 'Array':return Promise.all(node.elements.map(x=>evalExpr(x,env)));
    case 'Object':{const out=Object.create(null);for(const x of node.entries){if(['__proto__','constructor','prototype'].includes(x.key))throw Error('Unsafe object key');out[x.key]=await evalExpr(x.value,env);}return out;}
    case 'Access':{const obj=await evalExpr(node.target,env),key=await evalExpr(node.key,env);if(obj===null||obj===undefined||!['string','number'].includes(typeof key)||['__proto__','constructor','prototype'].includes(String(key)))throw Error('Unsafe property access');if(!Object.hasOwn(Object(obj),key))throw Error('Missing property '+key);return obj[key];}
    case 'Unary':{const x=await evalExpr(node.arg,env);return node.op==='!'?!x:-x;}
    case 'Binary':{
     const a=await evalExpr(node.left,env);
     if(node.op==='&&')return a&&await evalExpr(node.right,env);
     if(node.op==='||')return a||await evalExpr(node.right,env);
     const b=await evalExpr(node.right,env);
     switch(node.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '==':case '===':return a===b;case '!=':case '!==':return a!==b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;}
     throw Error('Unknown operator '+node.op);
    }
    case 'Call':{
     const values=[];for(const arg of node.args)values.push(await evalExpr(arg,env));
     if(node.target==='ai'&&node.method==='reason'){
      if(!this.models)throw Error('Model registry required for ai.reason');
      if(values.length!==1||typeof values[0]!=='string')throw Error('ai.reason requires a string prompt');
      const output=await this.models.generate(this.provider,{model:config.model,prompt:values[0]});
      rt.trace.push({agent:name,method:'ai.reason',depth:depth+1,model:output.model,usage:output.usage});
      return output.text;
     }
     if(node.target==='agents'&&node.method==='parallel'){
      if(values.length!==1||!Array.isArray(values[0]))throw Error('agents.parallel requires a task array');
      if(values[0].length>8)throw Error('Parallel agent limit exceeded');
      const tasks=values[0].map(task=>{
       if(!task||typeof task!=='object'||typeof task.agent!=='string'||typeof task.method!=='string'||!Array.isArray(task.args))throw Error('Invalid parallel task');
       const child=instances.get(task.agent);if(!child)throw Error('Unknown agent instance '+task.agent);
       return this.invoke(child.blueprint,task.method,task.args,depth+1,child);
      });
      return Promise.all(tasks);
     }
     if(node.target==='tool'&&node.method==='call'){
      if(!this.tools)throw Error('Tool registry required');
      if(values.length!==2||typeof values[0]!=='string')throw Error('tool.call requires name and arguments');
      const allowed=(config.tools||[]).filter(x=>this.permissions.includes(x));
      return this.tools.call(values[0],values[1],{allowed});
     }
     if(node.target==='memory'&&node.method==='get'){
      if(!this.memory||config.memory!=='session')throw Error('Memory access denied');
      if(values.length!==1||typeof values[0]!=='string')throw Error('memory.get requires key');
      return this.memory.get(name,values[0]);
     }
     if(node.target==='memory'&&node.method==='set'){
      if(!this.memory||config.memory!=='session')throw Error('Memory access denied');
      if(values.length!==2||typeof values[0]!=='string')throw Error('memory.set requires key and value');
      await this.memory.set(name,values[0],values[1]);return values[1];
     }
     const child=instances.get(node.target);if(!child)throw Error('Unknown agent instance '+node.target);
     return this.invoke(child.blueprint,node.method,values,depth+1,child);
    }
   }
   throw Error('Unsupported async expression '+node.type);
  };
  const methods=new Map();
  for(const s of bp.body){
   if(s.type==='Method')methods.set(s.name,s);
   else if(s.type==='Import'){for(const n of s.names)if(!rt.blueprints.has(n))throw Error('Missing import '+n);}
   else if(s.type==='Instance'){
    if(!rt.blueprints.has(s.blueprint))throw Error('Unknown blueprint '+s.blueprint);
    if(!instances.has(s.name)){
     const child=rt.blueprints.get(s.blueprint),params=child.params||[];
     if(params.length!==s.args.length)throw Error('Constructor argument count mismatch');
     const state=new Map();for(let i=0;i<params.length;i++)state.set(params[i],await evalExpr(s.args[i],root));
     instances.set(s.name,{blueprint:s.blueprint,vars:state,instances:new Map()});
    }
   }else if(s.type==='Assign'&&!vars.has(s.name))vars.set(s.name,await evalExpr(s.value,root));
  }
  if(config.input!==undefined){if(args.length!==1)throw Error('@input contract requires exactly one argument');validate(args[0],config.input,'input');}
  const fn=methods.get(method);if(!fn)throw Error('Unknown method '+name+'.'+method);
  if(fn.params.length!==args.length)throw Error('Argument count mismatch');
  const local={values:new Map(fn.params.map((p,i)=>[p,args[i]])),parent:root};
  rt.trace.push({agent:name,method,depth});
  const exec=async(body,env)=>{
   for(const stmt of body){
    if(++this.steps>rt.maxSteps)throw Error('Maximum execution steps exceeded');
    if(stmt.type==='Assign'){assign(env,stmt.name,await evalExpr(stmt.value,env));continue;}
    if(stmt.type==='Echo'){rt.log(await evalExpr(stmt.value,env));continue;}
    if(stmt.type==='Return')return {returned:true,value:await evalExpr(stmt.value,env)};
    if(stmt.type==='If'){const value=await evalExpr(stmt.condition,env);const r=await exec(value?stmt.then:stmt.otherwise,{values:new Map(),parent:env});if(r.returned)return r;continue;}
    if(stmt.type==='While'){while(await evalExpr(stmt.condition,env)){if(++this.steps>rt.maxSteps)throw Error('Maximum execution steps exceeded');const r=await exec(stmt.body,{values:new Map(),parent:env});if(r.returned)return r;}continue;}
    throw Error('Unsupported async statement '+stmt.type);
   }
   return {returned:false};
  };
  try{
   const output=(await exec(fn.body,local)).value;
   if(config.output!==undefined)validate(output,config.output,'output');
   rt.trace.push({event:'complete',agent:name,method,depth,durationMs:Date.now()-started});
   return output;
  }catch(error){
   rt.trace.push({event:'failed',agent:name,method,depth,errorName:error.name,durationMs:Date.now()-started});
   throw error;
  }
 }
}
module.exports={AsyncRuntime};
