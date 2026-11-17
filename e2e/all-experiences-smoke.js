"use strict";
const {chromium}=require("playwright");
const {spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const base="http://127.0.0.1:18799",root=path.resolve(__dirname,"..");
const groups=["foundation","navigation","hero","visual","story","conversion","utility"];
async function ready(){for(let i=0;i<120;i++){try{if((await fetch(base+"/showcase")).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error("showcase server unavailable");}
async function main(){
 const server=spawn(process.execPath,[path.join(root,"hiro.js"),"showcase","18799"],{stdio:"pipe"});
 let browser;
 try{
  await ready();browser=await chromium.launch({headless:true});
  const output=path.join(root,"artifacts");fs.mkdirSync(output,{recursive:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:880}});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   const response=await page.goto(base+"/showcase",{waitUntil:"domcontentloaded"});
   assert.equal(response.status(),200);
   await page.getByRole("heading",{name:"Every component. One living gallery."}).waitFor();
   assert.equal(await page.locator("main").count(),1,"no duplicate main landmarks");
   const library=fs.readFileSync(path.join(root,"examples/native-ui-library/main.scroll"),"utf8");
   const names=[...library.matchAll(/^\.([A-Za-z_]\w*)\s*=\s*\(/gm)].map(m=>m[1]);
   assert.equal(names.length,66);
   const componentCounts=await page.evaluate(()=>[...document.querySelectorAll("[data-hiro-component]")].reduce((acc,el)=>{acc[el.dataset.hiroComponent]=(acc[el.dataset.hiroComponent]||0)+1;return acc;},{}));
   for(const name of names)assert(componentCounts[name]>=1,"missing live "+name);
   assert.equal(await page.locator(".hg-showcase-demo").count(),66);
   assert.equal(await page.locator(".hg-showcase-code").count(),66);
   for(const slug of groups){
    const area=page.locator("#hg-showcase-"+slug);
    await area.waitFor();await area.scrollIntoViewIfNeeded();
    for(let y=0;y<await area.evaluate(el=>el.scrollHeight);y+=530){
     await area.evaluate((el,offset)=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY+offset),y);
     await page.waitForTimeout(18);
    }
    await area.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
    const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,view:innerWidth}));
    assert(overflow.body<=overflow.view+2,"horizontal overflow "+slug+" "+width+" "+JSON.stringify(overflow));
    await area.screenshot({path:path.join(output,"showcase-"+slug+"-"+width+".png"),animations:"disabled",timeout:30000});
   }
   const sectionNav=page.getByRole("link",{name:"Immersive hero experiences"});
   await sectionNav.click();assert.equal(new URL(page.url()).hash,"#hg-showcase-hero");
   const carousel=page.locator('[data-hiro-component="ShowcaseCarousel"]');
   await carousel.getByRole("button",{name:"Next experience"}).click();
   assert.equal(await carousel.locator(".hg-track").evaluate(el=>el.style.getPropertyValue("--hg-slide")),"1");
   const accordion=page.locator('[data-hiro-component="FAQItem"]');
   await accordion.getByRole("button").click();assert.equal(await accordion.getByRole("button").getAttribute("aria-expanded"),"true");
   const slider=page.getByRole("slider",{name:"Before and after comparison"});
   await slider.evaluate(el=>{el.value="72";el.dispatchEvent(new Event("input",{bubbles:true}));});
   await page.waitForFunction(()=>[...document.querySelectorAll(".hg-compare")].some(el=>el.style.getPropertyValue("--hg-wipe")==="72"));
   await slider.focus();await page.keyboard.press("ArrowRight");
   await page.waitForFunction(()=>[...document.querySelectorAll(".hg-compare")].some(el=>el.style.getPropertyValue("--hg-wipe")==="73"));
   const pricing=page.locator('[data-hiro-component="PricingPanel"]');
   await pricing.getByRole("button",{name:"Switch monthly / yearly"}).click();
   assert.equal(await pricing.getByText("$19").isVisible(),true);
   const modal=page.locator('[data-hiro-component="Modal"]');
   await modal.getByRole("button",{name:/Modal — a native/}).click();
   await modal.getByRole("dialog").waitFor();
   await modal.getByRole("button",{name:"Close dialog"}).click();
   assert.equal(await modal.getByRole("dialog").count(),0);
   assert.deepEqual(errors,[],"browser errors");
   await page.close();
  }
  console.log("All 66 HiroGlifx native classes rendered, interactive and photographed at mobile and desktop widths.");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
