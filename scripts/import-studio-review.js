#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path");
const {createStudioClient}=require("../runtime/agent-studio");

/** Fixed host import of finished creative; no generation, approval or publication. */
async function main(argv=process.argv.slice(2)) {
  if(argv.length!==2||argv[0]!=="--package"||!path.isAbsolute(argv[1]))throw Error("Use --package /private/completed-package.json");
  const file=argv[1];
  const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
  let raw;
  try{
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.size>30000||(process.platform!=="win32"&&(stat.mode&0o077)))throw Error("Review package must be a bounded private file (0600)");
    raw=fs.readFileSync(fd,"utf8");
  }finally{fs.closeSync(fd);}
  const payload=JSON.parse(raw);
  if(payload.asset_file||payload.feedback||payload.outcomes||payload.published===true||![undefined,"pending"].includes(payload.approval))
    throw Error("Import accepts an HTTPS finished asset for review; owner decisions are separate");
  const studio=createStudioClient({baseUrl:process.env.AGENT_STUDIO_BASE_URL,producer:process.env.AGENT_STUDIO_PRODUCER||"content-operator"});
  const receipt=await studio.importReview(payload);
  console.log(JSON.stringify(receipt));
  return receipt;
}
if(require.main===module)main().catch(()=>{console.error("Private review import unconfirmed; inspect the Studio receipt before retrying");process.exitCode=1;});
module.exports={main};
