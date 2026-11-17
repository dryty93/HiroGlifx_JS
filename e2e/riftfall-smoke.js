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
   const content=await page.evaluate(()=>window.HiroRiftfallContentSnapshot?.());
   assert.equal(content.builderItems,9);
   assert.equal(content.questDetails.length,4);
   assert.equal(content.inventory.equipment[0].id,"training-sword");
   await page.locator("#inventoryButton").click();
   assert.equal(await page.locator("#rpgModal").isVisible(),true);
   assert.match(await page.locator("#rpgEntries").innerText(),/Healing Potion/);
   await page.screenshot({path:path.join(out,"riftfall-inventory-desktop.png"),fullPage:true});
   await page.getByRole("button",{name:"Close"}).click();
   await page.locator("#questsButton").click();
   assert.match(await page.locator("#rpgEntries").innerText(),/Clear the approach/);
   await page.screenshot({path:path.join(out,"riftfall-quests-desktop.png"),fullPage:true});
   await page.getByRole("button",{name:"Close"}).click();
   await page.locator("#talkButton").click();
   assert.match(await page.locator("#rpgDescription").innerText(),/rift is growing/);
   await page.getByRole("button",{name:"Close"}).click();
   await page.locator("#contentSourceTab").click();
   assert.match(await page.locator("#source").innerText(),/rift-guardian/);
   await page.locator("#combatSourceTab").click();
   await page.locator("#saveButton").click();
   assert.equal(await page.evaluate(()=>Boolean(localStorage.getItem("hiroglifx-riftfall-save-quick"))),true);
   await page.locator("#loadButton").click();
   await page.screenshot({path:path.join(out,"riftfall-intro-desktop.png"),fullPage:true});
   await page.getByRole("button",{name:/Enter the arena/}).click();
   await page.screenshot({path:path.join(out,"riftfall-rigged-game.png"),fullPage:true});
   const raidersBefore=await page.evaluate(()=>window.HiroRiftfallSnapshot()?.raiders);
   await page.waitForFunction(previous=>{
     const now=window.HiroRiftfallSnapshot?.()?.raiders;
     return Array.isArray(now)&&now.some((a,i)=>a.repaths>0&&
       Math.hypot(a.x-previous[i].x,a.z-previous[i].z)>.08);
   },raidersBefore,{timeout:8500});
   const beforeMove=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
   await page.keyboard.down("KeyW");
   try{
     await page.waitForFunction(previous=>{
       const now=window.HiroRiftfallSnapshot?.();
       return now&&now.z<previous-.05;
     },beforeMove.z,{timeout:6000,polling:75});
   }catch(error){
     const debug=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
     console.log("Riftfall movement diagnostic",JSON.stringify({beforeMove,debug}));
     throw error;
   }finally{await page.keyboard.up("KeyW");}
   const after=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
   assert.ok(after.z<beforeMove.z-.05,"Physics-backed controller should move toward enemies");
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
