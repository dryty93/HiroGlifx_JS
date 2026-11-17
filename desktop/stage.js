"use strict";
/* Offline desktop packaging. Uses exact pinned npm package binaries and rejects
 * all remote game scripts. Does not run Electron, sign binaries, or upload to Steam.
 */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");

const SOURCE_ROOT=path.resolve(__dirname,".."),DEST=path.resolve(__dirname,"dist-web");
const LOCAL_GAME_FILES=Object.freeze([
 "riftfall.html","riftfall-ui.css",
 "assets/hero-rig.gltf",
 "examples/steam-rpg-combat.scroll","examples/riftfall-content.scroll","examples/riftfall-levels.scroll",
 "runtime/scroll-game-runtime.js","runtime/scroll-world-rules.js",
 "runtime/game-physics.js","runtime/game-assets.js","runtime/game-combat.js",
 "runtime/game-ai.js","runtime/game-navmesh.js","runtime/riftfall-world.js","runtime/steam-rpg-demo.js",
 "runtime/game-progression.js","runtime/game-content.js","runtime/game-save.js",
 "runtime/game-audio.js","runtime/game-fx.js","runtime/riftfall-campaign.js","runtime/riftfall-ui.js"
]);
const VENDORS=Object.freeze([
 ["babylonjs","babylon.js","vendor/babylon.js"],
 ["babylonjs-loaders","babylonjs.loaders.min.js","vendor/babylonjs.loaders.min.js"],
 ["@babylonjs/havok","lib/umd/HavokPhysics_umd.js","vendor/HavokPhysics_umd.js"],
 ["@babylonjs/havok","lib/umd/HavokPhysics.wasm","vendor/HavokPhysics.wasm"]
]);
const SCRIPT_MAP=new Map([
 ["https://cdn.babylonjs.com/babylon.js","./vendor/babylon.js"],
 ["https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js","./vendor/babylonjs.loaders.min.js"],
 ["https://cdn.babylonjs.com/havok/HavokPhysics_umd.js","./vendor/HavokPhysics_umd.js"]
]);
const NO_RECAST='https://cdn.jsdelivr.net/npm/recast-detour@1.6.4/recast.js';
const CSP="default-src 'self' data: blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' data: blob:; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
function mustFile(file){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error("Missing required local dependency: "+file);
 return file;
}
function copyFile(source,dest){
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(mustFile(source),dest);
}
function hash(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");}
function replaceGamePage(page){
 // The source HTML owns all inline game JS. Move it into an external local script
 // so the offline window can enforce script-src 'self' with no unsafe-inline.
 let count=0;
 const script=/\n<script>\s*([\s\S]*?)\s*<\/script>(?=\s*<\/body>)/i;
 page=page.replace(script,(_match,code)=>{count++;
   fs.writeFileSync(path.join(DEST,"vendor","riftfall-app.js"),code+"\n","utf8");
   return '\n<script src="./vendor/riftfall-app.js"></script>';
 });
 if(count!==1)throw Error("Expected exactly one Riftfall inline game script");
 for(const [remote,local] of SCRIPT_MAP){
   const original='<script src="'+remote+'"></script>';
   if(!page.includes(original))throw Error("Missing expected remote script: "+remote);
   page=page.replace(original,'<script src="'+local+'"></script>');
 }
 // Recast is optional, and its unverified CDN URL is intentionally not bundled:
 // the code displays the explicit A* GRID fallback.
 const re='<script src="'+NO_RECAST+'"></script>';
 if(!page.includes(re))throw Error("Missing expected Recast script marker");
 page=page.replace(re,'');
 const meta='<meta http-equiv="Content-Security-Policy" content="'+CSP+'">';
 page=page.replace('<meta charset="utf-8">','<meta charset="utf-8">'+meta);
 if(!page.includes('Content-Security-Policy'))throw Error("CSP not applied");
 if(/<script\b[^>]*src=["']https?:\/\//i.test(page))throw Error("Remote executable script in offline bundle");
 if(/<script(?:\s[^>]*)?>[\s\S]*?\S[\s\S]*?<\/script>/i.test(page))
   throw Error("Inline scripts are forbidden in staged desktop app");
 return page;
}
function generate({root=SOURCE_ROOT,target=DEST,vendorRoot=path.join(__dirname,"node_modules")}={}){
 if(path.resolve(target)===path.resolve(root)||!path.resolve(target).startsWith(path.resolve(__dirname)+path.sep))
   throw Error("Unsafe desktop staging destination");
 // Default paths intentionally keep stage in desktop/dist-web.
 if(path.resolve(target)!==DEST)throw Error("Custom staging target not supported");
 const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,"package.json"),"utf8"));
 for(const [name] of VENDORS){
   const meta=JSON.parse(fs.readFileSync(mustFile(path.join(vendorRoot,name,"package.json")),"utf8"));
   const declared=pkg.dependencies[name];
   if(meta.version!==declared)throw Error("Vendor version mismatch: "+name+" expected "+declared+" got "+meta.version);
 }
 fs.rmSync(target,{recursive:true,force:true});
 fs.mkdirSync(path.join(target,"vendor"),{recursive:true});
 for(const rel of LOCAL_GAME_FILES)copyFile(path.join(root,rel),path.join(target,rel));
 for(const [name,source,dest] of VENDORS){
   copyFile(path.join(vendorRoot,name,source),path.join(target,dest));
 }
 const html=path.join(target,"riftfall.html");
 fs.writeFileSync(html,replaceGamePage(fs.readFileSync(html,"utf8")),"utf8");
 const notices=["# Riftfall desktop — third party components","",
   "This experimental local build vendors these exact dependency versions:",
   ...Object.entries(pkg.dependencies).map(([name,version])=>"- "+name+" "+version),
   "",
   "Babylon.js and babylonjs-loaders are Apache-2.0 licensed.",
   "@babylonjs/havok is MIT licensed. Consult the original packages and licenses.",
   "Electron runtime and electron-builder are build dependencies; review their bundled notices.",
   "The original Riftfall art and HiroGlifx game code are included from the repository.",
   "This is not code-signed, notarized, licensed for external asset packs, or Steam-certified."
 ].join("\n");
 fs.writeFileSync(path.join(target,"THIRD_PARTY_NOTICES.md"),notices+"\n");
 // Copy any available actual license texts, not just a human summary.
 for(const name of ["babylonjs","babylonjs-loaders","@babylonjs/havok"]){
   const choices=["LICENSE","LICENSE.md","LICENSE.txt"];
   const candidate=choices.map(f=>path.join(vendorRoot,name,f)).find(fs.existsSync);
   if(candidate)copyFile(candidate,path.join(target,"licenses",name.replace("/","-")+".txt"));
 }
 const entries=[];
 function walk(directory){
   for(const item of fs.readdirSync(directory,{withFileTypes:true})){
     const filepath=path.join(directory,item.name);
     if(item.isDirectory())walk(filepath);
     else if(item.isFile()){
       const relative=path.relative(target,filepath).split(path.sep).join("/");
       if(relative!=="stage-manifest.json")
         entries.push({path:relative,sha256:hash(filepath),bytes:fs.statSync(filepath).size});
     }
   }
 }
 walk(target);entries.sort((a,b)=>a.path.localeCompare(b.path));
 fs.writeFileSync(path.join(target,"stage-manifest.json"),
   JSON.stringify({schema:1,entry:"riftfall.html",version:pkg.version,
     offline:true,recastBundled:false,dependencies:pkg.dependencies,files:entries},null,2)+"\n");
 return {target,files:entries.length,offline:true,recastBundled:false};
}
if(require.main===module){
 try{const status=generate();console.log("Riftfall offline stage complete:",JSON.stringify(status));}
 catch(error){console.error("Riftfall staging failed:",error.message);process.exitCode=1;}
}
module.exports={generate,replaceGamePage,LOCAL_GAME_FILES,VENDORS,CSP,hash};
