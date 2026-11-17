/* Deterministic combat attack timing; actual balance supplied by HiroGlifx. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroAttackWindows=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 class AttackWindows{
  constructor({maxActors=48}={}){
   if(!Number.isInteger(maxActors)||maxActors<1||maxActors>512)throw Error("Invalid attack window capacity");
   this.maxActors=maxActors;this.active=new Map();
  }
  begin(id,{windup=.12,recovery=.3,onImpact,onEnd=()=>{}}={}){
   if(typeof id!=="string"||!/^[a-z][\w-]{0,39}$/.test(id)||
      !Number.isFinite(windup)||windup<0||windup>3||
      !Number.isFinite(recovery)||recovery<0||recovery>5||
      windup+recovery<=0||typeof onImpact!=="function"||typeof onEnd!=="function")
    throw Error("Invalid attack window");
   if(this.active.has(id)||this.active.size>=this.maxActors)return false;
   this.active.set(id,{remaining:windup+recovery,windup,impacted:false,onImpact,onEnd});
   return true;
  }
  tick(dt){
   if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error("Invalid attack frame delta");
   const callbacks=[];
   for(const [id,entry] of this.active){
    const prev=entry.remaining;entry.remaining=Math.max(0,entry.remaining-dt);
    // The hit begins after windup; even a zero-duration windup cannot double-fire.
    if(!entry.impacted&&entry.remaining<=entry.recovery){
     entry.impacted=true;callbacks.push(entry.onImpact);
    }
    if(entry.remaining<=0){
     this.active.delete(id);callbacks.push(entry.onEnd);
    }
   }
   for(const cb of callbacks)cb();
  }
  cancel(id){
   const e=this.active.get(id);if(!e)return false;
   this.active.delete(id);e.onEnd();return true;
  }
  has(id){return this.active.has(id);}
  snapshot(){return [...this.active].map(([id,e])=>({id,remaining:e.remaining,impacted:e.impacted}));}
  dispose(){this.active.clear();}
 }
 return {AttackWindows};
});
