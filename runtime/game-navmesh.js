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
return {RecastNavigation,DEFAULT_CONFIG:config};
});