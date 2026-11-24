"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

/** Bind one known application command. Model input can never supply argv or a shell. */
function createCommandTool({name,executable,args=[],cwd,envNames=[],successStates=["succeeded"],
  requiredReceipt={},timeoutMs=180000}) {
  if(typeof executable!=="string"||!path.isAbsolute(executable)||executable.includes("\0"))
    throw Error("An absolute, host-configured executable is required");
  if(!Array.isArray(args)||args.some(a=>typeof a!=="string"||a.includes("\0")||a.length>4096))
    throw Error("Invalid fixed command arguments");
  if(typeof cwd!=="string"||!path.isAbsolute(cwd)||!fs.statSync(cwd).isDirectory())
    throw Error("Absolute command working directory required");
  if(!Array.isArray(envNames)||envNames.some(n=>typeof n!=="string"||!/^[A-Z][A-Z0-9_]{0,79}$/.test(n)))
    throw Error("Invalid environment allowlist");
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Error("Invalid command timeout");
  if(!Array.isArray(successStates)||!successStates.length||successStates.some(s=>typeof s!=="string"))
    throw Error("Explicit success states required");
  const fixedArgs=[...args], environmentKeys=[...envNames];
  return {
    name,description:"Run the host-configured private application workflow and verify its delivery receipt.",
    parameters:{type:"object",properties:{},additionalProperties:false},sideEffecting:true,timeoutMs,
    async execute(_args,{runId,callId,idempotencyKey,signal}) {
      const env={};
      for(const key of environmentKeys)if(process.env[key]!==undefined)env[key]=process.env[key];
      env.HIRO_AGENT_RUN_ID=runId;
      env.HIRO_AGENT_CALL_ID=callId;
      env.HIRO_AGENT_IDEMPOTENCY_KEY=idempotencyKey;
      return new Promise((resolve,reject)=>{
        execFile(executable,fixedArgs,{cwd,env,shell:false,timeout:timeoutMs,maxBuffer:128000,signal},(error,stdout)=>{
          if(error) { reject(Error(error.killed||error.name==="AbortError"?"Application command interrupted; reconcile its ledger":"Application command failed; inspect private application logs")); return; }
          const line=stdout.trim().split(/\r?\n/).at(-1);
          try {
            const receipt=JSON.parse(line);
            if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw Error("Invalid receipt");
            resolve(receipt);
          } catch { reject(Error("Application command did not return a JSON delivery receipt")); }
        });
      });
    },
    verifyResult(receipt) {
      return successStates.includes(receipt.state)&&Object.entries(requiredReceipt).every(([key,value])=>Object.hasOwn(receipt,key)&&receipt[key]===value);
    }
  };
}
module.exports={createCommandTool};
