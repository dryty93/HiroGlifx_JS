'use strict';
const {parse}=require('./parser');
class Runtime {
 constructor(program,{log=console.log,maxDepth=16}={}){this.blueprints=new Map();this.log=log;this.maxDepth=maxDepth;this.trace=[];for(const bp of program.blueprints){if(this.blueprints.has(bp.name))throw Error('Duplicate blueprint '+bp.name);this.blueprints.set(bp.name,bp);}}
 invoke(blueprint,method='run',args=[],depth=0){if(depth>=this.maxDepth)throw Error('Maximum agent call depth exceeded');const bp=this.blueprints.get(blueprint);if(!bp)throw Error('Unknown blueprint '+blueprint);
  const vars=new Map(),instances=new Map(),methods=new Map();
  const evaluate=e=>{if(e.type==='Literal')return e.value;if(e.type==='Variable'){if(!vars.has(e.name))throw Error('Undefined variable '+e.name);return vars.get(e.name);}if(e.type==='Name')return e.name;if(e.type==='Call'){const target=instances.get(e.target);if(!target)throw Error('Unknown agent instance '+e.target);return this.invoke(target.blueprint,e.method,e.args.map(evaluate),depth+1);}throw Error('Unknown expression '+e.type);};
  for(const s of bp.body){if(s.type==='Import'){for(const n of s.names)if(!this.blueprints.has(n))throw Error('Missing import '+n);}else if(s.type==='Instance'){if(!this.blueprints.has(s.blueprint))throw Error('Unknown blueprint '+s.blueprint);instances.set(s.name,{blueprint:s.blueprint});}else if(s.type==='Assign')vars.set(s.name,evaluate(s.value));else if(s.type==='Method')methods.set(s.name,s);}
  const fn=methods.get(method);if(!fn)throw Error('Unknown method '+blueprint+'.'+method);if(fn.params.length!==args.length)throw Error('Argument count mismatch for '+blueprint+'.'+method);
  fn.params.forEach((p,i)=>vars.set(p,args[i]));this.trace.push({agent:blueprint,method,depth});
  for(const s of fn.body){if(s.type==='Assign')vars.set(s.name,evaluate(s.value));else if(s.type==='Echo')this.log(evaluate(s.value));else if(s.type==='Return')return evaluate(s.value);else throw Error('Unsupported method statement '+s.type);}
 }
}
module.exports={Runtime,parse};
