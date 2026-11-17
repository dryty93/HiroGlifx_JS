"use strict";
const {chromium}=require("playwright"),{spawn}=require("node:child_process");
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const base="http://127.0.0.1:18768",artifacts=path.resolve("artifacts");
async function ready(){
 for(let i=0;i<90;i++){
   try{const r=await fetch(base+"/polymorphism.html");if(r.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw new Error("Polymorphism demo server unavailable");
}
async function main(){
 fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn("python3",["-m","http.server","18768","--bind","127.0.0.1"],
   {cwd:path.resolve(__dirname,".."),stdio:"ignore"});
 let browser;
 try{
   await ready();
   browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
   const page=await browser.newPage({viewport:{width:1380,height:920}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/polymorphism.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.HiroPolySnapshot?.()?.roster===4,null,{timeout:30000});
   let state=await page.evaluate(()=>window.HiroPolySnapshot());
   assert.deepEqual(state.types,["Scout","Brute","Medic","Boss"]);
   assert.equal(state.classCount,6);
   await page.locator("#libraryTab").click();
   await page.waitForFunction(()=>document.querySelector("#code")?.textContent.includes(".Brute = (Enemy)"));
   await page.screenshot({path:path.join(artifacts,"polymorphism-library-desktop.png"),fullPage:true});
   await page.locator("#appTab").click();
   await page.waitForFunction(()=>document.querySelector("#code")?.textContent.includes('import enemykit'));
   await page.screenshot({path:path.join(artifacts,"polymorphism-arena-desktop.png"),fullPage:true});
   await page.locator("#gauntlet").click();
   await page.waitForFunction(()=>window.HiroPolySnapshot?.()?.roster===6,null,{timeout:30000});
   state=await page.evaluate(()=>window.HiroPolySnapshot());
   assert.equal(state.types.every(x=>x==="Phantom"),true);
   await page.screenshot({path:path.join(artifacts,"polymorphism-gauntlet-desktop.png"),fullPage:true});
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:path.join(artifacts,"polymorphism-mobile.png"),fullPage:true});
   assert.deepEqual(errors,[]);
   console.log("Real browser polymorphism app import, subclass overrides and responsive source viewer passed");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
