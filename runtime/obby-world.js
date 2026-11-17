/* Deterministic browser-only tile obstacle course model.
 * No dependency on Babylon: rendering is a separate adapter.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroObby=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ID=/^[A-Za-z][A-Za-z0-9_]*$/;
 const KINDS=new Set(["solid","lava","checkpoint","finish"]);
 function number(value,label,min=-1000,max=1000){
   if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)
     throw new Error("Invalid "+label);
   return value;
 }
 function overlap1(a,aw,b,bw){return a+aw/2>b-bw/2&&a-aw/2<b+bw/2;}
 class ObbyWorld{
   constructor(){
     this.kind="obby-world";this.tiles=new Map();this.player=null;
     this.gravity=-22;this.jumpSpeed=9.8;this.moveSpeed=6;
     this.elapsed=0;this.dead=0;this.completed=false;this.checkpoint=null;
     this.listeners=new Map();this.history=[];
   }
   on(event,callback){
     if(!["land","fall","checkpoint","finish","respawn","jump","stage"].includes(event)||typeof callback!=="function")
       throw new Error("Unknown obby event");
     const listeners=this.listeners.get(event)||new Set();
     listeners.add(callback);this.listeners.set(event,listeners);
     return ()=>listeners.delete(callback);
   }
   emit(type,detail={}){
     const event={type,elapsed:this.elapsed,...detail};this.history.push(event);
     if(this.history.length>200)this.history.shift();
     for(const listener of this.listeners.get(type)||[])listener(event);
   }
   tile(id,x,y,z,size=3,kind="solid"){
     if(typeof id!=="string"||!ID.test(id)||this.tiles.has(id))throw new Error("Invalid/duplicate tile");
     if(!KINDS.has(kind))throw new Error("Unknown tile type "+kind);
     const tile={id,kind,x:number(x,"x"),y:number(y,"y"),z:number(z,"z"),
       size:number(size,"size",0.5,20),height:0.6};
     this.tiles.set(id,tile);return tile;
   }
   spawn(id,x,y,z){
     if(this.player)throw new Error("Player already exists");
     if(typeof id!=="string"||!ID.test(id))throw new Error("Invalid player ID");
     this.player={id,x:number(x,"x"),y:number(y,"y"),z:number(z,"z"),
       vx:0,vy:0,vz:0,radius:0.35,height:1.4,grounded:false,standing:null};
     this.checkpoint={x,y,z};return this.player;
   }
   setInput(x,z){
     if(!this.player)throw new Error("Player not spawned");
     this.player.vx=number(x,"input x",-1,1);
     this.player.vz=number(z,"input z",-1,1);
   }
   jump(){
     const p=this.player;if(!p)throw new Error("Player not spawned");
     if(!p.grounded||this.completed)return false;
     p.vy=this.jumpSpeed;p.grounded=false;p.standing=null;return true;
   }
   reset(){
     if(!this.player||!this.checkpoint)throw new Error("Player not spawned");
     const p=this.player;Object.assign(p,{...this.checkpoint,vx:0,vy:0,vz:0,grounded:false,standing:null});
     this.dead+=1;this.emit("respawn",{deaths:this.dead});return p;
   }
   step(seconds){
     if(!this.player)throw new Error("Player not spawned");
     const dt=number(seconds,"frame delta",0,0.05);
     if(!dt||this.completed)return;
     this.elapsed+=dt;
     const p=this.player,prevFeet=p.y-p.height/2;
     p.x+=p.vx*this.moveSpeed*dt;p.z+=p.vz*this.moveSpeed*dt;
     p.vy+=this.gravity*dt;p.y+=p.vy*dt;
     let supporting=null,highest=-Infinity;
     if(p.vy<=0){
       for(const tile of this.tiles.values()){
         if(tile.active===false)continue;
         const top=tile.y+tile.height/2;
         const crossing=prevFeet>=top-0.08&&(p.y-p.height/2)<=top;
         if(crossing&&overlap1(p.x,p.radius*2,tile.x,tile.size)&&
           overlap1(p.z,p.radius*2,tile.z,tile.size)&&top>highest){
           highest=top;supporting=tile;
         }
       }
     }
     if(supporting){
       if(supporting.kind==="lava"){this.emit("fall",{reason:"lava"});this.reset();return;}
       p.y=highest+p.height/2;p.vy=0;
       const wasStanding=p.standing;
       p.grounded=true;p.standing=supporting.id;
       if(wasStanding!==supporting.id)this.emit("land",{tile:supporting.id});
       if(supporting.kind==="checkpoint"&&(!this.checkpoint||this.checkpoint.tile!==supporting.id)){
         this.checkpoint={tile:supporting.id,x:supporting.x,y:highest+p.height/2+0.2,z:supporting.z};
         this.emit("checkpoint",{tile:supporting.id});
       }
       if(supporting.kind==="finish"){
         this.completed=true;this.emit("finish",{time:this.elapsed,deaths:this.dead});
       }
     }else{p.grounded=false;p.standing=null;}
     if(p.y < -18){this.emit("fall",{reason:"void"});this.reset();}
   }
 }
 return {ObbyWorld,overlap1};
});