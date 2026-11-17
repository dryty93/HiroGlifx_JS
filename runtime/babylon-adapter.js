/* HiroGlifx Babylon.js browser scene model + injected engine adapter. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroBabylon=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ID=/^[A-Za-z][\w-]*$/;
 const COLOR=/^#[0-9a-fA-F]{6}$/;
 function num(value,label,min=-1e5,max=1e5){
   const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new Error("Invalid "+label);return n;
 }
 class World3D {
   constructor(){
     this.objects=new Map();
     this.background="#101827";this.camera={x:0,y:6,z:-16};this.light={x:0,y:10,z:-5};
     this.time=0;this.rotations=new Map();
   }
   cube(name,x,y,z,size,hex){
     if(!ID.test(name)||this.objects.has(name))throw new Error("Invalid/duplicate cube id");
     if(!COLOR.test(hex))throw new Error("Cube color must be #RRGGBB");
     this.objects.set(name,{name,x:num(x,"x"),y:num(y,"y"),z:num(z,"z"),size:num(size,"size",0.01,1000),color:hex});
   }
   rotate(name,axis,speed){
     if(!this.objects.has(name))throw new Error("Unknown cube "+name);
     if(!["x","y","z"].includes(axis))throw new Error("Invalid axis");
     this.rotations.set(name,{axis,speed:num(speed,"rotation speed",-100,100)});
   }
   seek(ms){this.time=num(ms,"time",0,600000);}
 }
 function compile3D(source){
   const model=new World3D();
   String(source).split(/\r?\n/).forEach((raw,index)=>{
     const line=raw.trim().replace(/;$/,"");
     if(!line||line.startsWith("#")||line.startsWith("//"))return;
     const [verb,...args]=line.split(/\s+/);
     try{
       if(verb==="world"){
         if(args.length!==2||args[0]!=="3d"||!COLOR.test(args[1]))throw new Error('world 3d "#RRGGBB"');
         model.background=args[1];
       }else if(verb==="cube"){
         if(args.length!==6)throw new Error("cube id x y z size #RRGGBB");
         model.cube(...args);
       }else if(verb==="camera"||verb==="light"){
         if(args.length!==3)throw new Error(verb+" x y z");
         model[verb]={x:num(args[0],"x"),y:num(args[1],"y"),z:num(args[2],"z")};
       }else if(verb==="rotate"){
         if(args.length!==3)throw new Error("rotate id axis radiansPerSecond");
         model.rotate(...args);
       }else throw new Error("Unknown 3D command: "+verb);
     }catch(e){throw new Error("Line "+(index+1)+": "+e.message);}
   });
   return model;
 }
 class BabylonAdapter{
   constructor({BABYLON,canvas,model}){
     if(!BABYLON||!BABYLON.Engine||!BABYLON.Scene||!BABYLON.MeshBuilder)throw new Error("Babylon.js engine required");
     if(!canvas||!model)throw new Error("Canvas and model required");
     this.B=BABYLON;this.canvas=canvas;this.model=model;this.meshes=new Map();
     this.engine=null;this.scene=null;this.camera=null;
   }
   start(){
     const B=this.B;
     this.engine=new B.Engine(this.canvas,true,{preserveDrawingBuffer:true});
     this.scene=new B.Scene(this.engine);
     this.scene.clearColor=B.Color4.FromHexString(this.model.background+"ff");
     this.camera=new B.ArcRotateCamera("camera",-Math.PI/2,Math.PI/2.8,18,new B.Vector3(0,0,0),this.scene);
     this.camera.setPosition(new B.Vector3(this.model.camera.x,this.model.camera.y,this.model.camera.z));
     this.camera.attachControl(this.canvas,true);
     const light=new B.HemisphericLight("light",new B.Vector3(this.model.light.x,this.model.light.y,this.model.light.z),this.scene);
     light.intensity=1;
     for(const object of this.model.objects.values()){
       const mesh=B.MeshBuilder.CreateBox(object.name,{size:object.size},this.scene);
       mesh.position=new B.Vector3(object.x,object.y,object.z);
       const mat=new B.StandardMaterial(object.name+"-material",this.scene);
       mat.diffuseColor=B.Color3.FromHexString(object.color);
       mesh.material=mat;
       this.meshes.set(object.name,mesh);
     }
     this.engine.runRenderLoop(()=>this.scene.render());
     return this;
   }
   seek(ms){
     this.model.seek(ms);
     for(const [name,behavior] of this.model.rotations){
       const mesh=this.meshes.get(name);
       if(mesh)mesh.rotation[behavior.axis]=behavior.speed*ms/1000;
     }
   }
   stop(){
     if(this.engine)this.engine.stopRenderLoop();
     if(this.scene)this.scene.dispose();
     if(this.engine)this.engine.dispose();
     this.meshes.clear();this.engine=null;this.scene=null;
   }
 }
 return {World3D,compile3D,BabylonAdapter};
});