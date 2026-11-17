"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {buildChapters,ChapterDirector}=require("../runtime/game-chapters");
const source=fs.readFileSync(path.join(__dirname,"../examples/riftfall-chapters.scroll"),"utf8");
test("native .scroll chapter definitions load and link in order",()=>{
 const list=buildChapters(source);
 assert.deepEqual(list.map(c=>c.id),["approach","watchtower","forge","guardian"]);
 assert.equal(list[0].objective.type,"defeat");
 assert.equal(list[3].next,null);
});
test("chapter director gates encounters and supports serial progression",()=>{
 const events=[],d=new ChapterDirector(buildChapters(source),{onChange:s=>events.push(s)});
 assert.equal(d.advance(),false);
 assert.equal(d.record("reach","watchtower"),false);
 assert.equal(d.record("defeat","raider"),true);
 assert.equal(d.record("defeat","raider",200),true);
 assert.equal(d.snapshot().progress,2);
 assert.equal(d.advance(),true);
 assert.equal(d.current.id,"watchtower");
 assert.equal(d.record("reach","watchtower"),true);
 assert.equal(d.advance(),true);
 assert.equal(d.record("craft","steel-blade"),true);
 assert.equal(d.advance(),true);
 assert.equal(d.record("defeat","raider",7),true);
 assert.equal(d.advance(),true);
 assert.equal(d.finished,true);
 assert.equal(d.advance(),false);
 assert.equal(d.record("defeat","raider"),false);
 assert.equal(events.at(-1).current,null);
});
test("chapter state roundtrips and rejects corrupt restore atomically",()=>{
 const chapters=buildChapters(source),d=new ChapterDirector(chapters);
 d.record("defeat","raider");d.record("defeat","raider");d.advance();
 d.record("reach","watchtower");
 const snapshot=d.snapshot(),copy=new ChapterDirector(chapters).restore(snapshot);
 assert.deepEqual(copy.snapshot(),snapshot);
 for(const bad of [
  {...snapshot,index:99},
  {...snapshot,progress:2},
  {...snapshot,completed:["guardian"]},
  {...snapshot,current:"guardian"},
  {...snapshot,finished:true}
 ]){
   assert.throws(()=>copy.restore(bad),/Invalid|Incompatible/);
   assert.deepEqual(copy.snapshot(),snapshot);
 }
});
test("chapter schema rejects invalid chaining, unsupported event types and duplicates",()=>{
 const example=buildChapters(source);
 const d=new ChapterDirector(example);
 assert.throws(()=>d.record("defeat","raider",0),/Invalid event amount/);
 assert.throws(()=>d.record("defeat","raider",201),/Invalid event amount/);
 assert.throws(()=>buildChapters(source.replace('"defeat","raider",2','"teleport","raider",2')),/Unsupported/);
 assert.throws(()=>buildChapters(source.replace('"watchtower","The Northern Signal"','"approach","The Northern Signal"')),/Duplicate/);
 assert.throws(()=>buildChapters(source.replace('"guardian","The Last Rift"','"guardian","The Last Rift"').replace('"raider",7,""','"raider",7,"approach"')),/predecessor|Cyclic/);
});
