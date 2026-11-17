/* Phase 28: reusable chapter progression for HiroGlifx-authored campaigns.
 * Author chapter objectives in .scroll; JS supplies bounded transitions and snapshots.
 */
(function(root,factory){
 const rules=typeof module==="object"&&module.exports?require("./scroll-world-rules"):root.HiroWorldRules;
 const api=factory(rules);
 if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGameChapters=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(world){
"use strict";
const ID=/^[a-z][a-z0-9-]{0,63}$/;
const EVENTS=new Set(["defeat","collect","craft","reach","talk"]);
function id(value,label){if(typeof value!=="string"||!ID.test(value))throw Error("Invalid "+label);return value;}
function positive(value,label){if(!Number.isInteger(value)||value<1||value>200)throw Error("Invalid "+label);return value;}
function buildChapters(source){
 if(typeof source!=="string"||source.length>100000)throw Error("Invalid chapter source");
 const runtime=new world.WorldRules(source,{name:"riftfall-chapters"});
 const rows=runtime.get("chapters");
 if(!Array.isArray(rows)||!rows.length||rows.length>32)throw Error("Invalid authored chapters");
 const chapters=rows.map((row,index)=>{
   if(!Array.isArray(row)||row.length!==7)throw Error("Invalid chapter row "+index);
   const [key,title,description,type,target,count,next]=row;
   id(key,"chapter ID");id(target,"objective ID");
   if(!EVENTS.has(type))throw Error("Unsupported chapter objective");
   if(next)id(next,"next chapter");
   if(typeof title!=="string"||!title.trim()||title.length>100)throw Error("Invalid chapter title");
   if(typeof description!=="string"||description.length>500)throw Error("Invalid chapter description");
   return Object.freeze({id:key,title,description,objective:Object.freeze({type,id:target,target:positive(count,"chapter count")}),next:next||null});
 });
 const byId=new Map();
 for(const chapter of chapters){if(byId.has(chapter.id))throw Error("Duplicate chapter "+chapter.id);byId.set(chapter.id,chapter);}
 for(const chapter of chapters)if(chapter.next&&!byId.has(chapter.next))throw Error("Unknown next chapter "+chapter.next);
 const incoming=new Map(chapters.map(c=>[c.id,0]));
 for(const chapter of chapters)if(chapter.next)incoming.set(chapter.next,incoming.get(chapter.next)+1);
 if(incoming.get(chapters[0].id))throw Error("First chapter cannot have predecessor");
 if(chapters.slice(1).some(c=>incoming.get(c.id)!==1))throw Error("Chapters must form a single forward chain");
 const visited=new Set();let current=chapters[0];
 while(current&&!visited.has(current.id)){visited.add(current.id);current=current.next?byId.get(current.next):null;}
 if(visited.size!==chapters.length||current)throw Error("Cyclic or disconnected chapters");
 return chapters;
}
class ChapterDirector{
 constructor(chapters,{onChange=()=>{}}={}){
   if(!Array.isArray(chapters)||!chapters.length)throw Error("Chapters required");
   this.chapters=chapters;this.byId=new Map(chapters.map(c=>[c.id,c]));
   if(this.byId.size!==chapters.length)throw Error("Duplicate chapters");
   if(typeof onChange!=="function")throw Error("Invalid chapter observer");
   this.onChange=onChange;this.index=0;this.progress=0;this.completed=[];
 }
 get current(){return this.chapters[this.index]||null;}
 get finished(){return this.index===this.chapters.length;}
 record(type,target,amount=1){
   positive(amount,"event amount");
   const chapter=this.current;if(!chapter)return false;
   if(chapter.objective.type!==type||chapter.objective.id!==target)return false;
   this.progress=Math.min(chapter.objective.target,this.progress+amount);
   this.onChange(this.snapshot());
   return true;
 }
 advance(){
   const chapter=this.current;
   if(!chapter||this.progress!==chapter.objective.target)return false;
   this.completed.push(chapter.id);this.index++;this.progress=0;
   this.onChange(this.snapshot());return true;
 }
 snapshot(){return {version:1,index:this.index,progress:this.progress,completed:[...this.completed],current:this.current?.id||null,finished:this.finished};}
 restore(saved){
   if(!saved||saved.version!==1||!Number.isInteger(saved.index)||saved.index<0||saved.index>this.chapters.length||
      !Number.isInteger(saved.progress)||saved.progress<0||!Array.isArray(saved.completed)||
      saved.completed.length!==saved.index)throw Error("Invalid chapter snapshot");
   if(saved.completed.some((v,i)=>v!==this.chapters[i].id))throw Error("Invalid chapter history");
   const current=this.chapters[saved.index];
   if(saved.progress>(current?.objective.target||0))throw Error("Invalid chapter progress");
   if(saved.current!==undefined&&saved.current!==(current?.id||null))throw Error("Incompatible chapter save");
   if(saved.finished!==undefined&&saved.finished!==(saved.index===this.chapters.length))throw Error("Invalid chapter completion");
   this.index=saved.index;this.progress=saved.progress;this.completed=[...saved.completed];
   this.onChange(this.snapshot());return this;
 }
}
return {buildChapters,ChapterDirector};
});
