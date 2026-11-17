"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {RouteBudget}=require("../runtime/game-navmesh");
const a={x:1,z:2},b={x:8,z:9};
test("Recast router caches valid paths and reduces repeated WASM queries",()=>{
 let recast=0,fallback=0;
 const router=new RouteBudget({path:()=>{recast++;return [a,b];},
   fallback:()=>{fallback++;return [a,b];},ttl:.25});
 assert.deepEqual(router.route(a,b,0),[a,b]);
 assert.deepEqual(router.route(a,b,.1),[a,b]);
 assert.equal(recast,1);assert.equal(router.stats().cacheHits,1);
 assert.deepEqual(router.route(a,b,.5),[a,b]);
 assert.equal(recast,2);assert.equal(fallback,0);
 assert.equal(router.stats().mode,"recast");
});
test("navigation query rate limit safely routes through A-star",()=>{
 let queries=0,fallbacks=0;
 const router=new RouteBudget({path:()=>{queries++;return [a,b];},
   fallback:()=>{fallbacks++;return [a,b];},maxQueriesPerSecond:1,ttl:0});
 router.route(a,b,0);
 router.route({x:3,z:3},b,.2);
 assert.equal(queries,1);assert.equal(fallbacks,1);
 router.route({x:4,z:4},b,1);
 assert.equal(queries,2);assert.equal(router.stats().fallbacks,1);
});
test("invalid Recast results trip circuit breaker but preserve A-star navigation",()=>{
 let calls=0,failovers=0;
 const router=new RouteBudget({path:()=>{calls++;throw Error("WASM path error");},
   fallback:()=>{failovers++;return [a,b];},errorLimit:2});
 assert.deepEqual(router.route(a,b,0),[a,b]);
 assert.deepEqual(router.route({x:2,z:2},b,.1),[a,b]);
 assert.equal(router.stats().mode,"a-star");
 assert.equal(router.stats().errors,2);
 assert.equal(router.stats().lastError,"WASM path error");
 router.route({x:3,z:2},b,.2);
 assert.equal(calls,2);assert.equal(failovers,3);
 router.dispose();
});
test("router refuses malformed positions, timing, and unsafe query bounds",()=>{
 assert.throws(()=>new RouteBudget({path:()=>[],fallback:()=>[],maxQueriesPerSecond:0}),/Invalid/);
 const router=new RouteBudget({path:()=>[],fallback:()=>[a,b]});
 assert.throws(()=>router.route({x:Infinity,z:0},b,0),/Invalid navigation/);
 assert.throws(()=>router.route(a,b,-1),/Invalid route time/);
 assert.deepEqual(router.route(a,b,0),[a,b]);
 assert.equal(router.stats().errors,1);
});
