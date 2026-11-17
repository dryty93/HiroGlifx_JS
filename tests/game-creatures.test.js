"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {CreatureVisual}=require("../runtime/game-creatures");
test("guardian rig has horns, glow, weapon, animation and balanced disposal",()=>{
 let disposed=0,materials=0,meshes=0;
 const mesh=(name)=>{meshes++;return {name,position:{set(){}},rotation:{x:0,z:0},scaling:{setAll(){}},dispose(){disposed++;}};};
 const B={MeshBuilder:{CreateBox:mesh,CreateSphere:mesh,CreateCylinder:mesh},
   StandardMaterial:class{constructor(){materials++;}dispose(){disposed++;}},
   Color3:{FromHexString:x=>x}};
 const parent={material:{alpha:1}};
 const rig=new CreatureVisual({BABYLON:B,scene:{},parent,guardian:true});
 assert.ok(rig.meshes.length>=15);
 assert.ok(rig.materials.length>=4);
 assert.equal(parent.material.alpha,.025);
 rig.tick(.05,{moving:true,warning:true});
 assert.ok(rig.weapon.rotation.z<0);
 const count=rig.meshes.length+rig.materials.length;
 rig.dispose();assert.equal(disposed,count);
});
test("creature art rejects unavailable renderer and invalid tick",()=>{
 assert.throws(()=>new CreatureVisual({BABYLON:{},scene:{},parent:{}}),/Invalid creature/);
 const B={MeshBuilder:{CreateBox:(name)=>({name,position:{set(){}},rotation:{}})},
 StandardMaterial:class{},Color3:{FromHexString:x=>x}};
 const rig=new CreatureVisual({BABYLON:B,scene:{},parent:{material:{}}});
 assert.throws(()=>rig.tick(-1),/Invalid creature animation/);
 rig.dispose();
});
