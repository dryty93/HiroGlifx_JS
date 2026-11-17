"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RegionStream}=require("../runtime/game-region-stream");
const regions=[
 ["south","South",0,0,20,20,"#aaaaaa"],
 ["middle","Middle",0,-24,20,20,"#bbbbbb"],
 ["north","North",0,-48,20,20,"#cccccc"]
];
test("streamer loads only nearby regions, reuses assets and disposes far detail",()=>{
 const created=[],released=[],stream=new RegionStream({
   regions,radius:3,maxRegions:2,create:row=>{
     created.push(row[0]);
     return {dispose(){released.push(row[0]);}};
   }
 });
 assert.deepEqual(stream.update({x:0,z:6}).regions,["south"]);
 stream.update({x:0,z:7});assert.deepEqual(created,["south"],"Region is not regenerated in the same area");
 assert.deepEqual(stream.update({x:0,z:-12}).regions,["south","middle"]);
 assert.deepEqual(stream.update({x:0,z:-44}).regions,["north"]);
 assert.deepEqual(released,["south","middle"]);
 stream.dispose();assert.deepEqual(released,["south","middle","north"]);
 assert.equal(stream.snapshot().count,0);
});
test("failed resource staging leaves existing visual regions intact",()=>{
 let released=0;
 const stream=new RegionStream({regions,radius:20,maxRegions:3,create:row=>{
   if(row[0]==="north")throw Error("asset unavailable");
   return {dispose(){released++;}};
 }});
 assert.deepEqual(stream.update({x:0,z:0}).regions,["south","middle"]);
 assert.throws(()=>stream.update({x:0,z:-35}),/asset unavailable/);
 assert.deepEqual(stream.snapshot().regions,["south","middle"]);
 assert.equal(released,0,"Existing visuals should survive failed staging");
 stream.dispose();assert.equal(released,2);
 assert.throws(()=>stream.update({x:Infinity,z:0}),/Invalid player/);
});
test("streamer rejects unsafe configuration and invalid resource ownership",()=>{
 assert.throws(()=>new RegionStream({regions,maxRegions:0,create:()=>({dispose(){}})}),/Invalid/);
 const stream=new RegionStream({regions,radius:0,create:()=>({})});
 assert.throws(()=>stream.update({x:0,z:0}),/disposable/);
 assert.equal(stream.snapshot().count,0);
});
