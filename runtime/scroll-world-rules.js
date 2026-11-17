/* HiroGlifx native 3D gameplay policy host.
 * Game-specific rules are written in .scroll; JS supplies audited physics/world services.
 */
(function(root,factory){
 const base=typeof module==="object"&&module.exports?require("./scroll-game-runtime"):root.HiroScrollGame;
 const api=factory(base);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroWorldRules=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(base){
 "use strict";
 const HOST=/^world_[A-Za-z_][A-Za-z0-9_]*$/;
 class WorldRules extends base.ScrollGame{
   constructor(source,{name="world-rules",services={}}={}){
     super(source,{name});
     this.services=new Map();
     for(const [key,fn] of Object.entries(services)){
       if(!HOST.test(key)||typeof fn!=="function")throw new Error("World service must be a namespaced function");
       this.services.set(key,fn);
     }
   }
   functionBuiltin(name,args,budget,mode){
     if(this.services?.has(name)){
       if(mode==="draw")throw new Error("World services may not be invoked during draw");
       return this.services.get(name)(...args);
     }
     if(name.startsWith("world_"))throw new Error("Unregistered world service "+name);
     return super.functionBuiltin(name,args,budget,mode);
   }
   run(name,...args){
     if(!this.program.methods.has(name))throw new Error("Undefined HiroGlifx game rule "+name);
     return this.invoke(name,args,{n:250000,loops:100000},"input");
   }
 }
 return {WorldRules};
});