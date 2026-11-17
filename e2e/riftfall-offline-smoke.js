"use strict";
const {chromium}=require("playwright");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {createServer}=require("../desktop/server.cjs");
async function run(){
 const root=path.resolve(__dirname,"../dist/riftfall");
 assert.ok(fs.existsSync(path.join(root,"manifest.json")),"Run vendor and desktop staging first");
 const server=createServer(root);
 let browser=null;
 try{
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-features=WebAssemblySimd"]});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const external=[],errors=[],vendor=[];
  await page.route("**/*",route=>{
   const url=route.request().url();
   if(!url.startsWith(origin+"/")){external.push(url);return route.abort("blockedbyclient");}
   if(url.includes("/vendor/"))vendor.push(url);
   return route.continue();
  });
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(origin+"/riftfall.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>/Ready\.|Initialization failed/.test(document.querySelector("#status")?.textContent||""),null,{timeout:90000});
  assert.match(await page.locator("#status").innerText(),/Ready\./,"True offline Havok and assets must initialize");
  const first=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
  assert.equal(first.physics,"havok");
  assert.match(first.asset,/glTF avatar \+ animations loaded/);
  assert.ok(first.physicalRegions?.colliders>0);
  assert.ok(first.physicalRegions?.colliders<11);
  assert.equal(first.enemies,3);
  await page.locator("#start").click();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyW");
  const after=await page.evaluate(()=>window.HiroRiftfallSnapshot?.());
  assert.ok(after.performance.metrics.sampleCount>=20);
  assert.ok(after.performance.metrics.frameP95>0);
  assert.ok(after.performance.metrics.frameP99<300,"Software-rendered browser regression exceeded 300ms p99");
  assert.ok(after.physicalRegions.colliders>0&&after.physicalRegions.colliders<=11);
  assert.ok(after.visualRegions.count<=2);
  assert.ok(vendor.some(x=>x.endsWith("/babylon.js")));
  assert.ok(vendor.some(x=>x.endsWith("/HavokPhysics_umd.js")));
  assert.deepEqual(external,[],"Offline runtime must never fetch a remote resource");
  assert.deepEqual(errors,[],"Offline gameplay must not raise uncaught exceptions");
  fs.mkdirSync(path.resolve("artifacts"),{recursive:true});
  await page.screenshot({path:path.resolve("artifacts/riftfall-offline-desktop.png"),fullPage:true});
  console.log(JSON.stringify({offline:true,vendorRequests:vendor.length,performance:after.performance,physics:after.physicalRegions,navigation:after.navMode}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
