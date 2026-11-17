#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {parseExtended}=require("./runtime/expressive-runtime");
const {serveProject}=require("./runtime/dev-server");
const example=String.raw;
const HOME=[
'.Main = [',
'  page "Hello HiroGlifx";',
'  background "#0b1220";',
'  state count 0;',
'  use FancyHero hero;',
'  text counter "";',
'  bind text counter "Clicked {count} times";',
'  button add "Add one";',
'  on click add => increment count;',
'  do celebrate hero-box;',
'  link about "About this app" /about;',
']',
'extends FancyHero BaseHero',
'ability celebrate target => pulse {target} 1500 infinite | color {target} purple',
'.BaseHero = [',
'  text heading "Build something with HiroGlifx";',
'  box box 96 96 blue;',
'  center box;',
']',
'.FancyHero = [',
'  text heading "HiroGlifx makes this simple";',
']'
].join("\n")+"\n";
const ABOUT=[
'.Main = [',
'  page "About";',
'  background "#0b1220";',
'  text heading "This is a separate .scroll route";',
'  text body "Save this file and the browser reloads automatically.";',
'  link home "Back home" /;',
']'
].join("\n")+"\n";
function makeProject(target){
  target=path.resolve(target);
  if(fs.existsSync(target)&&fs.readdirSync(target).length)throw new Error("Target directory is not empty");
  fs.mkdirSync(path.join(target,"pages"),{recursive:true});
  fs.writeFileSync(path.join(target,"app.scroll"),HOME,{flag:"wx"});
  fs.writeFileSync(path.join(target,"pages","about.scroll"),ABOUT,{flag:"wx"});
  fs.writeFileSync(path.join(target,".gitignore"),"node_modules/\n.env\ndata/\n");
  return target;
}
function validateProject(project){
  const files=[path.join(project,"app.scroll")];
  const pages=path.join(project,"pages");
  if(fs.existsSync(pages))for(const file of fs.readdirSync(pages)){
    if(file.endsWith(".scroll"))files.push(path.join(pages,file));
  }
  for(const file of files){
    const source=fs.readFileSync(file,"utf8");
    parseExtended(source);
  }
  return files.length;
}
async function main(argv=process.argv.slice(2)){
  const [command,location,...rest]=argv;
  if(command==="init"){
    if(!location)throw new Error("Usage: hiro init <project-directory>");
    const dir=makeProject(location);
    console.log("Created HiroGlifx project:",dir);
    console.log("Next: node hiro.js dev "+dir);
    return;
  }
  if(command==="check"){
    if(!location)throw new Error("Usage: hiro check <project-directory>");
    console.log("Validated",validateProject(path.resolve(location)),"page(s)");
    return;
  }
  if(command==="dev"){
    if(!location)throw new Error("Usage: hiro dev <project-directory> [port]");
    const dir=path.resolve(location);
    validateProject(dir);
    const port=rest[0]||3000;
    const live=await serveProject(dir,port);
    console.log("HiroGlifx app: http://127.0.0.1:"+live.server.address().port);
    return live;
  }
  console.log("HiroGlifx CLI\n  hiro init <directory>\n  hiro dev <directory> [port]\n  hiro check <directory>");
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main,makeProject,validateProject};
