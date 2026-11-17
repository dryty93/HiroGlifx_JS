/* HiroGlifx original browser voxel world: deterministic terrain and editable blocks.
 * Model contains no DOM or Babylon dependency, so terrain/edit tests run in Node.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroVoxel=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const BLOCKS=["grass","dirt","stone","wood","leaves","sand","glass"];
 const SOLID=new Set(["grass","dirt","stone","wood","sand","glass"]);
 const COORD_LIMIT=64,MAX_BLOCKS=12000;
 const n=(v,min,max,label)=>{
   if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new Error("Invalid "+label);
   return v;
 };
 const pos=v=>{n(v,-COORD_LIMIT,COORD_LIMIT,"block coordinate");if(!Number.isInteger(v))throw new Error("Block coordinates must be integers");return v;};
 const key=(x,y,z)=>x+","+y+","+z;
 function rand(seed,x,z){
   let h=(seed^Math.imul(x,374761393)^Math.imul(z,668265263))|0;
   h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;
 }
 class VoxelWorld{
   constructor(seed=42){
     this.kind="voxel-world";this.seed=n(seed,0,2147483647,"seed")|0;
     this.blocks=new Map();this.player=null;this.radius=0;
     this.time=0;this.listeners=new Map();this.edits=0;this.selected="grass";
   }
   on(type,listener){
     if(!["change","mine","place","jump"].includes(type)||typeof listener!=="function")throw new Error("Invalid voxel event");
     const arr=this.listeners.get(type)||new Set();arr.add(listener);this.listeners.set(type,arr);
     return ()=>arr.delete(listener);
   }
   emit(type,data){for(const fn of this.listeners.get(type)||[])fn({type,...data});}
   at(x,y,z){return this.blocks.get(key(pos(x),pos(y),pos(z)))||null;}
   block(x,y,z,type,{silent=false,replace=false}={}){
     x=pos(x);y=pos(y);z=pos(z);
     if(!BLOCKS.includes(type))throw new Error("Unknown block type "+type);
     const id=key(x,y,z);
     if(this.blocks.has(id)&&!replace)throw new Error("Block already exists");
     if(!this.blocks.has(id)&&this.blocks.size>=MAX_BLOCKS)throw new Error("World block limit exceeded");
     this.blocks.set(id,type);if(!silent){this.edits++;this.emit("change",{x,y,z,type});}
     return {x,y,z,type};
   }
   remove(x,y,z){
     x=pos(x);y=pos(y);z=pos(z);
     const id=key(x,y,z),type=this.blocks.get(id);
     if(!type)return false;
     this.blocks.delete(id);this.edits++;this.emit("change",{x,y,z,type:null});this.emit("mine",{x,y,z,type});
     return true;
   }
   place(x,y,z,type=this.selected){
     if(this.at(x,y,z))return false;
     if(this.player&&Math.abs(this.player.x-x)<.8&&Math.abs(this.player.y-(y+.5))<1.7&&Math.abs(this.player.z-z)<.8)
       return false;
     this.block(x,y,z,type);this.emit("place",{x,y,z,type});return true;
   }
   visible(x,y,z){
     if(!this.at(x,y,z))return false;
     return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
       .some(([dx,dy,dz])=>{
         const a=x+dx,b=y+dy,c=z+dz;
         return Math.abs(a)>COORD_LIMIT||Math.abs(b)>COORD_LIMIT||Math.abs(c)>COORD_LIMIT||!this.blocks.has(key(a,b,c));
       });
   }
   eachVisible(fn){
     for(const [id,type] of this.blocks){
       const [x,y,z]=id.split(",").map(Number);
       if(this.visible(x,y,z))fn({x,y,z,type});
     }
   }
   generate(radius=10){
     if(this.blocks.size)throw new Error("World already generated");
     radius=n(radius,4,18,"radius");if(!Number.isInteger(radius))throw new Error("Radius must be integer");
     this.radius=radius;
     for(let x=-radius;x<=radius;x++)for(let z=-radius;z<=radius;z++){
       const dist=Math.hypot(x,z);
       const elevation=(Math.sin(x*.28+this.seed*.001)+Math.cos(z*.31-this.seed*.001))*.9
         +(rand(this.seed,x,z)-.5)*1.1;
       let height=Math.max(1,Math.min(5,Math.round(3+elevation)));
       // Keep spawn area level and give initial exploration a reliable floor.
       if(dist<3)height=3;
       for(let y=0;y<=height;y++){
         const type=y===height?(dist<radius*.85?"grass":"sand"):y>=height-1?"dirt":"stone";
         this.block(x,y,z,type,{silent:true});
       }
     }
     // Deterministic decorative trees, away from spawn.
     for(let x=-radius+2;x<=radius-2;x+=4)for(let z=-radius+2;z<=radius-2;z+=4){
       if(Math.hypot(x,z)<5||rand(this.seed+7,x,z)>.29)continue;
       const top=this.groundTop(x,z);
       if(top===null)continue;
       for(let j=1;j<=3;j++)this.block(x,top+j,z,"wood",{silent:true});
       for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
         if(Math.abs(dx)+Math.abs(dz)>2)continue;
         const atY=top+4;
         if(!this.at(x+dx,atY,z+dz))this.block(x+dx,atY,z+dz,"leaves",{silent:true});
       }
     }
     return this;
   }
   groundTop(x,z){
     x=Math.round(x);z=Math.round(z);
     let result=null;
     for(const [id,type] of this.blocks){
       const [bx,by,bz]=id.split(",").map(Number);
       if(bx===x&&bz===z&&SOLID.has(type)&&(result===null||by>result))result=by;
     }
     return result;
   }
   spawn(x=0,z=0){
     x=n(x,-30,30,"spawn x");z=n(z,-30,30,"spawn z");
     const top=this.groundTop(x,z);
     if(top===null)throw new Error("Cannot spawn outside terrain");
     this.player={kind:"voxel-player",world:this,x,y:top+2.25,z,vy:0,
       vx:0,vz:0,grounded:false,jumps:0};
     return this.player;
   }
   setInput(x,z){
     if(!this.player)throw new Error("No player");
     this.player.vx=n(x,-1,1,"input x");this.player.vz=n(z,-1,1,"input z");
   }
   jump(){
     const p=this.player;if(!p||!p.grounded)return false;
     p.vy=7.5;p.grounded=false;p.jumps++;this.emit("jump",{jumps:p.jumps});return true;
   }
   step(dt){
     dt=n(dt,0,.05,"frame delta");if(!this.player||!dt)return;
     this.time+=dt;
     const p=this.player;
     const speed=4.8;
     const tryAxis=(axis,v)=>{
       const next=p[axis]+v*speed*dt;
       const nx=axis==="x"?next:p.x,nz=axis==="z"?next:p.z;
       const top=this.groundTop(nx,nz);
       const nextFoot=p.y-1.65;
       // Can't walk through a block higher than 1.05 units above feet.
       if(top!==null&&top+1-nextFoot>1.05)return;
       p[axis]=next;
     };
     tryAxis("x",p.vx);tryAxis("z",p.vz);
     const oldFeet=p.y-1.65;
     p.vy-=20*dt;p.y+=p.vy*dt;
     const top=this.groundTop(p.x,p.z);
     const floor=top===null?-Infinity:top+.5;
     if(p.vy<=0&&p.y-1.65<=floor&&oldFeet>=floor-.4){
       p.y=floor+1.65;p.vy=0;p.grounded=true;
     }else p.grounded=false;
     if(p.y< -15){
       const height=this.groundTop(0,0)??3;
       Object.assign(p,{x:0,y:height+3,z:0,vx:0,vz:0,vy:0,grounded:false});
     }
   }
   serialize(){
     return JSON.stringify({schema:1,seed:this.seed,radius:this.radius,
       blocks:[...this.blocks.entries()],player:this.player?{x:this.player.x,y:this.player.y,z:this.player.z}:null});
   }
   static deserialize(raw){
     if(typeof raw!=="string"||raw.length>1500000)throw new Error("Invalid saved world");
     const data=JSON.parse(raw);
     if(data?.schema!==1||!Array.isArray(data.blocks)||data.blocks.length>MAX_BLOCKS)
       throw new Error("Unsupported world save");
     const world=new VoxelWorld(data.seed);
     world.radius=n(data.radius,0,18,"radius");
     for(const entry of data.blocks){
       if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=="string")throw new Error("Invalid saved block");
       const coords=entry[0].split(",").map(Number);
       if(coords.length!==3||coords.some(x=>!Number.isInteger(x)))throw new Error("Invalid saved coordinate");
       world.block(...coords,entry[1],{silent:true});
     }
     world.spawn();
     if(data.player){
       const {x,y,z}=data.player;
       world.player.x=n(x,-32,32,"saved x");
       world.player.y=n(y,-32,64,"saved y");
       world.player.z=n(z,-32,32,"saved z");
     }
     return world;
   }
 }
 return {VoxelWorld,BLOCKS};
});