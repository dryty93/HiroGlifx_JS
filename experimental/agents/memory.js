'use strict';
const fs=require('node:fs/promises');const path=require('node:path');
class MemoryStore {
 constructor({directory}={}){this.directory=directory;this.data=new Map();}
 key(agent,key){if(!/^[a-zA-Z0-9_-]+$/.test(agent)||!/^[a-zA-Z0-9_-]+$/.test(key))throw Error('Invalid memory key');return agent+':'+key;}
 async get(agent,key){const k=this.key(agent,key);if(this.directory){try{return JSON.parse(await fs.readFile(path.join(this.directory,encodeURIComponent(k)+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return undefined;throw e;}}return this.data.get(k);}
 async set(agent,key,value){const k=this.key(agent,key);const json=JSON.stringify(value);if(json===undefined)throw TypeError('Value not serializable');if(this.directory){await fs.mkdir(this.directory,{recursive:true});await fs.writeFile(path.join(this.directory,encodeURIComponent(k)+'.json'),json,{mode:0o600});}else this.data.set(k,JSON.parse(json));}
}
module.exports={MemoryStore};
