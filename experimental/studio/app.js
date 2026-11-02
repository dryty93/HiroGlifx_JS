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
  if(run){result.textContent=JSON.stringify(data.result,null,2);trace.textContent=JSON.stringify({events:data.trace,logs:data.logs},null,2);}
 }catch(e){error.textContent=e.message;result.textContent='Failed';}
}
document.getElementById('analyze').addEventListener('click',()=>submit(false));
document.getElementById('run').addEventListener('click',()=>submit(true));
