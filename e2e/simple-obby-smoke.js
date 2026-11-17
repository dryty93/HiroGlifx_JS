"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),base="http://127.0.0.1:18783";
async function ready(){
 for(let i=0;i<100;i++){try{if((await fetch(base+"/simple-obby.html")).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}
 throw Error("HiroGlifx simple game server not ready");
}
async function main(){
 const server=spawn(process.execPath,[path.join(root,"hiro.js"),"game","18783"],{cwd:root,stdio:"pipe"});
 let browser;
 try{
  await ready();browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-features=WebAssemblySimd"]});
  const dir=path.join(root,"artifacts");fs.mkdirSync(dir,{recursive:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const response=await page.goto(base+"/simple-obby.html",{waitUntil:"domcontentloaded"});
   assert.equal(response.status(),200);
   try{await page.waitForFunction(()=>{
    const snapshot=window.HiroSimpleObbySnapshot?.();
    const text=document.getElementById("status")?.textContent||"";
    return snapshot?.sceneReady||/could not|couldn't|failed|error/i.test(text);
   },null,{timeout:45000});}catch(error){
    const diagnostic=await page.evaluate(()=>({status:document.getElementById("status")?.textContent,
     snapshot:window.HiroSimpleObbySnapshot?.(),scripts:[...document.scripts].map(x=>x.src).filter(Boolean)}));
    throw Error("Soda Splash startup: "+JSON.stringify({diagnostic,errors})+" "+error.message);
   }
   const snapshot=await page.evaluate(()=>window.HiroSimpleObbySnapshot?.());
   assert(snapshot?.sceneReady,"Babylon 3D scene did not initialize: "+await page.locator("#status").innerText());
   assert.equal(snapshot.title,"Soda Splash");
   assert.equal(snapshot.theme,"soda");
   assert.equal(snapshot.objects,12);
   assert.equal(snapshot.stages,3);
   assert.equal(await page.locator(".stage-card").count(),3);
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.body.scrollWidth}));
   assert(overflow.scroll<=overflow.width+2,"Horizontal overflow "+JSON.stringify(overflow));
   await page.getByRole("button",{name:"Start adventure"}).click();
   await page.waitForFunction(()=>window.HiroSimpleObbySnapshot?.()?.started===true);
   await page.waitForTimeout(180);
   await page.locator("#courseWorkshop").scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(dir,"simple-obby-"+width+".png"),fullPage:true});
   const editor=page.getByRole("textbox",{name:"Game directions"});
   const original=await editor.inputValue();assert.match(original,/platform start at/);
   const revised=original.replace('game "Soda Splash"','game "Soda Remix"').replace("theme soda","theme candy")
     .replace("speed 7","speed 9").replace("platform ice2 at","platform extra at 11 0 2 size 3\nplatform ice2 at");
   await editor.fill(revised);
   await page.getByRole("button",{name:"Build & Play My Game"}).click();
   await page.waitForFunction(()=>window.HiroSimpleObbySnapshot?.()?.title==="Soda Remix",{timeout:100000});
   const modified=await page.evaluate(()=>window.HiroSimpleObbySnapshot?.());
   assert.equal(modified.theme,"candy");
   assert.equal(modified.objects,13);
   assert.equal(modified.speed,9);
   assert.equal(modified.sceneReady,true);
   await page.getByRole("button",{name:"Restore Example"}).click();
   await page.waitForFunction(()=>window.HiroSimpleObbySnapshot?.()?.title==="Soda Splash");
   await editor.fill(original.replace("theme soda","theme unsafe"));
   await page.getByRole("button",{name:"Build & Play My Game"}).click();
   await page.waitForFunction(()=>/Line \\d+: Choose a theme/.test(document.getElementById("compileStatus")?.textContent||""));
   assert.equal((await page.evaluate(()=>window.HiroSimpleObbySnapshot?.())).title,"Soda Splash","invalid course must not replace existing world");
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log("Simple .scroll 3D game: Babylon scene, themes, gameplay editing, invalid input and 2 responsive viewports passed");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
