"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {WorldRules}=require("../runtime/scroll-world-rules");
const {VoxelWorld}=require("../runtime/voxel-world");
const root=path.resolve(__dirname,"../examples");
const sky=fs.readFileSync(path.join(root,"skybound-gameplay.scroll"),"utf8");
const vox=fs.readFileSync(path.join(root,"blockhaven-gameplay.scroll"),"utf8");

test("Skybound's authored HiroGlifx stage scoring and difficulty policies execute",()=>{
 const applied=[];
 const policy=new WorldRules(sky,{name:"skybound",services:{
   world_configure:(speed,jump)=>{applied.push({speed,jump});return speed;}
 }});
 assert.equal(policy.get("score"),0);
 policy.run("onStage",2);
 policy.run("onCheckpoint");
 policy.run("onJump");
 policy.tick(.05);
 assert.equal(policy.get("stage"),2);
 assert.equal(policy.get("score"),295);
 assert.equal(policy.get("jumps"),1);
 assert.equal(applied.at(-1).speed,6.4);
 policy.run("onRespawn");
 assert.equal(policy.get("deaths"),1);
 assert.equal(policy.get("combo"),0);
 assert.equal(policy.get("score"),270);
 policy.run("onFinish");
 assert.equal(policy.done,true);
 assert.ok(policy.score>=400);
});
test("Skybound native rules tune high-stage jump and running speed",()=>{
 const policy=new WorldRules(sky,{services:{world_configure:(speed,jump)=>({speed,jump})}});
 policy.run("onStage",5);policy.tick(.016);
 assert.equal(policy.get("runSpeed"),7.1);
 assert.equal(policy.get("jumpForce"),10.3);
});
test("Blockhaven's scripted terrain shapes a reproducible world, with mining rewards",()=>{
 const policy=new WorldRules(vox,{name:"blockhaven"});
 const profile={
   heightAt:(x,z,seed)=>policy.run("terrainHeight",x,z,seed),
   materialAt:(x,z,radius)=>policy.run("surfaceMaterial",x,z,radius),
   treeAt:(x,z,seed)=>policy.run("shouldPlantTree",x,z,seed)
 };
 const a=new VoxelWorld(42).generate(8,profile);
 const b=new VoxelWorld(42).generate(8,profile);
 assert.deepEqual([...a.blocks],[...b.blocks]);
 assert.equal(a.groundTop(0,0),3);
 assert.equal(a.at(8,a.groundTop(8,0),0),"sand");
 assert.equal(policy.run("canMine","stone"),true);
 assert.equal(policy.run("afterMine","stone"),5);
 assert.equal(policy.get("builderScore"),5);
 assert.equal(policy.run("canPlace","wood"),true);
 policy.run("afterPlace","wood");
 assert.equal(policy.get("blocksPlaced"),1);
 assert.equal(policy.get("builderScore"),7);
 policy.tick(.05);
 assert.ok(policy.get("worldAge")>0);
});
test("scripted terrain callbacks reject invalid geometry and unwanted host services",()=>{
 assert.throws(()=>new VoxelWorld(4).generate(6,{heightAt:()=>Infinity}),/terrain height/);
 assert.throws(()=>new VoxelWorld(4).generate(6,{heightAt:()=>3,materialAt:()=>"unsafe"}),/surface material/);
 assert.throws(()=>new VoxelWorld(4).generate(6,{heightAt:()=>3,treeAt:()=>"yes"}),/tree rule/);
 assert.throws(()=>new WorldRules(sky,{services:{eval:()=>{}}}),/namespaced/);
 const policy=new WorldRules(sky);
 assert.throws(()=>policy.tick(.02),/Unregistered world service world_configure/);
});

test("Skybound moving platforms, spinner and vanish decisions are supplied by HiroGlifx",()=>{
 const {SkyboundWorld}=require("../runtime/skybound-world");
 const policy=new WorldRules(sky,{services:{world_configure:()=>true}});
 const w=new SkyboundWorld();
 w.tile("start",0,0,0,4,"solid",1);
 w.moving("move",5,0,0,3,"z",1,3,3);
 w.spinner("spin",10,0,0,2,1,3,5);
 w.vanishing("vanish",15,0,0,3,.3,4);
 w.spawn("hero",0,2,0);
 let movingCalls=0;
 w.motionRules={
   movingOffset:(...args)=>{movingCalls++;return policy.run("movingOffset",...args);},
   spinnerX:(...args)=>policy.run("spinnerX",...args),
   spinnerZ:(...args)=>policy.run("spinnerZ",...args),
   shouldVanish:(...args)=>policy.run("shouldVanish",...args),
   respawnDelay:()=>policy.run("respawnDelay")
 };
 for(let i=0;i<40;i++)w.step(.02);
 assert.ok(movingCalls>0);
 const x=w.tiles.get("move").z;
 assert.ok(Math.abs(x)>0.1);
 assert.ok(Math.abs(w.tiles.get("spin").x-10)>0.1);
 const vanish=w.modifiers.get("vanish");
 vanish.started=w.motionTime-.4;
 w.step(.02);
 assert.equal(w.tiles.get("vanish").active,false);
 assert.ok(vanish.inactiveUntil>w.motionTime);
});
