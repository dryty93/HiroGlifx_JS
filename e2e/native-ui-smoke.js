"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const {execFileSync}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),base="http://127.0.0.1:18777";
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error("UI dev server unavailable");}
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-native-e2e-"));
 fs.cpSync(path.join(root,"examples/native-ui"),dir,{recursive:true});
 execFileSync(process.execPath,[path.join(root,"hiro.js"),"package","add",dir,path.join(root,"examples/native-ui-library")]);
 const server=spawn(process.execPath,[path.join(root,"hiro.js"),"dev",dir,"18777"],{stdio:"pipe"});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true});
  const artifacts=path.join(root,"artifacts");fs.mkdirSync(artifacts,{recursive:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   for(const [route,title] of [["/","Interfaces that feel"],["/dashboard","Your command center"],["/form","Join the next generation"],["/experiences","The web should make you feel something"],["/studio","Designed to be experienced"]]){
    await page.goto(base+route,{waitUntil:"domcontentloaded"});
    await page.getByText(title,{exact:false}).waitFor();
    assert.equal(await page.locator("h1").count(),1);
    assert.equal(await page.getByRole("main").count(),1,"one semantic main landmark");
    const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll("body *")].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+4||r.left< -4);}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,id:el.id,right:Math.round(el.getBoundingClientRect().right)}))}));
    assert.equal(overflow.body<=overflow.viewport+2,true,"horizontal overflow "+route+" "+width+" "+JSON.stringify(overflow));
    if(route==="/experiences"||route==="/studio"){
     for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=650){
      await page.evaluate(scrollY=>window.scrollTo(0,scrollY),y);
      await page.waitForTimeout(28);
     }
     await page.evaluate(()=>window.scrollTo(0,0));
     await page.waitForTimeout(150);
    }
    await page.screenshot({path:path.join(artifacts,"native-ui-"+(route==="/"?"landing":route.slice(1))+"-"+width+".png"),fullPage:true});
    if(route==="/experiences"){
     assert(await page.locator("[data-hg-motion=reveal].hg-in-view").count()>0,"viewport reveal");
     const tilt=page.locator('[data-hg-motion="tilt"]');
     await tilt.hover({position:{x:24,y:30}});
     assert.notEqual(await tilt.evaluate(el=>el.style.getPropertyValue("--hg-tilt-x")),"","native 3D tilt updates on pointer move");
     const spotlight=page.locator('[data-hg-motion="spotlight"]').first();
     await spotlight.hover({position:{x:35,y:40}});
     assert.notEqual(await spotlight.evaluate(el=>el.style.getPropertyValue("--hg-pointer-x")),"","native pointer spotlight updates");
     const carousel=page.locator(".hg-track");
     assert.equal(await carousel.evaluate(el=>el.style.getPropertyValue("--hg-slide")),"0");
     await page.getByRole("button",{name:"Next experience"}).click();
     assert.equal(await carousel.evaluate(el=>el.style.getPropertyValue("--hg-slide")),"1");
     await page.getByRole("button",{name:"Next experience"}).click();
     await page.getByRole("button",{name:"Next experience"}).click();
     assert.equal(await carousel.evaluate(el=>el.style.getPropertyValue("--hg-slide")),"0");
    }
    if(route==="/studio"){
     const faq=page.getByRole("button",{name:"Is the motion really native?"});
     assert.equal(await faq.getAttribute("aria-expanded"),"false");
     await faq.click();
     assert.equal(await faq.getAttribute("aria-expanded"),"true");
     const pricing=page.locator(".hg-pricing");
     assert.equal(await pricing.getByText("$24").isVisible(),true);
     await pricing.getByRole("button",{name:"Switch monthly / yearly"}).click();
     assert.equal(await pricing.getByText("$19").isVisible(),true);
     assert.equal(await pricing.getByText("$24").isVisible(),false);
     assert.equal(await page.locator("img.hg-image").count(),1);
     await page.waitForFunction(()=>[...document.querySelectorAll("img.hg-image")].every(el=>el.complete&&el.naturalWidth>0));
    }
    if(route==="/dashboard"){
     const button=page.getByRole("button",{name:"Clicked 0 times"});await button.click();
     await page.getByRole("button",{name:"Clicked 1 times"}).waitFor();
     await page.getByRole("button",{name:"Polymorphic UI details"}).click();
     await page.getByRole("dialog",{name:"Polymorphic UI details"}).waitFor();
     await page.getByRole("button",{name:"Close dialog"}).click();
     assert.equal(await page.getByRole("dialog").count(),0);
     await page.getByRole("button",{name:"Switch theme"}).click();
     assert.equal(await page.locator("html").getAttribute("data-hg-theme"),"light");
    }
    if(route==="/form"){
     await page.getByRole("textbox",{name:"Your name"}).fill("Taylor");
     await page.getByRole("textbox",{name:"Email address"}).fill("taylor@example.com");
     await page.getByRole("button",{name:"Request early access"}).click();
     await page.getByRole("status").getByText(/Thanks Taylor/).waitFor();
    }
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log("Native UI desktop/mobile: cinematic, bento, reveal, carousel, FAQ, pricing, images, click and submit");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
