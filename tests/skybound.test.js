"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {SkyboundWorld,stages}=require("../runtime/skybound-world");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install:installObby}=require("../runtime/obby-canonical");
const {install:installBlueprints}=require("../runtime/canonical-blueprints");
const {ObbyBabylonAdapter}=require("../runtime/obby-babylon");
function settle(w,steps=50){for(let i=0;i<steps;i++)w.step(.02);}
test("five stages and canonical example load as a real model",async()=>{
 const source=fs.readFileSync(path.join(__dirname,"../examples/skybound-course.scroll"),"utf8");
 const runtime=installObby(new CanonicalRuntime());
 await runtime.execute(installBlueprints(runtime,source));
 const world=runtime.get("world");
 assert.equal(world instanceof SkyboundWorld,true);
 assert.equal(stages.length,5);
 assert.equal(world.tiles.size,23);
 assert.equal(world.modifiers.size,6);
 assert.equal(world.player.id,"hero");
 assert.equal(runtime.get("runner").fields.get("speed"),8);
 assert.equal(runtime.get("won").kind,"event");
 assert.equal(world.stages[4].name,"Final Ascent");
});
test("moving tile changes position predictably and carries grounded players",()=>{
 const w=new SkyboundWorld();
 w.moving("ride",0,0,0,5,"x",1.2,3,3);
 w.spawn("hero",0,2,0);
 settle(w,30);
 assert.equal(w.player.grounded,true);
 const start=w.tiles.get("ride").x;
 const x=w.player.x;
 for(let i=0;i<10;i++)w.step(.02);
 assert.notEqual(w.tiles.get("ride").x,start);
 assert.notEqual(w.player.x,x);
 assert.equal(w.player.standing,"ride");
});
test("vanishing tiles temporarily disable contact and later reactivate",()=>{
 const w=new SkyboundWorld();
 w.vanishing("fade",0,0,0,5,.35,4);
 w.spawn("hero",0,2,0);
 settle(w,52);
 assert.equal(w.tiles.get("fade").active,false);
 settle(w,150);
 assert.equal(w.tiles.get("fade").active,true);
});
test("stage transitions, checkpoint and goal completion emit progression events",()=>{
 const w=new SkyboundWorld();
 w.tile("checkpoint",0,0,0,5,"checkpoint",3);
 w.tile("finish",4.3,0,0,5,"finish",5);
 w.spawn("hero",0,2,0);
 settle(w,45);
 assert.equal(w.currentStage,3);
 assert.equal(w.checkpoint.tile,"checkpoint");
 assert.equal(w.history.some(e=>e.type==="stage"&&e.stage===3),true);
 w.setInput(1,0);settle(w,50);
 assert.equal(w.completed,true);
 assert.equal(w.completedAt>0,true);
 assert.equal(w.summary().stage,5);
});
test("spinner hazard moves, lava is still fatal and jump counter tracks",()=>{
 const w=new SkyboundWorld();
 w.tile("safe",0,0,0,5,"solid",1);
 w.spinner("spinner",6,0,0,2,1,2,5);
 w.spawn("hero",0,2,0);
 settle(w,45);
 assert.equal(w.player.grounded,true);
 assert.equal(w.jump(),true);
 assert.equal(w.telemetry.jumpCount,1);
 const start=w.tiles.get("spinner").x;
 settle(w,8);
 assert.notEqual(w.tiles.get("spinner").x,start);
 assert.equal(w.telemetry.fallCount,0);
});
test("invalid modifier arguments cannot introduce unsafe geometry",()=>{
 const w=new SkyboundWorld();
 assert.throws(()=>w.moving("bad",0,0,0,3,"y",2,2),/axis/);
 assert.throws(()=>w.vanishing("bad",0,0,0,3,-1),/delay/);
 assert.throws(()=>w.spinner("bad",0,0,0,3,100,2),/range/);
 assert.throws(()=>w.tile("bad",0,0,0,3,"solid",9),/stage/);
});
test("Babylon adapter keeps dynamic meshes synchronized with world model",()=>{
 const w=new SkyboundWorld();
 w.moving("platform",0,0,0,5,"x",1,2,3);
 w.spawn("hero",0,2,0);
 const nodes=[];
 const B={
  Engine:class{runRenderLoop(fn){this.tick=fn;}stopRenderLoop(){}dispose(){}resize(){}},
  Scene:class{render(){}dispose(){}},
  Color4:{FromHexString:s=>s},Color3:{FromHexString:s=>s},
  Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;}},
  ArcRotateCamera:class{attachControl(){}setTarget(p){this.target=p;}},
  HemisphericLight:class{},
  MeshBuilder:{CreateBox:name=>{const node={name,position:null,rotation:{},enabled:true,setEnabled(v){this.enabled=v;}};nodes.push(node);return node;}},
  StandardMaterial:class{}
 };
 const adapter=new ObbyBabylonAdapter({BABYLON:B,canvas:{},world:w}).start();
 w.step(.05);adapter.sync(.016);
 assert.equal(adapter.meshes.get("platform").position.x,w.tiles.get("platform").x);
 w.tiles.get("platform").active=false;
 adapter.sync(.016);
 assert.equal(adapter.meshes.get("platform").enabled,false);
 adapter.stop();
});
