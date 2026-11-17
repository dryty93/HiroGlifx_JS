"use strict";
const {chromium}=require("playwright"),{spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),base="http://127.0.0.1:18795";
const curated=["AnnouncementRibbon","MegaNavigation","FullscreenNavigation","BreadcrumbTrail","SidebarWorkspace","CommandPalette","RewardCardPack","IdleMascot","HoverCardStack","SkeletonMorph","ShimmerHeadline","GradientMeshBackground","SuccessBurst","MotionButtonRow","AnimatedPillTabs","ToastNotification","DashboardAnalytics","StarRating"];
async function ready(){for(let i=0;i<125;i++){try{if((await fetch(base+"/raindrop-inspiration")).ok)return;}catch{}await new Promise(r=>setTimeout(r,90));}throw Error("Raindrop gallery unavailable");}
async function main(){
 const server=spawn(process.execPath,[path.join(root,"hiro.js"),"showcase","18795"],{stdio:"pipe",cwd:root});
 let browser;
 try{
  await ready();browser=await chromium.launch({headless:true});
  const dir=path.join(root,"artifacts");fs.mkdirSync(dir,{recursive:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const response=await page.goto(base+"/raindrop-inspiration",{waitUntil:"domcontentloaded"});
   assert.equal(response.status(),200);
   await page.getByRole("heading",{name:/Every beautiful interaction deserves/}).waitFor();
   assert.equal(await page.getByRole("main").count(),1);
   for(const name of curated)assert.equal(await page.locator('[data-hiro-component="'+name+'"]').count(),1,"missing "+name);
   const overflow=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
   assert(overflow.body<=overflow.viewport+2,"horizontal overflow "+JSON.stringify(overflow));
   for(let y=0,total=await page.evaluate(()=>document.body.scrollHeight);y<total;y+=580){
    await page.evaluate(value=>scrollTo(0,value),y);await page.waitForTimeout(15);
   }
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:path.join(dir,"raindrop-native-"+width+".png"),fullPage:true,animations:"disabled"});
   const pick=name=>page.locator('[data-hiro-component="'+name+'"]');
   await pick("AnnouncementRibbon").getByRole("button",{name:"Dismiss announcement"}).click();
   assert.equal(await pick("AnnouncementRibbon").getByRole("complementary").count(),0);
   const mega=pick("MegaNavigation");
   await mega.getByRole("button",{name:/Explore products/}).click();
   assert.equal(await mega.getByRole("button",{name:/Explore products/}).getAttribute("aria-expanded"),"true");
   await mega.getByRole("link",{name:"Products"}).waitFor();
   const full=pick("FullscreenNavigation");
   await full.getByRole("button",{name:"Open full-screen menu"}).click();
   await full.getByRole("link",{name:"All Experiences"}).waitFor();
   await full.getByRole("button",{name:"Close menu"}).click();
   assert.equal(await full.getByRole("link",{name:"All Experiences"}).count(),0);
   const query=pick("CommandPalette");
   await query.getByRole("button",{name:"Open command palette"}).click();
   await query.getByRole("searchbox",{name:"Command search"}).fill("document");
   assert.equal(await query.getByText("Open documentation").isVisible(),true);
   assert.equal(await query.getByText("View projects").isVisible(),false);
   const reward=pick("RewardCardPack");
   await reward.getByRole("button",{name:/Tap to reveal/}).click();
   await reward.getByText("+250 Hiro Points").waitFor();
   const skeleton=pick("SkeletonMorph");
   await skeleton.getByRole("button",{name:"Toggle loading state"}).click();
   await skeleton.getByText("Your interface is ready.").waitFor();
   const toast=pick("ToastNotification");
   await toast.getByRole("button",{name:"Show notification"}).click();
   await toast.getByRole("status").getByText("Saved in native HiroGlifx.").waitFor();
   const rating=pick("StarRating");
   await rating.getByRole("button",{name:"Rate 5 out of 5"}).click();
   await rating.getByText("Current rating: 5 out of 5").waitFor();
   const tabs=pick("AnimatedPillTabs");
   await tabs.getByRole("button",{name:"Develop"}).click();
   await tabs.getByText(/Develop: reusable classes/).waitFor();
   const burst=pick("SuccessBurst");
   await burst.getByRole("button",{name:"Celebrate success"}).click();
   await burst.getByRole("status").getByText("Achievement unlocked!").waitFor();
   const mascot=pick("IdleMascot");
   assert.equal(await mascot.getByRole("img",{name:/Illustrated sheep/}).count(),1);
   assert.deepEqual(errors,[],"JS page errors");
   await page.close();
  }
  console.log("18 Raindrop-inspired native .scroll classes exercised in Chromium, desktop and mobile.");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
