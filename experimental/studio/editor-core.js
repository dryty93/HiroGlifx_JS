'use strict';
// Shared by the browser and Node tests. Never executes user source.
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HiroEditor=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 const INDENT='    ';
 const header=/^(?:(:[A-Za-z_]\w*\([^)]*\))|(if|while)\s+(.+)|(else))$/;
 function heading(text){
  const s=text.trim().replace(/:\s*$/,'');
  if(/^:[A-Za-z_]\w*\([^)]*\)$/.test(s))return true;
  if(/^(if|while)\s+\S.*$/.test(s))return true;
  return s==='else';
 }
 function blockHeader(text){return heading(text)&&/:$/.test(text.trim());}
 function normalizeHeader(text){
  const trimmed=text.trim();
  if(!trimmed||trimmed.startsWith('//'))return trimmed;
  if(heading(trimmed)&&!trimmed.endsWith(':'))return trimmed+':';
  return trimmed;
 }
 function splitComment(text){
  let quote=null,escape=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;}
   else if(c==='"'||c==="'")quote=c;
   else if(c==='/'&&text[i+1]==='/')return [text.slice(0,i),text.slice(i)];
  }
  return [text,''];
 }
 function isLayout(source){
  return source.split(/\r?\n/).some(line=>/^\s*:[A-Za-z_]\w*\([^)]*\)\s*:\s*(?:\/\/.*)?$/.test(line))
   ||source.split(/\r?\n/).some(line=>/^\s*:[A-Za-z_]\w*\([^)]*\)\s*$/.test(line));
 }
 // Conservative: fix whitespace and structural header punctuation, not expressions.
 // For a valid layout file, its block hierarchy is unchanged.
 function format(source){
  const lines=source.replace(/\r\n?/g,'\n').split('\n');
  const layout=isLayout(source);
  if(!layout)return lines.map(x=>x.replace(/[ \t]+$/,'')).join('\n');
  const result=[];
  let logicalDepth=0,prevIndent=0,prevDepth=0,prevWasHeader=false,activeGroup=0;
  const levels=[0]; // source indentation widths at active block depths
  const branchStack=[];
  for(const line of lines){
   if(!line.trim()){result.push('');continue;}
   const rawIndent=(line.match(/^[ \t]*/)||[''])[0].replace(/\t/g,INDENT).length;
   const rawBody=line.trimEnd().trimStart();
   const [code,comment]=splitComment(rawBody);
   const codeText=code.trimEnd();
   const formatted=normalizeHeader(codeText);
   if(activeGroup>0){
    // Keep grouped object and array layouts relative to their original indentation.
    const delta=rawIndent-prevIndent;
    const depth=Math.max(0,prevDepth+Math.round(delta/4));
    result.push(INDENT.repeat(depth)+(formatted||comment).trimEnd()+(comment&&formatted?' '+comment.trim():''));
    prevIndent=rawIndent;prevDepth=depth;
    activeGroup+=delimiters(codeText);
    continue;
   }
   if(/^\.[A-Za-z_]\w*\s*=/.test(formatted)){
    result.push(formatted+(comment?' '+comment.trim():''));
    logicalDepth=0;prevDepth=0;prevIndent=rawIndent;prevWasHeader=true;
    levels.length=0;levels.push(rawIndent);branchStack.length=0;
    continue;
   }
   let depth;
   if(prevWasHeader&&rawIndent>prevIndent){
    depth=prevDepth+1;
   }else if(rawIndent===prevIndent)depth=prevDepth;
   else if(rawIndent>prevIndent)depth=prevDepth; // stray indentation is normalized
   else{
    const previous=levels.findLastIndex(x=>x===rawIndent);
    depth=previous>=0?previous:Math.max(1,Math.round(rawIndent/4));
   }
   if(depth===0)depth=1;
   if(formatted==='else:'){
    while(branchStack.length&&branchStack[branchStack.length-1]>depth)branchStack.pop();
    if(branchStack.length)depth=branchStack.pop();
    else if(prevDepth>1)depth=prevDepth-1;
   }
   result.push(INDENT.repeat(depth)+formatted+(comment?' '+comment.trim():''));
   if(/^if\s/.test(formatted)&&formatted.endsWith(':'))branchStack.push(depth);
   levels[depth]=rawIndent;levels.length=depth+1;
   prevIndent=rawIndent;prevDepth=depth;prevWasHeader=blockHeader(formatted);
   activeGroup+=delimiters(codeText);
  }
  return result.join('\n');
 }
 function delimiters(code){
  let quote=null,escape=false,count=0;
  for(let i=0;i<code.length;i++){
   const c=code[i];
   if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}
   if(c==='"'||c==="'"){quote=c;continue;}
   if(c==='/'&&code[i+1]==='/')break;
   if('([{'.includes(c))count++;
   if(')]}'.includes(c))count--;
  }
  return count;
 }
 function quickFixes(source){
  const fixes=[];
  for(const [i,line] of source.split(/\r?\n/).entries()){
   const lineNo=i+1,trim=line.trim();
   if(line.startsWith('\t')||/^[ \t]*\t/.test(line)){
    fixes.push({line:lineNo,message:'Use four spaces instead of tabs',replacement:line.replace(/^\s+/,s=>s.replace(/\t/g,INDENT))});continue;
   }
   if(heading(trim)&&!trim.endsWith(':')){
    fixes.push({line:lineNo,message:'Add the missing block colon',replacement:line+':'});continue;
   }
   if(/^retrun\b/.test(trim)){
    fixes.push({line:lineNo,message:'Did you mean return?',replacement:line.replace('retrun','return')});
   }
   if(/^els:$/.test(trim))fixes.push({line:lineNo,message:'Did you mean else:?',replacement:line.replace('els:','else:')});
  }
  return fixes;
 }
 function applyFix(source,fix){
  const lines=source.split(/\r?\n/);
  if(!fix||!Number.isInteger(fix.line)||fix.line<1||fix.line>lines.length)throw Error('Invalid quick fix');
  lines[fix.line-1]=fix.replacement;
  return lines.join('\n');
 }
 function complete(source,cursor){
  const prefix=(source.slice(0,cursor).match(/[A-Za-z_]\w*$/)||[''])[0];
  if(!prefix||prefix.length<2)return [];
  const words=['return','if','else','while','echo','true','false','null','imports','run','reason','tools','model','role','instructions','memory'];
  const names=[...source.matchAll(/^\s*\.[A-Za-z_]\w*/gm)].map(m=>m[0].trim().slice(1));
  const methods=[...source.matchAll(/^\s*:[A-Za-z_]\w*(?=\()/gm)].map(m=>m[0].trim().slice(1));
  return [...new Set([...words,...names,...methods])]
   .filter(w=>w.toLowerCase().startsWith(prefix.toLowerCase())&&w!==prefix).slice(0,8)
   .map(w=>({label:w,insert:w,prefix}));
 }
 return {INDENT,heading,blockHeader,format,quickFixes,applyFix,complete,delimiters,isLayout};
});
