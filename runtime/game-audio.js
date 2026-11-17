/* Original procedural RPG audio — licensed music assets not required.
 * AudioContext starts only after an explicit user gesture.
 */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroGameAudio=api;})(typeof globalThis!=="undefined"?globalThis:this,function(root){
"use strict";
const PRESETS={
 swing:{freq:420,end:145,time:.13,wave:"sawtooth"},
 hit:{freq:170,end:70,time:.21,wave:"triangle"},
 parry:{freq:750,end:990,time:.14,wave:"square"},
 collect:{freq:740,end:1100,time:.23,wave:"sine"},
 quest:{freq:640,end:1020,time:.48,wave:"sine"},
 defeat:{freq:160,end:42,time:.45,wave:"triangle"},
 heal:{freq:440,end:880,time:.3,wave:"sine"},
 step:{freq:145,end:95,time:.045,wave:"triangle"}
};
class GameAudio{
 constructor({AudioContext:Context=(root.AudioContext||root.webkitAudioContext),volume=.32,muted=false}={}){
   if(typeof volume!=="number"||volume<0||volume>1)throw Error("Invalid volume");
   this.Context=Context;this.ctx=null;this.volume=volume;this.muted=muted;this.voices=new Set();
   this.ambience=[];
 }
 async unlock(){
   if(!this.Context)throw Error("Web Audio unavailable in this browser");
   if(!this.ctx)this.ctx=new this.Context();
   if(this.ctx.state==="suspended")await this.ctx.resume();
   return this.ctx;
 }
 setVolume(value){if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1)throw Error("Invalid volume");this.volume=value;}
 mute(value=true){this.muted=Boolean(value);}
 play(name,{intensity=1}={}){
   const p=PRESETS[name];if(!p)throw Error("Unknown game audio cue "+name);
   if(!this.ctx||this.muted)return false;
   if(typeof intensity!=="number"||!Number.isFinite(intensity)||intensity<0||intensity>2)throw Error("Invalid intensity");
   const c=this.ctx,now=c.currentTime;
   const tone=c.createOscillator(),gain=c.createGain();
   tone.type=p.wave;
   tone.frequency.setValueAtTime(p.freq,now);
   tone.frequency.exponentialRampToValueAtTime(p.end,now+p.time);
   gain.gain.setValueAtTime(Math.max(.0001,this.volume*.12*intensity),now);
   gain.gain.exponentialRampToValueAtTime(.0001,now+p.time);
   tone.connect(gain).connect(c.destination);
   this.voices.add(tone);tone.onended=()=>{tone.disconnect();gain.disconnect();this.voices.delete(tone);};
   tone.start(now);tone.stop(now+p.time);
   return true;
 }
 startAmbience(){
   if(!this.ctx||this.ambience.length||this.muted)return false;
   const c=this.ctx;
   for(const freq of [65.41,98.0,130.81]){
     const oscillator=c.createOscillator(),gain=c.createGain();
     oscillator.type="sine";oscillator.frequency.value=freq;
     gain.gain.value=this.volume*.011;
     oscillator.connect(gain).connect(c.destination);oscillator.start();
     this.ambience.push({oscillator,gain});
   }
   return true;
 }
 stopAmbience(){for(const {oscillator,gain} of this.ambience){oscillator.stop();oscillator.disconnect();gain.disconnect();}this.ambience=[];}
 async close(){
   this.stopAmbience();
   for(const voice of this.voices){voice.stop?.();voice.disconnect?.();}
   this.voices.clear();
   if(this.ctx)await this.ctx.close?.();
   this.ctx=null;
 }
}
return {GameAudio,PRESETS};
});