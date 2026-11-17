/* Riftfall campaign controller: connects HiroGlifx-authored content with
 * reusable inventory, quest, audio, save and combat systems.
 */
(function(root,factory){
 const prog=typeof module==="object"&&module.exports?require("./game-content"):root.HiroGameContent;
 const saving=typeof module==="object"&&module.exports?require("./game-save"):root.HiroGameSave;
 const audio=typeof module==="object"&&module.exports?require("./game-audio"):root.HiroGameAudio;
 const effects=typeof module==="object"&&module.exports?require("./game-fx"):root.HiroGameFX;
 const chapters=typeof module==="object"&&module.exports?require("./game-chapters"):root.HiroGameChapters;
 const api=factory(root,prog,saving,audio,effects,chapters);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRiftfallCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root,prog,saving,audio,effects,chapters){
"use strict";
const allowedSlot=/^(auto|quick|slot-[123])$/;
class RiftfallCampaign{
 constructor({demo,source,chapterSource=null,storage=null,onChange=()=>{}}){
   if(!demo?.combat||!demo?.scene||typeof source!=="string")throw Error("Campaign requires initialized RPG and HiroGlifx content");
   this.demo=demo;this.content=new prog.GameContent(source).starter();
   this.chapters=chapterSource?new chapters.ChapterDirector(chapters.buildChapters(chapterSource)):null;
   this.chapterEvents=new Set();
   this.audio=new audio.GameAudio();this.fx=new effects.CombatFX({BABYLON:demo.B,scene:demo.scene,maxParticles:64});
   this.store=storage?new saving.GameSaveStore(storage):null;
   this.onChange=onChange;this.dialogue=null;this.reachedWatchtower=false;
   this.events=[];this.disposers=[];
   this.disposers.push(demo.combat.onEvent(event=>this.handleCombatEvent(event)));
   this.disposers.push(this.content.quests.onChange(()=>this.emit("quest","Quest progress updated")));
   this.disposers.push(this.content.inventory.onChange(()=>this.emit("inventory","Inventory updated")));
   this.applyEquipment();
   this.demo.campaign=this;
 }
 emit(type,message){
   this.events.push({type,message,at:this.demo.rules.get("elapsed")||0});
   if(this.events.length>40)this.events.shift();
   this.onChange(this.snapshot(),{type,message});
 }
 handleCombatEvent(event){
   const target=this.demo.combat.actors.get(event.target||event.actor);
   if(event.type==="hit"){
     if(target)this.fx.impact({x:target.x,y:1.2,z:target.z},{damage:event.damage,power:1.2,color:event.target==="hero"?"#f45d80":"#ffe29a"});
     this.audio.play("hit");
   }else if(event.type==="defeat"){
     if(event.actor==="hero"){this.audio.play("defeat");return;}
     const index=Number(event.actor.split("-").at(-1))||0;
     const drop=this.content.defeated("raider",index);
     this.recordChapterEvents();
     this.audio.play("collect");
     this.emit("loot","Raider defeated · collected "+drop);
     this.autoSave();
   }
 }
 async enableAudio(){
   try{await this.audio.unlock();this.audio.startAmbience();this.emit("audio","Original ambient audio enabled");return true;}
   catch(error){this.emit("audio","Audio unavailable: "+error.message);return false;}
 }
 toggleMute(){this.audio.mute(!this.audio.muted);if(this.audio.muted)this.audio.stopAmbience();else this.audio.startAmbience();return this.audio.muted;}
 tick(dt){
   this.content.rules.tick(dt);this.fx.tick(dt);
   const p=this.demo.character?.position;
   if(p&&!this.reachedWatchtower&&p.z< -23&&Math.abs(p.x)<5){
     this.reachedWatchtower=true;
     this.content.reach("watchtower");this.recordChapterEvents();this.audio.play("quest");
     this.emit("explore","Discovered the old watchtower");
     this.autoSave();
   }
 }
 attackCue(){this.audio.play("swing");}
 potion(){
   const item=this.content.consume("healing-potion");
   if(!item)return false;
   this.demo.combat.heal("hero",item.heal);
   this.audio.play("heal");this.emit("heal","Used Healing Potion (+ "+item.heal+" HP)");
   this.autoSave();return true;
 }
 applyEquipment(){
   const equipped=this.content.inventory.equipment;
   const hero=this.demo.combat.actor("hero");
   // CombatWorld equip only registers positive item values; absent slots have no bonuses.
   for(const slot of ["weapon","armor"]){
     const id=equipped.get(slot);
     if(id){const def=this.content.catalog.get(id);this.demo.combat.equip("hero",slot,def);}
     else hero.equipment.delete(slot);
   }
 }
 equip(id,slot="weapon"){
   if(!this.content.inventory.equip(id,slot))return false;
   this.applyEquipment();this.audio.play("collect");
   this.emit("equip","Equipped "+this.content.catalog.get(id).label);this.autoSave();return true;
 }
 craft(id){
   if(!this.content.craft(id))return false;
   this.recordChapterEvents();
   this.audio.play("quest");this.emit("craft","Crafted "+this.content.catalog.get(id).label);
   this.autoSave();return true;
 }
 claim(id){
   const success=this.content.claim(id);
   if(!success)return false;
   if(id==="first-blood"&&this.content.quests.accept("rift-guardian")){
     // Retroactively count prior defeats: quests accepted after objectives still recognize history.
     const previous=this.content.events.filter(e=>e.type==="defeat"&&e.id==="raider").length;
     if(previous)this.content.quests.record("defeat","raider",Math.min(200,previous));
   }
   this.audio.play("quest");this.emit("quest","Claimed "+id);this.autoSave();return true;
 }
 canTalk(){
   const p=this.demo.character.position;
   return Math.hypot(p.x+2,p.z-6)<=5;
 }
 talk(id="elder",index=null){
   if(!this.canTalk())return null;
   const current=id||"elder";
   if(index===null)return this.content.dialogue.open(current);
   const next=this.content.talk(current,index);
   this.recordChapterEvents();
   this.audio.play("collect");this.emit("dialogue","Keeper Nara");this.autoSave();
   return next;
 }
 recipes(){
   return [...this.content.recipes.values()].map(recipe=>({...recipe,available:recipe.ingredients.every(p=>this.content.inventory.count(p.id)>=p.quantity)}));
 }
 snapshot(){
   const hero=this.demo.combat.actor("hero");
   return Object.freeze({
     inventory:this.content.inventory.snapshot(),
     quests:this.content.quests.snapshot(),
     questDetails:[...this.content.quests.specs.values()].map(q=>{
       const e=this.content.quests.entries.get(q.id);
       return {id:q.id,title:q.title,description:q.description,status:e?.status||"locked",
         progress:e?.progress?.[0]||0,target:q.objectives[0].target,experience:q.experience,rewards:q.rewards};
     }),
     recipes:this.recipes(),experience:this.content.quests.experience,
     chapters:this.chapters?.snapshot()||null,
     chapterDetails:this.chapters?.chapters.map((c,i)=>({id:c.id,title:c.title,description:c.description,status:i<this.chapters.index?"completed":i===this.chapters.index?"active":"locked",progress:i===this.chapters.index?this.chapters.progress:i<this.chapters.index?c.objective.target:0,target:c.objective.target}))||[],
     builderItems:this.content.catalog.items.size,nearElder:this.canTalk(),
     watchtowerReached:this.reachedWatchtower,
     latest:this.events.at(-1)||null,muted:this.audio.muted,volume:this.audio.volume,
     equipment:[...this.content.inventory.equipment],health:hero.health
   });
 }

 recordChapterEvents(){
   if(!this.chapters)return;
   // Replay the bounded event history after every completion. Earlier combat
   // counts toward later chapter objectives without double-counting.
   let changed=true,iterations=0;
   while(changed&&iterations++<this.chapters.chapters.length+1){
     changed=false;
     const c=this.chapters.current;if(!c)break;
     const key=c.id;
     for(let i=0;i<this.content.events.length;i++){
       const event=this.content.events[i];
       const eventKey=key+":"+i;
       if(this.chapterEvents.has(eventKey))continue;
       this.chapterEvents.add(eventKey);
       if(event.type===c.objective.type&&event.id===c.objective.id){
         this.chapters.record(event.type,event.id,event.quantity||1);
       }
     }
     if(this.chapters.advance()){
       changed=true;this.emit("chapter","Chapter cleared: "+c.title);
     }
   }
 }
 restoreLegacyChapterState(saved){
   this.chapters.restore({version:1,index:0,progress:0,completed:[],current:this.chapters.chapters[0].id,finished:false});
   // A Phase 27 save has no chapter history. Reconstruct known objective
   // milestones conservatively using saved enemy state and quest progress.
   this.content.events=[];
   this.chapterEvents.clear();
   const kills=saved.raiders.filter(r=>!r.alive).length;
   for(let i=0;i<kills;i++)this.content.events.push({type:"defeat",id:"raider",index:i});
   if(this.reachedWatchtower)this.content.events.push({type:"reach",id:"watchtower"});
   if(this.content.quests.entries.get("rift-smith")?.status==="completed"||
      this.content.quests.entries.get("rift-smith")?.status==="claimed")
     this.content.events.push({type:"craft",id:"steel-blade"});
   this.recordChapterEvents();
 }
 saveData(){
   const demo=this.demo,p=demo.character.position,hero=demo.combat.actor("hero");
   return {position:{x:p.x,y:p.y,z:p.z},health:hero.health,stamina:hero.stamina,
     ...(this.chapters?{chapters:this.chapters.snapshot(),chapterEvents:[...this.chapterEvents],eventHistory:this.content.events.map(e=>({...e}))}:{}),
     kills:demo.rules.get("kills"),wave:demo.wave,elapsed:demo.rules.get("elapsed"),
     inventory:this.content.inventory.snapshot(),quests:this.content.quests.snapshot(),
     raiders:demo.enemies.map(e=>{
       const a=demo.combat.actor(e.id);
       return {id:e.id,health:a.health,x:a.x,z:a.z,alive:a.alive};
     })};
 }
 save(slot="quick"){
   if(!allowedSlot.test(slot))throw Error("Unsupported save slot");
   if(!this.store)throw Error("Browser storage unavailable");
   const result=this.store.save(slot,this.saveData());
   this.emit("save","Saved locally: "+slot);return result;
 }
 autoSave(){if(!this.store)return false;try{this.save("auto");return true;}catch{return false;}}
 load(slot="quick"){
   if(!this.store)throw Error("Browser storage unavailable");
   const saved=this.store.read(slot);if(!saved)return false;
   const demo=this.demo,hero=demo.combat.actor("hero");
   // Validate the entire saved progression before touching the live world.
   const previous=this.content.serialize();
   const oldChapters=this.chapters?.snapshot();
   const oldHistory=[...this.content.events],oldSeen=new Set(this.chapterEvents);
   if(this.chapters&&saved.chapters){
     // Validate chapter state in isolation before mutating the live game.
     new chapters.ChapterDirector(this.chapters.chapters).restore(saved.chapters);
   }
   this.content.restore({inventory:saved.inventory,quests:saved.quests});
   if(saved.wave>this.demo.wave)this.demo.ensureWave(saved.wave);
   try{
     const expected=new Set(demo.enemies.map(e=>e.id));
     if(saved.raiders.length!==expected.size||saved.raiders.some(r=>!expected.has(r.id)))
       throw Error("Incompatible enemy save for this level");
     if(typeof demo.character.controller.setPosition!=="function")
       throw Error("Havok character teleport unavailable");
     demo.character.controller.setPosition(new demo.B.Vector3(saved.position.x,saved.position.y,saved.position.z));
     demo.character.vertical=0;
     hero.x=saved.position.x;hero.z=saved.position.z;
     hero.health=Math.min(hero.maxHealth,saved.health);
     hero.stamina=Math.min(hero.maxStamina,saved.stamina);
     hero.alive=hero.health>0;
     for(const enemy of demo.enemies){
       const state=saved.raiders.find(r=>r.id===enemy.id),a=demo.combat.actor(enemy.id);
       a.health=Math.min(a.maxHealth,state.health);a.alive=state.alive&&a.health>0;
       a.x=state.x;a.z=state.z;enemy.agent.position={x:state.x,z:state.z};
       enemy.agent.lastGoal=null;enemy.agent.path=[];
       enemy.mesh.setEnabled?.(a.alive);
     }
     const rule=demo.rules.state.get("kills");
     if(rule)demo.rules.state.set("kills",{...rule,value:saved.kills});
     const victory=demo.rules.state.get("done");
     if(victory)demo.rules.state.set("done",{...victory,value:saved.kills>=7});
     const time=demo.rules.state.get("elapsed");
     if(time)demo.rules.state.set("elapsed",{...time,value:saved.elapsed});
     this.applyEquipment();this.reachedWatchtower=this.content.quests.entries.get("explorer")?.progress[0]>=1;
     if(this.chapters){
       if(saved.chapters){
         this.chapters.restore(saved.chapters);
         this.content.events=(saved.eventHistory||[]).map(e=>({...e}));
         this.chapterEvents=new Set(saved.chapterEvents||[]);
         this.recordChapterEvents();
       }else this.restoreLegacyChapterState(saved);
     }
   }catch(error){
     this.content.restore(previous);
     if(oldChapters)this.chapters.restore(oldChapters);
     this.content.events=oldHistory;this.chapterEvents=oldSeen;
     throw error;
   }
   this.emit("load","Loaded "+slot);return true;
 }
 exportSave(slot="quick"){if(!this.store)throw Error("Browser storage unavailable");return this.store.export(slot);}
 dispose(){
   for(const unsubscribe of this.disposers)unsubscribe?.();
   this.disposers=[];
   this.fx.dispose();this.audio.close().catch(()=>{});
   if(this.demo.campaign===this)this.demo.campaign=null;
 }
}
return {RiftfallCampaign};
});