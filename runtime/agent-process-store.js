"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

/** Synchronous durable-store bridge to one trusted host program, never model input.
 * The production Python helper implements this protocol with PostgreSQL transactions.
 * This is process separation, not an OS sandbox or a distributed worker queue.
 */
function createProcessRunStore({executable,args=[],cwd,envNames=[],namespace,timeoutMs=15000}) {
  if(typeof executable!=="string"||!path.isAbsolute(executable)||executable.includes("\0"))throw Error("Absolute store executable required");
  if(!Array.isArray(args)||args.some(v=>typeof v!=="string"||v.includes("\0")||v.length>4096))throw Error("Invalid fixed store arguments");
  if(typeof cwd!=="string"||!path.isAbsolute(cwd)||!fs.statSync(cwd).isDirectory())throw Error("Absolute store working directory required");
  if(!Array.isArray(envNames)||envNames.some(v=>typeof v!=="string"||!/^[A-Z][A-Z0-9_]{0,79}$/.test(v)))throw Error("Invalid store environment allowlist");
  if(typeof namespace!=="string"||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/.test(namespace))throw Error("Invalid store namespace");
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw Error("Invalid store timeout");
  const env={};
  for(const key of envNames)if(process.env[key]!==undefined)env[key]=process.env[key];
  function request(operation,fields={}) {
    const input=JSON.stringify({schema_version:"hiro-process-store-v1",namespace,operation,...fields});
    if(Buffer.byteLength(input)>4000000)throw Error("Run store request exceeds limit");
    let output;
    try { output=execFileSync(executable,args,{cwd,env,shell:false,input,encoding:"utf8",timeout:timeoutMs,maxBuffer:4200000,stdio:["pipe","pipe","pipe"]}); }
    catch { throw Error("Durable run store unavailable; inspect private service logs before recovery"); }
    let response;
    try {response=JSON.parse(output);}catch{throw Error("Invalid durable store response");}
    if(response?.schema_version!=="hiro-process-store-v1"||response.ok!==true)throw Error("Durable run store rejected operation");
    return response.result;
  }
  request("initialize");
  return {
    load(id){return request("load",{run_id:id});},
    save(snapshot){request("save",{snapshot});},
    claim(key,id){return request("claim",{key,run_id:id});},
    lock(id){const token=request("lock",{run_id:id});return ()=>request("unlock",{run_id:id,token});}
  };
}
module.exports={createProcessRunStore};
