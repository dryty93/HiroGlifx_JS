/* Riftfall multi-chapter level builder. Every encounter, region and obstacle
 * is authored in .scroll. Babylon/Havok supply reusable physical geometry.
 */
(function(root,factory){
 const world=typeof module==="object"&&module.exports?require("./scroll-world-rules"):root.HiroWorldRules;
 const ai=typeof module==="object"&&module.exports?require("./game-ai"):root.HiroAI;
 const api=factory(world,ai);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRiftfallWorld=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(world,ai){
"use strict";
const numeric=(n,min,max,label)=>{
 if(typeof n!=="number"||!Number.isFinite(n)||n<min||n>max)throw Error("Invalid "+label);
 return n;
};
const color=c=>{if(typeof c!=="string"||!/^#[0-9a-fA-F]{6}$/.test(c))throw Error("Invalid world material");return c;};
class RiftfallWorld{
 constructor(source){
   if(typeof source!=="string")throw Error("HiroGlifx level source required");
   this.rules=new world.WorldRules(source,{name:"riftfall-levels"});
   this.regions=this.rules.get("regions");
   this.obstacles=this.rules.get("obstacles");
   this.encounters=this.rules.get("encounters");
   if(!Array.isArray(this.regions)||this.regions.length<2||this.regions.length>12||
     !Array.isArray(this.obstacles)||this.obstacles.length>70||
     !Array.isArray(this.encounters)||this.encounters.length>50)throw Error("Invalid Riftfall level source");
   this.worldMeshes=[];this.nav=null;this.currentWave=1;
 }
 waveTitle(stage){return this.rules.run("chapterTitle",stage);}
 threshold(stage){return this.rules.run("waveThreshold",stage);}
 waveStart(stage){this.currentWave=stage;return this.rules.run("waveStart",stage);}
 spawns(stage){
   return this.encounters.map((row,i)=>{
     if(!Array.isArray(row)||row.length!==7)throw Error("Invalid encounter definition");
     const [wave,x,z,health,armor,speed,tint]=row;
     numeric(wave,1,6,"enemy wave");
     if(wave!==stage)return null;
     return {id:"raider-"+i,index:i,wave,
       x:numeric(x,-100,100,"enemy x"),z:numeric(z,-100,100,"enemy z"),
       health:numeric(health,1,10000,"enemy HP"),armor:numeric(armor,0,1000,"enemy armor"),
       speed:numeric(speed,.1,20,"enemy speed"),color:color(tint)};
   }).filter(Boolean);
 }
 build({BABYLON:B,scene,physics,material}){
   if(!B?.MeshBuilder?.CreateBox||!scene||!physics||typeof material!=="function")throw Error("Invalid world builder host");
   this.nav=new ai.NavigationGrid({width:44,height:92,originX:-22,originZ:-68,cellSize:1});
   let meshCount=0;
   const box=(id,x,y,z,w,h,d,tint,occlude=true)=>{
     const mesh=B.MeshBuilder.CreateBox(id,{width:w,height:h,depth:d},scene);
     mesh.position.set(x,y,z);mesh.material=material(id,color(tint));
     mesh.metadata={cameraOccluder:occlude,riftfallWorld:true};physics.staticBox(mesh);
     this.worldMeshes.push(mesh);return mesh;
   };
   for(const entry of this.regions){
     if(!Array.isArray(entry)||entry.length!==7)throw Error("Invalid region declaration");
     const [id,title,x,z,w,d,tint]=entry;
     if(typeof id!=="string"||!/^[a-z][a-z0-9-]*$/.test(id)||typeof title!=="string")throw Error("Invalid region id/title");
     box("region-"+id,numeric(x,-100,100,"region x"),-.45,numeric(z,-100,100,"region z"),
       numeric(w,4,100,"width"),.9,numeric(d,4,100,"depth"),tint,false);
     meshCount++;
   }
   for(const [i,entry] of this.obstacles.entries()){
     if(!Array.isArray(entry)||entry.length!==7)throw Error("Invalid obstacle");
     const [x,y,z,w,h,d,tint]=entry;
     [x,y,z,w,h,d].forEach((n,j)=>numeric(n,j<3?-100:.2,j<3?100:10,"obstacle coordinate"));
     box("ruin-"+i,x,y,z,w,h,d,tint);
     for(let bx=Math.floor(x-w/2);bx<=Math.ceil(x+w/2);bx++)
       for(let bz=Math.floor(z-d/2);bz<=Math.ceil(z+d/2);bz++){
         const cell=this.nav.cell(bx,bz);
         if(this.nav.inside(cell.x,cell.z))this.nav.setBlocked(cell.x,cell.z,true);
       }
     meshCount++;
   }
   if(B.MeshBuilder.CreateSphere){
     for(let i=0;i<54;i++){
       const zone=i%3,z=[0,-23,-48][zone],angle=i*2.39996322973;
       const x=Math.cos(angle)*(.8+i%5+9),dz=Math.sin(angle)*(.8+i%4+9);
       const shrub=B.MeshBuilder.CreateSphere("world-foliage-"+i,{diameter:1+(i%3)*.34,segments:6},scene);
       shrub.position.set(x,.4,z+dz);shrub.scaling.y=.52;
       shrub.material=material("foliage-"+i,zone===2?"#5a769a":zone===1?"#5c9a83":"#378472");
       shrub.isPickable=false;
     }
   }
   if(B.MeshBuilder.CreateCylinder){
     for(let i=0;i<17;i++){
       const z=i%2?-50:-22,angle=i*2.4;
       const mesh=B.MeshBuilder.CreateCylinder("world-obelisk-"+i,{diameter:.9,height:1.6+i%4,tessellation:6},scene);
       mesh.position.set(Math.cos(angle)*11,1,z+Math.sin(angle)*10);
       mesh.material=material("obelisk-"+i,i%2?"#566382":"#947966");
       mesh.isPickable=false;
     }
   }
   return {navigation:this.nav,meshes:this.worldMeshes,count:meshCount,regions:this.regions.length};
 }
}
return {RiftfallWorld};
});