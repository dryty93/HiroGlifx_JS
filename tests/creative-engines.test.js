"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {Scene,compile,overlaps}=require("../runtime/creative-scene");
const {PhaserAdapter}=require("../runtime/phaser-adapter");
const {World3D,compile3D,BabylonAdapter}=require("../runtime/babylon-adapter");
test("2D game commands create interactive playable goal",()=>{
 const scene=compile('scene 320 180 #101827\nsprite player 0 0 20 20 #60a5fa\nsprite goal 40 0 20 20 #facc15\ncontrol ArrowRight player 20 0\ngoal player goal');
 assert.equal(scene.score,0);
 scene.keydown("ArrowRight");assert.equal(scene.score,0);
 scene.keydown("ArrowRight");assert.equal(scene.score,1);
 scene.keydown("ArrowRight");assert.equal(scene.score,1);
 assert.equal(overlaps({x:0,y:0,width:10,height:10},{x:9,y:0,width:10,height:10}),true);
});
test("2D animation timeline is deterministic",()=>{
 const scene=compile('sprite box 0 0 10 10 blue\ntween box x 100 1000 0');
 scene.seek(500);assert.equal(scene.object("box").x,50);
 scene.seek(1000);assert.equal(scene.object("box").x,100);
 scene.seek(0);assert.equal(scene.object("box").x,0);
 assert.throws(()=>compile("sprite a 0 0 0 10 blue"),/Invalid width/);
 assert.throws(()=>compile("web.open https:\/\/example.com"),/Unknown creative command/);
});
test("Phaser adapter maps scene sprites to engine rectangle objects",async()=>{
 const model=compile("scene 320 180 #101827\nsprite player 0 0 20 20 #60a5fa\ncontrol ArrowRight player 10 0");
 const rects=[];
 const Phaser={AUTO:0,Game:class{
   constructor(options){
     this.options=options;
     const phaserScene={add:{rectangle:(x,y,w,h,fill)=>{
       const node={x,y,w,h,fill,setPosition(a,b){this.x=a;this.y=b;},setDisplaySize(){}};
       rects.push(node);return node;
     }}};
     queueMicrotask(()=>options.scene.create.call(phaserScene));
   }
   destroy(){this.destroyed=true;}
 }};
 const adapter=new PhaserAdapter({Phaser,container:{},model});
 await adapter.start();
 assert.equal(rects.length,1);
 adapter.keydown("ArrowRight");assert.equal(rects[0].x,20);
 adapter.stop();assert.equal(adapter.started,false);
});
test("3D commands compile with validation and time-independent rotation",()=>{
 const world=compile3D("world 3d #101827\ncamera 0 6 -16\nlight 0 10 -5\ncube hero 0 0 0 3 #60a5fa\nrotate hero y 1.5");
 assert.equal(world.objects.get("hero").size,3);
 assert.deepEqual(world.rotations.get("hero"),{axis:"y",speed:1.5});
 world.seek(2000);assert.equal(world.time,2000);
 assert.throws(()=>compile3D("cube dangerous 0 0 0 1 red"),/Cube color/);
 assert.throws(()=>compile3D("rotate missing y 1"),/Unknown cube/);
});
test("Babylon adapter renders world using provided engine and disposes",()=>{
 const log=[];
 const B={
   Engine:class{runRenderLoop(fn){this.render=fn;}stopRenderLoop(){}dispose(){log.push("engine.dispose");}},
   Scene:class{render(){log.push("render");}dispose(){log.push("scene.dispose");}},
   Color4:{FromHexString:value=>value},
   Color3:{FromHexString:value=>value},
   Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},
   ArcRotateCamera:class{setPosition(pos){this.position=pos;}attachControl(){}},
   HemisphericLight:class{},
   StandardMaterial:class{},
   MeshBuilder:{CreateBox:()=>({rotation:{},position:null})}
 };
 const model=compile3D("cube hero 0 0 0 3 #60a5fa\nrotate hero y 2");
 const adapter=new BabylonAdapter({BABYLON:B,canvas:{},model}).start();
 adapter.seek(1000);assert.equal(adapter.meshes.get("hero").rotation.y,2);
 adapter.stop();assert.deepEqual(log,["scene.dispose","engine.dispose"]);
});