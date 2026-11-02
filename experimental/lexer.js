'use strict';
function tokenize(source) {
 const tokens=[];
 const re=/\s+|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|&&|\|\||[A-Za-z_][A-Za-z_0-9]*|[.#&$=();{},~:+*/!<>-]|./gy;
 let match;
 while((match=re.exec(source))!==null){
  const value=match[0];
  if(/^\s+$/.test(value)||value.startsWith('//'))continue;
  const kind=/^[A-Za-z_]/.test(value)?'id':/^["']/.test(value)?'string':/^\d/.test(value)?'number':'symbol';
  if(kind==='symbol'&&!['===','!==','==','!=','<=','>=','&&','||'].includes(value)&&!'.#&$=();{},~:+*/!<>-'.includes(value))
   throw new SyntaxError('Unexpected character '+JSON.stringify(value)+' at '+match.index);
  tokens.push({kind,value,offset:match.index});
 }
 tokens.push({kind:'eof',value:'<eof>',offset:source.length});
 return tokens;
}
module.exports={tokenize};
