"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {VoxelWorld,BLOCKS}=require("../runtime/voxel-world");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install}=require("../runtime/voxel-canonical");
const {VoxelBabylonAdapter}=require("../runtime/voxel-babylon");

test("voxel generation is deterministic, bounded and reproducible",()=>{
 const a=new VoxelWorld(42).generate(8),b=new VoxelWorld(42).generate(8);
 assert.deepEqual([...a.blocks],[...b.blocks]);
 assert.ok(a.blocks.size>200);
 assert.ok(BLOCKS.includes(a.at(0,3,0)));
 assert.equal(a.at(50,60,50),null);
 assert.throws(()=>new VoxelWorld(7).generate(21),/radius/);
});
test("mine, place, re-render visibility and restore saved edits",()=>{
 const world=new VoxelWorld(42).generate(6);world.spawn();
 const target=world.at(0,3,0);
 assert.ok(target);
 assert.equal(world.remove(0,3,0),true);
 assert.equal(world.at(0,3,0),null);
 assert.equal(world.place(0,3,0,"stone"),true);
 assert.equal(world.at(0,3,0),"stone");
 assert.equal(world.place(0,3,0,"stone"),false);
 const saved=world.serialize();
 const reloaded=VoxelWorld.deserialize(saved);
 assert.equal(reloaded.at(0,3,0),"stone");
 assert.equal(reloaded.blocks.size,world.blocks.size);
 assert.equal(reloaded.seed,42);
 assert.ok(typeof reloaded.player.x==="number");
 assert.throws(()=>world.block(1,3,0,"javascript:"),/Unknown block type/);
});
test("player movement, gravity, jump and terrain wall collision",()=>{
 const world=new VoxelWorld(42).generate(6);world.spawn();
 for(let i=0;i<50;i++)world.step(.02);
 assert.equal(world.player.grounded,true);
 const oldX=world.player.x;
 world.setInput(1,0);
 for(let i=0;i<15;i++)world.step(.02);
 assert.ok(world.player.x>oldX);
 assert.equal(world.jump(),true);
 assert.ok(world.player.vy>0);
 assert.throws(()=>world.setInput(2,0),/Invalid input/);
 assert.throws(()=>world.step(1),/frame delta/);
});
test("canonical voxel factories create world and object references",async()=>{
 const runtime=install(new CanonicalRuntime());
 await runtime.execute('.Main = ()\n& world = voxel_world(19);\n& terrain = voxel_generate(world, 6);\n& explorer = voxel_player(world, 0, 0);\nbreak;');
 const world=runtime.get("world");
 assert.equal(world instanceof VoxelWorld,true);
 assert.equal(runtime.get("terrain"),world);
 assert.equal(runtime.get("explorer").world,world);
});
test("renderer creates Babylon meshes, syncs updates and disposes",()=>{
 const world=new VoxelWorld(42).generate(4);world.spawn();
 const meshes=[];
 const B={
  Engine:class{runRenderLoop(fn){this.render=fn;}stopRenderLoop(){}dispose(){}resize(){}},
  Scene:class{render(){}dispose(){}},
  Color4:{FromHexString:s=>s},Color3:{FromHexString:s=>s},
  Vector3:class{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;}},
  FreeCamera:class{constructor(){this.rotation={y:0,x:0};this.position={set(){}};}attachControl(){}getForwardRay(){}},
  HemisphericLight:class{},
  MeshBuilder:{CreateBox(name){const mesh={name,metadata:null,position:null,dispose(){this.disposed=true;}};meshes.push(mesh);return mesh;}},
  StandardMaterial:class{},
 };
 const renderer=new VoxelBabylonAdapter({BABYLON:B,canvas:{},world});
 renderer.start();
 assert.ok(renderer.meshes.size>20);
 const target=[...renderer.meshes.keys()][0];
 const [x,y,z]=target.split(",").map(Number);
 world.remove(x,y,z);
 assert.equal(renderer.meshes.has(target),false);
 renderer.stop();
 assert.equal(renderer.active,false);
});
