'use strict';
class ToolRegistry {
 constructor(){this.tools=new Map();}
 register(name,handler){if(typeof handler!=='function'||!name)throw new TypeError('Invalid tool');if(this.tools.has(name))throw Error('Duplicate tool '+name);this.tools.set(name,handler);return this;}
 async call(name,args,{allowed=[]}={}){
  if(!allowed.includes(name))throw Error('Permission denied for tool '+name);
  const fn=this.tools.get(name);if(!fn)throw Error('Unknown tool '+name);
  return fn(args);
 }
}
module.exports={ToolRegistry};
