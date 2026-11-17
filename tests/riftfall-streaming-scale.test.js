"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {performance}=require("node:perf_hooks");
const {PhysicsRegionStream}=require("../runtime/game-physics-stream");
const {RegionStream}=require("../runtime/game-region-stream");
const regions=[],entries=[];
for(let x=0;x<48;x++)for(let z=0;z<48;z++){
 const id="region-"+x+"-"+z,row=[id,"Tile",x*36,z*36,32,32,"#597d8a"];
 regions.push(row);entries.push({regionId:id,mesh:{id}});
}
test("2304-region physics stress never exceeds resident collider budget",()=>{
 let creates=0,releases=0;
 const manager=new PhysicsRegionStream({regions,entries,maxRegions:3,radius:9,
  create:mesh=>{creates++;return {mesh,dispose(){releases++;}};},release:x=>x.dispose()});
 const start=performance.now();
 for(let i=0;i<6000;i++){
  const x=i%48,z=Math.floor(i/48)%48;
  const frame=manager.update({x:x*36,z:z*36});
  assert.ok(frame.colliders<=3);
 }
 const duration=performance.now()-start;
 manager.dispose();
 assert.equal(creates,releases,"Every allocated Havok aggregate was released exactly once");
 assert.equal(manager.snapshot().colliders,0);
 assert.ok(duration<10000,"Streaming index regressed into expensive global scans: "+duration+"ms");
 console.log("PHYSICS_STREAM_BENCH",JSON.stringify({regions:regions.length,steps:6000,durationMs:+duration.toFixed(2),creates,releases}));
});
test("2304-region visuals do not leak GPU-side mesh records",()=>{
 let creates=0,releases=0;
 const manager=new RegionStream({regions,maxRegions:2,radius:9,create:()=>{
  creates++;return {dispose(){releases++;}};
 }});
 const start=performance.now();
 for(let i=0;i<3000;i++){
  const x=i%48,z=Math.floor(i/48)%48;
  assert.ok(manager.update({x:x*36,z:z*36}).count<=2);
 }
 const duration=performance.now()-start;manager.dispose();
 assert.equal(releases,creates);
 assert.ok(duration<10000);
 console.log("VISUAL_STREAM_BENCH",JSON.stringify({regions:regions.length,steps:3000,durationMs:+duration.toFixed(2),creates,releases}));
});
