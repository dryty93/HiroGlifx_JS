/* Original animated procedural enemy rig and Rift Guardian presentation.
 * Character color/stage come from authored HiroGlifx encounter definitions.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroCreatureArt=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
class CreatureVisual{
 constructor({BABYLON:B,scene,parent,color="#d78bb1",guardian=false}={}){
  if(!B?.MeshBuilder?.CreateBox||!B.StandardMaterial||!B.Color3||!scene||!parent)
   throw Error("Invalid creature art host");
  this.B=B;this.scene=scene;this.parent=parent;this.guardian=Boolean(guardian);
  this.meshes=[];this.materials=[];this.age=0;
  const material=(name,tint,emission=false)=>{
   const m=new B.StandardMaterial("creature-"+name,scene);
   m.diffuseColor=B.Color3.FromHexString(tint);
   if(emission)m.emissiveColor=B.Color3.FromHexString(tint);
   this.materials.push(m);return m;
  };
  try{
   const armor=material("armor",guardian?"#33446c":"#624d68");
   const metal=material("steel",guardian?"#b5c1de":"#c2abb0");
   const flesh=material("flesh",color);
   const glow=material("glow",guardian?"#a7b4ff":"#ffd78c",true);
   const box=(name,size,xyz,mat)=>{
    const mesh=B.MeshBuilder.CreateBox("creature-"+name,{width:size[0],height:size[1],depth:size[2]},scene);
    mesh.parent=parent;mesh.position.set(...xyz);mesh.material=mat;mesh.isPickable=false;
    this.meshes.push(mesh);return mesh;
   };
   const sphere=(name,diameter,xyz,mat)=>{
    if(!B.MeshBuilder.CreateSphere)return box(name,[diameter,diameter,diameter],xyz,mat);
    const mesh=B.MeshBuilder.CreateSphere("creature-"+name,{diameter,segments:8},scene);
    mesh.parent=parent;mesh.position.set(...xyz);mesh.material=mat;mesh.isPickable=false;
    this.meshes.push(mesh);return mesh;
   };
   box("chest",guardian?[1.05,.9,.55]:[.55,.7,.35],[0,0,0],armor);
   box("waist",guardian?[.68,.35,.49]:[.43,.27,.3],[0,-.5,0],metal);
   sphere("head",guardian?.48:.32,[0,.67,0],flesh);
   this.leftArm=box("left-arm",[.19,.62,.24],[-(guardian?.75:.43),-.04,0],flesh);
   this.rightArm=box("right-arm",[.19,.62,.24],[(guardian?.75:.43),-.04,0],flesh);
   this.leftLeg=box("left-leg",[.24,.75,.28],[-.22,-1.02,0],metal);
   this.rightLeg=box("right-leg",[.24,.75,.28],[.22,-1.02,0],metal);
   box("pauldron-left",guardian?[.48,.25,.5]:[.3,.18,.33],[-(guardian?.65:.42),.43,0],armor);
   box("pauldron-right",guardian?[.48,.25,.5]:[.3,.18,.33],[(guardian?.65:.42),.43,0],armor);
   sphere("eye-left",guardian?.12:.075,[-.11,.69,-.27],glow);
   sphere("eye-right",guardian?.12:.075,[.11,.69,-.27],glow);
   this.weapon=box("sword",guardian?[.22,1.55,.16]:[.13,.95,.12],[(guardian?.95:.57),-.24,-.18],metal);
   if(guardian&&B.MeshBuilder.CreateCylinder){
    for(let i=0;i<4;i++){
     const horn=B.MeshBuilder.CreateCylinder("guardian-horn-"+i,{
       height:.6+i*.08,diameterTop:.02,diameterBottom:.2,tessellation:6},scene);
     horn.parent=parent;horn.position.set((i-1.5)*.27,1.14,-.05);
     horn.material=i%2?glow:metal;horn.isPickable=false;this.meshes.push(horn);
    }
    this.core=sphere("rift-core",.38,[0,.09,-.38],glow);
   }
   parent.visibility=.025;
  }catch(e){this.dispose();throw e;}
 }
 tick(dt,{moving=false,warning=false,defeated=false}={}){
  if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error("Invalid creature animation delta");
  this.age+=dt;
  const gait=moving?Math.sin(this.age*9)*(this.guardian?.19:.3):0;
  if(this.leftArm?.rotation)this.leftArm.rotation.x=gait;
  if(this.rightArm?.rotation)this.rightArm.rotation.x=-gait;
  if(this.leftLeg?.rotation)this.leftLeg.rotation.x=-gait;
  if(this.rightLeg?.rotation)this.rightLeg.rotation.x=gait;
  if(this.weapon?.rotation)this.weapon.rotation.z=warning?-.8+.12*Math.sin(this.age*22):-.12;
  if(this.core?.scaling?.setAll)this.core.scaling.setAll(1+.09*Math.sin(this.age*3));
  if(defeated&&this.parent?.setEnabled)this.parent.setEnabled(false);
 }
 dispose(){for(const mesh of this.meshes)mesh.dispose?.();
  for(const mat of this.materials)mat.dispose?.();this.meshes=[];this.materials=[];}
}
return {CreatureVisual};
});
