/* Reusable Babylon combat feedback with bounded pooled particles and hit numbers. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGameFX=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
class CombatFX{
 constructor({BABYLON,scene,maxParticles=48}){
   if(!BABYLON?.MeshBuilder||!scene)throw Error("CombatFX requires Babylon scene");
   if(!Number.isInteger(maxParticles)||maxParticles<1||maxParticles>256)throw Error("Invalid VFX budget");
   this.B=BABYLON;this.scene=scene;this.maxParticles=maxParticles;
   this.sparks=[];this.flash=0;this.damageText=[];this.clock=0;
   this.materials=new Map();
 }
 material(color){
   if(this.materials.has(color))return this.materials.get(color);
   if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error("Invalid VFX color");
   const mat=new this.B.StandardMaterial("vfx-"+color.slice(1),this.scene);
   mat.diffuseColor=this.B.Color3.FromHexString(color);
   if("emissiveColor" in mat)mat.emissiveColor=this.B.Color3.FromHexString(color);
   this.materials.set(color,mat);return mat;
 }
 impact(position,{color="#f9d98d",power=1,damage=0}={}){
   if(!position||![position.x,position.y,position.z].every(Number.isFinite))throw Error("Invalid impact point");
   if(typeof power!=="number"||power<0||power>3)throw Error("Invalid impact power");
   this.flash=Math.min(.45,this.flash+.13*power);
   if(damage){
     this.damageText.push({value:Math.floor(damage),at:{...position},expires:this.clock+1.1});
     if(this.damageText.length>25)this.damageText.shift();
   }
   const count=Math.min(12,Math.ceil(5*power));
   for(let i=0;i<count;i++){
     if(this.sparks.length>=this.maxParticles)break;
     const mesh=this.B.MeshBuilder.CreateSphere("impact-"+this.clock+"-"+i,{diameter:.10,segments:5},this.scene);
     mesh.position.set(position.x,position.y,position.z);mesh.material=this.material(color);
     mesh.isPickable=false;
     const angle=i*2.3999632;
     this.sparks.push({mesh,lifetime:.44,age:0,
       velocity:{x:Math.cos(angle)*2.8*power,y:1.4+Math.sin(angle)*power,z:Math.sin(angle)*2.8*power}});
   }
 }
 tick(dt){
   if(typeof dt!=="number"||!Number.isFinite(dt)||dt<0||dt>.2)throw Error("Invalid VFX frame");
   this.clock+=dt;this.flash=Math.max(0,this.flash-dt*1.3);
   for(let i=this.sparks.length-1;i>=0;i--){
     const p=this.sparks[i];p.age+=dt;
     if(p.age>=p.lifetime){p.mesh.dispose?.();this.sparks.splice(i,1);continue;}
     p.mesh.position.x+=p.velocity.x*dt;
     p.mesh.position.y+=p.velocity.y*dt;
     p.mesh.position.z+=p.velocity.z*dt;
     p.velocity.y-=9.8*dt;
     if(p.mesh.scaling?.setAll)p.mesh.scaling.setAll(Math.max(.05,1-p.age/p.lifetime));
   }
   this.damageText=this.damageText.filter(item=>item.expires>this.clock);
 }
 dispose(){for(const p of this.sparks)p.mesh.dispose?.();for(const mat of this.materials.values())mat.dispose?.();this.sparks=[];this.materials.clear();this.damageText=[];}
}
return {CombatFX};
});