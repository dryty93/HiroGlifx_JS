#!/usr/bin/env node
"use strict";
/* Stage an UNSIGNED installer project; no signing or publishing code. */
const fs=require("node:fs"),path=require("node:path");
function buildApp({root=path.resolve(__dirname,".."),out=path.join(root,"dist","riftfall-desktop-app")}={}){
 root=path.resolve(root);out=path.resolve(out);
 if(!out.startsWith(path.join(root,"dist")+path.sep)||out===root)throw Error("Unsafe installer staging directory");
 const source=path.join(root,"dist","riftfall");
 if(!fs.existsSync(path.join(source,"manifest.json")))throw Error("Offline Riftfall bundle not built");
 fs.rmSync(out,{recursive:true,force:true});
 fs.mkdirSync(path.join(out,"desktop"),{recursive:true});
 fs.cpSync(source,path.join(out,"dist","riftfall"),{recursive:true});
 for(const file of ["main.cjs","server.cjs"])
  fs.copyFileSync(path.join(root,"desktop",file),path.join(out,"desktop",file));
 const pkg={name:"hiroglifx-riftfall-desktop",version:"0.1.0",private:true,
   description:"Unsigned desktop test build of original HiroGlifx Riftfall",
   main:"desktop/main.cjs",license:"UNLICENSED",devDependencies:{electron:"43.8.10"}};
 fs.writeFileSync(path.join(out,"package.json"),JSON.stringify(pkg,null,2)+"\n");
 return {out,assets:path.join(out,"dist","riftfall")};
}
if(require.main===module){
 try{const {out}=buildApp();console.log("Unsigned desktop application staged at "+out);}
 catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={buildApp};
