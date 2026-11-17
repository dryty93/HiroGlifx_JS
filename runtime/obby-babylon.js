/* Babylon.js third-person rendering for a HiroGlifx ObbyWorld. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroObbyBabylon=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const COLORS={solid:"#60a5fa",checkpoint:"#22c55e",lava:"#ef4444",finish:"#facc15"};
 class ObbyBabylonAdapter{
   constructor({BABYLON,canvas,world}){
     if(!BABYLON?.Engine||!BABYLON?.MeshBuilder||!canvas||!world)
       throw new Error("Babylon engine, canvas and ObbyWorld required");
     if(!world.player)throw new Error("Create player before rendering");
     this.B=BABYLON;this.canvas=canvas;this.world=world;
     this.engine=null;this.scene=null;this.meshes=new Map();
     this.last=0;this.active=false;this.paused=false;
   }
   start(){
     if(this.active)throw new Error("Renderer already active");
     const B=this.B;
     const engine=new B.Engine(this.canvas,true);
     this.engine=engine;this.scene=new B.Scene(engine);
     this.scene.clearColor=B.Color4.FromHexString("#101827ff");
     this.camera=new B.ArcRotateCamera("follow",-Math.PI/3,Math.PI/3.2,20,new B.Vector3(0,0,0),this.scene);
     this.camera.attachControl(this.canvas,true);
     new B.HemisphericLight("sun",new B.Vector3(0,1,0),this.scene);
     const create=(name,x,y,z,w,h,d,color)=>{
       const mesh=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);
       mesh.position=new B.Vector3(x,y,z);
       const material=new B.StandardMaterial(name+"-material",this.scene);
       material.diffuseColor=B.Color3.FromHexString(color);
       mesh.material=material;this.meshes.set(name,mesh);return mesh;
     };
     for(const tile of this.world.tiles.values())
       create(tile.id,tile.x,tile.y,tile.z,tile.size,tile.height,tile.size,COLORS[tile.kind]);
     const p=this.world.player;
     this.avatar=create("player",p.x,p.y,p.z,0.7,p.height,0.7,"#e9d5ff");
     const head=create("head",p.x,p.y+0.9,p.z,0.65,0.65,0.65,"#fde68a");
     this.head=head;
     this.active=true;
     engine.runRenderLoop(()=>{
       if(!this.paused){
         const now=(typeof performance!=="undefined"?performance.now():Date.now());
         const dt=this.last?Math.min(0.05,(now-this.last)/1000):0;
         this.last=now;
         if(dt)this.world.step(dt);
       }
       this.sync();this.scene.render();
     });
     return this;
   }
   sync(){
     if(!this.scene)return;
     const p=this.world.player;
     this.avatar.position.set(p.x,p.y,p.z);
     this.head.position.set(p.x,p.y+0.95,p.z);
     const goal=new this.B.Vector3(p.x+2,p.y,p.z);
     this.camera.setTarget(goal);
     this.camera.radius=17;
   }
   stop(){
     if(this.engine)this.engine.stopRenderLoop();
     if(this.scene)this.scene.dispose();
     if(this.engine)this.engine.dispose();
     this.active=false;this.scene=null;this.engine=null;this.meshes.clear();
   }
 }
 return {ObbyBabylonAdapter};
});