'use strict';
const allowed=new Set(['model','role','instructions','tools','memory','input','output']);
function constant(node){
 if(node.type==='Literal')return node.value;
 if(node.type==='Name')return node.name;
 if(node.type==='Access'&&node.target.type==='Name'&&node.key.type==='Literal')return node.target.name+'.'+node.key.value;
 if(node.type==='Array')return node.elements.map(constant);
 if(node.type==='Object'){const out=Object.create(null);for(const item of node.entries){if(['__proto__','constructor','prototype'].includes(item.key))throw Error('Unsafe metadata key');out[item.key]=constant(item.value);}return out;}
 throw Error('Agent metadata must contain static values');
}
function agentConfiguration(blueprint){
 const config=Object.create(null);
 for(const stmt of blueprint.body){
  if(stmt.type!=='AgentConfig')continue;
  if(!allowed.has(stmt.name))throw Error('Unknown agent annotation @'+stmt.name);
  if(Object.hasOwn(config,stmt.name))throw Error('Duplicate agent annotation @'+stmt.name);
  config[stmt.name]=constant(stmt.value);
 }
 if(config.tools!==undefined&&(!Array.isArray(config.tools)||!config.tools.every(x=>typeof x==='string')))throw Error('@tools must be a string array');
 for(const name of ['model','role','instructions'])if(config[name]!==undefined&&typeof config[name]!=='string')throw Error('@'+name+' must be a string');
 return config;
}
module.exports={agentConfiguration};
