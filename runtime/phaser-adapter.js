/* Browser Phaser 4 integration. The engine is injected by the host. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroPhaser=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 class PhaserAdapter{
   constructor({Phaser,container,model}){
     if(!Phaser||typeof Phaser.Game!=="function")throw new Error("Phaser 4 required");
     if(!container||!model)throw new Error("Container and scene model required");
     this.Phaser=Phaser;this.container=container;this.model=model;
     this.nodes=new Map();this.game=null;this.started=false;
   }
   async start(){
     if(this.started)throw new Error("Phaser already started");
     const adapter=this;
     return new Promise((resolve,reject)=>{
       try{
         this.game=new this.Phaser.Game({
           type:this.Phaser.AUTO,
           width:this.model.width,height:this.model.height,
           parent:this.container,
           backgroundColor:this.model.background,
           scene:{
             create(){
               for(const item of adapter.model.objects.values()){
                 const hex=/^#[0-9a-fA-F]{6}$/.test(item.fill)?Number.parseInt(item.fill.slice(1),16):0x60a5fa;
                 const sprite=this.add.rectangle(item.x+item.width/2,item.y+item.height/2,item.width,item.height,hex);
                 adapter.nodes.set(item.name,sprite);
               }
               adapter.started=true;resolve(adapter);
             },
             update(){adapter.sync();}
           }
         });
       }catch(error){reject(error);}
     });
   }
   sync(){
     for(const item of this.model.objects.values()){
       const sprite=this.nodes.get(item.name);
       if(!sprite)continue;
       sprite.setPosition(item.x+item.width/2,item.y+item.height/2);
       if(typeof sprite.setDisplaySize==="function")sprite.setDisplaySize(item.width,item.height);
     }
   }
   keydown(key){this.model.keydown(key);this.sync();}
   seek(time){this.model.seek(time);this.sync();}
   stop(){if(this.game)this.game.destroy(true);this.game=null;this.nodes.clear();this.started=false;}
 }
 return {PhaserAdapter};
});