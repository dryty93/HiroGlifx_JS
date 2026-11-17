"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {installLocal,resolveSource,readLocked}=require("../runtime/package-manager");
const {makeProject,validateProject}=require("../hiro");
const {PolymorphicGame}=require("../runtime/scroll-game-classes");
const pkg=path.resolve(__dirname,"../examples/packages/enemykit");
const library=fs.readFileSync(path.join(pkg,"main.scroll"),"utf8");
const app=fs.readFileSync(path.resolve(__dirname,"../examples/polymorphism/arena.scroll"),"utf8");
test("existing HiroGlifx package workflow installs and lock-verifies polymorphic game library",()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-poly-pkg-"));
 const project=path.join(folder,"app");makeProject(project);
 try{
   assert.deepEqual(installLocal(project,pkg),{name:"enemykit",version:"1.0.0"});
   assert.match(readLocked(project).packages.enemykit.integrity,/^sha256-[a-f0-9]{64}$/);
   fs.writeFileSync(path.join(project,"app.scroll"),app);
   assert.equal(resolveSource(project,app),app);
   assert.equal(validateProject(project),2);
   const game=new PolymorphicGame(app,{libraries:{enemykit:library}});
   assert.equal(game.get("roster").length,4);
   fs.appendFileSync(path.join(project,"packages/enemykit/main.scroll"),"\n// modified");
   assert.throws(()=>resolveSource(project,app),/integrity mismatch/);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test("package import fails closed on unknown name",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-poly-missing-"));
 try{
   makeProject(path.join(dir,"app"));
   assert.throws(()=>resolveSource(path.join(dir,"app"),app),/Missing or invalid lock/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
