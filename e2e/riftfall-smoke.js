"use strict";
const {chromium}=require("playwright"),{spawn}=require("node:child_process"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base="http://127.0.0.1:18769";
async function waitForServer(){
 for(let i=0;i<100;i++){try{const r=await fetch(base+"/riftfall.html");if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,120));}
 throw Error("Riftfall server never started");
}
async function run(){
 const out=path.resolve("artifacts");fs.mkdirSync(out,{recursive:true});
 const server=spawn("python3",["-m","http.server","18769","--bind","127.0.0.1"],
   {cwd:path.resolve(__dirname,".."),stdio:"ignore"});
 let browser;
 try{
   await waitForServer();
   browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-features=WebAssemblySimd"]});
   const page=await browser.newPage({viewport:{width:1380,height:920}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/riftfall.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>{
     const status=document.querySelector("#status")?.textContent||"";
     return status.includes("Ready.")||status.includes("Initialization failed");
   },null,{timeout:85000});
   const status=await page.locator("#status").innerText();
   assert.match(status,/Ready\./,"Havok and glTF should initialize: "+status);
   const snapshot=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
   assert.equal(snapshot?.physics,"havok");
   assert.equal(snapshot?.enemies,3);
   assert.match(snapshot.asset,/glTF avatar \+ animations loaded/,"Original glTF and all six animation groups should load");
   await page.screenshot({path:path.join(out,"riftfall-intro-desktop.png"),fullPage:true});
   await page.getByRole("button",{name:/Enter the arena/}).click();
   const raidersBefore=await page.evaluate(()=>window.HiroRiftfallSnapshot()?.raiders);
   await page.waitForFunction(previous=>{
     const now=window.HiroRiftfallSnapshot?.()?.raiders;
     return Array.isArray(now)&&now.some((a,i)=>a.repaths>0&&
       Math.hypot(a.x-previous[i].x,a.z-previous[i].z)>.08);
   },raidersBefore,{timeout:8500});
   await page.keyboard.down("KeyW");
   await page.waitForTimeout(550);
   await page.keyboard.up("KeyW");
   const after=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
   assert.ok(after.z<snapshot.z-.05,"Physics-backed controller should move toward enemies");
   await page.keyboard.press("Space");await page.keyboard.press("KeyJ");
   await page.waitForTimeout(350);
   await page.screenshot({path:path.join(out,"riftfall-game-desktop.png"),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   assert.equal(await page.locator(".touch").isVisible(),true);
   await page.screenshot({path:path.join(out,"riftfall-mobile.png"),fullPage:true});
   assert.deepEqual(errors,[],"Browser should have no uncaught errors");
   console.log("Riftfall Havok, glTF animation, movement, combat input and mobile passed");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
