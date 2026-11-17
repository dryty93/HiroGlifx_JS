/* Installs safe obby factories and game-event methods into CanonicalRuntime. */
(function(root,factory){
 const obby=typeof module==="object"&&module.exports?require("./obby-world"):root.HiroObby;
 const api=factory(obby);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroObbyCanonical=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(obby){
 "use strict";
 const isWorld=w=>w instanceof obby.ObbyWorld;
 const requireWorld=w=>{if(!isWorld(w))throw new Error("Expected an obby world");return w;};
 function install(runtime){
   runtime.register("obby_world",({args})=>{
     if(args.length)throw new Error("obby_world takes no arguments");
     return new obby.ObbyWorld();
   });
   runtime.register("obby_tile",({args})=>{
     if(args.length!==7)throw new Error("obby_tile(world,id,x,y,z,size,type)");
     const [world,...tile]=args;return requireWorld(world).tile(...tile);
   });
   runtime.register("obby_player",({args})=>{
     if(args.length!==5)throw new Error("obby_player(world,id,x,y,z)");
     const [world,...player]=args;const p=requireWorld(world).spawn(...player);
     p.kind="obby-player";p.world=world;return p;
   });
   runtime.register("obby_event",({args})=>{
     if(args.length!==2)throw new Error("obby_event(world,event)");
     const [world,name]=args;requireWorld(world);
     if(!["land","fall","checkpoint","finish","respawn"].includes(name))throw new Error("Unknown obby event");
     const event={kind:"event",world,name,occurrences:0,last:null};
     event.dispose=world.on(name,payload=>{event.occurrences++;event.last=payload;});
     return event;
   });
   runtime.registerMethod("obby-world","step",({target,args})=>target.step(args[0]));
   runtime.registerMethod("obby-world","reset",({target,args})=>{if(args.length)throw new Error("reset takes no arguments");return target.reset();});
   runtime.registerMethod("obby-player","jump",({target,args})=>{if(args.length)throw new Error("jump takes no arguments");return target.world.jump();});
   runtime.registerMethod("obby-player","move",({target,args})=>{
     if(args.length!==2)throw new Error("move requires input x,z");
     return target.world.setInput(args[0],args[1]);
   });
   runtime.registerMethod("event","count",({target,args})=>{
     if(args.length)throw new Error("count takes no arguments");return target.occurrences;
   });
   runtime.registerMethod("event","occurred",({target,args})=>{
     if(args.length)throw new Error("occurred takes no arguments");return target.occurrences>0;
   });
   return runtime;
 }
 return {install};
});