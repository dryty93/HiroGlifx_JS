/* Loads real authored .scroll content into engine inventory, recipes, quests and dialogue.
 * All game-specific items and objectives are data returned from HiroGlifx.
 */
(function(root,factory){
 const world=typeof module==="object"&&module.exports?require("./scroll-world-rules"):root.HiroWorldRules;
 const prog=typeof module==="object"&&module.exports?require("./game-progression"):root.HiroProgression;
 const api=factory(world,prog);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGameContent=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(world,prog){
"use strict";
const requireArray=(value,length,label)=>{
 if(!Array.isArray(value)||(length!==null&&value.length!==length))throw Error("Invalid "+label+" in content.scroll");
 return value;
};
const itemFrom=a=>{
 requireArray(a,8,"item");
 const [id,kind,label,maxStack,weight,damage,defense,heal]=a;
 return {id,kind,label,maxStack,weight,damage,defense,heal};
};
function buildContent(source){
 const rules=new world.WorldRules(source,{name:"riftfall-content"});
 const catalog=new prog.ItemCatalog(requireArray(rules.get("items"),null,"catalog").map(itemFrom));
 const recipes=new Map();
 for(const row of requireArray(rules.get("recipes"),null,"recipes")){
   if(!Array.isArray(row)||row.length<3||typeof row[0]!=="string")throw Error("Invalid recipe");
   if(recipes.has(row[0]))throw Error("Duplicate recipe "+row[0]);
   catalog.get(row[0]);
   const ingredients=row.slice(2).map(part=>{
     requireArray(part,2,"ingredient");catalog.get(part[0]);return {id:part[0],quantity:part[1]};
   });
   recipes.set(row[0],{output:row[0],quantity:row[1],ingredients});
 }
 const definitions=requireArray(rules.get("quests"),null,"quests").map(row=>{
   requireArray(row,10,"quest");
   const [id,title,description,type,targetId,targetCount,prerequisite,experience,rewardId,rewardQuantity]=row;
   catalog.get(rewardId);
   return {id,title,description,objectives:[{type,id:targetId,target:targetCount}],
     prerequisite:prerequisite||null,experience,rewards:[{id:rewardId,quantity:rewardQuantity}]};
 });
 const dialogues=requireArray(rules.get("dialogue"),null,"dialogue").map(row=>{
   if(!Array.isArray(row)||row.length<3)throw Error("Invalid dialogue");
   return {id:row[0],speaker:row[1],text:row[2],choices:row.slice(3).map(choice=>{
     requireArray(choice,3,"dialogue choice");
     return {label:choice[0],next:choice[1]||null,quest:choice[2]||null};
   })};
 });
 const inventory=new prog.Inventory(catalog,{slots:18,maxWeight:70});
 const quests=new prog.QuestJournal(definitions,{inventory});
 const dialogue=new prog.DialogueTree(dialogues);
 return {rules,catalog,inventory,quests,dialogue,recipes};
}
class GameContent{
 constructor(source){
   Object.assign(this,buildContent(source));
   this.events=[];this._started=false;
 }
 starter(){
   if(this._started)return this;
   this._started=true;
   this.inventory.add("training-sword");
   this.inventory.equip("training-sword","weapon");
   this.inventory.add("healing-potion",2);
   this.inventory.add("wood",1);
   this.inventory.add("healing-herb",2);
   for(const id of ["first-blood","rift-smith","explorer"])this.quests.accept(id);
   return this;
 }
 collect(id,qty=1){
   if(!this.inventory.add(id,qty))return false;
   this.quests.record("collect",id,qty);
   this.events.push({type:"collect",id,quantity:qty});
   return true;
 }
 defeated(type="raider",index=0){
   this.quests.record("defeat",type,1);
   const drops=["rift-shard","healing-herb","rift-shard","wood"];
   const id=drops[index%drops.length];this.collect(id,1);
   this.events.push({type:"defeat",id:type,index});
   return id;
 }
 craft(id){
   const recipe=this.recipes.get(id);if(!recipe)return false;
   if(!this.inventory.craft(recipe))return false;
   this.quests.record("craft",id,recipe.quantity);
   this.events.push({type:"craft",id});return true;
 }
 reach(id){this.quests.record("reach",id,1);this.events.push({type:"reach",id});}
 talk(current,index){
   const node=this.dialogue.choose(current,index,{journal:this.quests});
   this.events.push({type:"talk",id:current,index});
   this.quests.record("talk",current,1);
   return node;
 }
 consume(id){const item=this.inventory.consume(id);if(item)this.events.push({type:"consume",id});return item;}
 claim(id){const granted=this.quests.claim(id);if(granted)this.events.push({type:"claim",id});return granted;}
 serialize(){return {inventory:this.inventory.snapshot(),quests:this.quests.snapshot()};}
 restore(snapshot){
   if(!snapshot||!snapshot.inventory||!snapshot.quests)throw Error("Invalid progression save");
   // Validate against temporary engine objects before modifying live state.
   const inv=new prog.Inventory(this.catalog,{slots:this.inventory.slots,maxWeight:this.inventory.maxWeight});
   inv.restore(snapshot.inventory);
   const quests=new prog.QuestJournal([...this.quests.specs.values()],{inventory:inv});
   quests.restore(snapshot.quests);
   this.inventory.restore(snapshot.inventory);this.quests.restore(snapshot.quests);
   this._started=true;return this;
 }
}
return {GameContent,buildContent};
});