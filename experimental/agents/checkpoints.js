'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
class CheckpointStore {
 constructor({directory}={}){this.directory=directory;this.records=new Map();}
 validate(id){if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw Error('Invalid checkpoint id');return id;}
 async save(id,record){
  id=this.validate(id);const value=JSON.parse(JSON.stringify(record));
  if(!value||typeof value!=='object'||Array.isArray(value))throw TypeError('Invalid checkpoint record');
  if(!this.directory){this.records.set(id,value);return;}
  await fs.mkdir(this.directory,{recursive:true,mode:0o700});
  const file=path.join(this.directory,id+'.json'),tmp=path.join(this.directory,id+'.'+process.pid+'.tmp');
  await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});
  await fs.rename(tmp,file);
 }
 async load(id){
  id=this.validate(id);
  if(!this.directory)return this.records.has(id)?structuredClone(this.records.get(id)):undefined;
  try{return JSON.parse(await fs.readFile(path.join(this.directory,id+'.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT')return undefined;throw error;}
 }
}
module.exports={CheckpointStore};
