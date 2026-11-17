/* Original stylized visual polish for authored Riftfall regions.
 * Geometry and palette are drawn from .scroll region definitions, not paid assets.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRiftfallArt=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function regionAccent(tint){
 const n=parseInt(tint.slice(1),16);
 if(!Number.isFinite(n))throw Error("Invalid region tint");
 const c=n&255;
 return c>125?"#a7d9ff":"#b7a1ff";
}
class RegionArt{
 constructor({BABYLON:B,scene,row,quality="medium"}){
  if(!B?.MeshBuilder||!scene||!Array.isArray(row)||row.length!==7||
     !["low","medium","high"].includes(quality))throw Error("Invalid art region");
  this.meshes=[];this.materials=[];this.lights=[];this.age=0;
  this.B=B;this.scene=scene;this.row=row;this.quality=quality;
  const [id,,cx,cz,w,d,tint]=row,accent=regionAccent(tint);
  const makeMat=(name,color,emission=false)=>{
   const mat=new B.StandardMaterial("art-"+id+"-"+name,scene);
   mat.diffuseColor=B.Color3.FromHexString(color);
   if(emission)mat.emissiveColor=B.Color3.FromHexString(color);
   this.materials.push(mat);return mat;
  };
  try{
   const dark=makeMat("basalt","#27344e"),light=makeMat("stone",tint),
     glow=makeMat("crystal",accent,true);
   const count=quality==="low"?4:quality==="high"?12:8;
   for(let i=0;i<count;i++){
    const angle=i*2.399963229728653,radius=.23+.48*((i*7%11)/11);
    const x=cx+Math.cos(angle)*radius*w/2,z=cz+Math.sin(angle)*radius*d/2;
    const tower=B.MeshBuilder.CreateCylinder?.("rift-altar-"+id+"-"+i,{
      height:.8+(i%4)*.45,diameterTop:.12,diameterBottom:.55+(i%3)*.18,tessellation:5},scene);
    if(tower){tower.position.set(x,.4+(i%4)*.225,z);tower.material=i%3===0?glow:dark;
      tower.isPickable=false;this.meshes.push(tower);}
    if(B.MeshBuilder.CreateSphere&&i%2===0){
     const orb=B.MeshBuilder.CreateSphere("rift-orb-"+id+"-"+i,{diameter:.25+(i%3)*.06,segments:8},scene);
     orb.position.set(x,1.35+(i%3)*.12,z);orb.material=glow;orb.isPickable=false;
     this.meshes.push(orb);
    }
   }
   if(B.MeshBuilder.CreateTorus){
    const ring=B.MeshBuilder.CreateTorus("rift-sigil-"+id,{diameter:Math.min(w,d)*.26,thickness:.095,tessellation:48},scene);
    ring.position.set(cx,.06,cz);ring.material=light;ring.isPickable=false;this.meshes.push(ring);
   }
   if(B.PointLight&&quality!=="low"){
    const lantern=new B.PointLight("rift-lantern-"+id,new B.Vector3(cx,2.2,cz),scene);
    lantern.diffuse=B.Color3.FromHexString(accent);
    lantern.intensity=.35;lantern.range=9;
    this.lights.push(lantern);
   }
  }catch(error){this.dispose();throw error;}
 }
 tick(delta){
  if(!Number.isFinite(delta)||delta<0||delta>.2)throw Error("Invalid art frame");
  this.age+=delta;
  for(const light of this.lights)light.intensity=.28+.08*Math.sin(this.age*2.1);
  for(const mesh of this.meshes)if(mesh.name?.includes("rift-orb"))
   mesh.position.y+=Math.sin(this.age*2.2)*.0009;
 }
 dispose(){
  for(const mesh of this.meshes)mesh.dispose?.();
  for(const light of this.lights)light.dispose?.();
  for(const mat of this.materials)mat.dispose?.();
  this.meshes=[];this.lights=[];this.materials=[];
 }
}
return {RegionArt,regionAccent};
});
