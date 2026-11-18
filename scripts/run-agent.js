#!/usr/bin/env node
"use strict";
/* Manual CLI entrypoint. No autonomous scheduling, implicit credentials or remote tool access. */
const fs=require("node:fs");
const path=require("node:path");
const {loadDefinition,createOpenAIAdapter,createAgentRunner}=require("../runtime/agent-executor");
function option(argv,name,fallback) {
  const i=argv.indexOf("--"+name);
  return i<0?fallback:argv[i+1];
}
function usage(){
  return "Usage: node scripts/run-agent.js --agent HavabyteResearch --task \"Summarize the README\" [--workspace .] [--model gpt-4.1-mini]\nRequires OPENAI_API_KEY. Read-only local workspace tools only.";
}
async function main(argv=process.argv.slice(2)){
  if(argv.includes("--help")){console.log(usage());return;}
  const agent=option(argv,"agent",null),task=option(argv,"task",null);
  if(!agent||!task)throw Error(usage());
  const workspace=fs.realpathSync(path.resolve(option(argv,"workspace",".")));
  const root=path.resolve(__dirname,"..");
  const source=fs.readFileSync(path.join(root,"examples/agents/havabyte-team.scroll"),"utf8");
  const library=fs.readFileSync(path.join(root,"examples/packages/agentkit/main.scroll"),"utf8");
  const spec=loadDefinition({source,imports:{agentkit:library},name:agent});
  function inside(filename) {
    if(typeof filename!=="string"||filename.length>240||path.isAbsolute(filename))throw Error("Invalid relative path");
    const target=path.resolve(workspace,filename);
    if(target===workspace||!target.startsWith(workspace+path.sep))throw Error("Workspace traversal denied");
    const real=fs.realpathSync(target);
    if(!real.startsWith(workspace+path.sep))throw Error("Workspace symlink escape denied");
    return real;
  }
  const tools=[
    {name:"read_workspace_file",description:"Read one UTF-8 text file in the local workspace; argument path is relative.",
      parameters:{type:"object",properties:{path:{type:"string"}},required:["path"],additionalProperties:false},
      async execute(args){
        const file=inside(args.path);
        if(!fs.statSync(file).isFile())throw Error("Not a file");
        const stat=fs.statSync(file);
        if(stat.size>60000)throw Error("File too large");
        return {path:args.path,content:fs.readFileSync(file,"utf8")};
      }
    },
    {name:"list_workspace_files",description:"List filenames in the chosen workspace directory; no file content or recursion.",
      parameters:{type:"object",properties:{},additionalProperties:false},
      async execute(){
        return fs.readdirSync(workspace,{withFileTypes:true}).filter(e=>e.isFile()&&!e.name.startsWith(".")).slice(0,100).map(e=>e.name);
      }
    }
  ];
  const runner=createAgentRunner({model:createOpenAIAdapter({model:option(argv,"model","gpt-4.1-mini")}),
    tools,allowedTools:tools.map(t=>t.name),maxSteps:8,maxToolCalls:12});
  const result=await runner.run({agent:spec,task});
  console.log(JSON.stringify(result,null,2));
  if(result.state!=="succeeded")process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={main};
