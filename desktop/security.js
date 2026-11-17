"use strict";
/* Pure path and origin guards used by Electron's custom hiro-game: protocol. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const ORIGIN="hiro-game://app";
const GAME_PATH="/riftfall.html";
const MIME={
 ".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",
 ".js":"text/javascript; charset=utf-8",".gltf":"model/gltf+json",
 ".glb":"model/gltf-binary",".wasm":"application/wasm",
 ".scroll":"text/plain; charset=utf-8",".md":"text/plain; charset=utf-8",
 ".json":"application/json; charset=utf-8",".png":"image/png",".svg":"image/svg+xml"
};
function resolveBundleUrl(requestUrl,root){
 if(typeof requestUrl!=="string")throw Error("Invalid desktop resource URL");
 const url=new URL(requestUrl);
 if(url.protocol!=="hiro-game:"||url.hostname!=="app"||url.username||url.password||url.port||url.search||url.hash)
   throw Error("Blocked external or malformed resource URL");
 const pathname=url.pathname;
 if(/%(?:2f|5c|00)/i.test(pathname)||pathname.includes("\\")||pathname.includes("//"))
   throw Error("Unsafe encoded path");
 let decoded;
 try{decoded=decodeURIComponent(pathname);}catch{throw Error("Invalid path encoding");}
 const rel=decoded.replace(/^\/+/,"");
 if(rel.split("/").includes("..")||rel.split("/").includes(".")||!rel)
   throw Error("Disallowed resource path");
 const base=path.resolve(root),file=path.resolve(base,rel);
 if(!file.startsWith(base+path.sep))throw Error("Resource escapes desktop bundle");
 const ext=path.extname(file).toLowerCase();
 if(!Object.hasOwn(MIME,ext))throw Error("Resource type not permitted "+ext);
 return {file,mime:MIME[ext],relative:rel};
}
function allowedNavigation(url){
 try{const parsed=new URL(url);return parsed.origin===ORIGIN&&parsed.pathname===GAME_PATH;}
 catch{return false;}
}
function validateManifest(root){
 const file=path.join(root,"stage-manifest.json");
 const doc=JSON.parse(fs.readFileSync(file,"utf8"));
 if(doc.schema!==1||doc.offline!==true||doc.entry!=="riftfall.html"||!Array.isArray(doc.files)||doc.files.length<15)
   throw Error("Invalid offline manifest");
 for(const entry of doc.files){
   if(!/^[a-zA-Z0-9_./-]+$/.test(entry.path)||entry.path.includes("..")||!/^[a-f0-9]{64}$/.test(entry.sha256))
     throw Error("Unsafe manifest entry");
   const r=resolveBundleUrl(ORIGIN+"/"+entry.path,root);
   const data=fs.readFileSync(r.file);
   const actual=crypto.createHash("sha256").update(data).digest("hex");
   if(actual!==entry.sha256)throw Error("Desktop asset hash mismatch: "+entry.path);
 }
 return doc;
}
module.exports={ORIGIN,GAME_PATH,resolveBundleUrl,allowedNavigation,validateManifest,MIME};
