/* Phase 23: real Babylon Physics V2/Havok bridge + camera-safe character controller.
 * Errors are explicit; never silently downgrade to a fake physics implementation.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroPhysics=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const finite=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v;};
 class HavokWorld{
   constructor({BABYLON,scene,HavokPhysics}){
     if(!BABYLON?.HavokPlugin||!BABYLON.PhysicsAggregate||!BABYLON.PhysicsCharacterController||!BABYLON.Vector3||!scene||typeof HavokPhysics!=="function")
       throw Error("Havok V2 physics and PhysicsCharacterController are required");
     this.B=BABYLON;this.scene=scene;this.factory=HavokPhysics;this.aggregates=[];this.controllers=[];this.active=false;
   }
   async initialize(gravity=-22){
     if(this.active)throw Error("Havok already initialized");
     finite(gravity,-100,-.01,"gravity");
     const wasm=await this.factory();
     if(!wasm)throw Error("Havok WASM initialization failed");
     const plugin=new this.B.HavokPlugin(true,wasm);
     const enabled=this.scene.enablePhysics(new this.B.Vector3(0,gravity,0),plugin);
     if(enabled===false)throw Error("Babylon failed to enable Havok physics");
     this.active=true;this.plugin=plugin;this.gravity=gravity;
     return this;
   }
   staticBox(mesh,{friction=.8}={}){
     if(!this.active)throw Error("Initialize Havok before creating colliders");
     finite(friction,0,1,"friction");
     const a=new this.B.PhysicsAggregate(mesh,this.B.PhysicsShapeType.BOX,{mass:0,friction},this.scene);
     this.aggregates.push(a);return a;
   }
   dynamicBox(mesh,{mass=1,restitution=.15}={}){
     if(!this.active)throw Error("Havok not ready");
     finite(mass,.01,10000,"mass");finite(restitution,0,1,"restitution");
     const a=new this.B.PhysicsAggregate(mesh,this.B.PhysicsShapeType.BOX,{mass,restitution},this.scene);
     this.aggregates.push(a);return a;
   }
   character(position,{height=1.7,radius=.33,speed=5.8,jump=8.6}={}){
     if(!this.active)throw Error("Havok not ready");
     finite(height,1,4,"capsule height");finite(radius,.1,.8,"capsule radius");
     const v=new this.B.Vector3(...position);
     const controller=new this.B.PhysicsCharacterController(v,{capsuleHeight:height,capsuleRadius:radius},this.scene);
     const actor=new CharacterController({BABYLON:this.B,controller,speed,jump,gravity:this.gravity});
     this.controllers.push(actor);return actor;
   }
   dispose(){
     for(const controller of this.controllers)controller.dispose();
     for(const aggregate of this.aggregates)aggregate.dispose?.();
     this.controllers=[];this.aggregates=[];this.active=false;
   }
 }
 class CharacterController{
   constructor({BABYLON,controller,speed=5.8,jump=8.6,gravity=-22}){
     this.B=BABYLON;this.controller=controller;
     this.speed=finite(speed,.1,30,"speed");this.jumpStrength=finite(jump,.1,30,"jump");
     this.gravity=gravity;this.vertical=0;this.grounded=false;this.jumpBuffer=0;this.coyote=0;
     this.input={x:0,z:0};this.maxDelta=.04;
   }
   setInput(x,z){finite(x,-1,1,"x input");finite(z,-1,1,"z input");this.input={x,z};}
   jump(){this.jumpBuffer=.13;}
   tick(dt){
     finite(dt,0,.1,"frame delta");if(!dt)return this.position;
     const down=new this.B.Vector3(0,-1,0);
     const clamped=Math.min(this.maxDelta,dt),support=this.controller.checkSupport(clamped,down);
     this.grounded=support?.supportedState===2;
     this.coyote=this.grounded?.1:Math.max(0,this.coyote-clamped);
     this.jumpBuffer=Math.max(0,this.jumpBuffer-clamped);
     if(this.jumpBuffer>0&&(this.grounded||this.coyote>0)){
       this.vertical=this.jumpStrength;this.jumpBuffer=0;this.coyote=0;this.grounded=false;
     }else if(this.grounded&&this.vertical<0)this.vertical=0;
     else this.vertical+=this.gravity*clamped;
     const mag=Math.max(1,Math.hypot(this.input.x,this.input.z));
     const desired=new this.B.Vector3(this.input.x/mag*this.speed,this.vertical,this.input.z/mag*this.speed);
     this.controller.setVelocity(desired);
     this.controller.integrate(clamped,support,new this.B.Vector3(0,this.gravity,0));
     const p=this.controller.getPosition();
     return {x:p.x,y:p.y,z:p.z};
   }
   get position(){const p=this.controller.getPosition();return {x:p.x,y:p.y,z:p.z};}
   dispose(){this.controller.dispose?.();}
 }
 function cameraOcclusion({scene,BABYLON,origin,desired,minDistance=1.7}){
   if(!scene||!BABYLON?.Ray||!origin||!desired)throw Error("Camera occlusion requires scene and points");
   const start=new BABYLON.Vector3(origin.x,origin.y,origin.z);
   const end=new BABYLON.Vector3(desired.x,desired.y,desired.z);
   const vector=end.subtract(start),len=vector.length();
   if(!len)return desired;
   const hit=scene.pickWithRay?.(new BABYLON.Ray(start,vector.normalize(),len),
     mesh=>mesh.isPickable!==false&&mesh.metadata?.cameraOccluder===true);
   if(!hit?.hit||!Number.isFinite(hit.distance))return desired;
   const length=Math.max(minDistance,hit.distance-.25);
   const p=start.add(vector.scale(length/len));
   return {x:p.x,y:p.y,z:p.z};
 }
 return {HavokWorld,CharacterController,cameraOcclusion};
});