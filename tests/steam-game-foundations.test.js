"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {HavokWorld,CharacterController,cameraOcclusion}=require("../runtime/game-physics");
const {AssetRegistry,AnimationGraph,safeUrl}=require("../runtime/game-assets");
const {CombatWorld}=require("../runtime/game-combat");
const {NavigationGrid,NavigationAgent,BehaviorTree,SUCCESS,FAILURE}=require("../runtime/game-ai");

class Vec{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
 subtract(a){return new Vec(this.x-a.x,this.y-a.y,this.z-a.z);}
 add(a){return new Vec(this.x+a.x,this.y+a.y,this.z+a.z);}
 scale(v){return new Vec(this.x*v,this.y*v,this.z*v);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 normalize(){const l=this.length()||1;return this.scale(1/l);}
}
test("Phase 23: Havok must initialize before static/dynamic collider construction",async()=>{
 let enabled=0,created=0,disposed=0;
 const B={Vector3:Vec,HavokPlugin:class{constructor(flag,wasm){assert.ok(wasm);}},
   PhysicsShapeType:{BOX:1},PhysicsAggregate:class{constructor(){created++;}dispose(){disposed++;}},
   PhysicsCharacterController:class{
     constructor(position){this.position=position;this.v=new Vec();}
     getPosition(){return this.position;}
     checkSupport(){return {supportedState:2};}
     setVelocity(v){this.v=v;}
     integrate(dt){this.position=this.position.add(this.v.scale(dt));}
     dispose(){disposed++;}
   }};
 const scene={enablePhysics(gravity,plugin){enabled++;assert.equal(gravity.y,-22);return true;}};
 const world=await new HavokWorld({BABYLON:B,scene,HavokPhysics:async()=>({})}).initialize();
 assert.equal(enabled,1);
 world.staticBox({});world.dynamicBox({});
 assert.equal(created,2);
 const actor=world.character([0,2,0]);
 actor.setInput(1,0);actor.tick(.016);
 assert.ok(actor.position.x>0);
 actor.jump();actor.tick(.016);assert.ok(actor.vertical>0);
 assert.throws(()=>actor.setInput(2,0),/Invalid/);
 world.dispose();assert.equal(disposed,3);
});
test("Phase 23: explicit failures for missing Havok and camera obstruction",async()=>{
 assert.throws(()=>new HavokWorld({BABYLON:{},scene:{},HavokPhysics:async()=>({})}),/Havok V2/);
 const B={Vector3:Vec,Ray:class{constructor(origin,direction,length){this.length=length;}}};
 const desired={x:10,y:1,z:0},origin={x:0,y:1,z:0};
 assert.deepEqual(cameraOcclusion({scene:{pickWithRay:()=>({hit:false})},BABYLON:B,origin,desired}),desired);
 const closer=cameraOcclusion({scene:{pickWithRay:()=>({hit:true,distance:4})},BABYLON:B,origin,desired});
 assert.ok(closer.x<4&&closer.x>=1.7);
});
test("Phase 24: glTF path validation, deduplicated loading and animation state transitions",async()=>{
 assert.throws(()=>safeUrl("https://evil.example/avatar.glb"),/same-origin/);
 assert.throws(()=>safeUrl("./assets/../../secret.glb"),/same-origin/);
 const played=[];
 const groups=["idle","walk","run","jump","attack","death"].map(name=>({name,start(){played.push(name);},stop(){},setWeightForAllAnimatables(){}}));
 let imports=0;
 const B={SceneLoader:{async ImportMeshAsync(){imports++;return {meshes:[{dispose(){}}],animationGroups:groups};}}};
 const assets=new AssetRegistry({BABYLON:B,scene:{},manifest:{hero:"./assets/hero.glb"}});
 const loaded=await assets.load("hero");await assets.load("hero");
 assert.equal(imports,1);
 const graph=new AnimationGraph({clips:loaded.animations,transitions:{idle:["walk","run","attack","jump"],walk:["run","idle","attack"],run:["idle","attack","jump"]}});
 graph.update({speed:5});assert.equal(graph.state,"run");
 graph.update({grounded:false});assert.equal(graph.state,"jump");
 graph.update({dead:true});assert.equal(graph.state,"death");
 assert.ok(played.includes("death"));
 assets.dispose();
});
test("Phase 25: armor, range, stamina, cooldown, weapon and status effects",()=>{
 const w=new CombatWorld();
 const hero=w.create("hero",{team:"allies",health:100,x:0,z:0});
 const goblin=w.create("goblin",{team:"enemies",health:60,x:1,z:0,armor:50});
 w.equip("hero","weapon",{id:"sword",damage:15});
 const first=w.strike("hero","goblin",{damage:25,range:2,cost:20,cooldown:.6});
 assert.equal(first.hit,true);assert.equal(first.damage,27);
 assert.equal(goblin.health,33);assert.equal(hero.stamina,80);
 assert.equal(w.strike("hero","goblin",{damage:20}).reason,"cooldown");
 w.tick(.61);assert.ok(hero.stamina>80);
 assert.equal(w.strike("hero","goblin",{damage:35}).hit,true);
 assert.equal(goblin.alive,false);
 const events=w.events.map(e=>e.type);assert.ok(events.includes("defeat"));
 const other=w.create("archer",{team:"enemies",x:40,z:40});
 assert.equal(w.strike("hero","archer",{}).reason,"out-of-range");
 w.status("hero","poison",{duration:2,power:3});w.tick(.5);
 assert.ok(hero.health<100);
 assert.throws(()=>w.equip("hero","unknown",{id:"weapon"}),/Invalid equipment/);
});
test("Phase 26: A* paths around blocked cells and prevents diagonal corner cuts",()=>{
 const grid=new NavigationGrid({width:11,height:11,cellSize:1});
 for(let z=0;z<9;z++)grid.setBlocked(5,z);
 const from={x:1.5,z:1.5},to={x:8.5,z:1.5};
 const path=grid.path(from,to);
 assert.ok(path.length>8);assert.ok(path.some(p=>p.z>8));
 const agent=new NavigationAgent({grid,position:from,speed:4});
 assert.equal(agent.navigate(to),true);
 for(let i=0;i<400;i++)agent.tick(.05);
 assert.ok(Math.hypot(agent.position.x-to.x,agent.position.z-to.z)<.1);
 const wall=new NavigationGrid({width:3,height:3});
 wall.setBlocked(1,0);wall.setBlocked(0,1);
 assert.deepEqual(wall.path({x:.5,z:.5},{x:1.5,z:1.5}),[]);
});
test("Phase 26: behavior selector, condition, sequence and cooldown",()=>{
 let attacks=0,chases=0;
 const tree=new BehaviorTree({type:"selector",children:[
   {type:"sequence",children:[{type:"condition",name:"close"},
     {type:"cooldown",seconds:1,child:{type:"action",name:"attack"}}]},
   {type:"action",name:"chase"}
 ]},{conditions:{close:c=>c.distance<2},actions:{
   attack:()=>{attacks++;return SUCCESS;},
   chase:()=>{chases++;return SUCCESS;}
 }});
 assert.equal(tree.tick({distance:1},.02),SUCCESS);assert.equal(attacks,1);
 assert.equal(tree.tick({distance:1},.02),SUCCESS);assert.equal(chases,1);
 assert.equal(tree.tick({distance:10},.02),SUCCESS);assert.equal(chases,2);
 tree.tick({distance:1},1.1);assert.equal(attacks,2);
 assert.throws(()=>new BehaviorTree({type:"action",name:"evil"},{actions:{}}).tick({},.01),/Unregistered/);
});
