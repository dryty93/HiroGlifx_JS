/* Browser Babylon renderer for HiroGlifx voxel world. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroVoxelBabylon=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const COLORS={grass:"#5db972",dirt:"#9f7851",stone:"#8498b0",wood:"#956c44",
   leaves:"#318e56",sand:"#e7cb88",glass:"#87d9ed"};
 class VoxelBabylonAdapter{
   constructor({BABYLON,canvas,world,onFrame=null}){
     if(!BABYLON?.Engine||!BABYLON?.Scene||!BABYLON?.MeshBuilder||!canvas||!world?.player)
       throw new Error("Babylon, canvas, and spawned world required");
     this.B=BABYLON;this.canvas=canvas;this.world=world;this.onFrame=onFrame;
     this.scene=null;this.engine=null;this.camera=null;this.meshes=new Map();this.paused=true;
     this.materials=new Map();this.keys=new Set();this.unsub=null;this.last=0;this.active=false;
   }
   start(){
     if(this.active)throw new Error("Renderer already running");
     const B=this.B,p=this.world.player;
     this.engine=new B.Engine(this.canvas,true,{antialias:true,preserveDrawingBuffer:true});
     if(this.engine.setHardwareScalingLevel){
       const ratio=typeof devicePixelRatio==="number"?devicePixelRatio:1;
       this.engine.setHardwareScalingLevel(Math.min(2,Math.max(1,ratio)));
     }
     this.scene=new B.Scene(this.engine);
     this.scene.clearColor=B.Color4.FromHexString("#8bc5edff");
     if(B.Scene.FOGMODE_EXP2!==undefined){
       this.scene.fogMode=B.Scene.FOGMODE_EXP2;
       this.scene.fogDensity=.014;
       this.scene.fogColor=B.Color3.FromHexString("#9ac9ef");
     }
     this.camera=new B.FreeCamera("voxel-camera",new B.Vector3(p.x,p.y,p.z),this.scene);
     this.camera.rotation.y=Math.PI*.22;
     this.camera.rotation.x=.30;
     this.camera.minZ=.08;
     if(this.camera.attachControl)this.camera.attachControl(this.canvas,true);
     if(this.camera.inputs?.removeByType)this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
     if("inertia" in this.camera)this.camera.inertia=.4;
     const light=new B.HemisphericLight("daylight",new B.Vector3(.25,1,.15),this.scene);
     light.intensity=1.12;
     if(B.DirectionalLight){
       const sun=new B.DirectionalLight("sun",new B.Vector3(-.5,-1,.4),this.scene);
       sun.intensity=.65;
     }
     for(const [name,hex] of Object.entries(COLORS)){
       const mat=new B.StandardMaterial(name+"-mat",this.scene);
       mat.diffuseColor=B.Color3.FromHexString(hex);
       if("specularColor" in mat)mat.specularColor=B.Color3.FromHexString("#152b3c");
       if(name==="glass"&&"alpha" in mat)mat.alpha=.65;
       // Small procedural tile textures: original pixel pattern, no game asset downloads.
       if(B.DynamicTexture&&name!=="glass"){
         const tex=new B.DynamicTexture(name+"-pixels",{width:32,height:32},this.scene,false);
         const ctx=tex.getContext();
         const base=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
         let seed=0;for(const letter of name)seed=(Math.imul(seed,31)+letter.charCodeAt(0))>>>0;
         for(let y=0;y<32;y+=4)for(let x=0;x<32;x+=4){
           seed=(Math.imul(seed,1664525)+1013904223)>>>0;
           const change=((seed>>>24)%9-4)*6;
           const rgb=base.map(c=>Math.max(0,Math.min(255,c+change)));
           ctx.fillStyle="rgb("+rgb.join(",")+")";ctx.fillRect(x,y,4,4);
         }
         tex.update();
         mat.diffuseTexture=tex;
         mat.diffuseColor=B.Color3.FromHexString("#ffffff");
       }
       this.materials.set(name,mat);
     }
     this.world.eachVisible(block=>this._add(block.x,block.y,block.z,block.type));
     this.unsub=this.world.on("change",({x,y,z})=>this.updateAround(x,y,z));
     this.active=true;
     this._resize=()=>this.engine?.resize();
     if(typeof window!=="undefined")window.addEventListener("resize",this._resize);
     this.engine.runRenderLoop(()=>{
       const now=typeof performance!=="undefined"?performance.now():Date.now();
       const dt=this.last?Math.max(0,Math.min(.05,(now-this.last)/1000)):0;
       this.last=now;
       if(dt&&!this.paused)this._frame(dt);
       this.scene.render();
     });
     return this;
   }
   _key(x,y,z){return x+","+y+","+z;}
   _add(x,y,z,type){
     const key=this._key(x,y,z);
     if(this.meshes.has(key))return;
     const mesh=this.B.MeshBuilder.CreateBox("block-"+key,{size:1},this.scene);
     mesh.position=new this.B.Vector3(x,y,z);
     mesh.material=this.materials.get(type);
     mesh.metadata={voxel:{x,y,z,type}};
     this.meshes.set(key,mesh);
   }
   _remove(key){const mesh=this.meshes.get(key);if(mesh){mesh.dispose();this.meshes.delete(key);}}
   updateAround(x,y,z){
     for(const [dx,dy,dz] of [[0,0,0],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
       const a=x+dx,b=y+dy,c=z+dz,key=this._key(a,b,c);
       const type=this.world.blocks.get(key)||null;
       if(type&&this.world.visible(a,b,c)){
         if(!this.meshes.has(key))this._add(a,b,c,type);
         else this.meshes.get(key).material=this.materials.get(type);
       }else this._remove(key);
     }
   }
   _frame(dt){
     const forward=(this.keys.has("KeyW")||this.keys.has("ArrowUp")?1:0)-
       (this.keys.has("KeyS")||this.keys.has("ArrowDown")?1:0);
     const strafe=(this.keys.has("KeyD")||this.keys.has("ArrowRight")?1:0)-
       (this.keys.has("KeyA")||this.keys.has("ArrowLeft")?1:0);
     const norm=Math.hypot(forward,strafe)||1,yaw=this.camera.rotation.y;
     const dx=(forward*Math.sin(yaw)+strafe*Math.cos(yaw))/norm;
     const dz=(forward*Math.cos(yaw)-strafe*Math.sin(yaw))/norm;
     this.world.setInput(dx,dz);this.world.step(dt);
     const p=this.world.player;
     this.camera.position.set(p.x,p.y,p.z);
     if(this.onFrame)this.onFrame(this.world,dt);
   }
   aim(){
     let hit=null;
     if(this.scene?.pickWithRay&&this.camera?.getForwardRay)
       hit=this.scene.pickWithRay(this.camera.getForwardRay(10),mesh=>!!mesh.metadata?.voxel);
     if(!hit?.hit||!hit.pickedMesh?.metadata?.voxel)return null;
     return {block:hit.pickedMesh.metadata.voxel,normal:hit.getNormal?.(true)||null};
   }
   mine(){
     const hit=this.aim();
     return hit?this.world.remove(hit.block.x,hit.block.y,hit.block.z):false;
   }
   place(type){
     const hit=this.aim();
     if(!hit||!hit.normal)return false;
     const {x,y,z}=hit.block,n=hit.normal;
     const axis=Math.max(Math.abs(n.x),Math.abs(n.y),Math.abs(n.z));
     if(axis<.5)return false;
     const dx=Math.abs(n.x)===axis?Math.sign(n.x):0;
     const dy=Math.abs(n.y)===axis?Math.sign(n.y):0;
     const dz=Math.abs(n.z)===axis?Math.sign(n.z):0;
     return this.world.place(x+dx,y+dy,z+dz,type);
   }
   keydown(key){this.keys.add(key);}
   keyup(key){this.keys.delete(key);}
   jump(){return this.world.jump();}
   stop(){
     this.keys.clear();if(this.unsub)this.unsub();this.unsub=null;
     if(typeof window!=="undefined"&&this._resize)window.removeEventListener("resize",this._resize);
     if(this.engine)this.engine.stopRenderLoop();
     if(this.scene)this.scene.dispose();
     if(this.engine)this.engine.dispose();
     this.meshes.clear();this.materials.clear();this.scene=null;this.engine=null;this.active=false;
   }
 }
 return {VoxelBabylonAdapter,COLORS};
});