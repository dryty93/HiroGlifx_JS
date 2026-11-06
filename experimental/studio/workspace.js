'use strict';
(() => {
 const {source,saveDraft}=window.StudioApp,ide=window.StudioIDE,util=window.HiroWorkspaceCore;
 const el=id=>document.getElementById(id);
 const bar=el('find-bar'),search=el('find-query'),replace=el('replace-query');
 const findStatus=el('find-status'),outline=el('blueprints'),filter=el('outline-filter'),history=el('run-history');
 let filename=localStorage.getItem('hiroglifx.studio.filename')||'untitled.scroll',symbols=[];
 const setFilename=name=>{
  filename=util.safeFilename(name);
  el('current-file').textContent=filename;
  try{localStorage.setItem('hiroglifx.studio.filename',filename);}catch(_){}
 };
 setFilename(filename);
 function changed(){
  source.dispatchEvent(new Event('input',{bubbles:true}));
  saveDraft();
 }
 function doFind(backwards=false){
  const query=search.value,from=backwards?source.selectionStart:source.selectionEnd;
  const found=util.findNext(source.value,query,from,{backwards});
  if(!found){findStatus.textContent=query?'No matches':'Enter text to search';return null;}
  source.focus();source.setSelectionRange(found.from,found.to);
  findStatus.textContent='Match at line '+(source.value.slice(0,found.from).split('\n').length);
  ide.refresh();return found;
 }
 function replaceOne(){
  const query=search.value;if(!query)return;
  const selected=source.value.slice(source.selectionStart,source.selectionEnd);
  if(selected.toLowerCase()!==query.toLowerCase()&&!doFind())return;
  source.setRangeText(replace.value,source.selectionStart,source.selectionEnd,'end');
  changed();doFind();
 }
 function replaceEvery(){
  const query=search.value;if(!query)return;
  const result=util.replaceAll(source.value,query,replace.value);
  if(!result.count){findStatus.textContent='No matches';return;}
  source.value=result.source;changed();ide.refresh();
  findStatus.textContent='Replaced '+result.count+' occurrence'+(result.count===1?'':'s');
 }
 const openFind=()=>{
  bar.hidden=false;search.focus();search.select();
 };
 const closeFind=()=>{bar.hidden=true;source.focus();};
 el('search-code').addEventListener('click',openFind);
 el('find-next').addEventListener('click',()=>doFind());
 el('find-prev').addEventListener('click',()=>doFind(true));
 el('find-close').addEventListener('click',closeFind);
 el('replace-next').addEventListener('click',replaceOne);
 el('replace-all').addEventListener('click',replaceEvery);
 search.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();doFind(e.shiftKey);}
  if(e.key==='Escape')closeFind();
 });
 search.addEventListener('input',()=>{if(search.value)doFind();else findStatus.textContent='';});
 document.addEventListener('keydown',e=>{
  const meta=e.metaKey||e.ctrlKey;
  if(meta&&e.key.toLowerCase()==='f'){e.preventDefault();openFind();}
  if(meta&&e.key.toLowerCase()==='p'){e.preventDefault();filter.focus();filter.select();}
  if(e.key==='F3'){e.preventDefault();bar.hidden=false;doFind(e.shiftKey);}
  if(e.key==='Escape'&&!bar.hidden&&document.activeElement===search)closeFind();
 });
 function locate(name,kind){
  const line=util.symbolLine(source.value,name,kind);
  if(line!==null)ide.jumpToLine(line);
 }
 function renderOutline(){
  outline.replaceChildren();
  const query=filter.value.trim().toLowerCase();
  for(const bp of symbols){
   const names=[bp.name,...bp.methods];
   if(query&&!names.some(n=>n.toLowerCase().includes(query)))continue;
   const li=document.createElement('li');
   const button=document.createElement('button');button.type='button';button.className='outline-node';
   button.textContent='◈ '+bp.name;button.addEventListener('click',()=>locate(bp.name,'blueprint'));li.append(button);
   const meta=document.createElement('div');meta.className='outline-meta';
   meta.textContent=(bp.instances.length?bp.instances.length+' agents · ':'')+(bp.imports.length?bp.imports.join(', '):'no imports');
   li.append(meta);
   for(const name of bp.methods){
    if(query&&!name.toLowerCase().includes(query)&&!bp.name.toLowerCase().includes(query))continue;
    const method=document.createElement('button');method.type='button';method.className='outline-node';
    method.textContent='   :'+name+'()';method.addEventListener('click',()=>locate(name,'method'));li.append(method);
   }
   outline.append(li);
  }
  if(!outline.children.length){const li=document.createElement('li');li.textContent=query?'No matching symbols':'No symbols detected';outline.append(li);}
 }
 window.addEventListener('studio:diagnostics',e=>{
  if(Array.isArray(e.detail.outline)){symbols=e.detail.outline;renderOutline();}
 });
 filter.addEventListener('input',renderOutline);
 const picker=el('file-picker');
 el('open-file').addEventListener('click',()=>picker.click());
 picker.addEventListener('change',async()=>{
  const file=picker.files&&picker.files[0];picker.value='';
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.scroll')||file.size>100000){
   window.alert('Choose a .scroll file smaller than 100 KB.');return;
  }
  if(source.value.trim()&&!window.confirm('Replace the current editor contents? Your current local draft will be overwritten.'))return;
  try{
   source.value=await file.text();
   setFilename(file.name);changed();ide.refresh();source.focus();
  }catch(e){window.alert('Unable to open local file: '+e.message);}
 });
 el('download-file').addEventListener('click',()=>{
  const blob=new Blob([source.value],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 });
 const historyKey='hiroglifx.studio.run-history.v1';
 function getHistory(){
  try{return JSON.parse(localStorage.getItem(historyKey)||'[]');}catch{return [];}
 }
 function drawHistory(){
  history.replaceChildren();
  const runs=getHistory();
  if(!runs.length){const li=document.createElement('li');li.textContent='No recent runs';history.append(li);}
  for(const item of runs){
   const li=document.createElement('li');li.textContent=item.time+' · '+item.status+' · '+item.summary;history.append(li);
  }
 }
 window.addEventListener('studio:run',event=>{
  const detail=event.detail||{};
  const summary=JSON.stringify(detail.result);
  const item={time:new Date().toLocaleTimeString(),status:detail.error?'Error':'Success',summary:(detail.error||summary||'undefined').slice(0,100)};
  try{localStorage.setItem(historyKey,JSON.stringify([item,...getHistory()].slice(0,15)));}catch(_){}
  drawHistory();
 });
 drawHistory();
})();
