/* Low-overhead in-game performance sampling and regression statistics.
 * No network telemetry, no browser instrumentation outside the game.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGamePerformance=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const percentile=(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(q*sorted.length)-1))]:0;
class FrameProfiler{
 constructor({capacity=600,budgets={frameP95:33.34,frameP99:50,drawCalls:500,activeMeshes:1200}}={}){
  if(!Number.isInteger(capacity)||capacity<20||capacity>6000)throw Error("Invalid profiling capacity");
  this.capacity=capacity;this.frames=[];this.last=null;this.budgets=Object.freeze({...budgets});
  for(const v of Object.values(this.budgets))if(!Number.isFinite(v)||v<0)throw Error("Invalid performance budget");
 }
 sample({frameMs,drawCalls=0,activeMeshes=0,activeColliders=0,navQueries=0}){
  for(const value of [frameMs,drawCalls,activeMeshes,activeColliders,navQueries])
   if(!Number.isFinite(value)||value<0||value>10000000)throw Error("Invalid frame sample");
  this.frames.push({frameMs,drawCalls,activeMeshes,activeColliders,navQueries});
  if(this.frames.length>this.capacity)this.frames.shift();
  return this.frames.length;
 }
 snapshot(){
  const frames=this.frames,sorted=frames.map(f=>f.frameMs).sort((a,b)=>a-b);
  const max=(key)=>frames.reduce((v,f)=>Math.max(v,f[key]),0);
  const metrics={sampleCount:frames.length,frameP50:percentile(sorted,.5),
   frameP95:percentile(sorted,.95),frameP99:percentile(sorted,.99),
   estimatedFps:percentile(sorted,.5)>0?1000/percentile(sorted,.5):0,
   drawCalls:max("drawCalls"),activeMeshes:max("activeMeshes"),
   activeColliders:max("activeColliders"),navQueries:max("navQueries")};
  const violations=[];
  if(frames.length>=20)for(const [metric,limit] of Object.entries(this.budgets))
   if(metric in metrics&&metrics[metric]>limit)violations.push({metric,actual:metrics[metric],budget:limit});
  return {metrics,violations,passing:frames.length>=20&&!violations.length,
   insufficientSamples:frames.length<20};
 }
 reset(){this.frames=[];}
}
return {FrameProfiler,percentile};
});
