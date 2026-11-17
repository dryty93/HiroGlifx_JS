/* HiroGlifx Simple 3D Obby authoring language.
 * Small, declarative .scroll files become canonical HiroGlifx level programs.
 * All mechanics remain in the reusable ObbyWorld / SkyboundWorld engine.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroSimpleObby=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ID=/^[A-Za-z][A-Za-z0-9_]{0,39}$/;
 const THEMES=Object.freeze(["sky","soda","candy","neon","ice"]);
 const SOUNDS=Object.freeze(["bubbles","glass","arcade","soft","off"]);
 const LIMIT=100;
 const codeString=x=>JSON.stringify(x);
 function words(line){
  const tokens=line.match(/"(?:\\.|[^"\\])*"|\S+/g)||[];
  return tokens.map(x=>x[0]==='"'?JSON.parse(x):x);
 }
 function number(value,label,min,max){
  if(typeof value!=="string"||!/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value))throw Error(label+" must be a number");
  const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+" must be between "+min+" and "+max);
  return n;
 }
 function id(value){
  if(typeof value!=="string"||!ID.test(value)||["world","player","won","checkpointHit"].includes(value))
   throw Error("Use a unique name with letters, numbers and underscores");
  return value;
 }
 function compile(source){
  if(typeof source!=="string"||source.length>24000||!source.trim())throw Error("Empty or oversized game directions");
  const data={title:"My First Obby",theme:"sky",sound:"bubbles",speed:6,jump:9.8,spawn:null,stages:[],tiles:[],finish:null};
  const used=new Set();let stage=0;
  for(const [index,raw] of source.split(/\r?\n/).entries()){
   const line=raw.trim();
   if(!line||line.startsWith("//")||line.startsWith("#"))continue;
   try{
    const a=words(line),op=a[0],n=a.length;
    if(op==="game"){
     if(n!==2||typeof a[1]!=="string"||a[1].length<2||a[1].length>80)throw Error('Write: game "A short title"');
     data.title=a[1];
    }else if(op==="theme"){
     if(n!==2||!THEMES.includes(a[1]))throw Error("Choose a theme: "+THEMES.join(", "));
     data.theme=a[1];
    }else if(op==="sound"){
     if(n!==2||!SOUNDS.includes(a[1]))throw Error("Choose a sound: "+SOUNDS.join(", "));
     data.sound=a[1];
    }else if(op==="speed"){
     if(n!==2)throw Error("Write: speed 7");
     data.speed=number(a[1],"Speed",2,14);
    }else if(op==="jump"){
     if(n!==2)throw Error("Write: jump 10");
     data.jump=number(a[1],"Jump",6,16);
    }else if(op==="player"){
     if(n!==5||a[1]!=="at"||data.spawn)throw Error("Write once: player at X Y Z");
     data.spawn={x:number(a[2],"X",-200,600),y:number(a[3],"Y",-30,90),z:number(a[4],"Z",-200,200)};
    }else if(op==="stage"){
     if(n!==3||typeof a[2]!=="string"||a[2].length<1||a[2].length>50)
      throw Error('Write: stage 1 "Name of stage"');
     const next=number(a[1],"Stage number",1,5);
     if(!Number.isInteger(next)||next!==data.stages.length+1)throw Error("Stages must be numbered 1, 2, 3... without gaps");
     data.stages.push({id:next,name:a[2]});stage=next;
    }else if(["platform","lava","checkpoint","finish","moving","vanishing","spinner"].includes(op)){
     if(!stage)throw Error('Add stage 1 "First stage" before platforms');
     if(data.tiles.length>=LIMIT)throw Error("Maximum 100 obstacles");
     if(a[2]!=="at"||a[6]!=="size"||n<8)throw Error(op+" NAME at X Y Z size S");
     const name=id(a[1]);if(used.has(name))throw Error("Duplicate object "+name);used.add(name);
     const tile={name,op,stage,x:number(a[3],"X",-200,600),y:number(a[4],"Y",-30,90),
       z:number(a[5],"Z",-200,200),size:number(a[7],"Size",.5,20)};
     if(["platform","lava","checkpoint","finish"].includes(op)){
      if(n!==8)throw Error(op+" NAME at X Y Z size S");
     }else if(op==="moving"){
      if(n!==14||a[8]!=="axis"||!["x","z"].includes(a[9])||a[10]!=="range"||a[12]!=="period")
       throw Error("moving NAME at X Y Z size S axis z range R period T");
      tile.axis=a[9];tile.range=number(a[11],"Range",.1,8);tile.period=number(a[13],"Period",.5,30);
     }else if(op==="vanishing"){
      if(n!==10||a[8]!=="delay")throw Error("vanishing NAME at X Y Z size S delay T");
      tile.delay=number(a[9],"Delay",.15,5);
     }else{
      if(n!==12||a[8]!=="range"||a[10]!=="period")
       throw Error("spinner NAME at X Y Z size S range R period T");
      tile.range=number(a[9],"Range",.1,5);tile.period=number(a[11],"Period",.5,15);
     }
     if(op==="finish"){if(data.finish)throw Error("Only one finish platform is allowed");data.finish=name;}
     data.tiles.push(tile);
    }else throw Error("Unknown direction: "+op);
   }catch(e){throw Error("Line "+(index+1)+": "+e.message);}
  }
  if(!data.spawn)throw Error("Missing: player at 0 2 0");
  if(!data.stages.length)throw Error('Missing: stage 1 "First stage"');
  if(!data.tiles.some(x=>x.op==="platform"))throw Error("Add at least one platform");
  if(!data.finish)throw Error("Add a finish platform");
  const lines=["// Compiled from simple .scroll directions into canonical HiroGlifx.",".Main = ()","    & world = obby_world();"];
  for(const t of data.tiles){
   const base=["world",codeString(t.name),t.x,t.y,t.z,t.size];let call,parts;
   if(t.op==="moving"){call="obby_moving";parts=[...base,codeString(t.axis),t.range,t.period,t.stage];}
   else if(t.op==="vanishing"){call="obby_vanish";parts=[...base,t.delay,t.stage];}
   else if(t.op==="spinner"){call="obby_spinner";parts=[...base,t.range,t.period,t.stage];}
   else{call="obby_tile";parts=[...base,codeString(t.op==="platform"?"solid":t.op),t.stage];}
   lines.push("    & "+t.name+" = "+call+"("+parts.join(", ")+");");
  }
  lines.push('    & player = obby_player(world, "hero", '+[data.spawn.x,data.spawn.y,data.spawn.z].join(", ")+");");
  lines.push('    @ won = obby_event(world, "finish");');
  lines.push('    @ checkpointHit = obby_event(world, "checkpoint");');
  lines.push("    break;");
  return {...data,count:data.tiles.length,canonical:lines.join("\n")+"\n"};
 }
 function starter(){return [
  '// Edit these readable directions, then press Play.',
  'game "Soda Splash"',
  'theme soda',
  'speed 7',
  'jump 10',
  'sound bubbles',
  'player at 0 2 0',
  '',
  'stage 1 "BUBBLE RUN"',
  'platform start at 0 0 0 size 5',
  'platform ice1 at 4.5 0 0 size 3.5',
  'platform ice2 at 8.9 0 1.2 size 3.2',
  'checkpoint save1 at 13.2 0 1.2 size 3.8',
  '',
  'stage 2 "MOVING ICE"',
  'moving glide1 at 17.8 0 1.2 size 3.4 axis z range 1.2 period 3.2',
  'platform ice3 at 22.2 0 1.2 size 3.5',
  'vanishing flash1 at 26.6 0 1.2 size 3.4 delay 1.5',
  'checkpoint save2 at 31 0 1.2 size 4',
  '',
  'stage 3 "THE FINAL SPLASH"',
  'spinner whirl at 35.2 0 1.2 size 2 range 1.5 period 4',
  'platform leap1 at 35.5 0 4.3 size 3.3',
  'platform leap2 at 40 0 4.3 size 3.4',
  'finish goal at 44.4 0 4.3 size 5',
  ''
 ].join("\n");}
 return {compile,starter,THEMES,SOUNDS};
});
