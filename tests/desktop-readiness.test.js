"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {stage,external,requiredProjectFiles,vendorFiles}=require("../scripts/prepare-riftfall-desktop");
const {createServer}=require("../desktop/server.cjs");
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"riftfall-desktop-"));
 for(const file of requiredProjectFiles){
   const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,file==="riftfall.html"
     ?Object.keys(external).map(url=>'<script src="'+url+'"></script>').join("\n")
     :"// placeholder project asset");
 }
 const vendorRoot=path.join(root,"vendor");fs.mkdirSync(vendorRoot,{recursive:true});
 const crypto=require("node:crypto"),lock={source:"pinned-npm",packages:{},files:{}};
 for(const file of vendorFiles){
   const basename=path.basename(file),bytes=basename.endsWith(".wasm")?
     Buffer.from([0,97,115,109,1,0,0,0]):Buffer.from("BABYLON function Recast Havok".repeat(55));
   fs.writeFileSync(path.join(vendorRoot,basename),bytes);
   lock.files[basename]={sha256:crypto.createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length};
 }
 fs.writeFileSync(path.join(vendorRoot,"vendor-lock.json"),JSON.stringify(lock));
 return {root,vendorRoot};
}
test("offline desktop staging requires all vendored third-party assets",()=>{
 const {root,vendorRoot}=fixture();
 try{
   fs.unlinkSync(path.join(vendorRoot,"HavokPhysics.wasm"));
   assert.throws(()=>stage({root,vendorRoot}),/HavokPhysics.wasm/);
   assert.equal(fs.existsSync(path.join(root,"dist","riftfall")),false);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test("offline manifest hashes local resources and removes CDN script links",()=>{
 const {root,vendorRoot}=fixture();
 try{
   const {output,files,manifest}=stage({root,vendorRoot});
   assert.ok(files>25);
   assert.equal(Object.keys(manifest.files).length,files);
   assert.match(fs.readFileSync(path.join(output,"riftfall.html"),"utf8"),/\.\/vendor\/babylon\.js/);
   assert.doesNotMatch(fs.readFileSync(path.join(output,"riftfall.html"),"utf8"),/https?:\/\//);
   assert.equal(manifest.files["vendor/HavokPhysics.wasm"].length,64);
   assert.throws(()=>stage({root,vendorRoot,output:root}),/Unsafe/);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
test("desktop loopback server serves local assets without allowing path escapes",async()=>{
 const {root,vendorRoot}=fixture(),{output}=stage({root,vendorRoot});
 const server=createServer(output);
 try{
   await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
   const origin="http://127.0.0.1:"+server.address().port;
   const ok=await fetch(origin+"/riftfall.html");
   assert.equal(ok.status,200);
   assert.match(await ok.text(),/vendor\/babylon.js/);
   const blocked=await fetch(origin+"/does-not-exist");
   assert.equal(blocked.status,404);
   const forbidden=await fetch(origin+"/%5c..%5c..%5csecret");
   assert.ok([400,403,404].includes(forbidden.status));
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{force:true,recursive:true});}
});
