/* Skybound gameplay progression over the HiroGlifx ObbyWorld.
 * Platform motion and stage state are deterministic, without a physics dependency.
 */
(function(root,factory){
 const basic=typeof module==="object"&&module.exports?require("./obby-world"):root.HiroObby;
 const api=factory(basic);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroSkybound=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(basic){
 "use strict";
 const {ObbyWorld}=basic;
 const valid=(value,min,max,label)=>{
   const num=Number(value);
   if(!Number.isFinite(num)||num<min||num>max)throw new Error("Invalid "+label);
   return num;
 };
 const stages=[
   {id:1,name:"Cloud Steps",description:"Find your rhythm",color:"#60a5fa"},
   {id:2,name:"Lava Run",description:"Stay off the red",color:"#fb7185"},
   {id:3,name:"Moving Skies",description:"Time your jump",color:"#a78bfa"},
   {id:4,name:"Vanishing Path",description:"Keep moving",color:"#38bdf8"},
   {id:5,name:"Final Ascent",description:"Reach the golden gate",color:"#fbbf24"}
 ];
 class SkyboundWorld extends ObbyWorld{
   constructor(){
     super();
     this.kind="obby-world";
     this.stages=stages.map(s=>({...s}));
     this.currentStage=1;
     this.bestStage=1;
     this.progress=0;
     this.motionTime=0;
     this.modifiers=new Map();
     this.telemetry={jumpCount:0,fallCount:0,stageTransitions:0};
     this.jumpBuffer=0;
     this.coyote=0;
     this.completedAt=null;
     this.fixedStep=1/120;
     this._accumulator=0;
     this._motionX=0;this._motionZ=0;
     this.groundAcceleration=28;this.airAcceleration=16;
     this.groundFriction=33;this.airFriction=7;
   }
   tile(id,x,y,z,size=3,kind="solid",stage=1){
     const tile=super.tile(id,x,y,z,size,kind);
     tile.stage=valid(stage,1,5,"stage");
     tile.active=true;
     return tile;
   }
   moving(id,x,y,z,size,axis,range,period,stage=3){
     if(!["x","z"].includes(axis))throw new Error("Moving platforms require x or z axis");
     const checkedRange=valid(range,.1,8,"range"),checkedPeriod=valid(period,.5,30,"period");
     const tile=this.tile(id,x,y,z,size,"solid",stage);
     this.modifiers.set(id,{type:"moving",axis,origin:tile[axis],
       range:checkedRange,period:checkedPeriod});
     return tile;
   }
   vanishing(id,x,y,z,size,delay,stage=4){
     const checkedDelay=valid(delay,.15,5,"delay");
     const tile=this.tile(id,x,y,z,size,"solid",stage);
     this.modifiers.set(id,{type:"vanishing",delay:checkedDelay,
       started:null,inactiveUntil:0});
     return tile;
   }
   spinner(id,x,y,z,size,range,period,stage=5){
     const checkedRange=valid(range,.1,5,"range"),checkedPeriod=valid(period,.5,15,"period");
     const tile=this.tile(id,x,y,z,size,"lava",stage);
     this.modifiers.set(id,{type:"spinner",centerX:tile.x,centerZ:tile.z,
       range:checkedRange,period:checkedPeriod});
     return tile;
   }
   jump(){
     const p=this.player;if(!p||this.completed)return false;
     if(p.grounded||this.coyote>0){
       if(!p.grounded&&this.coyote>0)p.grounded=true;
       const success=super.jump.call(this);
       if(success){this.coyote=0;this.telemetry.jumpCount++;this.emit("jump",{jumps:this.telemetry.jumpCount});}
       return success;
     }
     this.jumpBuffer=.13;
     return false;
   }
   reset(){
     const p=super.reset.call(this);
     this.jumpBuffer=0;this.coyote=0;
     this.telemetry.fallCount++;
     this._motionX=0;this._motionZ=0;this._accumulator=0;
     p.motionX=0;p.motionZ=0;
     return p;
   }
   step(dt){
     const delta=valid(dt,0,.05,"frame delta");
     if(!delta||this.completed)return;
     // Fixed 120 Hz physics with an accumulator avoids jump-height and collision
     // changes when the browser renders at 30, 60 or 120 FPS.
     this._accumulator+=delta;
     let steps=0;
     while(this._accumulator>=this.fixedStep-1e-9&&steps<8&&!this.completed){
       this._simulate(this.fixedStep);
       this._accumulator=Math.max(0,this._accumulator-this.fixedStep);
       steps++;
     }
   }
   _simulate(delta){
     const p=this.player;
     if(!p)throw new Error("Player not spawned");
     const priorGround=p.grounded;
     const oldPositions=new Map();
     this.motionTime+=delta;
     for(const [id,mod] of this.modifiers){
       const tile=this.tiles.get(id);
       if(!tile)continue;
       if(mod.type==="moving"||mod.type==="spinner"){
         oldPositions.set(id,{x:tile.x,z:tile.z});
         const phase=this.motionTime*Math.PI*2/mod.period;
         if(mod.type==="moving")tile[mod.axis]=mod.origin+Math.sin(phase)*mod.range;
         else{
           tile.x=mod.centerX+Math.sin(phase)*mod.range;
           tile.z=mod.centerZ+Math.cos(phase)*mod.range;
         }
       }else if(mod.type==="vanishing"){
         if(mod.started!==null&&this.motionTime-mod.started>=mod.delay){
           tile.active=false;mod.started=null;mod.inactiveUntil=this.motionTime+2.3;
         }
         if(!tile.active&&this.motionTime>=mod.inactiveUntil)tile.active=true;
       }
     }
     // Treat the platform as the supporting coordinate frame before integrating movement.
     if(priorGround&&p.standing&&oldPositions.has(p.standing)){
       const before=oldPositions.get(p.standing),current=this.tiles.get(p.standing);
       p.x+=current.x-before.x;p.z+=current.z-before.z;
     }
     const targetX=p.vx,targetZ=p.vz;
     const inputMagnitude=Math.hypot(targetX,targetZ);
     const speed=this.moveSpeed;
     const accelerate=(current,target,rate)=>{
       const difference=target-current;
       const maximum=rate*delta;
       return current+Math.max(-maximum,Math.min(maximum,difference));
     };
     const rate=(inputMagnitude>.001?(priorGround?this.groundAcceleration:this.airAcceleration):
       (priorGround?this.groundFriction:this.airFriction));
     this._motionX=accelerate(this._motionX,targetX*speed,rate);
     this._motionZ=accelerate(this._motionZ,targetZ*speed,rate);
     // Base ObbyWorld integrates p.vx/p.vz as normalized input. Feed it the smoothed
     // motion, then restore the caller's input for the following fixed frame.
     p.vx=this._motionX/speed;p.vz=this._motionZ/speed;
     this.coyote=priorGround?0.10:Math.max(0,this.coyote-delta);
     this.jumpBuffer=Math.max(0,this.jumpBuffer-delta);
     const deathCount=this.dead;
     super.step(delta);
     if(this.dead===deathCount){
       p.vx=targetX;p.vz=targetZ;
     }
     p.motionX=this._motionX;p.motionZ=this._motionZ;
     if(this.player.grounded&&this.jumpBuffer>0){
       this.jumpBuffer=0;
       this.jump();
     }
     const standing=this.tiles.get(this.player.standing);
     if(standing){
       const mod=this.modifiers.get(standing.id);
       if(mod?.type==="vanishing"&&mod.started===null&&standing.active)
         mod.started=this.motionTime;
       if(standing.stage>this.currentStage){
         this.currentStage=standing.stage;
         this.bestStage=Math.max(this.bestStage,standing.stage);
         this.telemetry.stageTransitions++;
         this.emit("stage",{stage:this.currentStage,title:this.stages[this.currentStage-1].name});
       }
       this.progress=Math.max(this.progress,standing.stage/5);
     }
     if(this.completed&&this.completedAt===null)this.completedAt=this.elapsed;
   }
   summary(){
     return {
       stage:this.currentStage,stageName:this.stages[this.currentStage-1].name,
       deaths:this.dead,time:this.elapsed,completed:this.completed,
       jumps:this.telemetry.jumpCount,progress:this.progress
     };
   }
 }
 return {SkyboundWorld,stages};
});