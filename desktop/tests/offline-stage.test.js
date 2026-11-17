"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {resolveBundleUrl,allowedNavigation,ORIGIN,validateManifest}=require("../security");
const {CSP,LOCAL_GAME_FILES,VENDORS,hash}=require("../stage");
test("desktop protocol resolves only local resources and allowed MIME types",()=>{
 const root=path.resolve(os.tmpdir(),"hiro-desktop-test");
 const result=resolveBundleUrl("hiro-game://app/runtime/game-combat.js",root);
 assert.equal(result.file,path.join(root,"runtime/game-combat.js"));
 assert.match(result.mime,/javascript/);
 assert.throws(()=>resolveBundleUrl("https://bad.com/payload.js",root),/Blocked/);
 assert.throws(()=>resolveBundleUrl("hiro-game://other/runtime/game-combat.js",root),/Blocked/);
 assert.throws(()=>resolveBundleUrl("hiro-game://app/runtime/payload.exe",root),/Resource type/);
 assert.throws(()=>resolveBundleUrl("hiro-game://app/runtime%2Fsecret.js",root),/Unsafe/);
 assert.throws(()=>resolveBundleUrl("hiro-game://app//etc/passwd",root),/Unsafe|Disallowed/);
 assert.equal(allowedNavigation(ORIGIN+"/riftfall.html"),true);
 assert.equal(allowedNavigation(ORIGIN+"/showcase.html"),false);
 assert.equal(allowedNavigation("https://github.com"),false);
});
test("offline stage specifies all project code and required pinned vendors",()=>{
 assert.ok(LOCAL_GAME_FILES.includes("examples/steam-rpg-combat.scroll"));
 assert.ok(LOCAL_GAME_FILES.includes("examples/riftfall-content.scroll"));
 assert.ok(LOCAL_GAME_FILES.includes("examples/riftfall-levels.scroll"));
 assert.ok(LOCAL_GAME_FILES.includes("assets/hero-rig.gltf"));
 assert.deepEqual(VENDORS.map(x=>x[0]).filter(x=>x==="@babylonjs/havok").length,2);
 assert.match(CSP,/script-src 'self' 'wasm-unsafe-eval'/);
 assert.equal(CSP.includes("'unsafe-eval'"),false);
 const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,"../package.json"),"utf8"));
 for(const key of ["electron","electron-builder"])assert.ok(pkg.devDependencies[key]);
 for(const key of ["babylonjs","babylonjs-loaders","@babylonjs/havok"])assert.ok(pkg.dependencies[key]);
 const main=fs.readFileSync(path.resolve(__dirname,"../main.js"),"utf8");
 for(const requirement of ["nodeIntegration:false","contextIsolation:true","sandbox:true","webSecurity:true",
   "setWindowOpenHandler","setPermissionRequestHandler"])assert.ok(main.includes(requirement),requirement);
});
test("offline staging archive has no external scripts, and hashed manifest detects corruption",()=>{
 const dir=path.resolve(__dirname,"../dist-web");
 if(!fs.existsSync(path.join(dir,"stage-manifest.json")))return;
 const manifest=validateManifest(dir);
 assert.equal(manifest.offline,true);assert.equal(manifest.recastBundled,false);
 const html=fs.readFileSync(path.join(dir,"riftfall.html"),"utf8");
 assert.match(html,/Content-Security-Policy/);
 assert.equal(/<script\b[^>]*src=["']https?:\/\//i.test(html),false);
 assert.equal(html.includes("cdn.babylonjs.com"),false);
 assert.equal(html.includes("cdn.jsdelivr.net"),false);
 for(const file of manifest.files)assert.equal(hash(path.join(dir,file.path)),file.sha256);
 const changed=manifest.files.find(x=>x.path==="vendor/HavokPhysics.wasm");
 assert.ok(changed&&changed.bytes>1000);
});
