"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RecastNavigation}=require("../runtime/game-navmesh");
const {AnimationGraph}=require("../runtime/game-assets");

test("Recast optional adapter calls real Babylon navmesh and crowd APIs",()=>{
 let built=false,disposed=false;
 class Vec{constructor(x,y,z){Object.assign(this,{x,y,z});}}
 class Plugin{
   createNavMesh(meshes,config){built=true;assert.equal(meshes.length,1);assert.equal(config.walkableSlopeAngle,40);}
   getClosestPoint(p){return p;}
   computePath(a,b){return [a,b];}
   createCrowd(size,radius){assert.equal(size,8);return {dispose(){disposed=true;}};}
 }
 const nav=new RecastNavigation({BABYLON:{Vector3:Vec,RecastJSPlugin:Plugin},scene:{},recast:{}});
 nav.build([{}]);assert.equal(built,true);
 assert.deepEqual(nav.closest({x:1,y:0,z:2}),{x:1,y:0,z:2});
 assert.equal(nav.path({x:0,y:0,z:0},{x:3,y:0,z:4}).length,2);
 nav.createCrowd(8,.6);
 assert.throws(()=>nav.build([{}],{__proto__bad:1}),/Unsafe/);
 nav.dispose();assert.equal(disposed,true);
});
test("animation graph crossfades glTF clips with actual weighted transitions",()=>{
 let from=1,to=0,stopped=false;
 const clips=new Map([
   ["idle",{start(){},stop(){stopped=true;},setWeightForAllAnimatables(value){from=value;}}],
   ["run",{start(){},stop(){},setWeightForAllAnimatables(value){to=value;}}]
 ]);
 const graph=new AnimationGraph({clips,fade:.2});
 graph.set("run");assert.equal(to,0);
 graph.tick(.1);assert.ok(to>.45&&to<.55);
 graph.tick(.1);assert.equal(to,1);assert.equal(from,0);assert.equal(stopped,true);
});
