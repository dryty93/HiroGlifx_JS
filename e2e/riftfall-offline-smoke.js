"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base="http://127.0.0.1:18770",out=path.resolve("artifacts");
async function waitForServer(){
 for(let n=0;n<100;n++){
   try{const result=await fetch(base+"/riftfall.html");if(result.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,120));
 }
 throw Error("Offline Riftfall stage not available");
}
async function run(){
 const dir=path.join(__dirname,"../desktop/dist-web");
 if(!fs.existsSync(path.join(dir,"stage-manifest.json")))
   throw Error("Run node desktop/stage.js before offline browser tests");
 fs.mkdirSync(out,{recursive:true});
 const server=spawn("python3",["-m","http.server","18770","--bind","127.0.0.1"],
   {cwd:dir,stdio:"ignore"});
 let browser;
 try{
   await waitForServer();
   browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-features=WebAssemblySimd"]});
   const page=await browser.newPage({viewport:{width:1380,height:900}});
   const external=[],errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.route("**/*",async(route)=>{
     const url=new URL(route.request().url);
     if(url.origin===base)return route.continue();
     external.push(url.toString());return route.abort("blockedbyclient");
   });
   await page.goto(base+"/riftfall.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>{
     const text=document.querySelector("#status")?.textContent||"";
     return text.includes("Ready.")||text.includes("Initialization failed");
   },null,{timeout:90000});
   const status=await page.locator("#status").innerText();
   assert.match(status,/Ready\./,"Offline Riftfall startup must succeed: "+status);
   const snap=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
   assert.equal(snap.physics,"havok");
   assert.equal(snap.navMode,"a-star","Offline build deliberately uses truthful A* fallback");
   assert.match(snap.asset,/glTF avatar \+ animations loaded/);
   assert.equal(snap.enemies,3);
   const content=await page.evaluate(()=>window.HiroRiftfallContentSnapshot?.());
   assert.equal(content?.questDetails?.length,4);
   await page.screenshot({path:path.join(out,"riftfall-offline-intro.png"),fullPage:true});
   await page.getByRole("button",{name:/Enter the arena/}).click();
   const initial=await page.evaluate(()=>window.HiroRiftfallSnapshot?.().z);
   await page.keyboard.down("KeyW");
   try{
     await page.waitForFunction(initialZ=>window.HiroRiftfallSnapshot?.()?.z<initialZ-.08,
       initial,{timeout:7500,polling:100});
   }finally{await page.keyboard.up("KeyW");}
   await page.locator("#inventoryButton").click();
   await page.waitForFunction(()=>document.querySelector("#rpgModal")?.hidden===false);
   assert.match(await page.locator("#rpgEntries").innerText(),/Healing Potion/);
   await page.screenshot({path:path.join(out,"riftfall-offline-inventory.png"),fullPage:true});
   assert.deepEqual(external,[],"The offline desktop stage must not make external HTTP requests");
   assert.deepEqual(errors,[],"Browser must have no unhandled JavaScript errors");
   console.log("Riftfall staged offline play test passed: local Havok, rig, world, movement and inventory");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
