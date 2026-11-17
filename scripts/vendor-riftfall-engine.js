#!/usr/bin/env node
"use strict";
/* Deterministic vendor-copy from installed, pinned npm packages. No CDN dependency in game. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const VERSION=Object.freeze({"babylonjs":"9.37.0","babylonjs-loaders":"9.37.0","@babylonjs/havok":"1.3.14","recast-detour":"1.6.4"});
const MAP=Object.freeze({
 "babylon.js":["babylonjs","babylon.js"],
 "babylonjs.loaders.min.js":["babylonjs-loaders","babylonjs.loaders.min.js"],
 "HavokPhysics_umd.js":["@babylonjs/havok","lib/umd/HavokPhysics_umd.js"],
 "HavokPhysics.wasm":["@babylonjs/havok","lib/umd/HavokPhysics.wasm"],
 "recast.js":["recast-detour","recast.js"]
});
function sha(buffer){return crypto.createHash("sha256").update(buffer).digest("hex");}
function packageDir(root,name){return path.join(root,"node_modules",...name.split("/"));}
function vendor({root=path.resolve(__dirname,".."),output=path.join(root,"vendor"),installedRoot=root}={}){
 root=path.resolve(root);output=path.resolve(output);installedRoot=path.resolve(installedRoot);
 if(output===root||!output.startsWith(root+path.sep))throw Error("Unsafe vendor directory");
 const staged=[],meta={source:"pinned-npm",packages:VERSION,files:{}};
 for(const [dest,[name,relative]] of Object.entries(MAP)){
  const folder=packageDir(installedRoot,name),pjson=path.join(folder,"package.json");
  if(!fs.existsSync(pjson))throw Error("Missing installed dependency "+name);
  const pkg=JSON.parse(fs.readFileSync(pjson,"utf8"));
  if(pkg.version!==VERSION[name])throw Error("Version mismatch for "+name+": "+pkg.version);
  const source=path.join(folder,relative);
  if(!fs.existsSync(source))throw Error("Missing distribution file "+source);
  const bytes=fs.readFileSync(source);
  if(bytes.length<1024)throw Error("Distribution asset suspiciously small: "+dest);
  if(dest.endsWith(".wasm")){
   if(bytes.subarray(0,4).toString("hex")!=="0061736d")throw Error("Invalid WASM magic: "+dest);
   if(WebAssembly.validate(bytes)===false)throw Error("Invalid WASM module: "+dest);
  }else if(!/Havok|BABYLON|Recast|webpack|function|define\(/i.test(bytes.subarray(0,Math.min(10000,bytes.length)).toString("utf8")))
   throw Error("Suspicious JavaScript vendor asset "+dest);
  staged.push([dest,bytes]);meta.files[dest]={sha256:sha(bytes),bytes:bytes.length,source:name+"@"+pkg.version+"/"+relative};
 }
 fs.mkdirSync(output,{recursive:true});
 for(const [name,bytes] of staged)fs.writeFileSync(path.join(output,name),bytes);
 fs.writeFileSync(path.join(output,"vendor-lock.json"),JSON.stringify(meta,null,2)+"\n");
 return meta;
}
if(require.main===module){
 try{const meta=vendor();console.log("Verified "+Object.keys(meta.files).length+" pinned vendor assets");}
 catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={vendor,MAP,VERSION};
