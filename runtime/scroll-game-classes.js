/* Typed, dynamically dispatched HiroGlifx game classes.
 * Inheritance and overrides are declared entirely in .scroll.
 * The host supplies only parsing, safe instance storage, and dynamic dispatch.
 */
(function(root,factory){
 const base=typeof module==="object"&&module.exports?require("./scroll-game-runtime"):root.HiroScrollGame;
 const api=factory(base);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroScrollClasses=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(base){
 "use strict";
 const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
 const BEGIN=/^\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([A-Za-z_][A-Za-z0-9_]*)?\)\s*$/;
 const IMPORT=/^import\s+([a-z][a-z0-9-]*)\s*;?$/;
 const DECL=/^([#$?&])\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/;
 const METHOD=/^:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*=\s*\[$/;
 const TYPES={"#":"number","$":"string","?":"boolean","&":"object"};
 const TYPE_LIMIT=100,DEPTH_LIMIT=20;
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function compile(source,libraries={}){
   if(typeof source!=="string"||source.length>160000)throw new Error("Invalid game source");
   const seen=new Set(),ordered=[],classes=new Map(),parts=[];
   function visit(text,name,stack=[]){
     if(stack.includes(name))throw new Error("Import cycle: "+stack.concat(name).join(" -> "));
     if(seen.has(name))return;
     if(stack.length>15)throw new Error("Too many imports");
     const lines=text.split(/\r?\n/),body=[];
     let block=null,methodDepth=0;
     for(let i=0;i<lines.length;i++){
       const line=lines[i].trim();
       if(!block){
         const imp=line.match(IMPORT);
         if(imp){
           if(!has(libraries,imp[1])||typeof libraries[imp[1]]!=="string")throw new Error("Missing game package: "+imp[1]);
           visit(libraries[imp[1]],imp[1],stack.concat(name));continue;
         }
         const m=line.match(BEGIN);
         if(m&&m[1]!=="Main"){
           if(classes.has(m[1]))throw new Error("Duplicate class: "+m[1]);
           block={name:m[1],parent:m[2]||null,fields:new Map(),methods:new Map()};
           continue;
         }
         body.push(lines[i]);continue;
       }
       if(methodDepth===0 && (line==="break;"||line==="end")){
         classes.set(block.name,block);block=null;continue;
       }
       if(methodDepth===0){
         if(!line||line.startsWith("//"))continue;
         const d=line.match(DECL);
         if(d){
           if(block.fields.has(d[2]))throw new Error("Duplicate class field "+d[2]);
           const parsed=base.expression(d[3]);
           if(parsed.tag!=="literal")throw new Error("Class field defaults must be literals");
           const value=parsed.value;
           if(typeof value!==TYPES[d[1]])throw new Error("Class field type mismatch: "+d[2]);
           block.fields.set(d[2],{type:d[1],value});continue;
         }
         const m=line.match(METHOD);
         if(!m)throw new Error("Invalid class declaration: "+line);
         const args=m[2].trim()?m[2].split(",").map(s=>s.trim()):[];
         if(args[0]!=="self"||!args.every(a=>IDENT.test(a))||new Set(args).size!==args.length)
           throw new Error("Class methods require self as first argument");
         if(block.methods.has(m[1]))throw new Error("Duplicate class method "+m[1]);
         block.methods.set(m[1],{args,lines:[lines[i]],line:i+1});
         methodDepth=1;continue;
       }
       const method=[...block.methods.values()].at(-1);
       method.lines.push(lines[i]);
       if(line==="]"&&--methodDepth===0)continue;
       if(line.endsWith("[")&&line!=="]")methodDepth+=1;
       if(line==="]"&&methodDepth<0)throw new Error("Extra close bracket");
     }
     if(block)throw new Error("Unclosed class "+block.name);
     seen.add(name);
     if(name!=="$main"&&body.some(line=>/^\s*\.Main\s*=/.test(line)))
       throw new Error("Libraries may not declare .Main");
     parts.push(...body);
   }
   visit(source,"$main");
   const resolved=new Map();
   function resolve(name,stack=[]){
     if(resolved.has(name))return resolved.get(name);
     const def=classes.get(name);
     if(!def)throw new Error("Unknown parent class "+name);
     if(stack.includes(name))throw new Error("Inheritance cycle: "+stack.concat(name).join(" -> "));
     if(stack.length>DEPTH_LIMIT)throw new Error("Inheritance depth exceeded");
     const parent=def.parent?resolve(def.parent,stack.concat(name)):null;
     const fields=new Map(parent?.fields||[]),methods=new Map(parent?.methods||[]);
     for(const [field,value] of def.fields){
       if(fields.has(field)&&fields.get(field).type!==value.type)
         throw new Error("Override changes field type: "+name+"."+field);
       fields.set(field,value);
     }
     for(const [method,body] of def.methods)methods.set(method,{owner:name,...body});
     const result={name,fields,methods,parent:def.parent};resolved.set(name,result);
     return result;
   }
   if(classes.size>TYPE_LIMIT)throw new Error("Too many game classes");
   for(const name of classes.keys())resolve(name);
   const main=parts.join("\n");
   if(!/^\s*\.Main\s*=\s*\(\)\s*$/m.test(main))throw new Error("Missing .Main = ()");
   const expanded=[];
   for(const [name,def] of classes)for(const [method,{args,lines}] of def.methods){
     expanded.push(lines[0].replace(/^\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/,": "+name+"__"+method));
     expanded.push(...lines.slice(1));
   }
   const assembled=main.replace(/^\s*break;\s*$/m,expanded.join("\n")+"\nbreak;");
   const program=base.parseProgram(assembled);
   return {program,classes:resolved,source:assembled};
 }
 class PolymorphicGame extends base.ScrollGame{
   constructor(source,{name="polymorphic-game",libraries={}}={}){
     const result=compile(source,libraries);
     super(result.source,{name});
     this.classes=result.classes;
     this.moduleSource=source;
     this.imports=Object.keys(libraries);
   }
   functionBuiltin(name,args,budget,mode){
     if(name==="spawn"){
       if(args.length!==1||typeof args[0]!=="string"||!this.classes.has(args[0]))
         throw new Error("spawn requires declared class");
       const type=this.classes.get(args[0]),fields=Object.create(null);
       for(const [field,def] of type.fields)fields[field]=def.value;
       return {__hiroInstance:true,type:args[0],fields};
     }
     if(name==="field"){
       if(args.length!==2)throw new Error("field(instance,name)");
       const [obj,key]=args;
       this.requireInstance(obj,key);
       return obj.fields[key];
     }
     if(name==="put"){
       if(args.length!==3)throw new Error("put(instance,name,value)");
       const [obj,key,value]=args;
       this.requireInstance(obj,key);
       const classField=this.classes.get(obj.type).fields.get(key);
       if(typeof value!==TYPES[classField.type])throw new Error("Typed field mismatch "+obj.type+"."+key);
       obj.fields[key]=value;return value;
     }
     if(name==="send"){
       if(args.length<2||args.length>12)throw new Error("send(instance,method,...)");
       const [obj,method,...params]=args;
       this.requireInstance(obj);
       if(typeof method!=="string"||!IDENT.test(method))throw new Error("Invalid method");
       const def=this.classes.get(obj.type).methods.get(method);
       if(!def)throw new Error("Undefined "+obj.type+" method "+method);
       return this.invoke(def.owner+"__"+method,[obj,...params],budget,mode);
     }
     if(name==="instanceType"){
       if(args.length!==1)throw new Error("instanceType(instance)");
       this.requireInstance(args[0]);return args[0].type;
     }
     return super.functionBuiltin(name,args,budget,mode);
   }
   requireInstance(obj,key){
     if(!obj||obj.__hiroInstance!==true||!this.classes.has(obj.type))
       throw new Error("Expected HiroGlifx class instance");
     if(key!==undefined&&(!IDENT.test(key)||!has(obj.fields,key)))
       throw new Error("Unknown instance field "+key);
   }
 }
 return {PolymorphicGame,compile};
});