"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {RiftfallWorld}=require("../runtime/riftfall-world");
const {NavigationGrid,NavigationAgent}=require("../runtime/game-ai");
const {GameContent}=require("../runtime/game-content");
const level=fs.readFileSync(path.join(__dirname,"../examples/riftfall-levels.scroll"),"utf8");
const content=fs.readFileSync(path.join(__dirname,"../examples/riftfall-content.scroll"),"utf8");
test("three chapters and seven enemy definitions are data authored in HiroGlifx .scroll",()=>{
 const world=new RiftfallWorld(level);
 assert.equal(world.regions.length,3);
 assert.equal(world.obstacles.length,8);
 assert.equal(world.encounters.length,7);
 assert.deepEqual([1,2,3].map(w=>world.spawns(w).length),[3,3,1]);
 assert.equal(world.threshold(1),3);assert.equal(world.threshold(2),6);assert.equal(world.threshold(3),7);
 assert.equal(world.waveTitle(3),"Obsidian Gate");
 assert.equal(world.spawns(3)[0].health,320);
});
test("real scene builder constructs each Havok-backed chapter and blocked navigation",()=>{
 const meshes=[];
 const B={MeshBuilder:{CreateBox(name,dimensions){const m={name,dimensions,
   position:{set(x,y,z){Object.assign(this,{x,y,z});}},
   metadata:null,dispose(){}};meshes.push(m);return m;},
   CreateSphere(){return {position:{set(){}},scaling:{y:1},material:null,isPickable:true};},
   CreateCylinder(){return {position:{set(){}},material:null,isPickable:true};}}};
 let colliders=0;
 const geometry=new RiftfallWorld(level).build({BABYLON:B,scene:{},
   physics:{staticBox(){colliders++;}},material:()=>({})});
 assert.equal(geometry.count,11);
 assert.equal(colliders,11);
 assert.equal(geometry.regions,3);
 assert.equal(meshes.length,11);
 assert.equal(geometry.navigation.walkable(...Object.values(geometry.navigation.cell(-4,.1))),false);
 const path=geometry.navigation.path({x:0,z:7},{x:0,z:-24});
 assert.ok(path.length>20);
});
test("live Recast route provider is used by generic NPC follower when supplied",()=>{
 const grid=new NavigationGrid({width:30,height:30});
 let calls=0;
 const agent=new NavigationAgent({grid,position:{x:2.5,z:2.5},speed:3,
   route:(from,to)=>{calls++;return [{x:from.x,z:from.z},{x:to.x,z:to.z}];}});
 assert.equal(agent.navigate({x:5.5,z:5.5}),true);
 assert.equal(calls,1);
 for(let i=0;i<40;i++)agent.tick(.05);
 assert.ok(agent.position.x>4);
 assert.ok(agent.position.z>4);
});
test("seven guardian quest requires all scripted defeats before claim",()=>{
 const c=new GameContent(content).starter();
 for(let i=0;i<2;i++)c.defeated("raider",i);
 assert.equal(c.claim("first-blood"),true);
 assert.equal(c.quests.accept("rift-guardian"),true);
 for(let i=0;i<6;i++)c.quests.record("defeat","raider",1);
 assert.equal(c.quests.entries.get("rift-guardian").status,"active");
 c.quests.record("defeat","raider",1);
 assert.equal(c.quests.entries.get("rift-guardian").status,"completed");
 assert.equal(c.claim("rift-guardian"),true);
});
