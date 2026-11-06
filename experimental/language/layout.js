'use strict';

/**
 * Translate indentation-based .scroll into the existing brace AST grammar.
 * Legacy files without a colon-style method remain unchanged.
 *
 * Layout syntax is intentionally strict: 4 spaces per level, no tabs, and
 * one logical statement per line. Grouped arrays/objects/calls may span lines.
 */
function usesLayout(source) {
 return source.split(/\r?\n/).some(line => /^\s*:[A-Za-z_]\w*\([^)]*\):\s*(?:\/\/.*)?$/.test(line));
}

function withoutComment(line) {
 let quote=null, escaped=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(quote) {
   if(escaped)escaped=false;
   else if(c==='\\')escaped=true;
   else if(c===quote)quote=null;
  } else if(c==='"'||c==="'")quote=c;
  else if(c==='/'&&line[i+1]==='/')return line.slice(0,i);
 }
 return line;
}

function logicalLines(source) {
 const out=[];let group=[],pending='',start=0,indent=0;
 for(const [i,line] of source.replace(/\r\n?/g,'\n').split('\n').entries()){
  const lineNumber=i+1;
  if(/^\s*$/.test(line)||/^\s*\/\//.test(line))continue;
  if(!pending){
   const whitespace=(line.match(/^[ \t]*/)||[''])[0];
   if(whitespace.includes('\t'))throw new SyntaxError('Tabs are not permitted for indentation at line '+lineNumber);
   indent=whitespace.length;
   if(indent%4!==0)throw new SyntaxError('Indentation must use multiples of four spaces at line '+lineNumber);
   start=lineNumber;
  }
  const code=withoutComment(line).trim();
  if(!code)continue;
  pending+=(pending?' ':'')+code;
  let quote=null,escaped=false;
  for(const c of code){
   if(quote){
    if(escaped)escaped=false;
    else if(c==='\\')escaped=true;
    else if(c===quote)quote=null;
    continue;
   }
   if(c==='"'||c==="'"){quote=c;continue;}
   if('([{'.includes(c))group.push(c);
   else if(')]}'.includes(c)){
    const opening=group.pop();
    if(!opening||'([{'.indexOf(opening)!==')]}'.indexOf(c))
     throw new SyntaxError('Unbalanced delimiter at line '+lineNumber);
   }
  }
  if(group.length===0){out.push({code:pending,indent,line:start});pending='';}
 }
 if(pending)throw new SyntaxError('Unclosed grouped expression starting at line '+start);
 return out;
}

function normalizeLayout(source) {
 if(!usesLayout(source))return source;
 const lines=logicalLines(source);
 const output=[],frames=[];
 let previouslyClosedIf=null;
 function close(frame) {
  if(!frame.child&&frame.type!=='blueprint')throw new SyntaxError('Missing indented body after line '+frame.line);
  if(frame.type==='method')output.push('};');
  else if(frame.type!=='blueprint')output.push('}');
  previouslyClosedIf=frame.type==='if'?frame.indent:null;
 }
 for(const entry of lines){
  const {code,indent,line}=entry;
  while(frames.length&&indent<=frames[frames.length-1].indent)close(frames.pop());
  const parent=frames[frames.length-1];
  if(parent){
   if(indent!==parent.indent+4)throw new SyntaxError('Unexpected indentation at line '+line);
   parent.child=true;
  }else if(indent!==0)throw new SyntaxError('Expected top-level blueprint at line '+line);
  const isElse=code==='else:';
  if(isElse&&previouslyClosedIf!==indent)throw new SyntaxError('else without matching if at line '+line);
  if(!isElse)previouslyClosedIf=null;

  if(/^\.[A-Za-z_]\w*\s*=\s*\([^)]*\)$/.test(code)){
   if(indent!==0)throw new SyntaxError('Blueprint must start at column zero at line '+line);
   output.push(code);frames.push({type:'blueprint',indent,line,child:false});continue;
  }
  if(!parent)throw new SyntaxError('Expected blueprint before line '+line);
  const method=code.match(/^(:[A-Za-z_]\w*\([^)]*\))\s*:\s*$/);
  if(method){
   if(parent.type!=='blueprint')throw new SyntaxError('Methods belong directly in a blueprint at line '+line);
   output.push(method[1]+' = {');frames.push({type:'method',indent,line,child:false});continue;
  }
  const condition=code.match(/^(if|while)\s+(.+):$/);
  if(condition){
   if(parent.type==='blueprint')throw new SyntaxError('Conditions belong inside methods at line '+line);
   output.push(condition[1]+' ('+condition[2]+') {');
   frames.push({type:condition[1],indent,line,child:false});continue;
  }
  if(isElse){
   output.push('else {');frames.push({type:'else',indent,line,child:false});continue;
  }
  if(code.endsWith(':'))throw new SyntaxError('Unsupported block header at line '+line);
  output.push(code.endsWith(';')?code:code+';');
 }
 while(frames.length)close(frames.pop());
 return output.join('\n');
}
module.exports={normalizeLayout,usesLayout};
