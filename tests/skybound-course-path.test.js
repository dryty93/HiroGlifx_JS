"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install:installObby}=require("../runtime/obby-canonical");
const {install:installBlueprints}=require("../runtime/canonical-blueprints");

test("flagship course has a continuous safe route across all five stages",async()=>{
 const source=fs.readFileSync(path.join(__dirname,"../examples/skybound-course.scroll"),"utf8");
 const runtime=installObby(new CanonicalRuntime());
 await runtime.execute(installBlueprints(runtime,source));
 const w=runtime.get("world");
 const safeRoute=[
  "start","cloud1","cloud2","cloud3","gate2","safe1","safe2","safe3",
  "gate3","move1","move2","skyledge","gate4","vanish1","vanish2","vanish3",
  "gate5","final1","final2","final3","finish"
 ];
 const kinds=new Set(["solid","checkpoint","finish"]);
 let lastStage=0;
 for(const id of safeRoute){
  const tile=w.tiles.get(id);
  assert.ok(tile,"Missing course tile "+id);
  assert.ok(kinds.has(tile.kind),"Safe route includes hazard "+id);
  assert.ok(tile.stage>=lastStage,"Stage order regressed at "+id);
  lastStage=tile.stage;
 }
 assert.equal(lastStage,5);
 const reachable=(a,b)=>{
  const dx=Math.max(0,Math.abs(a.x-b.x)-(a.size+b.size)/2);
  const dz=Math.max(0,Math.abs(a.z-b.z)-(a.size+b.size)/2);
  return Math.hypot(dx,dz);
 };
 for(let i=1;i<safeRoute.length;i++){
  const a=w.tiles.get(safeRoute[i-1]),b=w.tiles.get(safeRoute[i]);
  // Horizontal jump speed 6 units/s * ~0.89 s airtime ≈ 5.3 units.
  // Keep geometric edge separation under 3 units to retain margin for timing and moving tiles.
  assert.ok(reachable(a,b)<=3,
   safeRoute[i-1]+" to "+safeRoute[i]+" gap is too large: "+reachable(a,b).toFixed(2));
 }
});
