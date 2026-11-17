/* Declarative canonical blueprint classes with single expression methods.
 * A blueprint wraps a trusted target; it does not grant arbitrary JS access.
 */
(function(root,factory){
 const canonical=typeof module==="object"&&module.exports?require("./canonical-runtime"):root.HiroCanonical;
 const api=factory(canonical);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroBlueprints=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(canonical){
 "use strict";
 const ID=/^[A-Za-z_][A-Za-z0-9_]*$/;
 function extract(source){
   const definitions=new Map(),main=[];let current=null;
   for(const [index,raw] of String(source).split(/\r?\n/).entries()){
     const line=raw.trim();
     const start=line.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([A-Za-z_][A-Za-z0-9_]*)?\)\s*$/);
     if(start&&start[1]!=="Main"){
       if(current)throw new Error("Line "+(index+1)+": nested blueprint");
       if(definitions.has(start[1]))throw new Error("Duplicate blueprint "+start[1]);
       current={name:start[1],parent:start[2]||null,fields:new Map(),methods:new Map()};
       continue;
     }
     if(current){
       if(line==="break;"||line==="end"){
         definitions.set(current.name,current);current=null;continue;
       }
       if(!line||line.startsWith("//"))continue;
       let m=line.match(/^([#$?])\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/);
       if(m){
         const ast=canonical.parseExpr(m[3].replace(/;$/,""));
         if(ast.type!=="literal")throw new Error("Blueprint fields must have literal values");
         const type={"#":"number","$":"string","?":"boolean"}[m[1]];
         if(typeof ast.value!==type)throw new Error("Blueprint field type mismatch");
         current.fields.set(m[2],ast.value);continue;
       }
       m=line.match(/^:\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/);
       if(m){
         if(current.methods.has(m[1]))throw new Error("Duplicate blueprint method "+m[1]);
         current.methods.set(m[1],canonical.parseExpr(m[2].replace(/;$/,"")));continue;
       }
       throw new Error("Invalid blueprint declaration on line "+(index+1)+": "+line);
     }
     main.push(raw);
   }
   if(current)throw new Error("Unclosed blueprint "+current.name);
   return {source:main.join("\n"),definitions};
 }
 function install(runtime,source){
   const program=extract(source),resolved=new Map();
   function resolve(name,chain=[]){
     if(resolved.has(name))return resolved.get(name);
     if(chain.includes(name))throw new Error("Blueprint inheritance cycle: "+[...chain,name].join(" -> "));
     const current=program.definitions.get(name);
     if(!current)throw new Error("Unknown blueprint "+name);
     const parent=current.parent?resolve(current.parent,[...chain,name]):null;
     const obj={name,fields:new Map(parent?.fields||[]),methods:new Map(parent?.methods||[])};
     for(const [key,value] of current.fields)obj.fields.set(key,value);
     for(const [key,value] of current.methods)obj.methods.set(key,value);
     resolved.set(name,obj);return obj;
   }
   for(const name of program.definitions.keys())resolve(name);
   runtime.register("bp_create",({args})=>{
     if(args.length!==2||typeof args[0]!=="string"||!ID.test(args[0])||!resolved.has(args[0]))
       throw new Error("bp_create requires known blueprint name and target");
     const def=resolved.get(args[0]);
     return {kind:"blueprint",name:def.name,target:args[1],fields:new Map(def.fields),methods:new Map(def.methods)};
   });
   const common={
     value:({target,args})=>{
       if(args.length!==1||typeof args[0]!=="string"||!target.fields.has(args[0]))
         throw new Error("Unknown blueprint field");
       return target.fields.get(args[0]);
     },
     set:({target,args})=>{
       if(args.length!==2||typeof args[0]!=="string"||!target.fields.has(args[0]))
         throw new Error("Unknown blueprint field");
       const old=target.fields.get(args[0]);
       if(typeof old!==typeof args[1])throw new Error("Blueprint field type mismatch");
       target.fields.set(args[0],args[1]);return target;
     },
     jump:({target,args})=>{
       if(args.length||target.target?.kind!=="obby-player")throw new Error("jump requires player");
       return target.target.world.jump();
     },
     move:({target,args})=>{
       if(args.length!==2||target.target?.kind!=="obby-player")throw new Error("move requires player and x,z");
       return target.target.world.setInput(args[0],args[1]);
     },
     reset:({target,args})=>{
       if(args.length||target.target?.kind!=="obby-player")throw new Error("reset requires player");
       return target.target.world.reset();
     }
   };
   for(const [method,fn] of Object.entries(common))runtime.registerMethod("blueprint",method,fn);
   for(const def of resolved.values()){
     for(const method of def.methods.keys()){
       if(common[method])throw new Error("Blueprint method overrides reserved method: "+method);
       if(!runtime.methods.has("blueprint."+method)){
         runtime.registerMethod("blueprint",method,async({target,args,runtime:rt})=>{
           if(args.length)throw new Error("Blueprint methods take no arguments");
           const ast=target.methods.get(method);
           if(!ast)throw new Error("Method not defined for blueprint "+target.name);
           return rt._evaluate(ast,{self:target});
         });
       }
     }
   }
   return program.source;
 }
 return {extract,install};
});