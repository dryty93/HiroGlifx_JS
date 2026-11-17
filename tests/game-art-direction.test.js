"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RegionArt}=require("../runtime/game-art-direction");
const row=["rift","The Rift",0,-24,26,25,"#467f78"];
test("region art creates original scene objects with bounded live resources and disposes",()=>{
 const active=new Set();
 const make=(name)=>{
  const mesh={name,position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},scaling:{y:1},
   dispose(){active.delete(mesh);}};active.add(mesh);return mesh;
 };
 class Material{constructor(){active.add(this);}dispose(){active.delete(this);}}
 class Light{constructor(){active.add(this);}dispose(){active.delete(this);}}
 const B={StandardMaterial:Material,Color3:{FromHexString:c=>c},Vector3:class{},
  PointLight:Light,MeshBuilder:{CreateCylinder:make,CreateSphere:make,CreateTorus:make}};
 const art=new RegionArt({BABYLON:B,scene:{},row});
 assert.ok(art.meshes.length>=10);assert.ok(art.lights.length<=1);
 art.tick(.016);assert.throws(()=>art.tick(-1),/Invalid art frame/);
 art.dispose();assert.equal(active.size,0);
});
test("visual quality scales and malformed authored palettes fail safely",()=>{
 const B={MeshBuilder:{CreateCylinder(){}},StandardMaterial:class{},Color3:{FromHexString:c=>c}};
 assert.throws(()=>new RegionArt({BABYLON:B,scene:{},row,quality:"ultra"}),/Invalid art/);
 assert.throws(()=>new RegionArt({BABYLON:B,scene:{},row:["id","A",0,0,20,20,"invalid"]}),/Invalid region tint/);
});
