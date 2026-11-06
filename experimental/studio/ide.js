'use strict';
(() => {
 const {source,submit,saveDraft}=window.StudioApp;
 const core=window.HiroEditor;
 const find=id=>document.getElementById(id);
 const gutter=find('line-numbers'),status=find('cursor-status'),problems=find('problems'),completions=find('completions');
 const autoformat=find('autoformat'),fixButton=find('fix-code'),formatButton=find('format-code');
 const INDENT='    ';
 let lastDiagnostic=0,debounce,proposals=[],selectedSuggestion=0,showCompletion=false;
 const emitChange=()=>{source.dispatchEvent(new Event('input',{bubbles:true}));source.focus();};
 const edit=(from,to,replacement,selection=from+replacement.length)=>{
  source.setRangeText(replacement,from,to,'end');
  source.setSelectionRange(selection,selection);emitChange();
 };
 function positionInfo(){
  const before=source.value.slice(0,source.selectionStart);
  const line=before.split('\n').length,column=before.length-before.lastIndexOf('\n');
  status.textContent='Ln '+line+', Col '+column+' · '+source.value.split('\n').length+' lines';
 }
 function lineNumbers(){
  const count=source.value.split('\n').length;
  gutter.textContent=Array.from({length:count},(_,i)=>String(i+1)).join('\n');
  gutter.scrollTop=source.scrollTop;
 }
 function refresh(){positionInfo();lineNumbers();}
 function lineSpan(cursor){
  const start=source.value.lastIndexOf('\n',Math.max(0,cursor-1))+1;
  const end=source.value.indexOf('\n',cursor);
  return {start,end:end<0?source.value.length:end};
 }
 function cursorLine(){const span=lineSpan(source.selectionStart);return {span,text:source.value.slice(span.start,span.end)};}
 function correctCommittedLine(){
  const caret=source.selectionStart,span=lineSpan(caret),line=source.value.slice(span.start,span.end);
  const fix=core.quickFixes(line)[0];
  if(!fix)return;
  if(!/missing block colon|Did you mean|four spaces/.test(fix.message))return;
  const update=fix.replacement;
  source.setRangeText(update,span.start,span.end,'preserve');
  source.setSelectionRange(span.start+update.length,span.start+update.length);
  source.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function dedentElse(){
  const {span,text}=cursorLine();
  if(text.trim()!=='else:')return;
  const existing=(text.match(/^ */)||[''])[0].length;
  const before=source.value.slice(0,span.start).split('\n');
  let target=null;
  for(let i=before.length-1;i>=0;i--){
   const s=before[i],indent=(s.match(/^ */)||[''])[0].length;
   if(indent<existing&&/^if\s+.*:\s*$/.test(s.trim())){target=indent;break;}
   if(indent===0&&s.trim().startsWith('.'))break;
  }
  if(target===null||target===existing)return;
  const offset=source.selectionStart-span.start;
  source.setRangeText(INDENT.repeat(target/4)+text.trim(),span.start,span.end,'preserve');
  const delta=existing-target;
  source.setSelectionRange(Math.max(span.start+target,source.selectionStart-delta),Math.max(span.start+target,source.selectionStart-delta));
  source.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function replaceLines(action){
  const start=source.value.lastIndexOf('\n',Math.max(0,source.selectionStart-1))+1;
  const last=source.selectionEnd>source.selectionStart?source.selectionEnd-1:source.selectionEnd;
  const endIndex=source.value.indexOf('\n',last),end=endIndex<0?source.value.length:endIndex;
  const text=source.value.slice(start,end),lines=text.split('\n');
  const edited=lines.map(line=>{
   if(action==='indent')return INDENT+line;
   if(action==='outdent')return line.replace(/^ {1,4}/,'').replace(/^\t/,'');
   if(action==='comment')return line.trim().startsWith('//')?line.replace(/^(\s*)\/\/ ?/,'$1'):line.replace(/^(\s*)/,'$1// ');
   return line;
  }).join('\n');
  const expanded=source.selectionEnd!==source.selectionStart;
  source.setRangeText(edited,start,end,'preserve');
  source.setSelectionRange(expanded?start:Math.min(start+edited.length,source.selectionStart+4),start+edited.length);
  emitChange();
 }
 function inlineCorrect(){
  const {span,text}=cursorLine();
  if(!text.trim())return;
  const fix=core.quickFixes(text)[0];
  if(!fix)return;
  const next=fix.replacement;
  source.setRangeText(next,span.start,span.end,'preserve');
  source.setSelectionRange(span.start+next.length,span.start+next.length);
  source.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function smartEnter(){
  if(source.selectionStart!==source.selectionEnd){edit(source.selectionStart,source.selectionEnd,'\n');return;}
  // Explicitly correct only completed statement headers, not arbitrary expressions.
  if(autoformat.checked)inlineCorrect();
  const before=source.value.slice(0,source.selectionStart),current=before.slice(before.lastIndexOf('\n')+1);
  const leading=(current.match(/^ */)||[''])[0];
  const opens=core.blockHeader(current.trim());
  edit(source.selectionStart,source.selectionEnd,'\n'+leading+(opens?INDENT:''));
 }
 function autoPair(character){
  const pairs={'(':')','[':']','{':'}','"':'"',"'":"'"};
  const close=pairs[character];
  if(!close)return false;
  const from=source.selectionStart,to=source.selectionEnd;
  const selected=source.value.slice(from,to);
  if(from===to&&source.value[from]===close&&character===close){source.setSelectionRange(from+1,from+1);return true;}
  const lineStart=source.value.lastIndexOf('\n',Math.max(0,from-1))+1;
  const leading=source.value.slice(lineStart,from);
  let activeQuote=null,escaped=false;
  for(const c of leading){
   if(activeQuote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===activeQuote)activeQuote=null;}
   else if(c==='"'||c==="'")activeQuote=c;
  }
  if(activeQuote)return false;
  const text=character+selected+close;
  source.setRangeText(text,from,to,'preserve');
  source.setSelectionRange(from+1,from+1+selected.length);
  emitChange();return true;
 }
 function autocomplete(show=false){
  if(!showCompletion&&!show){completions.hidden=true;return;}
  const caret=source.selectionStart;
  proposals=core.complete(source.value,caret);
  if(!proposals.length){completions.hidden=true;return;}
  selectedSuggestion=0;
  drawCompletions();
 }
 function drawCompletions(){
  completions.replaceChildren();completions.hidden=!proposals.length;
  for(const [i,item] of proposals.entries()){
   const option=document.createElement('button');
   option.type='button';option.className='completion-option'+(i===selectedSuggestion?' is-active':'');
   option.textContent=item.label;
   option.setAttribute('role','option');option.setAttribute('aria-selected',String(i===selectedSuggestion));
   option.addEventListener('mousedown',e=>e.preventDefault());
   option.addEventListener('click',()=>acceptCompletion(i));
   completions.append(option);
  }
 }
 function acceptCompletion(index=selectedSuggestion){
  const item=proposals[index];if(!item)return;
  const end=source.selectionStart,start=end-item.prefix.length;
  edit(start,end,item.insert);
  completions.hidden=true;showCompletion=false;
 }
 async function diagnostics(){
  const serial=++lastDiagnostic,body={source:source.value};
  try{
   const response=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!response.ok)throw Error('Diagnostic service unavailable');
   const data=await response.json();if(serial!==lastDiagnostic)return;
   problems.replaceChildren();
   if(data.diagnostic){
    const item=document.createElement('div');item.className='problem-row';
    item.textContent='Error: '+data.diagnostic.message;
    if(data.diagnostic.line)item.addEventListener('click',()=>jumpToLine(data.diagnostic.line));
    problems.append(item);
   }
   for(const fix of (data.quickFixes||[])){
    const row=document.createElement('div');row.className='problem-row';
    const label=document.createElement('span');label.textContent='Line '+fix.line+': '+fix.message;
    const button=document.createElement('button');button.type='button';button.textContent='Fix';
    button.addEventListener('click',()=>{
     const before=source.value,after=core.applyFix(before,fix);
     if(after===before)return;
     source.value=after;source.dispatchEvent(new Event('input',{bubbles:true}));jumpToLine(fix.line);
    });
    row.append(label,button);problems.append(row);
   }
   if(!problems.childElementCount)problems.textContent='No syntax issues detected';
   window.dispatchEvent(new CustomEvent('studio:diagnostics',{detail:data}));
  }catch(e){if(serial===lastDiagnostic)problems.textContent='Diagnostics unavailable: '+e.message;}
 }
 function scheduleDiagnostics(){
  clearTimeout(debounce);debounce=setTimeout(diagnostics,300);
 }
 function formatDocument(){
  const formatted=core.format(source.value);
  if(formatted!==source.value){
   const previous=source.selectionStart;
   source.value=formatted;source.setSelectionRange(Math.min(formatted.length,previous),Math.min(formatted.length,previous));
   source.dispatchEvent(new Event('input',{bubbles:true}));
  }
  saveDraft();refresh();scheduleDiagnostics();
 }
 function save(){
  if(autoformat.checked)formatDocument();
  else saveDraft();
 }
 function jumpToLine(line){
  const lines=source.value.split('\n');const number=Math.max(1,Math.min(lines.length,Number(line)||1));
  const pos=lines.slice(0,number-1).reduce((sum,s)=>sum+s.length+1,0);
  source.focus();source.setSelectionRange(pos,pos);
  const lineHeight=parseFloat(getComputedStyle(source).lineHeight)||21;
  source.scrollTop=Math.max(0,(number-3)*lineHeight);refresh();
 }
 source.addEventListener('keydown',e=>{
  const meta=e.metaKey||e.ctrlKey;
  if(meta&&e.key.toLowerCase()==='s'){e.preventDefault();save();return;}
  if((meta&&e.shiftKey&&e.key.toLowerCase()==='f')||(e.altKey&&e.shiftKey&&e.key.toLowerCase()==='f')){e.preventDefault();formatDocument();return;}
  if(meta&&e.key==='/'){e.preventDefault();replaceLines('comment');return;}
  if(meta&&e.code==='Space'){e.preventDefault();showCompletion=true;autocomplete(true);return;}
  if(!completions.hidden&&['ArrowDown','ArrowUp','Escape','Enter','Tab'].includes(e.key)){
   if(e.key==='Escape'){e.preventDefault();completions.hidden=true;showCompletion=false;return;}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();selectedSuggestion=(selectedSuggestion+proposals.length+(e.key==='ArrowDown'?1:-1))%proposals.length;drawCompletions();return;}
   e.preventDefault();acceptCompletion();return;
  }
  if(e.key==='Tab'&&!meta&&!e.altKey){e.preventDefault();if(!e.shiftKey&&source.selectionStart===source.selectionEnd){edit(source.selectionStart,source.selectionEnd,INDENT);}else replaceLines(e.shiftKey?'outdent':'indent');return;}
  if(e.key==='Enter'&&!e.shiftKey&&!meta&&!e.altKey){e.preventDefault();smartEnter();return;}
  if(!meta&&!e.altKey&&!e.shiftKey&&'([{\"\''.includes(e.key)){
   // Skip inserting paired quotes inside existing string literals is future language work.
   e.preventDefault();autoPair(e.key);return;
  }
 });
 source.addEventListener('input',e=>{
  if(autoformat.checked&&source.value.slice(0,source.selectionStart).endsWith('else:'))dedentElse();
  refresh();scheduleDiagnostics();
  showCompletion=true;
  autocomplete(true);
 });
 source.addEventListener('keyup',positionInfo);
 source.addEventListener('click',positionInfo);
 source.addEventListener('scroll',()=>{gutter.scrollTop=source.scrollTop;});
 source.addEventListener('blur',()=>{
  setTimeout(()=>{if(document.activeElement!==source)completions.hidden=true;},80);
 });
 source.addEventListener('paste',()=>setTimeout(()=>{
  if(autoformat.checked){source.value=source.value.replace(/^\t+/gm,m=>INDENT.repeat(m.length));source.dispatchEvent(new Event('input',{bubbles:true}));}
 },0));
 formatButton.addEventListener('click',formatDocument);
 fixButton.addEventListener('click',()=>{
  const fixes=core.quickFixes(source.value);
  for(const fix of fixes.reverse())source.value=core.applyFix(source.value,fix);
  formatDocument();source.dispatchEvent(new Event('input',{bubbles:true}));
 });
 window.StudioIDE={formatDocument,jumpToLine,save,diagnostics,refresh};
 refresh();scheduleDiagnostics();
})();
