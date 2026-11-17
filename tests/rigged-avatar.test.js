"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const asset=JSON.parse(fs.readFileSync(path.join(__dirname,"../assets/hero-rig.gltf"),"utf8"));
test("original rigged humanoid uses real skin joints, bind matrices and weighted vertices",()=>{
 assert.equal(asset.asset.version,"2.0");
 assert.equal(asset.skins.length,1);assert.equal(asset.skins[0].joints.length,7);
 const geometry=asset.meshes[0].primitives[0];
 for(const attr of ["POSITION","NORMAL","COLOR_0","JOINTS_0","WEIGHTS_0"])
   assert.ok(Number.isInteger(geometry.attributes[attr]));
 const b=asset.buffers[0],decoded=Buffer.from(b.uri.split(",")[1],"base64");
 assert.equal(decoded.length,b.byteLength);
 for(const view of asset.bufferViews)assert.ok(view.byteOffset+view.byteLength<=b.byteLength);
 assert.equal(asset.accessors[asset.skins[0].inverseBindMatrices].type,"MAT4");
 assert.equal(asset.accessors[geometry.attributes.JOINTS_0].count,asset.accessors[geometry.attributes.POSITION].count);
});
test("all six authored clips target real rig joints",()=>{
 const names=asset.animations.map(a=>a.name);
 assert.deepEqual(names,["idle","walk","run","jump","attack","death"]);
 for(const clip of asset.animations){
   assert.ok(clip.channels.length>=5);
   for(const channel of clip.channels){
     assert.equal(channel.target.path,"rotation");
     assert.ok(asset.skins[0].joints.includes(channel.target.node));
     const sampler=clip.samplers[channel.sampler];
     assert.equal(asset.accessors[sampler.input].type,"SCALAR");
     assert.equal(asset.accessors[sampler.output].type,"VEC4");
   }
 }
});
