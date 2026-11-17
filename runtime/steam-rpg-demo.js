/* HiroGlifx Steam-scale foundations: playable third-person combat demonstration.
 * Hero/enemy behavior rules are authored in examples/steam-rpg-combat.scroll.
 * Babylon/Havok supply rendering, capsule movement and actual rigid-body collision.
 */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRPGDemo=api;})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
const finite=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v;};
class RPGDemo{
 constructor({canvas,BABYLON,HavokPhysics,source,onUpdate=()=>{},onEvent=()=>{}}){
   if(!canvas||!BABYLON?.Scene||!HavokPhysics||typeof source!=="string")throw Error("Babylon, Havok and HiroGlifx source required");
   this.canvas=canvas;this.B=BABYLON;this.havok=HavokPhysics;this.onUpdate=onUpdate;this.onEvent=onEvent;
   this.rules=new root.HiroWorldRules.WorldRules(source,{name:"rpg-combat"});
   this.combat=new root.HiroCombat.CombatWorld();
   this.keys=new Set();this.enemies=[];this.last=0;this.disposed=false;this.attackFlash=0;this.combo=0;
   this.snapshots=[];this.animationState="idle";this.ready=false;this.assetStatus="Loading glTF...";this.dynamicCrates=[];
 }
 async initialize(){
   const B=this.B;
   this.engine=new B.Engine(this.canvas,true,{antialias:true});
   this.scene=new B.Scene(this.engine);
   this.scene.clearColor=B.Color4.FromHexString("#334b73ff");
   if(typeof B.Scene.FOGMODE_EXP2==="number"){this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogDensity=.009;this.scene.fogColor=B.Color3.FromHexString("#334b73");}
   const light=new B.HemisphericLight("ambient",new B.Vector3(0,1,0),this.scene);light.intensity=.82;
   if(B.DirectionalLight){
     const sun=new B.DirectionalLight("sun",new B.Vector3(-.4,-1,.3),this.scene);sun.intensity=.85;
   }
   this.camera=new B.ArcRotateCamera("third-person",Math.PI/2,Math.PI/3.15,11,new B.Vector3(0,1.5,7),this.scene);
   this.camera.lowerRadiusLimit=5;this.camera.upperRadiusLimit=16;
   this.camera.attachControl(this.canvas,true);
   this.camera.inputs?.removeByType?.("ArcRotateCameraKeyboardMoveInput");
   this.physics=await new root.HiroPhysics.HavokWorld({BABYLON:B,scene:this.scene,HavokPhysics:this.havok}).initialize(-22);
   const material=(id,color)=>{const m=new B.StandardMaterial(id+"-mat",this.scene);m.diffuseColor=B.Color3.FromHexString(color);return m;};
   const platform=(id,x,y,z,width,height,depth,color,occluder=true)=>{
     const mesh=B.MeshBuilder.CreateBox(id,{width,height,depth},this.scene);
     mesh.position.set(x,y,z);mesh.material=material(id,color);
     mesh.metadata={cameraOccluder:occluder};
     this.physics.staticBox(mesh);return mesh;
   };
   platform("terrain",0,-.45,0,28,.9,28,"#3b766d");
   // Procedural scenery is original and requires no third-party game art.
   if(B.MeshBuilder.CreateSphere){
     for(let i=0;i<20;i++){
       const angle=i*Math.PI*2/20,radius=i%2===0?12.8:13.7;
       const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
       const crown=B.MeshBuilder.CreateSphere("rift-shrub-"+i,{diameter:1.5+(i%3)*.3,segments:8},this.scene);
       crown.position.set(x,.64,z);crown.scaling.y=.62;
       crown.material=material("shrub-"+i,i%3===0?"#276e79":"#3e9984");
       crown.isPickable=false;
     }
   }
   if(B.MeshBuilder.CreateCylinder){
     for(let i=0;i<8;i++){
       const angle=i*Math.PI/4,x=Math.cos(angle)*11,z=Math.sin(angle)*11;
       const pillar=B.MeshBuilder.CreateCylinder("rift-pillar-"+i,{diameter:1.0,height:2.0+(i%3)*.6,tessellation:6},this.scene);
       pillar.position.set(x,1,z);
       pillar.material=material("pillar-"+i,i%2===0?"#536782":"#607b97");
       pillar.isPickable=false;
     }
   }
   for(const [i,x,z] of [[0,-8,3],[1,8,5]]){
     const crate=B.MeshBuilder.CreateBox("physics-crate-"+i,{size:1.15},this.scene);
     crate.position.set(x,3,z);crate.material=material("crate-"+i,"#cb9a69");
     this.dynamicCrates.push(this.physics.dynamicBox(crate,{mass:3,restitution:.16}));
   }
   platform("stone-west",-4,.65,.1,2,1.3,2,"#70859b");
   platform("stone-east",4,.65,-1,2,1.3,2,"#75869d");
   platform("stone-center",0,.65,-3,2.3,1.3,1.5,"#70809b");
   this.nav=new root.HiroAI.NavigationGrid({width:28,height:28,originX:-14,originZ:-14});
   for(const [cx,cz,w,d] of [[-4,.1,2,2],[4,-1,2,2],[0,-3,2.3,1.5]]){
     for(let x=Math.floor(cx-w/2);x<=Math.ceil(cx+w/2);x++)
       for(let z=Math.floor(cz-d/2);z<=Math.ceil(cz+d/2);z++){
         const cell=this.nav.cell(x,z);
         if(this.nav.inside(cell.x,cell.z))this.nav.setBlocked(cell.x,cell.z,true);
       }
   }
   this.character=this.physics.character([0,1.9,8],{height:1.7,radius:.34,speed:5.7,jump:8.6});
   const body=B.MeshBuilder.CreateCapsule("hero-fallback",{height:1.7,radius:.34},this.scene);
   body.material=material("hero","#9c88ff");body.isPickable=false;
   this.heroMesh=body;
   const sword=B.MeshBuilder.CreateBox("sword",{width:.12,height:.8,depth:.13},this.scene);
   sword.material=material("sword","#f5d2a4");sword.isPickable=false;this.sword=sword;
   this.assets=new root.HiroAssets.AssetRegistry({BABYLON:B,scene:this.scene,manifest:{hero:"./assets/hero.gltf"}});
   try{
     const asset=await this.assets.load("hero");
     this.heroAsset=asset;
     if(asset.root){asset.root.parent=this.heroMesh;asset.root.position.y=-.2;body.visibility=0.03;}
     if(asset.animations.has("idle")){
       this.animations=new root.HiroAssets.AnimationGraph({clips:asset.animations,defaultState:"idle"});
       this.assetStatus="glTF avatar + animations loaded";
     }else this.assetStatus="glTF loaded without clips";
   }catch(error){this.assetStatus="Procedural character: "+error.message;}
   this.combat.create("hero",{team:"heroes",health:145,stamina:110,x:0,z:8,armor:8});
   this.combat.equip("hero","weapon",{id:"training-sword",damage:7});
   for(const [i,pos] of [[0,[-6,-5]],[1,[5,-7]],[2,[0,-10]]]){
     const id="raider-"+i, mesh=B.MeshBuilder.CreateBox(id,{width:.7,height:1.5,depth:.7},this.scene);
     mesh.material=material(id,i===2?"#ecb35c":"#df7187");mesh.position.set(pos[0],.75,pos[1]);
     this.combat.create(id,{team:"raiders",health:i===2?130:75,x:pos[0],z:pos[1],armor:i===2?35:7});
     const agent=new root.HiroAI.NavigationAgent({grid:this.nav,position:{x:pos[0],z:pos[1]},speed:i===2?1.8:2.6});
     const actor={id,mesh,agent,index:i,decision:null,attackTime:0};
     actor.decision=this.makeBehavior(actor);this.enemies.push(actor);
   }
   this.combat.onEvent(e=>{
     if(e.type==="defeat"&&e.actor!=="hero"){this.rules.run("afterEnemyDefeated");this.onEvent("Defeated "+e.actor);}
     if(e.type==="hit")this.onEvent(e.attacker+" hit "+e.target+" ("+e.damage+")");
   });
   this.ready=true;
   this.engine.runRenderLoop(()=>{
     if(this.disposed)return;
     const now=typeof performance!=="undefined"?performance.now():Date.now();
     const dt=this.last?Math.min(.05,Math.max(0,(now-this.last)/1000)):0;this.last=now;
     if(this.playing&&dt)this.tick(dt);
     this.sync();
     this.scene.render();
   });
   this._resize=()=>this.engine?.resize();
   if(typeof window!=="undefined")window.addEventListener("resize",this._resize);
   return this;
 }
 makeBehavior(actor){
   const AI=root.HiroAI;
   return new AI.BehaviorTree({type:"selector",children:[
     {type:"sequence",children:[{type:"condition",name:"in-attack-range"},
       {type:"cooldown",seconds:1.3,child:{type:"action",name:"strike"}}]},
     {type:"sequence",children:[{type:"condition",name:"aggressive"},{type:"action",name:"pursue"}]},
     {type:"action",name:"idle"}
   ]},{conditions:{
     "in-attack-range":context=>this.rules.run("canEnemyStrike",context.distance),
     aggressive:context=>this.rules.run("canEnemyChase",context.distance)
   },actions:{
     strike:()=>{const result=this.combat.strike(actor.id,"hero",{damage:this.rules.get("enemyDamage")+(actor.index===2?4:0),
       range:this.rules.get("enemyRange"),cost:0,cooldown:1});return result.hit?AI.SUCCESS:AI.FAILURE;},
     pursue:context=>{
       actor.agent.navigate(context.target);
       actor.agent.tick(context.dt);
       return AI.RUNNING;
     },
     idle:()=>AI.SUCCESS
   }});
 }
 press(code,down){if(down)this.keys.add(code);else this.keys.delete(code);}
 start(){if(!this.ready)throw Error("RPG scene not initialized");this.playing=true;this.last=0;}
 pause(){this.playing=false;this.last=0;this.keys.clear();}
 attack(){
   if(!this.ready||!this.playing||!this.combat.actor("hero").alive)return false;
   const hero=this.combat.actor("hero");
   const candidates=this.enemies.filter(e=>this.combat.actor(e.id).alive)
     .sort((a,b)=>Math.hypot(a.agent.position.x-hero.x,a.agent.position.z-hero.z)-
                   Math.hypot(b.agent.position.x-hero.x,b.agent.position.z-hero.z));
   if(!candidates.length)return false;
   const result=this.combat.strike("hero",candidates[0].id,{damage:this.rules.run("heroDamage",this.combo),
     range:this.rules.get("range"),cost:this.rules.get("staminaCost"),cooldown:this.rules.get("cooldown")});
   if(result.hit){this.combo=Math.min(5,this.combo+1);this.attackFlash=.25;return true;}
   return false;
 }
 tick(dt){
   this.rules.tick(dt);this.combat.tick(dt);
   const forward=(this.keys.has("KeyW")||this.keys.has("ArrowUp")?1:0)-
      (this.keys.has("KeyS")||this.keys.has("ArrowDown")?1:0);
   const sideways=(this.keys.has("KeyD")||this.keys.has("ArrowRight")?1:0)-
      (this.keys.has("KeyA")||this.keys.has("ArrowLeft")?1:0);
   this.character.setInput(sideways,-forward);
   this.character.tick(dt);
   const pos=this.character.position,hero=this.combat.actor("hero");
   hero.x=pos.x;hero.z=pos.z;
   const moving=Math.hypot(sideways,forward);
   this.attackFlash=Math.max(0,this.attackFlash-dt);
   this.animationState=this.attackFlash>0?"attack":!this.character.grounded?"jump":moving?"run":"idle";
   this.animations?.update({speed:moving*5,grounded:this.character.grounded,attacking:this.attackFlash>0,dead:!hero.alive});
   this.animations?.tick(dt);
   if(this.keys.has("KeyJ"))this.attack();
   for(const enemy of this.enemies){
     const a=this.combat.actor(enemy.id);
     if(!a.alive){enemy.mesh.setEnabled?.(false);continue;}
     const d=Math.hypot(hero.x-a.x,hero.z-a.z);
     if(hero.alive)enemy.decision.tick({distance:d,target:{x:hero.x,z:hero.z},dt},dt);
     a.x=enemy.agent.position.x;a.z=enemy.agent.position.z;
   }
   if(!hero.alive)this.pause();
   this.onUpdate(this.snapshot());
 }
 sync(){
   if(!this.ready)return;
   const pos=this.character.position;
   this.heroMesh.position.set(pos.x,pos.y,pos.z);
   this.sword.position.set(pos.x+.4,pos.y-.1,pos.z-.15);
   if(this.sword.rotation)this.sword.rotation.z=this.attackFlash>0?-.75:0;
   for(const e of this.enemies){
     const a=this.combat.actor(e.id);e.mesh.position.set(a.x,.8,a.z);
     e.mesh.setEnabled?.(a.alive);
   }
   const desired={x:pos.x+9,y:pos.y+7,z:pos.z+10};
   const actual=root.HiroPhysics.cameraOcclusion({scene:this.scene,BABYLON:this.B,
     origin:{x:pos.x,y:pos.y+1.1,z:pos.z},desired});
   if(this.camera?.setTarget){
     this.camera.setTarget(new this.B.Vector3(pos.x,pos.y+.7,pos.z-1.2));
     this.camera.radius=Math.hypot(actual.x-pos.x,actual.y-pos.y,actual.z-pos.z);
   }
 }
 snapshot(){
   const hero=this.combat.actor("hero");
   return Object.freeze({physics:"havok",asset:this.assetStatus,animation:this.animationState,
     health:Math.ceil(hero.health),stamina:Math.ceil(hero.stamina),enemies:this.enemies.filter(e=>this.combat.actor(e.id).alive).length,
     kills:this.rules.get("kills"),done:this.rules.done,x:hero.x,z:hero.z});
 }
 dispose(){
   this.disposed=true;this.pause();
   if(typeof window!=="undefined"&&this._resize)window.removeEventListener("resize",this._resize);
   this.assets?.dispose();this.physics?.dispose();this.scene?.dispose();this.engine?.dispose();
 }
}
return {RPGDemo};
});