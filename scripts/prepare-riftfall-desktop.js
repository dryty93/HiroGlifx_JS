#!/usr/bin/env node
"use strict";
/* Offline desktop staging. Never downloads third-party code or claims Steam certification. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const external=Object.freeze({
 "https://cdn.babylonjs.com/babylon.js":"vendor/babylon.js",
 "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js":"vendor/babylonjs.loaders.min.js",
 "https://cdn.babylonjs.com/havok/HavokPhysics_umd.js":"vendor/HavokPhysics_umd.js",
 "https://cdn.jsdelivr.net/npm/recast-detour@1.6.4/recast.js":"vendor/recast.js"
});
const requiredProjectFiles=[
 "riftfall.html","riftfall-ui.css","assets/hero-rig.gltf",
 "examples/steam-rpg-combat.scroll","examples/riftfall-content.scroll",
 "examples/riftfall-levels.scroll","examples/riftfall-chapters.scroll",
 "runtime/scroll-game-runtime.js","runtime/scroll-world-rules.js",
 "runtime/game-physics.js","runtime/game-assets.js","runtime/game-combat.js",
 "runtime/game-ai.js","runtime/game-navmesh.js","runtime/game-region-stream.js",
 "runtime/riftfall-world.js","runtime/steam-rpg-demo.js","runtime/game-progression.js",
 "runtime/game-content.js","runtime/game-save.js","runtime/game-audio.js",
 "runtime/game-fx.js","runtime/game-chapters.js","runtime/game-physics-stream.js",
 "runtime/game-performance.js","runtime/riftfall-campaign.js",
 "runtime/riftfall-ui.js"
];
const vendorFiles=[...Object.values(external),"vendor/HavokPhysics.wasm"];
function hash(buffer){return crypto.createHash("sha256").update(buffer).digest("hex");}
function stage({root=path.resolve(__dirname,".."),vendorRoot=path.join(root,"vendor"),
 output=path.join(root,"dist","riftfall")}={}){
 root=path.resolve(root);vendorRoot=path.resolve(vendorRoot);output=path.resolve(output);
 if(output===root||output===vendorRoot||path.basename(output)!=="riftfall"||
    !output.startsWith(root+path.sep))throw Error("Unsafe desktop output directory");
 const missing=requiredProjectFiles.filter(file=>!fs.existsSync(path.join(root,file)));
 const absent=vendorFiles.filter(file=>!fs.existsSync(path.join(vendorRoot,path.basename(file))));
 if(!fs.existsSync(path.join(vendorRoot,"vendor-lock.json")))absent.push("vendor/vendor-lock.json");
 if(missing.length||absent.length)throw Error(
   "Offline package blocked. Missing project files: "+(missing.join(", ")||"none")+
   "; missing vetted vendor assets: "+(absent.join(", ")||"none"));
 const lock=JSON.parse(fs.readFileSync(path.join(vendorRoot,"vendor-lock.json"),"utf8"));
 if(lock.source!=="pinned-npm"||!lock.files||typeof lock.files!=="object")throw Error("Invalid vendor lock metadata");
 for(const file of vendorFiles){
   const basename=path.basename(file),entry=lock.files[basename],bytes=fs.readFileSync(path.join(vendorRoot,basename));
   if(!entry||entry.sha256!==hash(bytes)||entry.bytes!==bytes.length)throw Error("Vendor checksum mismatch: "+basename);
   if(basename.endsWith(".wasm")&&!WebAssembly.validate(bytes))throw Error("Vendor WASM failed validation: "+basename);
 }
 if(fs.existsSync(output))fs.rmSync(output,{recursive:true,force:true});
 fs.mkdirSync(output,{recursive:true});
 const manifest={kind:"hiroglifx-riftfall-offline-preview",files:{}};
 for(const file of requiredProjectFiles){
   const bytes=fs.readFileSync(path.join(root,file)),destination=path.join(output,file);
   fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
   manifest.files[file]=hash(bytes);
 }
 for(const file of [...vendorFiles,"vendor/vendor-lock.json"]){
   const bytes=fs.readFileSync(path.join(vendorRoot,path.basename(file))),destination=path.join(output,file);
   fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
   manifest.files[file]=hash(bytes);
 }
 const htmlPath=path.join(output,"riftfall.html");
 let html=fs.readFileSync(htmlPath,"utf8");
 for(const [remote,local] of Object.entries(external)){
   if(!html.includes(remote))throw Error("Expected CDN reference is missing: "+remote);
   html=html.replace(remote,"./"+local);
 }
 if(/<script[^>]+src=["']https?:\/\//i.test(html))throw Error("Remote scripts remain in offline release");
 fs.writeFileSync(htmlPath,html);manifest.files["riftfall.html"]=hash(Buffer.from(html));
 fs.writeFileSync(path.join(output,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
 return {output,files:Object.keys(manifest.files).length,manifest};
}
if(require.main===module){
 const argv=process.argv.slice(2),root=path.resolve(__dirname,"..");
 const vendorIdx=argv.indexOf("--vendor-root");
 try{
   const built=stage({root,vendorRoot:vendorIdx>=0?path.resolve(argv[vendorIdx+1]):path.join(root,"vendor")});
   process.stdout.write("Staged local desktop preview: "+built.output+" ("+built.files+" files)\n");
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={stage,external,requiredProjectFiles,vendorFiles};
