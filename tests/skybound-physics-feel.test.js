"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {SkyboundWorld}=require("../runtime/skybound-world");
function setup(){
 const world=new SkyboundWorld();
 world.tile("ground",0,0,0,9,"solid",1);
 world.tile("next",8.5,0,0,9,"solid",1);
 world.spawn("hero",0,2,0);
 for(let i=0;i<55;i++)world.step(.02);
 return world;
}
test("fixed physics remains near frame-rate independent",()=>{
 const a=setup(),b=setup();
 a.setInput(1,0);b.setInput(1,0);
 for(let i=0;i<60;i++)a.step(1/60);
 for(let i=0;i<120;i++)b.step(1/120);
 assert.ok(Math.abs(a.player.x-b.player.x)<.08);
 assert.ok(Math.abs(a.player.y-b.player.y)<.08);
});
test("horizontal movement accelerates and brakes smoothly",()=>{
 const w=setup();
 w.setInput(1,0);w.step(1/60);
 assert.ok(w.player.motionX>0&&w.player.motionX<w.moveSpeed);
 for(let i=0;i<30;i++)w.step(1/60);
 assert.ok(w.player.motionX>w.moveSpeed*.9);
 w.setInput(0,0);w.step(1/60);
 assert.ok(w.player.motionX>0&&w.player.motionX<w.moveSpeed);
 for(let i=0;i<40;i++)w.step(1/60);
 assert.ok(Math.abs(w.player.motionX)<.05);
});
test("coyote jump works shortly after leaving ledge",()=>{
 const w=setup();
 w.player.x=-4.85;w.player.grounded=true;w.player.standing="ground";
 w.setInput(-1,0);
 for(let i=0;i<30;i++){w.step(1/120);if(!w.player.grounded)break;}
 assert.equal(w.player.grounded,false);
 assert.ok(w.coyote>0);
 assert.equal(w.jump(),true);
 assert.ok(w.player.vy>0);
});
test("early jump buffers until the character lands",()=>{
 const w=new SkyboundWorld();
 w.tile("ground",0,0,0,7,"solid",1);w.spawn("hero",0,2,0);
 w.player.y=1.9;w.player.vy=-3;w.player.grounded=false;
 assert.equal(w.jump(),false);
 for(let i=0;i<20;i++)w.step(1/120);
 assert.ok(w.telemetry.jumpCount>=1);
 assert.ok(w.player.vy>0);
});
test("moving platform carries standing player",()=>{
 const w=new SkyboundWorld();w.moving("moving",0,0,0,6,"x",1,3,3);w.spawn("hero",0,2,0);
 for(let i=0;i<120;i++)w.step(1/120);
 const beforeX=w.player.x,oldTileX=w.tiles.get("moving").x;
 for(let i=0;i<30;i++)w.step(1/120);
 const tileDelta=w.tiles.get("moving").x-oldTileX;
 assert.ok(Math.abs((w.player.x-beforeX)-tileDelta)<.4);
 assert.equal(w.player.standing,"moving");
});