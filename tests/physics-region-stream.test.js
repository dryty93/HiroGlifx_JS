"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {PhysicsRegionStream}=require("../runtime/game-physics-stream");
const {RiftfallWorld}=require("../runtime/riftfall-world");
const fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.resolve(__dirname,"../examples/riftfall-levels.scroll"),"utf8");
const regions=[["a","A",0,0,20,20,"#999999"],["b","B",0,-25,20,20,"#aaaaaa"],["c","C",0,-50,20,20,"#bbbbbb"]];
test("stream collider load, unload and bounded resident footprint",()=>{
 let created=0,released=0;
 const entries=regions.map(row=>({regionId:row[0],mesh:{name:row[0]}}));
 const manager=new PhysicsRegionStream({regions,entries,create:mesh=>{created++;return {mesh,dispose(){released++;}};},
  release:item=>item.dispose(),radius:3,maxRegions:2});
 assert.deepEqual(manager.update({x:0,z:0}).regions,["a"]);
 assert.equal(created,1);
 manager.update({x:0,z:-12});
 assert.deepEqual(manager.snapshot().regions,["a","b"]);
 manager.update({x:0,z:-49});
 assert.deepEqual(manager.snapshot().regions,["c"]);
 assert.equal(released,2);
 manager.dispose();assert.equal(released,3);assert.equal(manager.snapshot().colliders,0);
});
test("stream staging is atomic on missing physics aggregates",()=>{
 const entries=regions.map(r=>({regionId:r[0],mesh:{name:r[0]}}));
 let released=0;
 const manager=new PhysicsRegionStream({regions,entries,create:mesh=>{
  if(mesh.name==="b")throw Error("Havok creation error");
  return {dispose(){released++;}};
 },release:a=>a.dispose(),maxRegions:2,radius:0});
 manager.update({x:0,z:0});
 assert.throws(()=>manager.update({x:0,z:-12.5}),/Havok creation error/);
 assert.deepEqual(manager.snapshot().regions,["a"]);
 assert.equal(released,0);
 manager.dispose();assert.equal(released,1);
});
test("three-region world can stream Havok aggregates without altering navmesh meshes",()=>{
 const meshes=[],aggregates=new Set();
 const B={MeshBuilder:{CreateBox(name,dimensions){const mesh={name,dimensions,position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},metadata:null,dispose(){}};meshes.push(mesh);return mesh;},
 CreateSphere(){return {position:{set(){}},scaling:{y:1},dispose(){}};},
 CreateCylinder(){return {position:{set(){}},dispose(){}};}}};
 const physics={staticBox(mesh){const aggregate={mesh,dispose(){aggregates.delete(aggregate);}};aggregates.add(aggregate);return aggregate;},
 releaseAggregate(a){a.dispose();return true;}};
 const w=new RiftfallWorld(source);
 const result=w.build({BABYLON:B,scene:{},physics,material:()=>({}),physicsStreaming:true});
 assert.equal(result.meshes.length,11);
 assert.ok(aggregates.size>0&&aggregates.size<11);
 const before=aggregates.size;
 w.updatePhysics({x:0,z:-48});
 assert.ok(aggregates.size>0&&aggregates.size<11);
 assert.equal(result.meshes.length,11);
 w.dispose();assert.equal(aggregates.size,0);
});
test("reject unsafe coordinates and invalid collider factories",()=>{
 assert.throws(()=>new PhysicsRegionStream({regions,entries:[],radius:Infinity,create:()=>({}),release:()=>{}}),/Invalid/);
 const manager=new PhysicsRegionStream({regions,entries:[],create:()=>({dispose(){}}),release:a=>a.dispose()});
 assert.throws(()=>manager.update({x:NaN,z:0}),/Invalid/);
});
