"use strict";
/** Phase 11: local, declarative .scroll libraries with a verified lockfile.
 * Never fetches or evaluates remote JavaScript.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {parseExtended}=require("./expressive-runtime");
const {parse:parseCanonical}=require("./canonical-runtime");
const NAME=/^[a-z][a-z0-9-]{0,39}$/;
const VERSION=/^\d+\.\d+\.\d+$/;
const IMPORT=/^import\s+([a-z][a-z0-9-]{0,39})\s*;?$/;
function digest(text){return crypto.createHash("sha256").update(text,"utf8").digest("hex");}
function isObject(o){return !!o&&typeof o==="object"&&!Array.isArray(o);}
function safeName(name){
 if(typeof name!=="string"||!NAME.test(name))throw new Error("Invalid package name: "+name);
 return name;
}
function manifestFrom(folder){
 const file=path.join(folder,"hiro-package.json");
 const m=JSON.parse(fs.readFileSync(file,"utf8"));
 if(!isObject(m)||!NAME.test(m.name)||!VERSION.test(m.version)||m.entry!=="main.scroll")
   throw new Error("Invalid package manifest; expected name, x.y.z version and main.scroll entry");
 const extra=Object.keys(m).filter(k=>!["name","version","entry","description"].includes(k));
 if(extra.length)throw new Error("Unknown package manifest keys: "+extra.join(", "));
 return m;
}
function readLocked(project){
 const filename=path.join(project,"hiro.lock.json");
 if(!fs.existsSync(filename))return {lockVersion:1,packages:{}};
 const lock=JSON.parse(fs.readFileSync(filename,"utf8"));
 if(!isObject(lock)||lock.lockVersion!==1||!isObject(lock.packages))
   throw new Error("Invalid hiro.lock.json");
 return lock;
}
function writeAtomic(filename,value){
 const temp=filename+"."+crypto.randomUUID()+".tmp";
 try{
   fs.writeFileSync(temp,JSON.stringify(value,null,2)+"\n",{flag:"wx",mode:0o600});
   fs.renameSync(temp,filename);
 }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function validateLibrary(source,name){
 if(typeof source!=="string"||source.length>100000)throw new Error("Package exceeds 100 KB");
 const lines=source.split(/\r?\n/);
 if(lines.some(line=>/^\s*\.Main\s*=/.test(line)))throw new Error("Packages cannot declare .Main");
 // All executable top-level statements are forbidden; only definitions and imports.
 let block=false, hasDefinition=false;
 for(const raw of lines){
   const line=raw.trim();
   if(!line||line.startsWith("#")||line.startsWith("//"))continue;
   if(!block && /^\.[A-Za-z][\w-]*\s*=\s*\[$/.test(line)){
     block=true;hasDefinition=true;continue;
   }
   if(block){
     if(/^(?:\];?|break;?|end)$/.test(line))block=false;
     continue;
   }
   if(IMPORT.test(line)||/^extends\s+[A-Za-z][\w-]*\s+[A-Za-z][\w-]*\s*;?$/.test(line)
     ||/^ability\s+[A-Za-z][\w-]*\s+[A-Za-z][\w-]*\s*=>\s+.+/.test(line)){
     hasDefinition=true;continue;
   }
   throw new Error("Package "+name+" contains executable top-level command: "+line);
 }
 if(block)throw new Error("Unclosed library component");
 if(!hasDefinition)throw new Error("Package must declare a component or ability");
 // check standalone DSL syntax when no imports; imports are resolved at application compilation.
 if(!lines.some(line=>IMPORT.test(line)))parseExtended(source);
}
function installLocal(project,sourceFolder){
 project=path.resolve(project);sourceFolder=path.resolve(sourceFolder);
 const manifest=manifestFrom(sourceFolder);
 const name=safeName(manifest.name);
 const src=path.join(sourceFolder,manifest.entry);
 if(!fs.lstatSync(src).isFile()||fs.lstatSync(src).isSymbolicLink())
   throw new Error("Package entry must be a regular file");
 const scroll=fs.readFileSync(src,"utf8");
 validateLibrary(scroll,name);
 const installed=path.join(project,"packages",name);
 const lock=readLocked(project);
 if(Object.hasOwn(lock.packages,name)){
   throw new Error("Package already installed; remove it before reinstalling: "+name);
 }
 // No nested files, symlink traversal, network access or arbitrary JS manifests.
 fs.mkdirSync(path.join(project,"packages"),{recursive:true});
 fs.mkdirSync(installed);
 try{
   fs.writeFileSync(path.join(installed,"main.scroll"),scroll,{flag:"wx"});
   fs.writeFileSync(path.join(installed,"hiro-package.json"),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
   lock.packages[name]={version:manifest.version,integrity:"sha256-"+digest(scroll)};
   writeAtomic(path.join(project,"hiro.lock.json"),lock);
 }catch(error){
   fs.rmSync(installed,{recursive:true,force:true});
   throw error;
 }
 return {name,version:manifest.version};
}
function removePackage(project,name){
 name=safeName(name);project=path.resolve(project);
 const lock=readLocked(project);
 if(!Object.hasOwn(lock.packages,name))throw new Error("Package not installed: "+name);
 // Deny removal while any installed package imports it.
 for(const other of Object.keys(lock.packages)){
   if(other===name)continue;
   const content=readPackage(project,other,lock);
   if(scanImports(content).includes(name))throw new Error("Package still needed by "+other);
 }
 delete lock.packages[name];
 writeAtomic(path.join(project,"hiro.lock.json"),lock);
 fs.rmSync(path.join(project,"packages",name),{recursive:true,force:true});
}
function scanImports(source){
 const found=[];
 let block=false;
 for(const raw of source.split(/\r?\n/)){
   const line=raw.trim();
   if(/^\.[A-Za-z][\w-]*\s*=\s*\[$/.test(line)){block=true;continue;}
   if(block){if(/^(?:\];?|break;?|end)$/.test(line))block=false;continue;}
   if(line.startsWith("import ")){
     const matched=line.match(IMPORT);
     if(!matched)throw new Error("Malformed import: "+line);
     found.push(matched[1]);
   }
 }
 return found;
}
function stripImports(source){
 let block=false;
 return source.split(/\r?\n/).map(raw=>{
   const line=raw.trim();
   if(/^\.[A-Za-z][\w-]*\s*=\s*\[$/.test(line)){block=true;return raw;}
   if(block){if(/^(?:\];?|break;?|end)$/.test(line))block=false;return raw;}
   return IMPORT.test(line)?"":raw;
 }).join("\n");
}
function readPackage(project,name,lock){
 safeName(name);
 const entry=lock.packages[name];
 if(!entry||!VERSION.test(entry.version)||!/^sha256-[a-f0-9]{64}$/.test(entry.integrity))
   throw new Error("Missing or invalid lock entry: "+name);
 const folder=path.join(project,"packages",name);
 const manifestFile=path.join(folder,"hiro-package.json"),src=path.join(folder,"main.scroll");
 for(const file of [folder,manifestFile,src]){
   if(fs.lstatSync(file).isSymbolicLink())throw new Error("Package symlinks forbidden");
 }
 const manifest=manifestFrom(folder);
 if(manifest.name!==name||manifest.version!==entry.version)throw new Error("Package version mismatch: "+name);
 const data=fs.readFileSync(src,"utf8");
 if("sha256-"+digest(data)!==entry.integrity)throw new Error("Package integrity mismatch: "+name);
 validateLibrary(data,name);
 return data;
}
function resolveSource(project,source){
 project=path.resolve(project);
 // A canonical expression page is validated directly; legacy libraries are not yet compatible.
 if(/^\.Main\s*=\s*\(\)\s*$/m.test(source)){
   if(/^\s*import\s+/m.test(source))throw new Error("Canonical package imports are not implemented");
   parseCanonical(source);return source;
 }
 const lock=readLocked(project);
 const ordered=[],visited=new Set();
 function visit(name,stack=[]){
   if(stack.includes(name))throw new Error("Import cycle: "+[...stack,name].join(" -> "));
   if(visited.has(name))return;
   const data=readPackage(project,name,lock);
   for(const dep of scanImports(data))visit(dep,[...stack,name]);
   visited.add(name);
   ordered.push(stripImports(data));
 }
 for(const name of scanImports(source))visit(name);
 const resolved=ordered.join("\n")+"\n"+stripImports(source);
 if(resolved.length>250000)throw new Error("Resolved program exceeds 250 KB");
 // Reject collisions in package declarations rather than allowing Map overwrite.
 const names=new Set(),abilities=new Set();
 for(const line of resolved.split(/\r?\n/)){
   let m=line.trim().match(/^\.([A-Za-z][\w-]*)\s*=\s*\[$/);
   if(m){
     if(names.has(m[1]))throw new Error("Duplicate class across imports: "+m[1]);
     names.add(m[1]);
   }
   m=line.trim().match(/^ability\s+([A-Za-z][\w-]*)\s+/);
   if(m){
     if(abilities.has(m[1]))throw new Error("Duplicate ability across imports: "+m[1]);
     abilities.add(m[1]);
   }
 }
 parseExtended(resolved);
 return resolved;
}
module.exports={installLocal,removePackage,readLocked,resolveSource,scanImports,validateLibrary};
