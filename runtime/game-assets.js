/* Phase 24: asset manifest, glTF/glb loading and layered animation state graph.
 * Host engine provides SceneLoader + animation groups; source names resolve to real clips.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroAssets=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const IDENT=/^[a-z][a-z0-9_-]{0,63}$/;
const safeUrl=url=>{
 if(typeof url!=="string"||url.length>512||!/^\.\/assets\/[a-z0-9_/-]+\.(?:glb|gltf)$/i.test(url)||url.includes("..")||url.includes("//"))
   throw Error("Assets must be same-origin paths under ./assets/ ending in .glb or .gltf");
 return url;
};
class AssetRegistry{
 constructor({BABYLON,scene,manifest={}}){
   if(!BABYLON?.SceneLoader||!scene)throw Error("Babylon SceneLoader and scene required");
   this.B=BABYLON;this.scene=scene;this.manifest=new Map();this.loaded=new Map();
   for(const [name,path] of Object.entries(manifest))this.register(name,path);
 }
 register(name,url){
   if(!IDENT.test(name)||this.manifest.has(name))throw Error("Duplicate/invalid asset name");
   this.manifest.set(name,safeUrl(url));return this;
 }
 async load(name){
   if(!this.manifest.has(name))throw Error("Unknown asset "+name);
   if(this.loaded.has(name))return this.loaded.get(name);
   const path=this.manifest.get(name);
   const split=path.lastIndexOf("/");
   const root=path.slice(0,split+1),file=path.slice(split+1);
   const result=await this.B.SceneLoader.ImportMeshAsync("",root,file,this.scene);
   if(!Array.isArray(result?.meshes)||!Array.isArray(result?.animationGroups))throw Error("Malformed glTF asset");
   const asset={name,meshes:result.meshes,root:result.meshes[0]||null,
     animations:new Map(result.animationGroups.map(g=>[g.name.toLowerCase(),g])),
     dispose(){for(const g of this.animations.values())g.dispose?.();for(const mesh of this.meshes)mesh.dispose?.();}};
   this.loaded.set(name,asset);return asset;
 }
 dispose(){for(const asset of this.loaded.values())asset.dispose();this.loaded.clear();}
}
class AnimationGraph{
 constructor({clips,transitions={},defaultState="idle",fade=.18}){
   if(!(clips instanceof Map))throw Error("AnimationGraph requires loaded glTF animations");
   this.clips=clips;this.transitions=transitions;
   this.defaultState=defaultState;this.fade=fade;this.state=null;
   if(!clips.has(defaultState))throw Error("Missing default animation "+defaultState);
   this.set(defaultState,{force:true});
 }
 set(state,{force=false,loop=true}={}){
   if(typeof state!=="string"||!this.clips.has(state))throw Error("Unknown animation state "+state);
   if(this.state===state&&!force)return false;
   const allowed=this.transitions[this.state];
   if(!force&&allowed&&!allowed.includes(state)&&state!==this.defaultState)
     return false;
   const prev=this.state?this.clips.get(this.state):null;
   const next=this.clips.get(state);
   if(prev&&prev!==next){prev.stop?.();prev.setWeightForAllAnimatables?.(0);}
   next.setWeightForAllAnimatables?.(1);next.start?.(loop);
   this.state=state;return true;
 }
 update({speed=0,grounded=true,attacking=false,dead=false}={}){
   if(dead&&this.clips.has("death"))return this.set("death",{loop:false});
   if(attacking&&this.clips.has("attack"))return this.set("attack",{loop:false});
   if(!grounded&&this.clips.has("jump"))return this.set("jump",{loop:false});
   return this.set(speed>3&&this.clips.has("run")?"run":speed>.15&&this.clips.has("walk")?"walk":this.defaultState);
 }
}
return {AssetRegistry,AnimationGraph,safeUrl};
});