"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {ItemCatalog,Inventory,QuestJournal,DialogueTree}=require("../runtime/game-progression");
const {GameContent}=require("../runtime/game-content");
const {GameSaveStore,checksum}=require("../runtime/game-save");
const {GameAudio}=require("../runtime/game-audio");
const {CombatFX}=require("../runtime/game-fx");
const source=fs.readFileSync(path.resolve(__dirname,"../examples/riftfall-content.scroll"),"utf8");
const content=()=>new GameContent(source).starter();
test("HiroGlifx .scroll defines real items, recipes, quests and dialogue",()=>{
 const c=content();
 assert.equal(c.catalog.items.size,9);
 assert.equal(c.recipes.size,3);
 assert.equal(c.quests.specs.size,4);
 assert.equal(c.inventory.equipment.get("weapon"),"training-sword");
 assert.equal(c.inventory.count("healing-potion"),2);
 assert.equal(c.dialogue.open("elder").choices.length,3);
 assert.equal(c.talk("elder",1).id,"forge");
});
test("bounded atomic inventory equipment, consumption and crafting",()=>{
 const c=content(),i=c.inventory;
 assert.equal(i.canAdd("rift-shard",42),false);
 assert.equal(i.add("rift-shard",2),true);
 assert.equal(i.craft(c.recipes.get("steel-blade")),true);
 assert.equal(i.count("steel-blade"),1);
 assert.equal(i.count("rift-shard"),0);
 assert.equal(i.equip("steel-blade","weapon"),true);
 assert.equal(i.equipment.get("weapon"),"steel-blade");
 assert.equal(i.count("training-sword"),1);
 assert.equal(i.equip("healing-potion","weapon"),false);
 const potion=c.consume("healing-potion");
 assert.equal(potion.heal,45);
 assert.equal(i.count("healing-potion"),1);
 assert.equal(i.craft(c.recipes.get("guardian-armor")),false);
});
test("quest progression, prerequisites, rewards and validated replay",()=>{
 const c=content();
 assert.equal(c.quests.accept("rift-guardian"),false);
 c.defeated("raider",0);c.defeated("raider",1);
 assert.equal(c.quests.entries.get("first-blood").status,"completed");
 assert.equal(c.claim("first-blood"),true);
 assert.equal(c.quests.experience,90);
 assert.equal(c.quests.accept("rift-guardian"),true);
 for(let i=0;i<7;i++)c.quests.record("defeat","raider",1);
 assert.equal(c.quests.entries.get("rift-guardian").status,"completed");
 assert.equal(c.claim("rift-guardian"),true);
 assert.equal(c.inventory.count("sunstone"),1);
 const saved=c.serialize(),copy=content().restore(saved);
 assert.deepEqual(copy.quests.snapshot(),c.quests.snapshot());
 assert.deepEqual(copy.inventory.snapshot(),c.inventory.snapshot());
 const tampered=structuredClone(saved);tampered.inventory.items.push({id:"bad-id",count:100});
 assert.throws(()=>content().restore(tampered),/Unknown item/);
});
test("local saves have schema and checksum validation; invalid imports cannot overwrite slot",()=>{
 const m=new Map(),storage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const save=new GameSaveStore(storage);
 const c=content();
 const data={position:{x:0,y:1.5,z:8},health:120,stamina:77,kills:1,wave:1,elapsed:12,
   inventory:c.inventory.snapshot(),quests:c.quests.snapshot(),
   raiders:[{id:"raider-0",health:30,x:2,z:3,alive:true}]};
 save.save("quick",data);
 assert.equal(save.read("quick").health,120);
 const exported=save.export("quick");
 assert.deepEqual(save.slots(),["quick"]);
 assert.equal(save.import("slot-1",exported).position.z,8);
 assert.equal(save.read("slot-1").kills,1);
 assert.throws(()=>save.import("quick",exported.replace("120","999")) ,/checksum|Invalid/);
 assert.equal(save.read("quick").health,120);
 assert.throws(()=>save.save("bad slot",data),/Invalid save slot/);
 assert.throws(()=>save.save("quick",{...data,position:{x:Infinity}}),/Invalid player position/);
 assert.match(checksum("hello"),/^[a-f0-9]{8}$/);
});
test("Web Audio cues are opt-in and support mute, synthesized cues and lifecycle",async()=>{
 const voices=[];
 class Context{
   constructor(){this.state="suspended";this.currentTime=4;this.destination={};}
   async resume(){this.state="running";}
   createOscillator(){
     const voice={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){},value:0},type:"",
       connect(){return this;},start(){},stop(){},disconnect(){},onended:null};
     voices.push(voice);return voice;
   }
   createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},value:0},connect(){return this;},disconnect(){}};}
   async close(){this.state="closed";}
 }
 const audio=new GameAudio({AudioContext:Context,volume:.2});
 assert.equal(audio.play("hit"),false);
 await audio.unlock();
 assert.equal(audio.play("hit"),true);
 assert.equal(voices.length,1);
 audio.mute(true);assert.equal(audio.play("hit"),false);
 audio.mute(false);assert.equal(audio.startAmbience(),true);
 assert.equal(audio.ambience.length,3);
 audio.stopAmbience();assert.equal(audio.ambience.length,0);
 assert.throws(()=>audio.play("not-a-sound"),/Unknown/);
 await audio.close();
});
test("bounded Babylon hit VFX creates and disposes original particles",()=>{
 const meshes=[];
 const B={MeshBuilder:{CreateSphere(){const m={position:{x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}},
   scaling:{setAll(){}},dispose(){this.disposed=true;}};meshes.push(m);return m;}},
   StandardMaterial:class{dispose(){}},Color3:{FromHexString:s=>s}};
 const fx=new CombatFX({BABYLON:B,scene:{},maxParticles:8});
 fx.impact({x:0,y:2,z:4},{damage:19,power:2});
 assert.equal(fx.sparks.length,8);
 assert.equal(fx.damageText[0].value,19);
 for(let i=0;i<10;i++)fx.tick(.05);
 assert.equal(fx.sparks.length,0);
 assert.ok(meshes.every(m=>m.disposed===true));
 fx.dispose();
});

test("Phase 28 saves chapter progression, validates event history, and preserves old saves",()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const store=new GameSaveStore(storage);
 const c=content();
 const base={position:{x:0,y:1.9,z:8},health:145,stamina:110,kills:1,wave:1,elapsed:0,
   inventory:c.inventory.snapshot(),quests:c.quests.snapshot(),raiders:[]};
 store.save("slot-1",base);
 assert.equal(store.read("slot-1").chapters,undefined,"Older Phase 27 saves remain loadable");
 const campaign={...base,chapters:{version:1,index:1,progress:0,completed:["approach"],current:"watchtower",finished:false},
   eventHistory:[{type:"collect",id:"rift-shard",quantity:1},{type:"defeat",id:"raider",index:0}],
   chapterEvents:["approach:0","approach:1"]};
 store.save("slot-2",campaign);
 assert.deepEqual(store.read("slot-2").chapters,campaign.chapters);
 assert.deepEqual(store.read("slot-2").eventHistory,campaign.eventHistory);
 assert.throws(()=>store.save("slot-2",{...campaign,eventHistory:[{type:"execute",id:"raider"}]}),/Invalid chapter event history/);
 assert.throws(()=>store.save("slot-2",{...campaign,chapterEvents:["bad delimiter"]}),/Invalid chapter event ledger/);
 assert.deepEqual(store.read("slot-2").chapters,campaign.chapters,"Invalid writes cannot overwrite existing slots");
});
