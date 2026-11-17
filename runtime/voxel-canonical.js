/* Canonical HiroGlifx factories and safe methods for the original voxel sandbox. */
(function(root,factory){
 const voxel=typeof module==="object"&&module.exports?require("./voxel-world"):root.HiroVoxel;
 const api=factory(voxel);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroVoxelCanonical=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(voxel){
 "use strict";
 function worldOf(value){
   if(!(value instanceof voxel.VoxelWorld))throw new Error("Expected a voxel world");return value;
 }
 function install(runtime){
   runtime.register("voxel_world",({args})=>{
     if(args.length>1)throw new Error("voxel_world(seed) takes at most one argument");
     return new voxel.VoxelWorld(args.length?args[0]:42);
   });
   runtime.register("voxel_generate",({args})=>{
     if(args.length!==2)throw new Error("voxel_generate(world, radius)");
     return worldOf(args[0]).generate(args[1]);
   });
   runtime.register("voxel_block",({args})=>{
     if(args.length!==5)throw new Error("voxel_block(world, x, y, z, type)");
     return worldOf(args[0]).block(...args.slice(1));
   });
   runtime.register("voxel_player",({args})=>{
     if(args.length!==3)throw new Error("voxel_player(world, x, z)");
     return worldOf(args[0]).spawn(args[1],args[2]);
   });
   runtime.registerMethod("voxel-world","break",({target,args})=>{
     if(args.length!==3)throw new Error("break(x,y,z)");return target.remove(...args);
   });
   runtime.registerMethod("voxel-world","place",({target,args})=>{
     if(args.length!==4)throw new Error("place(x,y,z,type)");return target.place(...args);
   });
   runtime.registerMethod("voxel-world","set",({target,args})=>{
     if(args.length!==2)throw new Error("set(x,z)");return target.setInput(...args);
   });
   runtime.registerMethod("voxel-world","step",({target,args})=>{
     if(args.length!==1)throw new Error("step(seconds)");return target.step(args[0]);
   });
   runtime.registerMethod("voxel-player","jump",({target,args})=>{
     if(args.length)throw new Error("jump takes no arguments");return target.world.jump();
   });
   return runtime;
 }
 return {install};
});