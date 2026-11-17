/* Phase 25: reusable deterministic combat and equipment state.
 * Game-specific damage, stamina and cooldown values belong in HiroGlifx .scroll.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroCombat=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const ID=/^[a-z][\w-]{0,39}$/;
const finite=(v,min,max,label)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+label);return v;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
class CombatWorld{
 constructor(){this.actors=new Map();this.cooldowns=new Map();this.events=[];this.listeners=new Set();this.elapsed=0;}
 create(id,{health=100,stamina=100,armor=0,team="neutral",x=0,z=0}={}){
   if(!ID.test(id)||this.actors.has(id)||!ID.test(team))throw Error("Invalid combat actor");
   const actor={id,health:finite(health,1,10000,"health"),maxHealth:health,stamina:finite(stamina,0,1000,"stamina"),
     maxStamina:stamina,armor:finite(armor,0,1000,"armor"),team,x:finite(x,-1000,1000,"x"),
     z:finite(z,-1000,1000,"z"),alive:true,equipment:new Map(),status:new Map()};
   this.actors.set(id,actor);return actor;
 }
 actor(id){const a=this.actors.get(id);if(!a)throw Error("Unknown actor "+id);return a;}
 equip(id,slot,item){
   if(!["weapon","armor","accessory"].includes(slot)||!item||typeof item!=="object"||!ID.test(item.id))
     throw Error("Invalid equipment");
   const actor=this.actor(id);
   actor.equipment.set(slot,Object.freeze({id:item.id,damage:finite(item.damage||0,0,1000,"damage"),
      defense:finite(item.defense||0,0,1000,"defense")}));
   return actor;
 }
 onEvent(callback){if(typeof callback!=="function")throw Error("Event listener required");this.listeners.add(callback);return ()=>this.listeners.delete(callback);}
 emit(type,detail){const e=Object.freeze({type,time:this.elapsed,...detail});this.events.push(e);if(this.events.length>500)this.events.shift();for(const cb of this.listeners)cb(e);return e;}
 strike(attackerId,targetId,{damage=20,range=2.3,cost=15,cooldown=.55,knockback=0}={}){
   const attacker=this.actor(attackerId),target=this.actor(targetId);
   [damage,range,cost,cooldown,knockback].forEach((v,i)=>finite(v,0,i===0?10000:1000,["damage","range","cost","cooldown","knockback"][i]));
   if(!attacker.alive||!target.alive||attacker.team===target.team||attacker.stamina<cost)return {hit:false,reason:"blocked"};
   if(distance(attacker,target)>range)return {hit:false,reason:"out-of-range"};
   if((this.cooldowns.get(attackerId)||0)>this.elapsed)return {hit:false,reason:"cooldown"};
   attacker.stamina-=cost;this.cooldowns.set(attackerId,this.elapsed+cooldown);
   const weapon=attacker.equipment.get("weapon")?.damage||0;
   const protection=target.armor+(target.equipment.get("armor")?.defense||0);
   const effective=Math.max(1,Math.round((damage+weapon)*100/(100+protection)));
   target.health=Math.max(0,target.health-effective);target.alive=target.health>0;
   const event=this.emit("hit",{attacker:attackerId,target:targetId,damage:effective,remaining:target.health,knockback});
   if(!target.alive)this.emit("defeat",{actor:targetId,killer:attackerId});
   return {hit:true,damage:effective,event};
 }
 heal(id,amount){const a=this.actor(id);finite(amount,0,10000,"heal");if(!a.alive)return 0;a.health=Math.min(a.maxHealth,a.health+amount);this.emit("heal",{actor:id,health:a.health});return a.health;}
 status(id,name,{duration=2,power=1}={}){
   if(!["poison","slow","stun","regen"].includes(name))throw Error("Unknown status");
   finite(duration,.01,120,"duration");finite(power,0,1000,"power");
   this.actor(id).status.set(name,{ends:this.elapsed+duration,power});this.emit("status",{actor:id,name});return true;
 }
 tick(dt,{regen=12}={}){
   finite(dt,0,.1,"frame delta");finite(regen,0,1000,"regen");
   this.elapsed+=dt;
   for(const a of this.actors.values()){
     if(!a.alive)continue;
     a.stamina=Math.min(a.maxStamina,a.stamina+regen*dt);
     for(const [name,s] of a.status){
       if(this.elapsed>=s.ends){a.status.delete(name);continue;}
       if(name==="poison"){a.health=Math.max(0,a.health-s.power*dt);if(a.health===0){a.alive=false;this.emit("defeat",{actor:a.id,killer:"poison"});}}
       if(name==="regen")a.health=Math.min(a.maxHealth,a.health+s.power*dt);
     }
   }
 }
 snapshot(){return [...this.actors.values()].map(a=>({id:a.id,health:a.health,stamina:a.stamina,team:a.team,alive:a.alive,x:a.x,z:a.z}));}
}
return {CombatWorld,distance};
});