"use strict";
const fs=require("node:fs");
const readline=require("node:readline/promises");
const {Runtime}=require("./scroll-runtime");
const {createPolicyAdapter}=require("./browser-policy");
// Usage: node runtime/run-browser.js examples/automation.scroll example.com
async function run(sourcePath,domains) {
  if(!sourcePath || !domains.length) throw new Error("Usage: node runtime/run-browser.js <file.scroll> <allowed-domain> [...]");
  // Optional dependency: npm install -D playwright && npx playwright install chromium
  const {chromium}=require("playwright");
  const browser=await chromium.launch({headless:true});
  const prompt=readline.createInterface({input:process.stdin,output:process.stdout});
  try {
    const page=await browser.newPage();
    const adapter=createPolicyAdapter(page,{
      allowedDomains:domains,
      approve:async({action,metadata})=>(await prompt.question("Approve "+action+" "+JSON.stringify(metadata)+"? [y/N] ")).trim().toLowerCase()==="y",
      audit:event=>process.stdout.write("[audit] "+JSON.stringify(event)+"\n")
    });
    await new Runtime({browser:adapter}).execute(fs.readFileSync(sourcePath,"utf8"));
  }finally{prompt.close();await browser.close();}
}
if(require.main===module)run(process.argv[2],process.argv.slice(3)).catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
