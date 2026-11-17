/* Physical collision streaming for bounded HiroGlifx regions.
 * Babylon meshes remain available for rendering and navmesh construction;
 * live Havok aggregates are attached only to nearby regions.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroPhysicsStream=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const valid=n=>typeof n==="number"&&Number.isFinite(n);
 class PhysicsRegionStream{
  constructor({regions,entries,create,release,radius=10,maxRegions=3}={}){
   if(!Array.isArray(regions)||regions.length<1||regions.length>32||
      !Array.isArray(entries)||entries.length>1024||
      typeof create!=="function"||typeof release!=="function"||
      !valid(radius)||radius<0||radius>100||
      !Number.isInteger(maxRegions)||maxRegions<1||maxRegions>32)
      throw Error("Invalid physics stream configuration");
   const ids=new Set();
   for(const region of regions){
    if(!Array.isArray(region)||region.length<6||
       typeof region[0]!=="string"||ids.has(region[0])||
       ![2,3,4,5].every(i=>valid(region[i]))||region[4]<=0||region[5]<=0)
      throw Error("Invalid streaming region");
    ids.add(region[0]);
   }
   for(const entry of entries)if(!entry||!ids.has(entry.regionId)||!entry.mesh)
      throw Error("Invalid collider stream entry");
   this.regions=regions;this.entries=entries;this.create=create;this.release=release;
   this.radius=radius;this.maxRegions=maxRegions;this.active=new Map();
  }
  near(row,p){return Math.abs(p.x-row[2])<=row[4]/2+this.radius&&
                      Math.abs(p.z-row[3])<=row[5]/2+this.radius;}
  update(position){
   if(!position||!valid(position.x)||!valid(position.z))throw Error("Invalid physics stream position");
   const chosen=this.regions.filter(row=>this.near(row,position))
     .sort((a,b)=>Math.hypot(a[2]-position.x,a[3]-position.z)-Math.hypot(b[2]-position.x,b[3]-position.z))
     .slice(0,this.maxRegions);
   if(!chosen.length)throw Error("No nearby physical world region");
   const desired=new Set(chosen.map(row=>row[0])),staged=[];
   try{
    for(const row of chosen){
     if(this.active.has(row[0]))continue;
     const handles=[];
     try{
      for(const entry of this.entries){
       if(entry.regionId!==row[0])continue;
       const handle=this.create(entry.mesh);
       if(!handle||typeof handle.dispose!=="function")throw Error("Collider factory returned invalid aggregate");
       handles.push(handle);
      }
      staged.push([row[0],handles]);
     }catch(error){
      for(const handle of handles.reverse())this.release(handle);
      throw error;
     }
    }
   }catch(error){
    for(const [,handles] of staged)for(const handle of handles.reverse())this.release(handle);
    throw error;
   }
   // Stage new colliders before unloading old ones to avoid a physical gap.
   for(const [key,handles] of staged)this.active.set(key,handles);
   for(const [key,handles] of [...this.active])if(!desired.has(key)){
    for(const handle of handles)this.release(handle);
    this.active.delete(key);
   }
   return this.snapshot();
  }
  snapshot(){return Object.freeze({regions:[...this.active.keys()],
   colliders:[...this.active.values()].reduce((n,handles)=>n+handles.length,0)});}
  dispose(){
   for(const handles of this.active.values())for(const handle of handles)this.release(handle);
   this.active.clear();
  }
 }
 return {PhysicsRegionStream};
});
