/* HiroGlifx RPG systems — data-driven inventory, crafting, quests and dialogue.
 * Stateful JavaScript implements generic storage/lifecycle. Game items and quest
 * definitions are supplied by authored HiroGlifx .scroll data.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroProgression=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const ID=/^[a-z][a-z0-9-]{0,63}$/;
const INT=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)throw Error("Invalid "+label);return v;};
function requiredId(value){if(typeof value!=="string"||!ID.test(value))throw Error("Invalid ID");return value;}
class ItemCatalog{
 constructor(definitions=[]){
   this.items=new Map();
   for(const entry of definitions){
     if(!entry||this.items.has(entry.id))throw Error("Duplicate item ID");
     const id=requiredId(entry.id);
     if(!["weapon","armor","consumable","material","quest"].includes(entry.kind))throw Error("Invalid item kind");
     const maxStack=INT(entry.maxStack||1,1,99,"maxStack");
     const weight=Number(entry.weight??.1);
     if(!Number.isFinite(weight)||weight<0||weight>100)throw Error("Invalid item weight");
     const damage=INT(entry.damage||0,0,1000,"damage"),defense=INT(entry.defense||0,0,1000,"defense");
     const heal=INT(entry.heal||0,0,1000,"heal");
     this.items.set(id,Object.freeze({id,kind:entry.kind,label:String(entry.label||id).slice(0,80),
       maxStack,weight,damage,defense,heal}));
   }
 }
 get(id){requiredId(id);const item=this.items.get(id);if(!item)throw Error("Unknown item: "+id);return item;}
}
class Inventory{
 constructor(catalog,{slots=18,maxWeight=70}={}){
   if(!(catalog instanceof ItemCatalog))throw Error("Inventory requires catalog");
   this.catalog=catalog;this.slots=INT(slots,1,120,"inventory slots");
   if(typeof maxWeight!=="number"||!Number.isFinite(maxWeight)||maxWeight<=0||maxWeight>10000)throw Error("Invalid maxWeight");
   this.maxWeight=maxWeight;this.items=new Map();this.equipment=new Map();this.listeners=new Set();
 }
 onChange(fn){if(typeof fn!=="function")throw Error("Listener required");this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 emit(){for(const fn of this.listeners)fn(this.snapshot());}
 count(id){return this.items.get(this.catalog.get(id).id)||0;}
 weight(){let total=0;for(const [id,n] of this.items)total+=this.catalog.get(id).weight*n;for(const id of this.equipment.values())total+=this.catalog.get(id).weight;return total;}
 canAdd(id,amount=1){
   const item=this.catalog.get(id);INT(amount,1,9999,"amount");
   const current=this.count(id);
   return current+amount<=item.maxStack&&
     (this.items.has(id)||this.items.size<this.slots)&&
     this.weight()+item.weight*amount<=this.maxWeight+1e-8;
 }
 add(id,n=1){if(!this.canAdd(id,n))return false;this.items.set(id,this.count(id)+n);this.emit();return true;}
 remove(id,n=1){
   INT(n,1,9999,"amount");if(this.count(id)<n)return false;
   const left=this.count(id)-n;if(left)this.items.set(id,left);else this.items.delete(id);
   this.emit();return true;
 }
 equip(id,slot){
   if(!["weapon","armor","accessory"].includes(slot))throw Error("Invalid equipment slot");
   const item=this.catalog.get(id);
   if(!["weapon","armor"].includes(item.kind)||item.kind!==slot&&slot!=="accessory")return false;
   if(!this.count(id))return false;
   const previous=this.equipment.get(slot);
   if(previous&&!this.canAdd(previous,1)&&previous!==id)return false;
   this.remove(id,1);
   if(previous)this.add(previous,1);
   this.equipment.set(slot,id);this.emit();return true;
 }
 unequip(slot){
   const id=this.equipment.get(slot);if(!id||!this.canAdd(id))return false;
   this.equipment.delete(slot);this.add(id);this.emit();return true;
 }
 craft(recipe){
   if(!recipe||!Array.isArray(recipe.ingredients)||typeof recipe.output!=="string")throw Error("Invalid recipe");
   const ingredientCounts=new Map();
   for(const part of recipe.ingredients){
     this.catalog.get(part.id);
     INT(part.quantity,1,99,"ingredient quantity");
     ingredientCounts.set(part.id,(ingredientCounts.get(part.id)||0)+part.quantity);
   }
   const out=this.catalog.get(recipe.output),quantity=INT(recipe.quantity||1,1,99,"output quantity");
   for(const [id,n] of ingredientCounts)if(this.count(id)<n)return false;
   const staged=new Map(this.items);
   for(const [id,n] of ingredientCounts){
     const left=staged.get(id)-n;if(left)staged.set(id,left);else staged.delete(id);
   }
   staged.set(out.id,(staged.get(out.id)||0)+quantity);
   if(staged.size>this.slots||staged.get(out.id)>out.maxStack)return false;
   let weight=0;for(const [id,n] of staged)weight+=this.catalog.get(id).weight*n;
   for(const id of this.equipment.values())weight+=this.catalog.get(id).weight;
   if(weight>this.maxWeight)return false;
   this.items=staged;this.emit();return true;
 }
 consume(id){
   const item=this.catalog.get(id);
   if(item.kind!=="consumable"||!this.count(id))return null;
   this.remove(id,1);return item;
 }
 snapshot(){return {items:[...this.items].map(([id,count])=>({id,count})),
   equipment:[...this.equipment].map(([slot,id])=>({slot,id})),slots:this.slots,weight:this.weight()};}
 restore(snapshot){
   if(!snapshot||!Array.isArray(snapshot.items)||!Array.isArray(snapshot.equipment)||
     snapshot.items.length>this.slots||snapshot.equipment.length>3)throw Error("Invalid inventory save");
   const items=new Map(),equip=new Map();
   for(const {id,count} of snapshot.items){
     const def=this.catalog.get(id);INT(count,1,def.maxStack,"saved item count");
     if(items.has(id))throw Error("Duplicate inventory save item");
     items.set(id,count);
   }
   for(const {slot,id} of snapshot.equipment){
     if(!["weapon","armor","accessory"].includes(slot)||equip.has(slot)||!["weapon","armor"].includes(this.catalog.get(id).kind))
       throw Error("Invalid saved equipment");
     equip.set(slot,id);
   }
   let weight=0;
   for(const [id,count] of items)weight+=count*this.catalog.get(id).weight;
   for(const id of equip.values())weight+=this.catalog.get(id).weight;
   if(weight>this.maxWeight)throw Error("Saved inventory exceeds weight limit");
   this.items=items;this.equipment=equip;this.emit();return this;
 }
}
class QuestJournal{
 constructor(specifications=[],{inventory=null}={}){
   this.specs=new Map();this.inventory=inventory;
   this.entries=new Map();this.experience=0;this.listeners=new Set();
   for(const q of specifications){
     const id=requiredId(q.id);if(this.specs.has(id))throw Error("Duplicate quest");
     if(!Array.isArray(q.objectives)||q.objectives.length<1||q.objectives.length>8)throw Error("Invalid objectives");
     const objectives=q.objectives.map(o=>{
       if(!["defeat","collect","craft","reach","talk"].includes(o.type))throw Error("Invalid objective type");
       return {type:o.type,id:requiredId(o.id),target:INT(o.target,1,200,"target")};
     });
     const prerequisite=q.prerequisite?requiredId(q.prerequisite):null;
     const rewards=(q.rewards||[]).map(r=>({id:requiredId(r.id),quantity:INT(r.quantity,1,99,"reward")}));
     const experience=INT(q.experience||0,0,100000,"quest xp");
     this.specs.set(id,Object.freeze({id,title:String(q.title||id).slice(0,90),
       description:String(q.description||"").slice(0,300),prerequisite,
       objectives,rewards,experience}));
   }
 }
 onChange(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 emit(){for(const fn of this.listeners)fn(this.snapshot());}
 accept(id){
   const q=this.specs.get(id);if(!q||this.entries.has(id))return false;
   if(q.prerequisite&&this.entries.get(q.prerequisite)?.status!=="claimed")return false;
   this.entries.set(id,{status:"active",progress:q.objectives.map(()=>0)});
   this.emit();return true;
 }
 record(type,id,quantity=1){
   INT(quantity,1,200,"event quantity");let changed=false;
   for(const [questId,entry] of this.entries){
     if(entry.status!=="active")continue;
     const q=this.specs.get(questId);
     q.objectives.forEach((o,i)=>{
       if(o.type===type&&o.id===id){
         entry.progress[i]=Math.min(o.target,entry.progress[i]+quantity);
         changed=true;
       }
     });
     if(entry.progress.every((n,i)=>n>=q.objectives[i].target))entry.status="completed";
   }
   if(changed)this.emit();
   return changed;
 }
 claim(id){
   const entry=this.entries.get(id),q=this.specs.get(id);
   if(!q||entry?.status!=="completed")return false;
   // First verify the entire reward batch can fit, not just each item in isolation.
   if(q.rewards.length&&this.inventory){
     const trial=new Map(this.inventory.items);
     let weight=this.inventory.weight();
     for(const {id:rewardId,quantity} of q.rewards){
       const def=this.inventory.catalog.get(rewardId),value=(trial.get(rewardId)||0)+quantity;
       trial.set(rewardId,value);weight+=def.weight*quantity;
       if(value>def.maxStack)return false;
     }
     if(trial.size>this.inventory.slots||weight>this.inventory.maxWeight)return false;
     this.inventory.items=trial;this.inventory.emit();
   }
   entry.status="claimed";this.experience+=q.experience;this.emit();return true;
 }
 snapshot(){return {entries:[...this.entries].map(([id,e])=>({id,status:e.status,progress:[...e.progress]})),experience:this.experience};}
 restore(saved){
   if(!saved||!Array.isArray(saved.entries)||saved.entries.length>this.specs.size)throw Error("Invalid quest save");
   const entries=new Map();
   for(const e of saved.entries){
     const q=this.specs.get(e.id);
     if(!q||entries.has(e.id)||!["active","completed","claimed"].includes(e.status)||
        !Array.isArray(e.progress)||e.progress.length!==q.objectives.length)throw Error("Corrupt quest entry");
     e.progress.forEach((n,i)=>INT(n,0,q.objectives[i].target,"progress"));
     entries.set(e.id,{status:e.status,progress:[...e.progress]});
   }
   this.experience=INT(saved.experience,0,1e7,"experience");
   this.entries=entries;this.emit();return this;
 }
}
class DialogueTree{
 constructor(nodes){
   if(!Array.isArray(nodes)||nodes.length>80)throw Error("Invalid dialogue");
   this.nodes=new Map();
   for(const n of nodes){
     if(this.nodes.has(n.id))throw Error("Duplicate dialogue id");
     requiredId(n.id);
     if(!Array.isArray(n.choices)||n.choices.length>6)throw Error("Invalid dialogue choices");
     this.nodes.set(n.id,{id:n.id,speaker:String(n.speaker||"NPC").slice(0,80),
       text:String(n.text||"").slice(0,600),
       choices:n.choices.map(c=>({label:String(c.label||"").slice(0,100),next:c.next?requiredId(c.next):null,
         quest:c.quest?requiredId(c.quest):null}))});
   }
 }
 open(id){return this.nodes.get(id)||null;}
 choose(current,index,{journal}={}){
   const node=this.open(current),choice=node?.choices[index];if(!choice)return null;
   if(choice.quest&&journal)journal.accept(choice.quest);
   return choice.next?this.open(choice.next):null;
 }
}
return {ItemCatalog,Inventory,QuestJournal,DialogueTree};
});