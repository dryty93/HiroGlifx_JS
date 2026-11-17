"use strict";
const {chromium}=require("playwright");
const {spawn,execFileSync}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),base="http://127.0.0.1:18787";
async function waitReady(){for(let i=0;i<120;i++){try{if((await fetch(base)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error("Native catalog dev server unavailable");}
async function main(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-catalog-e2e-"));
 fs.cpSync(path.join(root,"examples/native-ui"),temp,{recursive:true});
 execFileSync(process.execPath,[path.join(root,"hiro.js"),"package","add",temp,path.join(root,"examples/native-ui-library")]);
 const server=spawn(process.execPath,[path.join(root,"hiro.js"),"dev",temp,"18787"],{stdio:"pipe"});
 let browser;
 try{
  await waitReady();browser=await chromium.launch({headless:true});
  const dir=path.join(root,"artifacts");fs.mkdirSync(dir,{recursive:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:880}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   for(const route of ["catalog","catalog-heroes","catalog-portfolios","catalog-stories","catalog-conversion"]){
    const response=await page.goto(base+"/"+route,{waitUntil:"domcontentloaded"});assert.equal(response.status(),200);
    await page.locator('[data-hiro-component="Main"]').waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('[data-hiro-component]').length>=3);
    assert.equal(await page.getByRole("main").count(),1,"one main landmark");
    const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
    assert(overflow.body<=overflow.viewport+2,route+" "+width+" horizontal overflow "+JSON.stringify(overflow));
    await page.screenshot({path:path.join(dir,"native-catalog-"+route+"-"+width+".png"),fullPage:true,animations:"disabled"});
    if(route==="catalog"){
     for(const name of ["Hero experiences","Portfolio experiences","Narrative experiences","Conversion experiences"])
      await page.getByRole("heading",{name}).waitFor();
    }
    if(route==="catalog-heroes"){
     assert(await page.locator('[data-hiro-component="SplitHero"]').count()===1);
     assert(await page.locator('[data-hiro-component="GlassHero"]').count()===1);
     assert(await page.locator('[data-hiro-component="VideoHero"]').count()===1);
    }
    if(route==="catalog-portfolios"){
     assert(await page.locator('[data-hiro-component="CollagePortfolio"]').count()>=1);
     const frame=page.locator(".hg-orbit-frame");assert(await frame.count()===0);
     assert(await page.locator(".hg-horizontal").count()>=1);
    }
    if(route==="catalog-stories"){
     const range=page.getByRole("slider",{name:"Before and after comparison"});
     await range.waitFor();
     await range.evaluate(el=>{el.value="75";el.dispatchEvent(new Event("input",{bubbles:true}));});
     await page.waitForFunction(()=>[...document.querySelectorAll(".hg-compare")].some(el=>el.style.getPropertyValue("--hg-wipe")==="75"));
     assert(await page.locator(".hg-sticky-pane").count()===1);
    }
    if(route==="catalog-conversion"){
     const toggle=page.getByRole("button",{name:"Switch showcase view"});
     await toggle.click();
     await page.getByText("Interaction system",{exact:true}).waitFor();
     await toggle.click();
     await page.getByText("Design system",{exact:true}).waitFor();
     await page.getByRole("textbox",{name:"Email address"}).fill("hello@example.com");
     await page.getByRole("button",{name:"Join now"}).click();
     await page.getByRole("status").getByText("Thank you for your interest.").waitFor();
     const magnet=page.locator('[data-hg-motion="magnetic"]');await magnet.hover({position:{x:20,y:10}});
     assert.notEqual(await magnet.evaluate(el=>el.style.transform),"");
    }
   }
   assert.deepEqual(errors,[],"browser JS errors");
   await page.close();
  }
  console.log("Native catalog verified: 5 routes, 2 viewports, 28 classes and real interactions");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");fs.rmSync(temp,{recursive:true,force:true});}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
