"use strict";
const {chromium}=require("playwright"),{spawn}=require("node:child_process");
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const base="http://127.0.0.1:18767",out=path.resolve("artifacts");
async function ready(){
 for(let i=0;i<80;i++){
  try{const r=await fetch(base+"/arcade.html");if(r.ok)return;}catch{}
  await new Promise(res=>setTimeout(res,180));
 }
 throw new Error("Arcade HTTP server did not start");
}
async function run(){
 fs.mkdirSync(out,{recursive:true});
 const server=spawn("python3",["-m","http.server","18767","--bind","127.0.0.1"],
   {cwd:path.resolve(__dirname,".."),stdio:"ignore"});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader"]});
  const page=await browser.newPage({viewport:{width:1400,height:950},deviceScaleFactor:1});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/arcade.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.sourceMode==="native-scroll");
  assert.equal(await page.locator(".game-tab").count(),6);
  await page.locator("#showEngine").click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes("class ScrollGame"));
  assert.match(await page.locator("#sourceFile").getAttribute("href"),/scroll-game-runtime\.js/);
  await page.locator("#showScroll").click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)"));
  await page.getByRole("button",{name:"Play",exact:false}).first().click();
  await page.keyboard.down("ArrowDown");await page.waitForTimeout(220);await page.keyboard.up("ArrowDown");
  await page.screenshot({path:path.join(out,"arcade-pong-desktop.png"),fullPage:true});
  await page.locator('[data-game="snake"]').click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.sourceMode==="native-scroll");
  assert.match(await page.locator("#gameTitle").innerText(),/Snake/);
  await page.locator("#pause").click();
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.snakeHead!==189,null,{timeout:5000});
  await page.screenshot({path:path.join(out,"arcade-snake-desktop.png"),fullPage:true});
  await page.locator('[data-game="chess"]').click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.sourceMode==="native-scroll");
  await page.locator("#showEngine").click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes("class ScrollGame"));
  await page.locator("#showScroll").click();
  // Click two legal white and black chess moves using responsive canvas positions.
  const clickSquare=async(square)=>{
   const pos=await page.evaluate(([f,r])=>{
     const rect=document.querySelector("#screen").getBoundingClientRect();
     const x=192+("abcdefgh".indexOf(f)+.5)*52,y=52+(8-r+.5)*52;
     return {x:rect.left+x*rect.width/800,y:rect.top+y*rect.height/520};
   },[square[0],Number(square[1])]);
   await page.mouse.click(pos.x,pos.y);
  };
  await clickSquare("e2");await clickSquare("e4");
  await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.moves===1,null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector("#score")?.textContent.includes("Black to move"),null,{timeout:5000});
  assert.match(await page.locator("#score").innerText(),/Black to move/);
  await clickSquare("e7");await clickSquare("e5");
  await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.moves===2,null,{timeout:5000});
  await page.waitForFunction(()=>document.querySelector("#score")?.textContent.includes("White to move"),null,{timeout:5000});
  assert.match(await page.locator("#score").innerText(),/White to move/);
  await page.screenshot({path:path.join(out,"arcade-chess-desktop.png"),fullPage:true});
  await page.locator("#undo").click();
  await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.moves===1,null,{timeout:5000});
  await page.locator('[data-game="star-defense"]').click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.sourceMode==="native-scroll");
  await page.locator("#pause").click();
  await page.keyboard.down("Space");
  try{await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.shots>0,null,{timeout:5000});}
  finally{await page.keyboard.up("Space");}
  await page.screenshot({path:path.join(out,"arcade-star-defense-desktop.png"),fullPage:true});
  await page.locator('[data-game="breakout"]').click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.name==="breakout");
  await page.locator("#pause").click();
  await page.keyboard.down("ArrowRight");
  try{await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.paddle>405,null,{timeout:5000});}
  finally{await page.keyboard.up("ArrowRight");}
  await page.screenshot({path:path.join(out,"arcade-breakout-desktop.png"),fullPage:true});
  await page.locator('[data-game="tic-tac-toe"]').click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes(": tick(dt)") && window.HiroArcadeSnapshot?.()?.sourceMode==="native-scroll");
  const playCell=async(index)=>{
    const point=await page.evaluate(i=>{
      const rect=document.querySelector("#screen").getBoundingClientRect();
      return {x:rect.left+(205+(i%3)*130+26)*rect.width/800,
        y:rect.top+(65+Math.floor(i/3)*130+26)*rect.height/520};
    },index);
    await page.mouse.click(point.x,point.y);
  };
  await playCell(0);await playCell(4);
  await page.waitForFunction(()=>window.HiroArcadeSnapshot?.()?.moves===2,null,{timeout:5000});
  await page.screenshot({path:path.join(out,"arcade-tic-tac-toe-desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(out,"arcade-mobile.png"),fullPage:true});
  // Blockhaven must expose the actual loaded .scroll, not a fabricated sample.
  await page.goto(base+"/blockhaven.html",{waitUntil:"domcontentloaded"});
  await page.locator("#sourcePanel summary").click();
  await page.waitForFunction(()=>document.querySelector("#sourceCode")?.textContent.includes("voxel_world(42)"),null,{timeout:60000});
  assert.equal(await page.locator("#sourcePanel").getAttribute("open")!==null,true);
  await page.screenshot({path:path.join(out,"blockhaven-source-panel.png"),fullPage:true});
  assert.deepEqual(errors,[],"No uncaught browser script errors");
  console.log("Arcade games and Blockhaven source viewer passed Chromium smoke tests");
 }finally{if(browser)await browser.close();server.kill("SIGTERM");}
}
run().catch(e=>{console.error(e);process.exitCode=1;});