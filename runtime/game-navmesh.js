/* Optional Phase 26 Recast-Detour navmesh bridge.
 * Uses Babylon RecastJSPlugin and initialized Recast runtime supplied by the host.
 * Separate from the guaranteed pure-JS A* grid used in the Riftfall starter arena.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroNavmesh=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const config=Object.freeze({cs:.3,ch:.2,walkableSlopeAngle:40,walkableHeight:2,
 walkableClimb:.5,walkableRadius:.5,maxEdgeLen:12,maxSimplificationError:1.3,
 minRegionArea:8,mergeRegionArea:20,maxVertsPerPoly:6,detailSampleDist:6,detailSampleMaxError:1});
class RecastNavigation{
 constructor({BABYLON,scene,recast}){
   if(!BABYLON?.RecastJSPlugin||!BABYLON?.Vector3||!scene||!recast)
     throw Error("Recast navigation plugin, initialized Recast and scene required");
   this.B=BABYLON;this.scene=scene;this.plugin=new BABYLON.RecastJSPlugin(recast);this.crowds=[];
 }
 build(meshes,options={}){
   if(!Array.isArray(meshes)||!meshes.length||meshes.length>1000)throw Error("Invalid navmesh geometry");
   const params={...config,...options};
   for(const [key,value] of Object.entries(params))
     if(!(key in config)||typeof value!=="number"||!Number.isFinite(value)||value<0)throw Error("Unsafe navmesh config");
   this.plugin.createNavMesh(meshes,params);return this;
 }
 closest(pos){
   if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))throw Error("Invalid nav query");
   const v=this.plugin.getClosestPoint(new this.B.Vector3(pos.x,pos.y,pos.z));
   return {x:v.x,y:v.y,z:v.z};
 }
 path(from,to){
   for(const p of [from,to])if(!p||![p.x,p.y,p.z].every(Number.isFinite))throw Error("Invalid path point");
   const points=this.plugin.computePath(new this.B.Vector3(from.x,from.y,from.z),new this.B.Vector3(to.x,to.y,to.z));
   return points.map(p=>({x:p.x,y:p.y,z:p.z}));
 }
 createCrowd(maxAgents=16,radius=.65){
   if(!Number.isInteger(maxAgents)||maxAgents<1||maxAgents>200||typeof radius!=="number"||radius<=0||radius>10)
     throw Error("Invalid crowd options");
   const crowd=this.plugin.createCrowd(maxAgents,radius,this.scene);
   this.crowds.push(crowd);return crowd;
 }
 dispose(){for(const crowd of this.crowds)crowd.dispose?.();this.crowds=[];this.plugin.dispose?.();}
}

class RouteBudget{
 constructor({path,fallback,maxQueriesPerSecond=20,ttl=.3,errorLimit=3}={}){
   if(typeof path!=="function"||typeof fallback!=="function"||
      !Number.isInteger(maxQueriesPerSecond)||maxQueriesPerSecond<1||maxQueriesPerSecond>100||
      !Number.isFinite(ttl)||ttl<0||ttl>5||
      !Number.isInteger(errorLimit)||errorLimit<1||errorLimit>20)
     throw Error("Invalid Recast route budget");
   this.path=path;this.fallback=fallback;this.maxQueries=maxQueriesPerSecond;
   this.ttl=ttl;this.errorLimit=errorLimit;this.disabled=false;
   this.calls=0;this.fallbacks=0;this.errors=0;this.cacheHits=0;this.failures=0;
   this.window=-1;this.windowCalls=0;this.cache=new Map();this.lastError=null;
 }
 route(from,to,now=0){
   for(const p of [from,to])if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>10000||Math.abs(p.z)>10000)
     throw Error("Invalid navigation position");
   if(!Number.isFinite(now)||now<0)throw Error("Invalid route time");
   const fallback=()=>{
     this.fallbacks++;
     const route=this.fallback(from,to);
     return Array.isArray(route)?route:[];
   };
   if(this.disabled)return fallback();
   const second=Math.floor(now);
   if(second!==this.window){this.window=second;this.windowCalls=0;}
   const key=[Math.round(from.x),Math.round(from.z),Math.round(to.x),Math.round(to.z)].join(":");
   const cached=this.cache.get(key);
   if(cached&&cached.expires>=now){this.cacheHits++;return cached.route.map(p=>({...p}));}
   if(this.windowCalls>=this.maxQueries)return fallback();
   this.windowCalls++;this.calls++;
   try{
     const result=this.path(from,to);
     if(!Array.isArray(result)||result.length<2||result.length>500||
        result.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)))
       throw Error("Recast returned invalid or empty route");
     const route=result.map(p=>({x:p.x,z:p.z}));
     this.failures=0;
     if(this.cache.size>=64)this.cache.delete(this.cache.keys().next().value);
     this.cache.set(key,{route,expires:now+this.ttl});
     return route.map(p=>({...p}));
   }catch(error){
     this.errors++;this.failures++;this.lastError=String(error.message||error).slice(0,200);
     if(this.failures>=this.errorLimit){this.disabled=true;this.cache.clear();}
     return fallback();
   }
 }
 stats(){return Object.freeze({mode:this.disabled?"a-star":"recast",queries:this.calls,
   fallbacks:this.fallbacks,errors:this.errors,cacheHits:this.cacheHits,
   disabled:this.disabled,lastError:this.lastError});}
 dispose(){this.disabled=true;this.cache.clear();}
}
return {RecastNavigation,RouteBudget,DEFAULT_CONFIG:config};
});