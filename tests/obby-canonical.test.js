"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {ObbyWorld}=require("../runtime/obby-world");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install:installObby}=require("../runtime/obby-canonical");
const {extract,install:installBlueprints}=require("../runtime/canonical-blueprints");
const {ObbyBabylonAdapter}=require("../runtime/obby-babylon");

function setup(){
 const rt=installObby(new CanonicalRuntime());
 return rt;
}
test("player can jump, land and reach a finish tile",()=>{
 const w=new ObbyWorld();
 w.tile("start",0,0,0,4,"solid");w.tile("finish",5,0,0,3,"finish");
 w.spawn("hero",0,2,0);
 for(let i=0;i<40;i++)w.step(.02);
 assert.equal(w.player.grounded,true);
 assert.equal(w.jump(),true);
 w.setInput(1,0);
 for(let i=0;i<55;i++)w.step(.02);
 assert.equal(w.completed,true);
 assert.equal(w.history.some(e=>e.type==="finish"),true);
});
test("lava respawns player; checkpoint updates respawn point",()=>{
 const w=new ObbyWorld();
 w.tile("start",0,0,0,4,"solid");w.tile("save",5,0,0,4,"checkpoint");
 w.tile("bad",10,0,0,4,"lava");
 w.spawn("hero",0,2,0);
 for(let i=0;i<40;i++)w.step(.02);
 w.player.x=5;w.player.y=2;w.player.vy=0;
 for(let i=0;i<35;i++)w.step(.02);
 assert.equal(w.checkpoint.tile,"save");
 w.player.x=10;w.player.y=2;w.player.vy=0;
 for(let i=0;i<35;i++)w.step(.02);
 assert.equal(w.dead,1);
 assert.equal(w.player.x,5);
 assert.equal(w.history.some(e=>e.type==="respawn"),true);
});
test("prevents invalid tiles, excessive dt, and jumping when airborne",()=>{
 const w=new ObbyWorld();w.tile("start",0,0,0,4,"solid");w.spawn("hero",0,2,0);
 assert.equal(w.jump(),false);
 assert.throws(()=>w.tile("evil",0,0,0,4,"javascript:"),/Unknown tile/);
 assert.throws(()=>w.step(5),/Invalid frame delta/);
 assert.throws(()=>w.setInput(3,0),/Invalid input/);
});
test("canonical Runner inheritance, typed fields, event refs and methods work",async()=>{
 const rt=setup();
 const file=fs.readFileSync(path.resolve(__dirname,"../examples/obby-course.scroll"),"utf8");
 const clean=installBlueprints(rt,file);
 await rt.execute(clean);
 const world=rt.get("world");
 assert.equal(world.tiles.size,9);
 assert.equal(rt.get("runner").fields.get("speed"),8);
 assert.equal(rt.get("runner").fields.get("label"),"Obby Runner");
 assert.equal(rt.get("won").kind,"event");
 assert.equal(await rt._evaluate(require("../runtime/canonical-runtime").parseExpr('runner.value("speed")')),8);
 await rt._evaluate(require("../runtime/canonical-runtime").parseExpr('runner.set("speed", 9)'));
 assert.equal(rt.get("runner").fields.get("speed"),9);
 assert.equal(world.player.vx,0);
 await rt._evaluate(require("../runtime/canonical-runtime").parseExpr("runner.dash()"));
 assert.equal(world.player.vx,1);
 assert.equal(await rt._evaluate(require("../runtime/canonical-runtime").parseExpr("won.count()")),0);
});
test("blueprint methods cannot call arbitrary JS and reject inheritance cycles",async()=>{
 const rt=setup();
 const source='.A = (B)\n : go = self.jump();\n break;\n.B = (A)\n : go = self.jump();\n break;\n.Main = ()\n break;';
 assert.throws(()=>installBlueprints(rt,source),/inheritance cycle/);
 assert.equal(extract('.A = ()\n : go = self.jump();\n break;').definitions.get("A").methods.get("go").method,"jump");
 const broken='.Actor = ()\n : exec = self.unsafe();\n break;\n.Main = ()\n & a = bp_create("Actor", obby_world());\n a.exec();\n break;';
 const x=setup();await assert.rejects(x.execute(installBlueprints(x,broken)),/Method not available/);
});
test("Babylon obby renderer creates platforms and player, syncs and disposes",()=>{
 const w=new ObbyWorld();w.tile("start",0,0,0,4,"solid");w.spawn("hero",0,2,0);
 const nodes=[];
 const B={
   Engine:class{runRenderLoop(fn){this.callback=fn;}stopRenderLoop(){}dispose(){}},
   Scene:class{render(){}dispose(){}},
   Color4:{FromHexString:s=>s},Color3:{FromHexString:s=>s},
   Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;}},
   ArcRotateCamera:class{attachControl(){}setTarget(point){this.target=point;}},
   HemisphericLight:class{},
   MeshBuilder:{CreateBox:(name)=>{const node={name,position:null};nodes.push(node);return node;}},
   StandardMaterial:class{}
 };
 const renderer=new ObbyBabylonAdapter({BABYLON:B,canvas:{},world:w}).start();
 assert.equal(nodes.length,3);
 renderer.sync();
 assert.equal(renderer.avatar.position.x,0);
 renderer.stop();assert.equal(renderer.active,false);
});
