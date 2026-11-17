"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {installLocal,removePackage,readLocked,resolveSource}=require("../runtime/package-manager");
const {makeProject,validateProject,main}=require("../hiro");
const {serveProject}=require("../runtime/dev-server");
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"hg-pkgs-"));
 const project=path.join(root,"app");
 makeProject(project);
 function packageFolder(name,source,version="1.0.0"){
   const folder=path.join(root,"source-"+name);
   fs.mkdirSync(folder);
   fs.writeFileSync(path.join(folder,"hiro-package.json"),JSON.stringify({name,version,entry:"main.scroll"}));
   fs.writeFileSync(path.join(folder,"main.scroll"),source);
   return folder;
 }
 return {root,project,packageFolder,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const BUTTON=[
'ability party target => pulse {target} 700 | color {target} purple',
'.PartyBadge = [',
'  box badge 90 90 blue;',
'  do party badge;',
']'
].join("\n");
test("local install, lockfile, and component/ability import compile",async()=>{
 const t=fixture();
 try{
   const folder=t.packageFolder("sparkfx",BUTTON);
   assert.deepEqual(installLocal(t.project,folder),{name:"sparkfx",version:"1.0.0"});
   const page='import sparkfx\n.Main = [\n use PartyBadge first;\n]';
   const compiled=resolveSource(t.project,page);
   assert.match(compiled,/ability party/);
   assert.doesNotMatch(compiled,/^import sparkfx$/m);
   const {parseExtended}=require("../runtime/expressive-runtime");
   const commands=parseExtended(compiled);
   assert.equal(commands.find(x=>x.command==="box").args[0],"first-badge");
   assert.equal(commands.some(x=>x.command==="animate"),true);
   fs.writeFileSync(path.join(t.project,"app.scroll"),page);
   assert.equal(validateProject(t.project),2);
   const dev=await serveProject(t.project,0,{watch:false});
   try{
     const url="http://127.0.0.1:"+dev.server.address().port+"/__hiro/page?path=/";
     const response=await fetch(url);
     assert.equal(response.status,200);
     assert.match(await response.text(),/PartyBadge/);
   }finally{await dev.close();}
   assert.equal(readLocked(t.project).packages.sparkfx.version,"1.0.0");
 }finally{t.cleanup();}
});
test("modified package content cannot silently execute",()=>{
 const t=fixture();
 try{
   installLocal(t.project,t.packageFolder("sparkfx",BUTTON));
   fs.appendFileSync(path.join(t.project,"packages","sparkfx","main.scroll"),"\nbox malicious 1 1 red");
   assert.throws(()=>resolveSource(t.project,"import sparkfx"),/integrity mismatch/);
 }finally{t.cleanup();}
});
test("transitive imports resolve once and reject cycles and collisions",()=>{
 const t=fixture();
 try{
   installLocal(t.project,t.packageFolder("sparkfx",BUTTON));
   installLocal(t.project,t.packageFolder("fancy",'import sparkfx\nextends FancyBadge PartyBadge\n.FancyBadge = [\n text title "Fancy";\n]'));
   let source=resolveSource(t.project,'import fancy\nimport sparkfx\n.Main = [\n use FancyBadge hero;\n]');
   assert.equal((source.match(/ability party/g)||[]).length,1);
   assert.equal(source.includes("extends FancyBadge PartyBadge"),true);
   assert.throws(()=>resolveSource(t.project,'import fancy\n.PartyBadge = [\n text new "Wrong";\n]'),/Duplicate class/);
   assert.throws(()=>removePackage(t.project,"sparkfx"),/still needed/);
   removePackage(t.project,"fancy");
   removePackage(t.project,"sparkfx");
   assert.deepEqual(readLocked(t.project).packages,{});
 }finally{t.cleanup();}
});
test("rejects executable and invalid packages, duplicate install",()=>{
 const t=fixture();
 try{
   assert.throws(()=>installLocal(t.project,t.packageFolder("badpkg","browser.open https://example.com")) ,/executable top-level/);
   const folder=t.packageFolder("sparkfx",BUTTON);
   installLocal(t.project,folder);
   assert.throws(()=>installLocal(t.project,folder),/already installed/);
   assert.throws(()=>resolveSource(t.project,"import missing"),/Missing or invalid lock/);
 }finally{t.cleanup();}
});
test("CLI package list/install/remove operate on explicit project paths",async()=>{
 const t=fixture(),logs=[];
 const original=console.log;
 console.log=(...args)=>logs.push(args.join(" "));
 try{
   const folder=t.packageFolder("sparkfx",BUTTON);
   await main(["package","add",t.project,folder]);
   await main(["package","list",t.project]);
   assert.equal(logs.some(x=>x.includes("sparkfx@1.0.0")),true);
   await main(["package","remove",t.project,"sparkfx"]);
   assert.deepEqual(readLocked(t.project).packages,{});
 }finally{console.log=original;t.cleanup();}
});

test("dependency cycles are detected before runtime execution",()=>{
 const t=fixture();
 try{
   installLocal(t.project,t.packageFolder("alpha",'import beta\n.Alpha = [\n text x "A";\n]'));
   installLocal(t.project,t.packageFolder("beta",'import alpha\n.Beta = [\n text x "B";\n]'));
   assert.throws(()=>resolveSource(t.project,"import alpha"),/Import cycle/);
 }finally{t.cleanup();}
});
