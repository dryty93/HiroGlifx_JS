'use strict';
class MockProvider {
 constructor(responses={}) { this.responses=responses; this.calls=[]; }
 async generate({model,prompt}) {
  if(typeof prompt!=='string'||!prompt.trim()) throw new TypeError('prompt required');
  this.calls.push({model,prompt});
  return {text:Object.hasOwn(this.responses,prompt)?this.responses[prompt]:prompt,usage:{inputTokens:0,outputTokens:0},model:model||'mock'};
 }
}
class ModelRegistry {
 constructor(){this.providers=new Map();}
 register(name,provider){if(!name||typeof provider?.generate!=='function')throw new TypeError('invalid provider');this.providers.set(name,provider);return this;}
 async generate(name,request){const p=this.providers.get(name);if(!p)throw Error('Unregistered model provider: '+name);return p.generate(request);}
}
module.exports={MockProvider,ModelRegistry};
