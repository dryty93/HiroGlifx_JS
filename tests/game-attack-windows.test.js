"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {AttackWindows}=require("../runtime/game-attack-windows");
test("one attack impact follows windup, then recovery prevents spam",()=>{
 const queue=new AttackWindows(),events=[];
 assert.equal(queue.begin("hero",{windup:.13,recovery:.35,onImpact:()=>events.push("impact"),onEnd:()=>events.push("end")}),true);
 assert.equal(queue.begin("hero",{onImpact:()=>events.push("bad")}),false);
 queue.tick(.1);assert.deepEqual(events,[]);
 queue.tick(.05);assert.deepEqual(events,["impact"]);
 for(let i=0;i<4;i++)queue.tick(.1);
 assert.deepEqual(events,["impact","end"]);
 assert.equal(queue.has("hero"),false);
});
test("cancel interrupts damage and releases remaining recovery",()=>{
 const queue=new AttackWindows(),events=[];
 queue.begin("enemy",{windup:.3,recovery:.5,onImpact:()=>events.push("impact"),onEnd:()=>events.push("cancel")});
 queue.tick(.1);assert.equal(queue.cancel("enemy"),true);
 for(let i=0;i<10;i++)queue.tick(.1);
 assert.deepEqual(events,["cancel"]);
 queue.dispose();assert.equal(queue.snapshot().length,0);
});
test("attacks validate bounds and clear at exact boundary",()=>{
 const q=new AttackWindows({maxActors:1});
 assert.throws(()=>q.begin("x",{windup:-1,onImpact:()=>{}}),/Invalid attack window/);
 assert.equal(q.begin("a",{windup:0,recovery:.1,onImpact:()=>{}}),true);
 assert.equal(q.begin("b",{windup:.1,recovery:.1,onImpact:()=>{}}),false);
 q.tick(.1);assert.equal(q.has("a"),false);
 assert.throws(()=>q.tick(Infinity),/Invalid attack frame/);
});
