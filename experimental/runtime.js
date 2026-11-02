'use strict';
const {parse}=require('./parser');
const {agentConfiguration}=require('./agents/configuration');
class Runtime {
 constructor(program,{log=console.log,maxDepth=16,maxSteps=10000}={}){this.blueprints=new Map();this.log=log;this.maxDepth=maxDepth;this.maxSteps=maxSteps;this.trace=[];for(const bp of program.blueprints){if(this.blueprints.has(bp.name))throw Error('Duplicate blueprint '+bp.name);agentConfiguration(bp);this.blueprints.set(bp.name,bp);}}
 configuration(name){const blueprint=this.blueprints.get(name);if(!blueprint)throw Error('Unknown blueprint '+name);return agentConfiguration(blueprint);}
 invoke(blueprint,method='run',args=[],depth=0,instance=null){if(depth>=this.maxDepth)throw Error('Maximum agent call depth exceeded');const bp=this.blueprints.get(blueprint);if(!bp)throw Error('Unknown blueprint '+blueprint);
  const vars=instance?.vars||new Map(),instances=instance?.instances||new Map(),methods=new Map();
  const state={values:vars,parent:null};
  const lookup=(env,name)=>{for(let cur=env;cur;cur=cur.parent)if(cur.values.has(name))return cur.values.get(name);throw Error('Undefined variable '+name);};
  const assign=(env,name,value)=>{for(let cur=env;cur;cur=cur.parent)if(cur.values.has(name)){cur.values.set(name,value);return;}env.values.set(name,value);};
  const evaluate=(e,env=state)=>{
   if(e.type==='Literal')return e.value;
   if(e.type==='Variable')return lookup(env,e.name);
   if(e.type==='Name')return e.name;
   if(e.type==='Array')return e.elements.map(x=>evaluate(x,env));
   if(e.type==='Object'){const result=Object.create(null);for(const entry of e.entries){if(['__proto__','prototype','constructor'].includes(entry.key))throw Error('Unsafe object key');result[entry.key]=evaluate(entry.value,env);}return result;}
   if(e.type==='Access'){const target=evaluate(e.target,env),key=evaluate(e.key,env);if(target===null||target===undefined)throw Error('Cannot access null value');if(typeof key!=='string'&&typeof key!=='number')throw Error('Invalid property key');if(['__proto__','prototype','constructor'].includes(String(key)))throw Error('Unsafe property access');if(!Object.hasOwn(Object(target),key))throw Error('Missing property '+String(key));return target[key];}
   if(e.type==='Unary'){const v=evaluate(e.arg,env);return e.op==='!'?!v:-v;}
   if(e.type==='Binary'){
    const a=evaluate(e.left,env);
    if(e.op==='&&')return a&&evaluate(e.right,env);
    if(e.op==='||')return a||evaluate(e.right,env);
    const b=evaluate(e.right,env);
    switch(e.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '==':case '===':return a===b;case '!=':case '!==':return a!==b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;}
   }
   if(e.type==='Call'){const target=instances.get(e.target);if(!target)throw Error('Unknown agent instance '+e.target);return this.invoke(target.blueprint,e.method,e.args.map(x=>evaluate(x,env)),depth+1,target);}
   throw Error('Unknown expression '+e.type);
  };
  for(const s of bp.body){if(s.type==='Import'){for(const n of s.names)if(!this.blueprints.has(n))throw Error('Missing import '+n);}else if(s.type==='Instance'){if(!this.blueprints.has(s.blueprint))throw Error('Unknown blueprint '+s.blueprint);if(!instances.has(s.name)){
   const child=this.blueprints.get(s.blueprint);
   const params=child.params||[];
   if(params.length!==s.args.length)throw Error('Constructor argument count mismatch for '+s.blueprint);
   const state=new Map();params.forEach((name,i)=>state.set(name,evaluate(s.args[i])));
   instances.set(s.name,{blueprint:s.blueprint,vars:state,instances:new Map()});
  }}else if(s.type==='Assign'){if(!vars.has(s.name))vars.set(s.name,evaluate(s.value));}else if(s.type==='Method')methods.set(s.name,s);else if(s.type==='AgentConfig')continue;}
  const fn=methods.get(method);if(!fn)throw Error('Unknown method '+blueprint+'.'+method);if(fn.params.length!==args.length)throw Error('Argument count mismatch for '+blueprint+'.'+method);
  const local={values:new Map(),parent:state};
  fn.params.forEach((p,i)=>local.values.set(p,args[i]));
  this.trace.push({agent:blueprint,method,depth});
  let steps=0;
  const execute=(statements,env)=>{
   for(const s of statements){
    if(++steps>this.maxSteps)throw Error('Maximum execution steps exceeded');
    if(s.type==='Assign'){assign(env,s.name,evaluate(s.value,env));continue;}
    if(s.type==='Echo'){this.log(evaluate(s.value,env));continue;}
    if(s.type==='Return')return {returned:true,value:evaluate(s.value,env)};
    if(s.type==='If'){const result=execute(evaluate(s.condition,env)?s.then:s.otherwise,{values:new Map(),parent:env});if(result.returned)return result;continue;}
    if(s.type==='While'){while(evaluate(s.condition,env)){if(++steps>this.maxSteps)throw Error('Maximum execution steps exceeded');const result=execute(s.body,{values:new Map(),parent:env});if(result.returned)return result;}continue;}
    throw Error('Unsupported method statement '+s.type);
   }
   return {returned:false};
  };
  return execute(fn.body,local).value;
 }
}
module.exports={Runtime,parse};
