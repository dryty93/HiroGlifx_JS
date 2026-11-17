"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {CombatWorld,TelegraphQueue}=require("../runtime/game-combat");
function world(){
 const w=new CombatWorld();
 w.create("hero",{team:"heroes",health:100,stamina:100,x:0,z:0});
 w.create("enemy",{team:"raiders",health:100,stamina:100,x:0,z:1});
 return w;
}
test("evade prevents a telegraphed strike but consumes enemy attack",()=>{
 const w=world(),events=[];w.onEvent(e=>events.push(e.type));
 w.status("hero","evade",{duration:.35});
 assert.equal(w.strike("enemy","hero",{damage:25,range:2,cooldown:.5}).reason,"evaded");
 assert.equal(w.actor("hero").health,100);
 assert.ok(events.includes("evade"));
 w.tick(.1);w.tick(.1);w.tick(.1);w.tick(.1);w.tick(.1);w.tick(.1);
 assert.equal(w.strike("enemy","hero",{damage:25,range:2,cooldown:0}).hit,true);
 assert.equal(w.actor("hero").health,75);
});
test("parry stuns and interrupts an enemy for a bounded window",()=>{
 const w=world(),events=[];w.onEvent(e=>events.push(e.type));
 w.status("hero","parry",{duration:.25});
 assert.equal(w.strike("enemy","hero",{damage:25,range:2,cooldown:0}).reason,"parried");
 assert.equal(w.actor("hero").health,100);
 assert.equal(w.strike("enemy","hero",{damage:25,range:2,cooldown:0}).reason,"blocked");
 assert.ok(events.includes("parry"));
 for(let i=0;i<8;i++)w.tick(.1);
 assert.equal(w.strike("enemy","hero",{damage:25,range:2,cooldown:0}).hit,true);
});
test("telegraph queue resolves only after windup and can cancel dead actors",()=>{
 const q=new TelegraphQueue({maxActive:2}),called=[];
 assert.equal(q.schedule("enemy",.3,()=>called.push("strike")),true);
 assert.equal(q.schedule("enemy",.3,()=>called.push("duplicate")),false);
 q.tick(.1);assert.equal(q.has("enemy"),true);
 q.tick(.1);q.tick(.1);assert.deepEqual(called,["strike"]);
 assert.equal(q.has("enemy"),false);
 assert.equal(q.schedule("hero",.2,()=>called.push("hero")),true);
 assert.equal(q.cancel("hero"),true);q.tick(.1);q.tick(.1);
 assert.deepEqual(called,["strike"]);
 q.dispose();assert.equal(q.active.size,0);
});
test("bounded telegraphs reject malformed callbacks and nonfinite time",()=>{
 const q=new TelegraphQueue({maxActive:1});
 assert.throws(()=>q.schedule("enemy",Infinity,()=>{}),/Invalid telegraph/);
 assert.throws(()=>q.schedule("enemy",.1,null),/Invalid telegraph/);
 assert.equal(q.schedule("enemy",.1,()=>{}),true);
 assert.equal(q.schedule("hero",.1,()=>{}),false);
 assert.throws(()=>q.tick(-1),/Invalid telegraph delta/);
});
