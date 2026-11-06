'use strict';
const source=document.getElementById('source'),error=document.getElementById('error'),list=document.getElementById('blueprints'),result=document.getElementById('result'),trace=document.getElementById('trace');
async function submit(run){
 error.textContent='';result.textContent=run?'Running...':'Analysis ready';
 try{
  const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:source.value,run})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed');
  list.replaceChildren();
  for(const bp of data.blueprints){
   const li=document.createElement('li');
   li.textContent=bp.name+' — imports: '+(bp.imports.join(', ')||'none')+'; instances: '+(bp.instances.map(x=>x.name+':'+x.blueprint).join(', ')||'none')+'; methods: '+(bp.methods.join(', ')||'none');
   list.append(li);
  }
  if(run){result.textContent=JSON.stringify(data.result,null,2);trace.textContent=JSON.stringify({events:data.trace,logs:data.logs},null,2);window.dispatchEvent(new CustomEvent('studio:run',{detail:{result:data.result}}));}
 }catch(e){error.textContent=e.message;result.textContent='Failed';if(run)window.dispatchEvent(new CustomEvent('studio:run',{detail:{error:e.message}}));}
}
document.getElementById('analyze').addEventListener('click',()=>submit(false));
document.getElementById('run').addEventListener('click',()=>submit(true));


// The editor persists only in the local browser; it does not upload source files.
const draftKey='hiroglifx.studio.draft.v1';
const sample=source.value;
const saveStatus=document.getElementById('save-status');
try{
 const stored=localStorage.getItem(draftKey);
 if(stored!==null){source.value=stored;saveStatus.textContent='Local draft restored';}
}catch(_){saveStatus.textContent='Browser storage unavailable';}
function saveDraft(){
 try{localStorage.setItem(draftKey,source.value);saveStatus.textContent='Draft saved in this browser';}
 catch(_){saveStatus.textContent='Storage unavailable — copy your code';}
}
function insertAtCursor(value,cursorShift=value.length){
 const start=source.selectionStart,end=source.selectionEnd;
 source.value=source.value.slice(0,start)+value+source.value.slice(end);
 source.selectionStart=source.selectionEnd=start+cursorShift;
 saveDraft();
}
source.addEventListener('input',saveDraft);
document.getElementById('reset').addEventListener('click',()=>{
 if(source.value!==sample&&!window.confirm('Replace the current editor text with the sample?'))return;
 source.value=sample;saveDraft();source.focus();
});

window.StudioApp={source,submit,saveDraft,sample};
