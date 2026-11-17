/* HiroGlifx 2D creative scene engine for browser games and videos. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroGlifxScene=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ID=/^[A-Za-z][\w-]*$/;
 const COLOR=/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([0-9.,%\s]+\))$/;
 function finite(value,label,min=-1e6,max=1e6){
   const n=Number(value);
   if(!Number.isFinite(n)||n<min||n>max)throw new Error("Invalid "+label);
   return n;
 }
 function validId(value){if(!ID.test(String(value)))throw new Error("Invalid object id");return value;}
 function validColor(value){if(!COLOR.test(String(value)))throw new Error("Invalid color");return value;}
 function overlaps(a,b){
   return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 }
 class Scene{
   constructor({width=640,height=360,background="#101827"}={}){
     this.width=finite(width,"width",1,4096);
     this.height=finite(height,"height",1,4096);
     this.background=validColor(background);
     this.objects=new Map();this.keys=new Map();this.animations=[];
     this.time=0;this.playing=false;this.goal=null;this.score=0;
   }
   add(name,x,y,width,height,fill){
     validId(name);
     if(this.objects.has(name))throw new Error("Duplicate object: "+name);
     const obj={name,x:finite(x,"x"),y:finite(y,"y"),width:finite(width,"width",1),height:finite(height,"height",1),fill:validColor(fill)};
     this.objects.set(name,obj);return obj;
   }
   object(name){
     const obj=this.objects.get(name);if(!obj)throw new Error("Unknown sprite: "+name);return obj;
   }
   move(name,dx,dy){
     const obj=this.object(name);
     obj.x+=finite(dx,"dx");obj.y+=finite(dy,"dy");
     obj.x=Math.max(0,Math.min(this.width-obj.width,obj.x));
     obj.y=Math.max(0,Math.min(this.height-obj.height,obj.y));
     this.checkGoal();return obj;
   }
   onKey(key,name,dx,dy){
     if(!/^(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|[a-zA-Z])$/.test(key))throw new Error("Invalid key");
     this.object(name);
     this.keys.set(key,{name,dx:finite(dx,"dx"),dy:finite(dy,"dy")});
   }
   goalFor(name,target){
     this.object(name);this.object(target);this.goal={name,target,won:false};
     this.checkGoal();
   }
   checkGoal(){
     if(!this.goal||this.goal.won)return false;
     if(overlaps(this.object(this.goal.name),this.object(this.goal.target))){
       this.goal.won=true;this.score+=1;return true;
     }
     return false;
   }
   tween(name,property,to,duration,start=0){
     const obj=this.object(name);
     if(!["x","y","width","height"].includes(property))throw new Error("Invalid animation property");
     const end=finite(to,"target"),ms=finite(duration,"duration",1,600000),at=finite(start,"start",0,600000);
     this.animations.push({name,property,from:obj[property],to:end,duration:ms,start:at});
   }
   seek(ms){
     const time=finite(ms,"time",0,600000);
     this.time=time;
     for(const item of this.animations){
       const fraction=Math.min(1,Math.max(0,(time-item.start)/item.duration));
       this.object(item.name)[item.property]=item.from+(item.to-item.from)*fraction;
     }
     this.checkGoal();
   }
   render(ctx){
     if(!ctx)throw new Error("Canvas context required");
     ctx.fillStyle=this.background;ctx.fillRect(0,0,this.width,this.height);
     for(const obj of this.objects.values()){
       ctx.fillStyle=obj.fill;ctx.fillRect(obj.x,obj.y,obj.width,obj.height);
     }
   }
   keydown(key){
     const command=this.keys.get(key);
     if(command)this.move(command.name,command.dx,command.dy);
   }
 }
 function compile(source,existing){
   const scene=existing||new Scene();
   const tokenize=line=>{
     const words=[];const expression=/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s]+)/g;
     for(const match of line.matchAll(expression))words.push(match[1]??match[2]??match[3]);
     return words;
   };
   String(source).split(/\r?\n/).forEach((raw,index)=>{
     const trimmed=raw.trim();
     if(!trimmed||trimmed.startsWith("#")||trimmed.startsWith("//"))return;
     const parts=tokenize(trimmed.replace(/;$/,""));
     const [command,...args]=parts;
     try{
       switch(command){
         case "scene": {
           if(args.length<2||args.length>3)throw new Error("scene needs width height [background]");
           if(scene.objects.size||scene.animations.length)throw new Error("scene must be defined first");
           scene.width=finite(args[0],"width",1,4096);
           scene.height=finite(args[1],"height",1,4096);
           if(args[2])scene.background=validColor(args[2]);
           break;
         }
         case "sprite":
           if(args.length!==6)throw new Error("sprite needs id x y width height color");
           scene.add(args[0],...args.slice(1));break;
         case "move":
           if(args.length!==3)throw new Error("move needs id dx dy");
           scene.move(args[0],args[1],args[2]);break;
         case "control":
           if(args.length!==4)throw new Error("control needs key sprite dx dy");
           scene.onKey(args[0],...args.slice(1));break;
         case "goal":
           if(args.length!==2)throw new Error("goal needs player target");
           scene.goalFor(args[0],args[1]);break;
         case "tween":
           if(args.length<4||args.length>5)throw new Error("tween needs sprite property target duration [start]");
           scene.tween(args[0],args[1],args[2],args[3],args[4]||0);break;
         default:throw new Error("Unknown creative command: "+command);
       }
     }catch(error){throw new Error("Line "+(index+1)+": "+error.message);}
   });
   return scene;
 }
 return {Scene,compile,overlaps};
});
