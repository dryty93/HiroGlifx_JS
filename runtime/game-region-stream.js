/* Bounded, deterministic streaming of visual-only details by authored world region.
 * Physics colliders and navigation remain resident; mesh detail is disposable.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroRegionStream=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 class RegionStream{
   constructor({regions,create,radius=8,maxRegions=3}={}){
     if(!Array.isArray(regions)||regions.length<1||regions.length>4096||
        typeof create!=="function"||!Number.isFinite(radius)||radius<0||radius>100||
        !Number.isInteger(maxRegions)||maxRegions<1||maxRegions>8)throw Error("Invalid region streamer");
     this.regions=regions;this.create=create;this.radius=radius;this.maxRegions=maxRegions;
     this.loaded=new Map();this.cellSize=64;this.cells=new Map();
     for(const region of regions){
       if(!Array.isArray(region)||region.length<6||![2,3,4,5].every(i=>Number.isFinite(region[i]))||
          region[4]<=0||region[5]<=0||region[4]>512||region[5]>512)
         throw Error("Invalid visual streaming region");
       const [id,,cx,cz,w,d]=region;
       const x0=Math.floor((cx-w/2-radius)/this.cellSize),x1=Math.floor((cx+w/2+radius)/this.cellSize);
       const z0=Math.floor((cz-d/2-radius)/this.cellSize),z1=Math.floor((cz+d/2+radius)/this.cellSize);
       for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
         const key=x+":"+z,list=this.cells.get(key)||[];
         list.push(region);this.cells.set(key,list);
       }
     }
   }
   near(row,x,z){return Math.max(0,Math.abs(row[2]-x)-row[4]/2)<=this.radius&&
       Math.max(0,Math.abs(row[3]-z)-row[5]/2)<=this.radius;}
   update({x,z}){
     if(!Number.isFinite(x)||!Number.isFinite(z))throw Error("Invalid player location");
     const key=Math.floor(x/this.cellSize)+":"+Math.floor(z/this.cellSize);
     const desired=(this.cells.get(key)||[]).filter(r=>this.near(r,x,z))
       .sort((a,b)=>Math.hypot(a[2]-x,a[3]-z)-Math.hypot(b[2]-x,b[3]-z))
       .slice(0,this.maxRegions);
     const ids=new Set(desired.map(r=>r[0])),staged=[];
     try{
       for(const row of desired)if(!this.loaded.has(row[0])){
         const value=this.create(row);
         if(!value||typeof value.dispose!=="function")throw Error("Stream factory must return disposable resource");
         staged.push([row[0],value]);
       }
     }catch(error){for(const [,value] of staged)value.dispose();throw error;}
     for(const [id,value] of this.loaded)if(!ids.has(id)){value.dispose();this.loaded.delete(id);}
     for(const [id,value] of staged)this.loaded.set(id,value);
     return this.snapshot();
   }
   snapshot(){return Object.freeze({regions:[...this.loaded.keys()],count:this.loaded.size});}
   dispose(){for(const value of this.loaded.values())value.dispose();this.loaded.clear();}
 }
 return {RegionStream};
});
