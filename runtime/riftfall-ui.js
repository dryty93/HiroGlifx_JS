/* Riftfall browser UI: inspect real HiroGlifx sources and manage RPG systems.
 * Every label from game content is inserted as textContent (never executable HTML).
 */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroRiftfallUI=api;})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
class RiftfallUI{
 constructor({stage,toolbar,source,combatSource,contentSource,getDemo,status}){
   if(!stage||!toolbar||!source||typeof getDemo!=="function")throw Error("Missing Riftfall UI mount");
   this.stage=stage;this.toolbar=toolbar;this.source=source;
   this.combatSource=combatSource;this.contentSource=contentSource;
   this.getDemo=getDemo;this.status=status||(()=>{});
   this.nodes=[];this.open=false;this.abort=new AbortController();
   this.mount();
 }
 listen(element,type,fn,options={}){element.addEventListener(type,fn,{...options,signal:this.abort.signal});}
 el(tag,attrs={},text=null){
   const e=document.createElement(tag);
   for(const [name,value] of Object.entries(attrs)){
     if(name==="className")e.className=value;
     else e.setAttribute(name,value);
   }
   if(text!==null)e.textContent=String(text);
   return e;
 }
 mount(){
   const group=this.el("div",{className:"rpg-toolbar"});
   this.nodes.push(group);
   const controls=[
     ["inventoryButton","🎒 Inventory","inventory"],
     ["questsButton","📜 Quests","quests"],
     ["craftButton","⚒ Craft","craft"],
     ["talkButton","💬 Talk","dialogue"],
     ["potionButton","♥ Potion","potion"],
     ["saveButton","Save","save"],
     ["loadButton","Load","load"],
     ["audioButton","♫ Sound","audio"]
   ];
   for(const [id,label,action] of controls){
     const button=this.el("button",{id,type:"button"},label);group.appendChild(button);
     this.listen(button,"click",()=>this.action(action));
   }
   this.toolbar.appendChild(group);
   const modal=this.el("div",{id:"rpgModal",className:"rpg-modal",role:"presentation"});
   modal.hidden=true;this.modal=modal;
   const dialog=this.el("section",{className:"rpg-dialog",role:"dialog","aria-modal":"true","aria-label":"RPG menu"});
   const head=this.el("header");
   this.heading=this.el("h2",{},"Inventory");
   this.close=this.el("button",{type:"button"},"Close");
   this.listen(this.close,"click",()=>this.hide());
   head.append(this.heading,this.close);
   this.description=this.el("p");
   this.entries=this.el("div",{id:"rpgEntries"});
   dialog.append(head,this.description,this.entries);modal.appendChild(dialog);
   this.stage.appendChild(modal);this.nodes.push(modal);
   const stats=this.el("div",{className:"rpg-stats"});this.nodes.push(stats);
   this.xp=this.el("div",{className:"chip",id:"xpBadge"},"⭐ 0 XP");
   this.questCount=this.el("div",{className:"chip",id:"questBadge"},"📜 0 QUESTS");
   stats.append(this.xp,this.questCount);
   const hud=this.stage.querySelector(".hud");
   if(hud)hud.appendChild(stats);else this.stage.appendChild(stats);
   const tabs=this.el("div",{className:"rpg-source-tabs"});
   const combat=this.el("button",{id:"combatSourceTab",type:"button","aria-pressed":"true"},"Combat .scroll");
   const content=this.el("button",{id:"contentSourceTab",type:"button","aria-pressed":"false"},"Items / quests .scroll");
   tabs.append(combat,content);
   this.source.parentElement.insertBefore(tabs,this.source);
   this.nodes.push(tabs);
   this.listen(combat,"click",()=>{this.source.textContent=this.combatSource;combat.setAttribute("aria-pressed","true");content.setAttribute("aria-pressed","false");});
   this.listen(content,"click",()=>{this.source.textContent=this.contentSource;content.setAttribute("aria-pressed","true");combat.setAttribute("aria-pressed","false");});
   this.listen(root,"keydown",event=>{
     if(["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName))return;
     if(this.open){
       if(event.code==="Escape")this.hide();
       event.preventDefault();event.stopImmediatePropagation();return;
     }
     if(event.repeat)return;
     const actions={KeyI:"inventory",KeyQ:"quests",KeyC:"craft",KeyE:"dialogue",KeyH:"potion",F5:"save",F9:"load"};
     if(actions[event.code]){
       event.preventDefault();event.stopImmediatePropagation();this.action(actions[event.code]);
     }
   },{capture:true});
 }
 get campaign(){return this.getDemo()?.campaign;}
 get demo(){return this.getDemo();}
 show(title,description){
   if(!this.campaign)return;
   this.open=true;this.modal.hidden=false;
   this.wasPlaying=Boolean(this.demo.playing);this.demo.pause();
   this.heading.textContent=title;this.description.textContent=description;this.entries.replaceChildren();
   this.close.focus();
 }
 hide(){
   if(!this.open)return;
   this.open=false;this.modal.hidden=true;
   if(this.wasPlaying&&this.demo?.combat.actor("hero").alive&&!this.demo.rules.done)this.demo.start();
 }
 line(name,description,button,click,disabled=false){
   const div=this.el("div",{className:"rpg-entry"}),info=this.el("div");
   const label=this.el("strong",{},name),detail=this.el("small",{},description);
   info.append(label,detail);div.append(info);
   if(button){
     const action=this.el("button",{type:"button"},button);
     action.disabled=disabled;
     this.listen(action,"click",click);div.append(action);
   }
   this.entries.append(div);
 }
 inventory(){
   const c=this.campaign;this.show("Inventory and equipment","Equip weapons, inspect loot and use potions.");
   const inv=c.content.inventory.snapshot();
   for(const {slot,id} of inv.equipment)this.line(slot.toUpperCase(),c.content.catalog.get(id).label,"Equipped",()=>{},true);
   for(const {id,count} of inv.items){
     const item=c.content.catalog.get(id);
     const button=["weapon","armor"].includes(item.kind)?"Equip":item.kind==="consumable"?"Use":null;
     this.line(item.label+" × "+count,item.kind+" · "+item.weight+" weight",button,()=>{
       const success=item.kind==="consumable"?c.potion():c.equip(id,item.kind);
       this.status(success?"Inventory updated.":"Cannot use or equip this item.");this.inventory();
     });
   }
   if(!inv.items.length)this.line("No unequipped items","Defeat enemies to discover loot.");
 }
 quests(){
   const c=this.campaign;this.show("Quest journal","Complete objectives and claim XP or item rewards.");
   for(const q of c.snapshot().questDetails){
     const button=q.status==="completed"?"Claim":null;
     this.line(q.title,q.description+" · "+q.progress+"/"+q.target+" · "+q.status+" · "+q.experience+" XP",
       button,()=>{if(!c.claim(q.id))this.status("Quest claim blocked by inventory capacity.");this.quests();});
   }
 }
 craft(){
   const c=this.campaign;this.show("Rift forge","Use Rift Shards and other materials to craft gear.");
   for(const recipe of c.recipes()){
     const parts=recipe.ingredients.map(i=>c.content.catalog.get(i.id).label+" × "+i.quantity).join(" + ");
     this.line(c.content.catalog.get(recipe.output).label,parts,
       recipe.available?"Craft":"Need materials",()=>{if(!c.craft(recipe.output))this.status("Not enough materials.");this.craft();},!recipe.available);
   }
 }
 dialogue(nodeId="elder",node=null){
   const c=this.campaign;if(!c.canTalk()){this.status("Keeper Nara is near the southern gate. Get closer to talk.");return;}
   const current=node||c.talk(nodeId);
   if(!current){this.hide();return;}
   this.show(current.speaker,current.text);
   current.choices.forEach((choice,index)=>{
     this.line(choice.label,"","Choose",()=>{
       const next=c.talk(current.id,index);
       if(next)this.dialogue(next.id,next);else this.hide();
     });
   });
   if(!current.choices.length)this.line("Continue the adventure","Come back whenever you need guidance.","Close",()=>this.hide());
 }
 action(action){
   const c=this.campaign;if(!c)return;
   if(action==="inventory")return this.inventory();
   if(action==="quests")return this.quests();
   if(action==="craft")return this.craft();
   if(action==="dialogue")return this.dialogue();
   if(action==="potion"){this.status(c.potion()?"Healed using a potion.":"No potion available.");return;}
   if(action==="save"){try{c.save("quick");this.status("Progress saved locally.");}catch(e){this.status("Save failed: "+e.message);}return;}
   if(action==="load"){try{this.status(c.load("quick")?"Progress restored.":"No quick save in this browser.");}catch(e){this.status("Load failed: "+e.message);}return;}
   if(action==="audio"){const muted=c.toggleMute();this.status(muted?"Sound muted.":"Sound enabled.");return;}
 }
 update(snapshot){
   const c=snapshot?.campaign;if(!c)return;
   this.xp.textContent="⭐ "+c.experience+" XP";
   this.questCount.textContent="📜 "+c.questDetails.filter(q=>q.status==="active"||q.status==="completed").length+" QUESTS";
 }
 dispose(){this.abort.abort();for(const node of this.nodes)node.remove();this.nodes=[];this.modal=null;}
}
return {RiftfallUI};
});