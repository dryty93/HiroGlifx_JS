/* Riftfall multi-chapter level builder. Every encounter, region and obstacle
 * is authored in .scroll. Babylon/Havok supply reusable physical geometry.
 */
(function(root,factory){
 const world=typeof module==="object"&&module.exports?require("./scroll-world-rules"):root.HiroWorldRules;
 const ai=typeof module==="object"&&module.exports?require("./game-ai"):root.HiroAI;
 const stream=typeof module==="object"&&module.exports?require("./game-region-stream"):root.HiroRegionStream;
 const api=factory(world,ai,stream);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRiftfallWorld=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(world,ai,stream){
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
   this.worldMeshes=[];this.nav=null;this.currentWave=1;this.details=null;
 }
 waveTitle(stage){return this.rules.run("chapterTitle",stage);}
 threshold(stage){return this.rules.run("waveThreshold",stage);}
 waveStart(stage){this.currentWave=stage;return this.rules.run("waveStart",stage);}
 updateDetails(position){return this.details?.update(position)||{regions:[],count:0};}
 dispose(){this.details?.dispose();this.details=null;}
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
   // All terrain and obstacles stay in Havok/Recast. Only non-colliding decorative
   // meshes stream by player proximity, bounding the visual mesh footprint.
   this.details=new stream.RegionStream({regions:this.regions,radius:7,maxRegions:2,
     create:row=>{
       const [id,,cx,cz,w,d,tint]=row;
       const meshes=[],mat=material("detail-"+id,tint);
       try{
         if(B.MeshBuilder.CreateSphere)for(let i=0;i<12;i++){
           const a=i*2.39996322973,r=.28+.56*((i*7%13)/13);
           const m=B.MeshBuilder.CreateSphere("detail-shrub-"+id+"-"+i,{diameter:1+(i%3)*.3,segments:6},scene);
           m.position.set(cx+Math.cos(a)*r*w/2,.4,cz+Math.sin(a)*r*d/2);
           if(m.scaling)m.scaling.y=.55;m.material=mat;m.isPickable=false;meshes.push(m);
         }
         if(B.MeshBuilder.CreateCylinder)for(let i=0;i<3;i++){
           const a=(i+.5)*2.2;
           const m=B.MeshBuilder.CreateCylinder("detail-pillar-"+id+"-"+i,{diameter:.9,height:1.7+i*.4,tessellation:6},scene);
           m.position.set(cx+Math.cos(a)*w*.38,1,cz+Math.sin(a)*d*.38);
           m.material=mat;m.isPickable=false;meshes.push(m);
         }
         return {dispose(){for(const m of meshes)m.dispose?.();mat?.dispose?.();}};
       }catch(error){for(const m of meshes)m.dispose?.();mat?.dispose?.();throw error;}
     }
   });
   this.details.update({x:0,z:8});
   return {navigation:this.nav,meshes:this.worldMeshes,count:meshCount,regions:this.regions.length};
 }
}
return {RiftfallWorld};
});