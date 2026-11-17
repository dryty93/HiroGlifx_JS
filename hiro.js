#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {parseExtended}=require("./runtime/expressive-runtime");
const {serveProject}=require("./runtime/dev-server");
const {installLocal,removePackage,readLocked,resolveSource}=require("./runtime/package-manager");
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
function makeNativeProject(target){
 target=path.resolve(target);
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw new Error("Target directory is not empty");
 fs.mkdirSync(target,{recursive:true});
 fs.cpSync(path.join(__dirname,"examples","native-ui"),target,{recursive:true});
 installLocal(target,path.join(__dirname,"examples","native-ui-library"));
 fs.writeFileSync(path.join(target,".gitignore"),"node_modules/\ndist/\n.env\n",{flag:"wx"});
 validateProject(target);
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
    resolveSource(project,source);
  }
  return files.length;
}

/** Export native UI pages as dependency-free static browser documents. */
function buildProject(project,destination=path.join(project,"dist")){
 project=path.resolve(project);destination=path.resolve(destination);
 if(destination===project||!destination.startsWith(project+path.sep))throw new Error("Build target must be inside project");
 const files=[path.join(project,"app.scroll")],pages=path.join(project,"pages");
 if(fs.existsSync(pages))for(const name of fs.readdirSync(pages))if(name.endsWith(".scroll"))files.push(path.join(pages,name));
 const output=[];
 for(const file of files){
  const source=resolveSource(project,fs.readFileSync(file,"utf8"));
  if(!/^ui application$/m.test(source))throw new Error("Static build currently supports native UI pages only");
  const relative=file===files[0]?"index.html":path.join(path.basename(file,".scroll"),"index.html");
  const markup='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiroGlifx</title></head><body><div id="app"></div><script src="/assets/native-ui.js"></script><script>(function(){"use strict";const host=document.getElementById("app");new HiroNativeUI.NativeUIRuntime({document,mount:host}).execute('+
  JSON.stringify(source).replace(/</g,"\\u003c")+
  ');})();</script></body></html>';
  const dest=path.join(destination,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,markup);output.push(dest);
 }
 fs.mkdirSync(path.join(destination,"assets"),{recursive:true});
 fs.copyFileSync(path.join(__dirname,"runtime/native-ui.js"),path.join(destination,"assets/native-ui.js"));
 const assets=path.join(project,"assets");
 if(fs.existsSync(assets)){
  for(const name of fs.readdirSync(assets)){
   if(!/^[A-Za-z0-9_-]+\.(?:svg|png|jpg|jpeg|webp|avif)$/.test(name))continue;
   const file=path.join(assets,name);
   if(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink())
    fs.copyFileSync(file,path.join(destination,"assets",name));
  }
 }
 return output;
}

function uiClasses(project){
 const {compile}=require("./runtime/native-ui");
 const source=resolveSource(path.resolve(project),"ui application\nimport native-ui\n.Main = ()\n : render(self) = [\n ]\n break;\n");
 return compile(source).classes;
}
function createUIPage(project,component,slug){
 project=path.resolve(project);
 if(!/^[A-Z][A-Za-z0-9_]*$/.test(component)||component==="Main")throw Error("Invalid UI component name");
 if(!/^[a-z][a-z0-9-]{0,39}$/.test(slug))throw Error("Invalid UI route slug");
 const classes=uiClasses(project);
 if(!classes.has(component))throw Error("Unknown UI component "+component);
 const file=path.join(project,"pages",slug+".scroll");
 if(fs.existsSync(file))throw Error("UI route already exists: "+slug);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const root=component==="NotFoundExperience"?"div":"main";
 const source=[
 "ui application","import native-ui","",
 ".Main = ()",
 "    : render(self) = [",
 "        element page "+root+" root;",
 "        component "+component+" experience page;",
 "    ]","    break;",""
 ].join("\n");
 resolveSource(project,source);
 fs.writeFileSync(file,source,{flag:"wx"});
 return file;
}
async function main(argv=process.argv.slice(2)){
  const [command,location,...rest]=argv;
  if(command==="ui"){
    const action=location,project=rest[0];
    if(!project)throw Error("Usage: hiro ui <list|add> <project> [Component route]");
    if(action==="list"){
      const classes=uiClasses(project);
      console.log([...classes.keys()].filter(name=>name!=="Main").sort().join("\n"));return;
    }
    if(action==="add"){
      const component=rest[1],slug=rest[2];
      if(!component||!slug)throw Error("Usage: hiro ui add <project> <Component> <route>");
      const filename=createUIPage(project,component,slug);console.log("Created",filename);return;
    }
    throw Error("Unknown UI command "+action);
  }
  if(command==="package"){
    const [action,projectDir,arg]=[location,rest[0],rest[1]];
    if(!projectDir)throw new Error("Usage: hiro package <add|remove|list> <project> [path|name]");
    const project=path.resolve(projectDir);
    if(action==="add"){
      if(!arg)throw new Error("Supply the local package folder");
      const installed=installLocal(project,arg);console.log("Installed",installed.name+"@"+installed.version);return;
    }
    if(action==="remove"){
      if(!arg)throw new Error("Supply the package name");
      removePackage(project,arg);console.log("Removed",arg);return;
    }
    if(action==="list"){
      for(const [name,item] of Object.entries(readLocked(project).packages))console.log(name+"@"+item.version);
      return;
    }
    throw new Error("Unknown package command: "+action);
  }
  if(command==="init"){
    if(!location)throw new Error("Usage: hiro init <project-directory>");
    if(rest.length&&!(rest.length===1&&rest[0]==="--ui"))throw new Error("Usage: hiro init <directory> [--ui]");
    const dir=rest[0]==="--ui"?makeNativeProject(location):makeProject(location);
    console.log("Created HiroGlifx project:",dir);
    console.log("Next: node hiro.js dev "+dir);
    return;
  }
  if(command==="check"){
    if(!location)throw new Error("Usage: hiro check <project-directory>");
    console.log("Validated",validateProject(path.resolve(location)),"page(s)");
    return;
  }
  if(command==="build"){
    if(!location)throw new Error("Usage: hiro build <project-directory>");
    const outputs=buildProject(path.resolve(location));console.log("Built",outputs.length,"native UI page(s) to",path.resolve(location,"dist"));return;
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
  console.log("HiroGlifx CLI\n  hiro init <directory> [--ui]\n  hiro dev <directory> [port]\n  hiro check <directory>\n  hiro build <directory>\n  hiro ui list <project>\n  hiro ui add <project> <Component> <route>\n  hiro package add <project> <local-folder>\n  hiro package remove <project> <name>\n  hiro package list <project>");
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main,makeProject,makeNativeProject,validateProject,buildProject,uiClasses,createUIPage};
