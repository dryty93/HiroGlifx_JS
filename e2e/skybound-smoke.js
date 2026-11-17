"use strict";
/** Real Chromium smoke test for the Skybound browser experience.
 * Run with: npm install --no-save playwright && npx playwright install chromium
 * node e2e/skybound-smoke.js
 */
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path");
const assert=require("node:assert/strict");
const base="http://127.0.0.1:18765";
const captures=path.resolve("artifacts");
async function waitForServer(){
 for(let i=0;i<60;i++){
   try{const r=await fetch(base+"/showcase.html");if(r.ok)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw new Error("Local browser QA server did not start");
}
async function main(){
 fs.mkdirSync(captures,{recursive:true});
 const server=spawn("python3",["-m","http.server","18765","--bind","127.0.0.1"],
   {cwd:path.resolve(__dirname,".."),stdio:"ignore"});
 let browser;
 try{
   await waitForServer();
   browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
   const page=await browser.newPage({viewport:{width:1365,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/showcase.html",{waitUntil:"domcontentloaded"});
   assert.equal(await page.locator(".card").count(),7);
   await page.screenshot({path:path.join(captures,"hiroglifx-showcase-desktop.png"),fullPage:true});
   await page.goto(base+"/skybound.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>{
     const status=document.querySelector("#status")?.textContent||"";
     return status.includes("Skybound is ready")||status.includes("Babylon.js")||status.includes("Could not");
   },null,{timeout:45000});
   const status=await page.locator("#status").innerText();
   assert.match(status,/Skybound is ready/,"Game must load in Chromium: "+status);
   assert.equal(await page.locator("#overlay").isVisible(),true);
   await page.getByRole("button",{name:/Start adventure/}).click();
   assert.equal(await page.locator("#overlay").isVisible(),false);
   const initialX=await page.evaluate(()=>window.HiroSkyboundSnapshot()?.x);
   assert.equal(typeof initialX,"number");
   await page.keyboard.down("KeyW");
   try {
     await page.waitForFunction(startX=>window.HiroSkyboundSnapshot()?.x>startX+.15,
       initialX,{timeout:4000,polling:50});
   } finally {
     await page.keyboard.up("KeyW");
   }
   const forwardX=await page.evaluate(()=>window.HiroSkyboundSnapshot()?.x);
   assert.ok(forwardX>initialX+.15,"W should move the player forward before the first gap");
   await page.keyboard.press("Space");
   await page.waitForTimeout(900);
   assert.notEqual(await page.locator("#timer").textContent(),"0:00.0","Timer should advance during gameplay");
   await page.screenshot({path:path.join(captures,"skybound-game-desktop.png"),fullPage:true});
   await page.getByRole("button",{name:/Restart/}).click();
   await page.waitForTimeout(750);
   assert.equal(await page.locator("#overlay").isVisible(),false);
   await page.setViewportSize({width:390,height:844});
   await page.waitForTimeout(450);
   assert.equal(await page.locator(".mobile-pad").isVisible(),true);
   await page.locator("#jumpButton").click();
   await page.screenshot({path:path.join(captures,"skybound-game-mobile.png"),fullPage:true});
   assert.deepEqual(errors,[],"Browser should have no uncaught page errors");
   console.log("Skybound browser QA passed; saved screenshots in "+captures);
 }finally{
   if(browser)await browser.close();
   server.kill("SIGTERM");
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
