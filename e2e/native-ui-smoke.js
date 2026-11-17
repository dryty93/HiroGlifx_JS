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
   for(const [route,title] of [["/","Interfaces that feel"],["/dashboard","Your command center"],["/form","Join the next generation"]]){
    await page.goto(base+route,{waitUntil:"domcontentloaded"});
    await page.getByText(title,{exact:false}).waitFor();
    assert.equal(await page.locator("h1").count(),1);
    assert.equal(await page.locator("body").evaluate(el=>el.scrollWidth<=innerWidth+2),true,"horizontal overflow");
    await page.screenshot({path:path.join(artifacts,"native-ui-"+(route==="/"?"landing":route.slice(1))+"-"+width+".png"),fullPage:true});
    if(route==="/dashboard"){
     const button=page.getByRole("button",{name:"Clicked 0 times"});await button.click();
     await page.getByRole("button",{name:"Clicked 1 times"}).waitFor();
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
  console.log("Native UI .scroll pages passed Chromium desktop/mobile, click and submit");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
