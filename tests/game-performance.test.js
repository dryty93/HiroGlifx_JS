"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {FrameProfiler,percentile}=require("../runtime/game-performance");
test("frame histogram reports bounded p50/p95/p99 and budget violations",()=>{
 const monitor=new FrameProfiler({capacity:120,budgets:{frameP95:30,activeMeshes:100}});
 for(let i=0;i<100;i++)monitor.sample({frameMs:i%20===0?45:16.6,activeMeshes:i%10===0?150:70,activeColliders:12});
 const report=monitor.snapshot();assert.equal(report.metrics.sampleCount,100);
 assert.equal(report.metrics.frameP50,16.6);
 assert.ok(report.metrics.frameP95<=45);
 assert.equal(report.metrics.activeColliders,12);
 assert.deepEqual(report.violations.map(v=>v.metric),["activeMeshes"]);
 monitor.reset();assert.equal(monitor.snapshot().metrics.sampleCount,0);
});
test("ring buffer drops old samples and forbids invalid input",()=>{
 const m=new FrameProfiler({capacity:20});
 for(let i=0;i<30;i++)m.sample({frameMs:i+1});
 assert.equal(m.snapshot().metrics.sampleCount,20);
 assert.equal(m.snapshot().metrics.frameP50,20);
 assert.throws(()=>m.sample({frameMs:NaN}),/Invalid frame sample/);
 assert.throws(()=>new FrameProfiler({capacity:0}),/Invalid profiling capacity/);
 assert.equal(percentile([], .5),0);
});
