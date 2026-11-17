/* Phase 26: bounded grid navigation, A* pathfinding and reusable behavior-tree runtime. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroAI=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const finite=(n,label)=>{if(typeof n!=="number"||!Number.isFinite(n))throw Error("Invalid "+label);return n;};
const key=(x,z)=>x+","+z;
class NavigationGrid{
 constructor({width=30,height=30,cellSize=1,originX=0,originZ=0}={}){
   if(!Number.isInteger(width)||width<2||width>100||!Number.isInteger(height)||height<2||height>100)
     throw Error("Invalid navigation bounds");
   this.width=width;this.height=height;this.cellSize=finite(cellSize,"cellSize");
   if(cellSize<=0)throw Error("cellSize must be positive");
   this.originX=originX;this.originZ=originZ;this.blocked=new Set();
 }
 inside(x,z){return Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<this.width&&z<this.height;}
 setBlocked(x,z,value=true){if(!this.inside(x,z))throw Error("Nav point outside grid");if(value)this.blocked.add(key(x,z));else this.blocked.delete(key(x,z));}
 walkable(x,z){return this.inside(x,z)&&!this.blocked.has(key(x,z));}
 cell(x,z){return {x:Math.floor((x-this.originX)/this.cellSize),z:Math.floor((z-this.originZ)/this.cellSize)};}
 world(x,z){return {x:this.originX+(x+.5)*this.cellSize,z:this.originZ+(z+.5)*this.cellSize};}
 path(from,to,{diagonal=true,maxNodes=10000}={}){
   const a=this.cell(from.x,from.z),b=this.cell(to.x,to.z);
   if(!this.walkable(a.x,a.z)||!this.walkable(b.x,b.z))return [];
   const first=key(a.x,a.z),end=key(b.x,b.z);
   if(first===end)return [this.world(a.x,a.z)];
   const h=(x,z)=>Math.hypot(x-b.x,z-b.z);
   const open=[{x:a.x,z:a.z,g:0,f:h(a.x,a.z)}],seen=new Map([[first,0]]),came=new Map();
   const steps=[[1,0],[-1,0],[0,1],[0,-1],...(diagonal?[[1,1],[1,-1],[-1,1],[-1,-1]]:[])];
   let searched=0;
   while(open.length&&searched++<maxNodes){
     open.sort((x,y)=>x.f-y.f);
     const node=open.shift(),id=key(node.x,node.z);
     if(node.g!==seen.get(id))continue;
     if(id===end){
       const result=[b];let cursor=id;
       while(cursor!==first){cursor=came.get(cursor);if(cursor===undefined)return [];const [x,z]=cursor.split(",").map(Number);result.push({x,z});}
       return result.reverse().map(p=>this.world(p.x,p.z));
     }
     for(const [dx,dz] of steps){
       const x=node.x+dx,z=node.z+dz;
       if(!this.walkable(x,z))continue;
       // Prevent diagonal corner cutting through solid cells.
       if(dx&&dz&&(!this.walkable(node.x+dx,node.z)||!this.walkable(node.x,node.z+dz)))continue;
       const id2=key(x,z),g=node.g+Math.hypot(dx,dz);
       if(g>=(seen.get(id2)??Infinity))continue;
       seen.set(id2,g);came.set(id2,id);open.push({x,z,g,f:g+h(x,z)});
     }
   }
   return [];
 }
}
const SUCCESS="success",FAILURE="failure",RUNNING="running";
function node(def){
 if(!def||typeof def!=="object")throw Error("Invalid behavior tree node");
 const name=def.type;
 if(!["sequence","selector","condition","action","cooldown"].includes(name))throw Error("Unknown behavior tree node "+name);
 if(["sequence","selector"].includes(name)){
   if(!Array.isArray(def.children)||!def.children.length||def.children.length>32)throw Error("Composite node needs 1–32 children");
   return {type:name,children:def.children.map(node)};
 }
 if(name==="cooldown"){
   if(typeof def.seconds!=="number"||def.seconds<0||def.seconds>120)throw Error("Invalid cooldown");
   return {type:name,seconds:def.seconds,child:node(def.child),next:0};
 }
 if(typeof def.name!=="string"||!/^[a-z][\w-]{0,39}$/.test(def.name))throw Error("Invalid behavior node name");
 return {type:name,name:def.name};
}
class BehaviorTree{
 constructor(definition,{conditions={},actions={}}={}){
   this.root=node(definition);this.conditions=conditions;this.actions=actions;this.time=0;
 }
 _tick(n,context){
   if(n.type==="sequence"){
     for(const child of n.children){const result=this._tick(child,context);if(result!==SUCCESS)return result;}return SUCCESS;
   }
   if(n.type==="selector"){
     for(const child of n.children){const result=this._tick(child,context);if(result!==FAILURE)return result;}return FAILURE;
   }
   if(n.type==="cooldown"){
     if(this.time<n.next)return FAILURE;
     const value=this._tick(n.child,context);
     if(value===SUCCESS)n.next=this.time+n.seconds;
     return value;
   }
   const fn=(n.type==="condition"?this.conditions:this.actions)[n.name];
   if(typeof fn!=="function")throw Error("Unregistered behavior "+n.type+": "+n.name);
   const result=fn(context);
   if(result===RUNNING||result===FAILURE||result===SUCCESS)return result;
   if(n.type==="condition"&&typeof result==="boolean")return result?SUCCESS:FAILURE;
   throw Error("Behavior nodes must return success, failure, running (or boolean condition)");
 }
 tick(context,dt){
   finite(dt,"AI frame delta");if(dt<0||dt>.2)throw Error("Invalid AI frame delta");
   this.time+=dt;return this._tick(this.root,context);
 }
}
class NavigationAgent{
 constructor({grid,speed=2.5,position={x:1,z:1},route=null}){
   if(!(grid instanceof NavigationGrid))throw Error("Agent requires NavigationGrid");
   this.grid=grid;this.speed=finite(speed,"speed");this.position={...position};
   if(route!==null&&typeof route!=="function")throw Error("Invalid external navigation path provider");
   this.route=route;this.path=[];this.lastGoal=null;this.repaths=0;
 }
 navigate(target){
   const targetCell=this.grid.cell(target.x,target.z);
   const id=key(targetCell.x,targetCell.z);
   if(id!==this.lastGoal||!this.path.length){
     const path=this.route?this.route(this.position,target):this.grid.path(this.position,target);
     if(!Array.isArray(path)||path.length>500||path.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)))
       throw Error("Invalid navigation route result");
     this.path=path;
     this.lastGoal=id;this.repaths++;
   }
   return this.path.length>0;
 }
 tick(dt){
   finite(dt,"delta");if(dt<0||dt>.2)throw Error("Invalid delta");
   let remain=dt*this.speed;
   while(this.path.length&&remain>0){
     const p=this.path[0],dist=Math.hypot(p.x-this.position.x,p.z-this.position.z);
     if(dist<.04){this.path.shift();continue;}
     const step=Math.min(remain,dist);
     this.position.x+=(p.x-this.position.x)/dist*step;
     this.position.z+=(p.z-this.position.z)/dist*step;
     remain-=step;
     if(step===dist)this.path.shift();
   }
   return this.position;
 }
}
return {NavigationGrid,NavigationAgent,BehaviorTree,SUCCESS,FAILURE,RUNNING};
});