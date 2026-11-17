"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path");
const assert=require("node:assert/strict");
const base="http://127.0.0.1:18766";
async function ready(){
 for(let i=0;i<90;i++){
  try{const r=await fetch(base+"/blockhaven.html");if(r.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw new Error("Voxel QA server didn't start");
}
async function run(){
 const out=path.resolve("artifacts");fs.mkdirSync(out,{recursive:true});
 const server=spawn("python3",["-m","http.server","18766","--bind","127.0.0.1"],
   {cwd:path.resolve(__dirname,".."),stdio:"ignore"});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
  const page=await browser.newPage({viewport:{width:1365,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/blockhaven.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.HiroBlockhavenSnapshot?.()?.blocks>200,null,{timeout:90000});
  const before=await page.evaluate(()=>window.HiroBlockhavenSnapshot());
  assert.ok(before.blocks>200);
  await page.screenshot({path:path.join(out,"blockhaven-desktop.png"),fullPage:true});
  await page.getByRole("button",{name:/Enter Blockhaven/}).click();
  await page.keyboard.down("KeyW");await page.waitForTimeout(1200);await page.keyboard.up("KeyW");
  const after=await page.evaluate(()=>window.HiroBlockhavenSnapshot());
  assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.1,"W should walk in voxel world");
  await page.screenshot({path:path.join(out,"blockhaven-game-desktop.png"),fullPage:true});
  await page.getByRole("button",{name:"Save world"}).click();
  assert.equal(await page.evaluate(()=>!!localStorage.getItem("hiroglifx-blockhaven-v1")),true);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(650);
  assert.equal(await page.locator(".mobile").isVisible(),true);
  await page.waitForFunction(()=>!!window.HiroBlockhavenSnapshot?.()?.target,null,{timeout:10000});
  const beforeMine=await page.evaluate(()=>window.HiroBlockhavenSnapshot().edits);
  await page.locator("#mobileMine").click();
  await page.waitForFunction(previous=>window.HiroBlockhavenSnapshot?.()?.edits>previous,beforeMine,{timeout:5000});
  await page.screenshot({path:path.join(out,"blockhaven-mobile.png"),fullPage:true});
  assert.deepEqual(errors,[],"No uncaught browser errors");
  console.log("Blockhaven Chromium QA passed");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
run().catch(e=>{console.error(e);process.exitCode=1;});