/* HiroGlifx Steam-scale foundations: playable third-person combat demonstration.
 * Hero/enemy behavior rules are authored in examples/steam-rpg-combat.scroll.
 * Babylon/Havok supply rendering, capsule movement and actual rigid-body collision.
 */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRPGDemo=api;})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
const finite=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v;};
class RPGDemo{
 constructor({canvas,BABYLON,HavokPhysics,source,levelSource=null,recastFactory=null,onUpdate=()=>{},onEvent=()=>{}}){
   if(!canvas||!BABYLON?.Scene||!HavokPhysics||typeof source!=="string")throw Error("Babylon, Havok and HiroGlifx source required");
   this.canvas=canvas;this.B=BABYLON;this.havok=HavokPhysics;this.onUpdate=onUpdate;this.onEvent=onEvent;
   this.levelSource=levelSource;this.recastFactory=recastFactory;
   this.navmesh=null;this.navMode="a-star";this.navQueries=0;this.wave=1;this.level=null;this.navError=null;
   this.rules=new root.HiroWorldRules.WorldRules(source,{name:"rpg-combat"});
   this.combat=new root.HiroCombat.CombatWorld();
   this.telegraphs=new root.HiroCombat.TelegraphQueue();
   this.profiler=new root.HiroGamePerformance.FrameProfiler();
   this.evadeReady=0;this.parryReady=0;
   this.keys=new Set();this.enemies=[];this.last=0;this.disposed=false;this.attackFlash=0;this.combo=0;
   this.campaign=null;this.hitReactions=new Map();this.snapshots=[];this.animationState="idle";this.ready=false;this.assetStatus="Loading glTF...";this.dynamicCrates=[];
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

   if(!this.levelSource)throw Error("Missing authored HiroGlifx level source");
   this.level=new root.HiroRiftfallWorld.RiftfallWorld(this.levelSource);
   const geometry=this.level.build({BABYLON:B,scene:this.scene,physics:this.physics,material,physicsStreaming:true});
   this.nav=geometry.navigation;
   // Dynamic physics props are real Havok rigid bodies.
   for(const [i,x,z] of [[0,-8,3],[1,8,5],[2,-2,-26],[3,6,-47]]){
     const crate=B.MeshBuilder.CreateBox("physics-crate-"+i,{size:1.15},this.scene);
     crate.position.set(x,3,z);crate.material=material("crate-"+i,"#cb9a69");
     this.dynamicCrates.push(this.physics.dynamicBox(crate,{mass:3,restitution:.16}));
   }
   // Prefer actual Recast-Detour path queries whenever WASM is available.
   if(this.recastFactory&&root.HiroNavmesh?.RecastNavigation){
     try{
       const recast=typeof this.recastFactory==="function"?await this.recastFactory():this.recastFactory;
       if(!recast)throw Error("Recast returned no runtime");
       this.navmesh=new root.HiroNavmesh.RecastNavigation({BABYLON:B,scene:this.scene,recast});
       this.navmesh.build(geometry.meshes);
       this.navRouter=new root.HiroNavmesh.RouteBudget({
         path:(from,to)=>this.navmesh.path({x:from.x,y:.1,z:from.z},{x:to.x,y:.1,z:to.z}),
         fallback:(from,to)=>this.nav.path(from,to),maxQueriesPerSecond:20,ttl:.25,errorLimit:3
       });
       this.navMode="recast";
     }catch(error){
       this.navmesh?.dispose();this.navmesh=null;
       this.navMode="a-star";this.navError=error.message;
     }
   }
   this.character=this.physics.character([0,1.9,8],{height:1.7,radius:.34,speed:5.7,jump:8.6});
   this.baseMovementSpeed=this.character.speed;
   const body=B.MeshBuilder.CreateCapsule("hero-fallback",{height:1.7,radius:.34},this.scene);
   body.material=material("hero","#9c88ff");body.isPickable=false;
   this.heroMesh=body;
   const sword=B.MeshBuilder.CreateBox("sword",{width:.12,height:.8,depth:.13},this.scene);
   sword.material=material("sword","#f5d2a4");sword.isPickable=false;this.sword=sword;
   this.assets=new root.HiroAssets.AssetRegistry({BABYLON:B,scene:this.scene,manifest:{hero:"./assets/hero-rig.gltf"}});
   try{
     const asset=await this.assets.load("hero");
     this.heroAsset=asset;
     if(asset.root){asset.root.parent=this.heroMesh;asset.root.position.y=-.92;body.visibility=.01;}
     if(asset.animations.has("idle")){
       this.animations=new root.HiroAssets.AnimationGraph({clips:asset.animations,defaultState:"idle"});
       this.assetStatus="glTF avatar + animations loaded (skinned rig)";
     }else this.assetStatus="glTF loaded without clips";
   }catch(error){this.assetStatus="Procedural character: "+error.message;}
   this.combat.create("hero",{team:"heroes",health:145,stamina:110,x:0,z:8,armor:8});
   this.combat.equip("hero","weapon",{id:"training-sword",damage:7});
   this.spawnWave(1,material);
   this.combat.onEvent(e=>{
     if(e.type==="defeat"&&e.actor!=="hero"){
       const kills=this.rules.run("afterEnemyDefeated");
       this.onEvent("Defeated "+e.actor);
       if(this.wave<3&&kills>=this.level.threshold(this.wave)){
         this.ensureWave(this.wave+1);
         this.onEvent("New region unlocked: "+this.level.waveTitle(this.wave));
       }
     }
     if(e.type==="hit"){
       this.hitReactions.set(e.target,.22);
       this.onEvent(e.attacker+" hit "+e.target+" ("+e.damage+")");
     }
   });
   this.ready=true;
   this.engine.runRenderLoop(()=>{
     if(this.disposed)return;
     const now=typeof performance!=="undefined"?performance.now():Date.now();
     const dt=this.last?Math.min(.05,Math.max(0,(now-this.last)/1000)):0;this.last=now;
     if(this.playing&&dt)this.tick(dt);
     this.sync();
     this.scene.render();
     if(this.playing&&dt)this.profiler.sample({frameMs:dt*1000,
       activeMeshes:this.scene.meshes?.length||0,
       activeColliders:this.physics.aggregates?.length||0,
       navQueries:this.navRouter?.stats().queries||0});
   });
   this._resize=()=>this.engine?.resize();
   if(typeof window!=="undefined")window.addEventListener("resize",this._resize);
   return this;
 }
 spawnWave(stage,material=null){
   if(!this.level)throw Error("Level source not loaded");
   const B=this.B,mat=material||((id,color)=>{
     const m=new B.StandardMaterial(id+"-mat",this.scene);m.diffuseColor=B.Color3.FromHexString(color);return m;
   });
   const info=this.level.spawns(stage);
   for(const entry of info){
     const {id,index,x,z,health,armor,speed,color}=entry;
     const mesh=B.MeshBuilder.CreateBox(id,{width:stage===3?1.15:.7,
        height:stage===3?2.2:1.5,depth:stage===3?1.15:.7},this.scene);
     mesh.material=mat(id,color);mesh.position.set(x,stage===3?1.1:.75,z);
     this.combat.create(id,{team:"raiders",health,x,z,armor});
     const route=this.navRouter?((from,to)=>this.navRouter.route(from,to,this.combat.elapsed)):null;
     const agent=new root.HiroAI.NavigationAgent({grid:this.nav,position:{x,z},speed,route});
     const actor={id,mesh,agent,index,stage,decision:null,attackTime:0};
     actor.decision=this.makeBehavior(actor);this.enemies.push(actor);
   }
   this.wave=stage;this.level.waveStart(stage);
   return info.length;
 }
 ensureWave(target){
   if(!Number.isInteger(target)||target<1||target>3)throw Error("Invalid RPG wave");
   for(let stage=this.wave+1;stage<=target;stage++)this.spawnWave(stage);
   return this.wave;
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
     strike:()=>{
       if(this.telegraphs.has(actor.id))return AI.SUCCESS;
       return this.telegraphs.schedule(actor.id,this.rules.get("enemyWindup"),()=>{
         if(!this.combat.actor(actor.id).alive||!this.combat.actor("hero").alive)return;
         this.combat.strike(actor.id,"hero",{damage:this.rules.get("enemyDamage")+(actor.index===2?4:0),
           range:this.rules.get("enemyRange"),cost:0,cooldown:this.rules.get("enemyCooldown")});
       })?AI.SUCCESS:AI.FAILURE;
     },
     pursue:context=>{
       actor.agent.navigate(context.target);
       actor.agent.tick(context.dt);
       return AI.RUNNING;
     },
     idle:()=>AI.SUCCESS
   }});
 }
 press(code,down){if(down)this.keys.add(code);else this.keys.delete(code);}
 start(){if(!this.ready)throw Error("RPG scene not initialized");this.playing=true;this.last=0;
   this.campaign?.enableAudio().catch(()=>{});
 }
 pause(){this.playing=false;this.last=0;this.keys.clear();}
 evade(){
   const hero=this.combat.actor("hero"),now=this.combat.elapsed;
   if(!this.playing||!hero.alive||now<this.evadeReady||hero.stamina<this.rules.get("evadeCost")||
      hero.status.get("parry")?.ends>now)return false;
   hero.stamina-=this.rules.get("evadeCost");
   this.combat.status("hero","evade",{duration:this.rules.get("evadeDuration")});
   this.evadeReady=now+this.rules.get("evadeCooldown");
   this.onEvent("Evade! Briefly invulnerable.");return true;
 }
 parry(){
   const hero=this.combat.actor("hero"),now=this.combat.elapsed;
   if(!this.playing||!hero.alive||now<this.parryReady||hero.stamina<this.rules.get("parryCost")||
      hero.status.get("evade")?.ends>now)return false;
   hero.stamina-=this.rules.get("parryCost");
   this.combat.status("hero","parry",{duration:this.rules.get("parryDuration")});
   this.parryReady=now+this.rules.get("parryCooldown");
   this.onEvent("Parry window opened.");return true;
 }
 attack(){
   this.campaign?.attackCue();
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
   this.telegraphs.tick(dt);
   this.campaign?.tick(dt);
   for(const [id,remaining] of this.hitReactions){if(remaining<=dt)this.hitReactions.delete(id);else this.hitReactions.set(id,remaining-dt);}
   const forward=(this.keys.has("KeyW")||this.keys.has("ArrowUp")?1:0)-
      (this.keys.has("KeyS")||this.keys.has("ArrowDown")?1:0);
   const sideways=(this.keys.has("KeyD")||this.keys.has("ArrowRight")?1:0)-
      (this.keys.has("KeyA")||this.keys.has("ArrowLeft")?1:0);
   this.character.setInput(sideways,-forward);
   this.character.speed=this.baseMovementSpeed*(this.combat.actor("hero").status.get("evade")?.ends>this.combat.elapsed?1.65:1);
   this.character.tick(dt);
   const pos=this.character.position,hero=this.combat.actor("hero");
   this.level?.updateDetails(pos,dt);
   this.level?.updatePhysics(pos);
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
     const a=this.combat.actor(e.id);e.mesh.position.set(a.x,e.stage===3?1.1:.8,a.z);
     e.mesh.setEnabled?.(a.alive);
     const impacted=this.hitReactions.get(e.id)||0,warning=this.telegraphs.has(e.id);
     if(e.mesh.scaling){const pulse=impacted>0?1+.11*Math.sin((.22-impacted)*44):warning?1.05+.09*Math.sin(this.combat.elapsed*28):1;e.mesh.scaling.setAll?.(pulse);}
     if(e.mesh.rotation)e.mesh.rotation.z=impacted>0?.11*Math.sin((.22-impacted)*24):0;
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
     raiders:this.enemies.map(e=>({id:e.id,x:this.combat.actor(e.id).x,z:this.combat.actor(e.id).z,
       repaths:e.agent.repaths,alive:this.combat.actor(e.id).alive})),
     kills:this.rules.get("kills"),done:this.rules.done,x:hero.x,z:hero.z,
     wave:this.wave,chapter:this.level?.waveTitle(this.wave)||"Riftfall",
     navMode:this.navRouter?.stats().mode||this.navMode,
     recastQueries:this.navRouter?.stats().queries||0,
     navFallbacks:this.navRouter?.stats().fallbacks||0,
     navErrors:this.navRouter?.stats().errors||0,
     telegraphs:this.enemies.filter(e=>this.telegraphs.has(e.id)).map(e=>e.id),
     defense:{evading:hero.status.get("evade")?.ends>this.combat.elapsed,parrying:hero.status.get("parry")?.ends>this.combat.elapsed},
     visualRegions:this.level?.details?.snapshot()||null,
     physicalRegions:this.level?.colliderStream?.snapshot()||null,
     performance:this.profiler.snapshot(),
     campaign:this.campaign?.snapshot()||null});
 }
 dispose(){
   this.disposed=true;this.pause();
   if(typeof window!=="undefined"&&this._resize)window.removeEventListener("resize",this._resize);
   this.campaign?.dispose();this.telegraphs.dispose();this.level?.dispose();this.navRouter?.dispose();this.navmesh?.dispose();this.assets?.dispose();this.physics?.dispose();this.scene?.dispose();this.engine?.dispose();
 }
}
return {RPGDemo};
});