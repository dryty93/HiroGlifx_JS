/* HiroGlifx Skybound third-person Babylon.js renderer.
 * Renders canonical ObbyWorld tiles and Skybound dynamic modifiers.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroObbyBabylon=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const COLORS={solid:"#67b9ff",checkpoint:"#22d3a6",lava:"#ff466e",finish:"#facc15"};
 const STAGES={1:"#60a5fa",2:"#fb7185",3:"#a78bfa",4:"#38bdf8",5:"#fbbf24"};
 class ObbyBabylonAdapter{
   constructor({BABYLON,canvas,world}){
     if(!BABYLON?.Engine||!BABYLON?.MeshBuilder||!canvas||!world)
       throw new Error("Babylon engine, canvas and ObbyWorld required");
     if(!world.player)throw new Error("Create player before rendering");
     this.B=BABYLON;this.canvas=canvas;this.world=world;
     this.engine=null;this.scene=null;this.meshes=new Map();
     this.last=0;this.active=false;this.paused=false;
     this.decorations=[];this.limbs=[];this.camerapos=null;this._resize=null;
   }
   start(){
     if(this.active)throw new Error("Renderer already active");
     const B=this.B;
     const engine=new B.Engine(this.canvas,true,{antialias:true,preserveDrawingBuffer:true,stencil:true});
     this.engine=engine;
     if(typeof engine.setHardwareScalingLevel==="function")engine.setHardwareScalingLevel(Math.min(2,Math.max(1,(typeof devicePixelRatio!=="undefined"?devicePixelRatio:1))));
     this.scene=new B.Scene(engine);
     this.scene.clearColor=B.Color4.FromHexString("#3b65aaff");
     if(typeof B.Scene.FOGMODE_EXP2==="number"){
       this.scene.fogMode=B.Scene.FOGMODE_EXP2;
       this.scene.fogDensity=.007;
       this.scene.fogColor=B.Color3.FromHexString("#5175b5");
     }
     this.camera=new B.ArcRotateCamera("follow",Math.PI*1.08,Math.PI/3.05,19,new B.Vector3(0,0,0),this.scene);
     if(typeof this.camera.lowerRadiusLimit!=="undefined")this.camera.lowerRadiusLimit=11;
     if(typeof this.camera.upperRadiusLimit!=="undefined")this.camera.upperRadiusLimit=27;
     if(typeof this.camera.attachControl==="function")this.camera.attachControl(this.canvas,true);
     // Babylon arrow-key camera input must not compete with HiroGlifx player controls.
     if(typeof this.camera.inputs?.removeByType==="function")
       this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
     const sun=new B.HemisphericLight("sun",new B.Vector3(-.6,1,.35),this.scene);
     sun.intensity=1.15;
     if(typeof B.DirectionalLight==="function"){
       const key=new B.DirectionalLight("warm-sun",new B.Vector3(-.5,-1,.3),this.scene);
       key.intensity=.8;
     }
     const material=(name,hex,{glow=false}={})=>{
       const mat=new B.StandardMaterial(name+"-mat",this.scene);
       mat.diffuseColor=B.Color3.FromHexString(hex);
       if(glow&&"emissiveColor" in mat)mat.emissiveColor=B.Color3.FromHexString(hex);
       if("specularColor" in mat)mat.specularColor=B.Color3.FromHexString("#475569");
       return mat;
     };
     const create=(name,x,y,z,w,h,d,color,{glow=false}={})=>{
       const mesh=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);
       mesh.position=new B.Vector3(x,y,z);mesh.material=material(name,color,{glow});
       this.meshes.set(name,mesh);return mesh;
     };
     for(const tile of this.world.tiles.values()){
       const color=tile.kind==="solid" ? (STAGES[tile.stage]||COLORS.solid) : COLORS[tile.kind];
       const mesh=create(tile.id,tile.x,tile.y,tile.z,tile.size,tile.height,tile.size,color,{glow:tile.kind!=="solid"});
       if(typeof mesh.enableEdgesRendering==="function"){
         mesh.enableEdgesRendering();
         mesh.edgesWidth=1.25;
         if(B.Color4)mesh.edgesColor=B.Color4.FromHexString("#e0f2feaa");
       }
     }
     const p=this.world.player;
     this.avatar=create("player",p.x,p.y,p.z,.76,p.height,.66,"#8b5cf6");
     this.head=create("head",p.x,p.y+.95,p.z,.65,.65,.65,"#fcd9a8");
     if(typeof B.MeshBuilder.CreateSphere==="function"){
       // Stylized low-poly avatar details, only when full Babylon primitives are present.
       const limbs=[
         ["left-arm",-.53,-.12,0,.20,.74,.24,"#b59dff"],
         ["right-arm",.53,-.12,0,.20,.74,.24,"#b59dff"],
         ["left-leg",-.22,-.88,0,.25,.60,.28,"#3e3b99"],
         ["right-leg",.22,-.88,0,.25,.60,.28,"#3e3b99"]
       ];
       for(const [name,dx,dy,dz,w,h,d,color] of limbs){
         const mesh=create(name,p.x+dx,p.y+dy,p.z+dz,w,h,d,color);
         this.limbs.push({mesh,dx,dy,dz});
       }
       // A few low-poly clouds create the floating-world depth without image assets.
       const cloudMaterial=material("soft-cloud","#e5f5ff");
       if("emissiveColor" in cloudMaterial)cloudMaterial.emissiveColor=B.Color3.FromHexString("#516a95");
       if("alpha" in cloudMaterial)cloudMaterial.alpha=.72;
       for(let n=0;n<13;n++){
         const x=n*7-12,z=(n%2===0?-12:13)+(n%3-1)*2,y=-5+(n%4)*1.9;
         for(let k=0;k<3;k++){
           const cloud=B.MeshBuilder.CreateSphere("cloud-"+n+"-"+k,{diameter:4.5+(k%2)*1.8,segments:8},this.scene);
           cloud.position=new B.Vector3(x+k*2.4,y+(k===1 ? .5 : 0),z+(k-1)*.7);
           cloud.scaling.y=.32;
           cloud.material=cloudMaterial;
           cloud.isPickable=false;
           this.decorations.push(cloud);
         }
       }
       // Sunny beacon at the end of the course; does not participate in physics.
       const sun=B.MeshBuilder.CreateSphere("sky-sun",{diameter:13,segments:12},this.scene);
       sun.position=new B.Vector3(100,45,-62);
       sun.material=material("sky-sun","#ffe6a4",{glow:true});
       sun.isPickable=false;this.decorations.push(sun);
     }
     this.active=true;
     this._resize=()=>{if(this.engine)this.engine.resize();};
     if(typeof window!=="undefined")window.addEventListener("resize",this._resize);
     engine.runRenderLoop(()=>{
       const now=(typeof performance!=="undefined"?performance.now():Date.now());
       const dt=this.last?Math.min(.05,Math.max(0,(now-this.last)/1000)):0;
       this.last=now;
       if(!this.paused&&dt)this.world.step(dt);
       this.sync(dt);
       this.scene.render();
     });
     return this;
   }
   sync(dt=.016){
     if(!this.scene)return;
     const p=this.world.player;
     this.avatar.position.set(p.x,p.y,p.z);
     this.head.position.set(p.x,p.y+.95,p.z);
     for(const tile of this.world.tiles.values()){
       const mesh=this.meshes.get(tile.id);
       if(!mesh)continue;
       mesh.position.set(tile.x,tile.y,tile.z);
       if(typeof mesh.setEnabled==="function")mesh.setEnabled(tile.active!==false);
       if(tile.kind==="lava"&&mesh.rotation)mesh.rotation.y=(this.world.motionTime||0)*1.25;
     }
     for(const {mesh,dx,dy,dz} of this.limbs){
       // Small jump lift/swing makes the simple avatar feel less rigid.
       const jumping=!p.grounded;
       mesh.position.set(p.x+dx,p.y+dy+(jumping ? .09 : 0),p.z+dz);
       if(mesh.rotation)mesh.rotation.z=jumping?(dx<0 ? .13 : -.13):0;
     }
     const B=this.B;
     const goal=new B.Vector3(p.x+3,p.y+1.05,p.z);
     if(this.camerapos===null)this.camerapos=goal;
     else if(typeof B.Vector3.Lerp==="function")
       this.camerapos=B.Vector3.Lerp(this.camerapos,goal,Math.min(1,Math.max(0,dt)*6));
     else this.camerapos=goal;
     this.camera.setTarget(this.camerapos);
   }
   stop(){
     if(typeof window!=="undefined"&&this._resize)window.removeEventListener("resize",this._resize);
     if(this.engine)this.engine.stopRenderLoop();
     if(this.scene)this.scene.dispose();
     if(this.engine)this.engine.dispose();
     this.active=false;this.scene=null;this.engine=null;this.last=0;this._resize=null;
     this.meshes.clear();this.decorations=[];this.limbs=[];
   }
 }
 return {ObbyBabylonAdapter};
});