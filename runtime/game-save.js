/* HiroGlifx versioned local save slots with schema validation and corruption checks.
 * Storage is injected (window.localStorage in browser; fake storage for tests).
 * The checksum detects accidental corruption, not adversarial modification.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGameSave=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const GAME_VERSION=2,KEY="hiroglifx-riftfall-save";
const MAX_SIZE=240000;
const isNumber=n=>typeof n==="number"&&Number.isFinite(n);
function checksum(source){
 let h=2166136261;for(let i=0;i<source.length;i++){h^=source.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,"0");
}
function validate(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload))throw Error("Invalid game snapshot");
 if(!payload.position||!["x","y","z"].every(k=>isNumber(payload.position[k])&&Math.abs(payload.position[k])<500))
   throw Error("Invalid player position");
 if(!["health","stamina","kills","wave","elapsed"].every(k=>isNumber(payload[k])&&payload[k]>=0&&payload[k]<=1e7))
   throw Error("Invalid game metrics");
 if(!payload.inventory||!Array.isArray(payload.inventory.items)||!Array.isArray(payload.inventory.equipment))
   throw Error("Invalid inventory snapshot");
 if(!payload.quests||!Array.isArray(payload.quests.entries)||!isNumber(payload.quests.experience))
   throw Error("Invalid quest snapshot");
 if(!Array.isArray(payload.raiders)||payload.raiders.length>32)throw Error("Invalid enemy snapshot");
 for(const r of payload.raiders){
   if(typeof r.id!=="string"||!/^[a-z0-9-]{1,40}$/.test(r.id)||
     !["health","x","z"].every(k=>isNumber(r[k])&&Math.abs(r[k])<2000)||typeof r.alive!=="boolean")
     throw Error("Invalid enemy state");
 }
 return payload;
}
class GameSaveStore{
 constructor(storage,{namespace=KEY}={}){
   if(!storage||!["getItem","setItem","removeItem"].every(k=>typeof storage[k]==="function"))
     throw Error("Storage adapter with getItem, setItem, removeItem required");
   if(!/^[a-z][a-z0-9-]{3,79}$/.test(namespace))throw Error("Invalid save namespace");
   this.storage=storage;this.namespace=namespace;
 }
 _key(slot){if(!/^[a-z0-9-]{1,20}$/.test(slot))throw Error("Invalid save slot");return this.namespace+"-"+slot;}
 save(slot,game){
   const payload=validate(game),body=JSON.stringify(payload);
   if(body.length>MAX_SIZE)throw Error("Save exceeds size limit");
   const document={version:GAME_VERSION,savedAt:new Date().toISOString(),payload,checksum:checksum(body)};
   this.storage.setItem(this._key(slot),JSON.stringify(document));
   return {slot,savedAt:document.savedAt,bytes:body.length};
 }
 read(slot){
   const raw=this.storage.getItem(this._key(slot));if(raw===null)return null;
   if(typeof raw!=="string"||raw.length>MAX_SIZE+1000)throw Error("Save is corrupted or too large");
   let data;try{data=JSON.parse(raw);}catch{throw Error("Save contains invalid JSON");}
   if(data.version!==GAME_VERSION)throw Error("Unsupported save version "+data.version);
   const body=JSON.stringify(data.payload);
   if(checksum(body)!==data.checksum)throw Error("Save checksum mismatch");
   return structuredSafe(validate(data.payload));
 }
 delete(slot){this.storage.removeItem(this._key(slot));}
 slots(){return ["auto","quick","slot-1","slot-2","slot-3"].filter(s=>this.storage.getItem(this._key(s))!==null);}
 export(slot){const raw=this.storage.getItem(this._key(slot));if(!raw)throw Error("No save in slot");this.read(slot);return raw;}
 import(slot,source){
   if(typeof source!=="string"||source.length>MAX_SIZE+1000)throw Error("Imported save exceeds limit");
   // Validate before touching user's existing slot
   const rawKey=this._key(slot),temp=this.namespace+"-temporary-validate";
   const old=this.storage.getItem(temp);
   try{
     this.storage.setItem(temp,source);
     const clone=new GameSaveStore(this.storage,{namespace:this.namespace});
     const validated=clone.read("temporary-validate");
     this.storage.setItem(rawKey,source);return validated;
   }finally{
     if(old===null)this.storage.removeItem(temp);else this.storage.setItem(temp,old);
   }
 }
}
function structuredSafe(value){return JSON.parse(JSON.stringify(value));}
return {GameSaveStore,validate,checksum,GAME_VERSION};
});