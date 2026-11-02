'use strict';
const {tokenize}=require('./lexer');
function parse(source) {
 const tokens=tokenize(source); let pos=0;
 const peek=()=>tokens[pos].value;
 const take=(expected)=>{const t=tokens[pos];if(expected!==undefined&&t.value!==expected)throw new SyntaxError('Expected '+expected+' at '+t.offset+', found '+t.value);pos++;return t.value;};
 const id=()=>{const t=tokens[pos];if(t.kind!=='id')throw new SyntaxError('Expected identifier at '+t.offset);pos++;return t.value;};
 const expr=()=>{
  if(tokens[pos].kind==='string')return {type:'Literal',value:JSON.parse(JSON.stringify(take()).replace(/^'/,'"').replace(/'$/,'"'))};
  if(peek()==='$'){take('$');return {type:'Variable',name:id()};}
  const name=id();
  if(peek()==='.') {take('.');const method=id();take('(');const args=argsList();take(')');return {type:'Call',target:name,method,args};}
  return {type:'Name',name};
 };
 const argsList=()=>{const args=[];if(peek()!==')'){args.push(expr());while(peek()===','){take(',');args.push(expr());}}return args;};
 const stmt=()=>{
  if(peek()==='I'){take('I');take('imports');take('=');const names=[id()];while(peek()==='~'){take('~');names.push(id());}take(';');return {type:'Import',names};}
  if(peek()==='&'){take('&');const name=id();take('=');const blueprint=id();take('(');const args=argsList();take(')');take(';');return {type:'Instance',name,blueprint,args};}
  if(peek()==='$'){take('$');const name=id();take('=');const value=expr();take(';');return {type:'Assign',name,value};}
  if(peek()==='return'){take('return');const value=expr();take(';');return {type:'Return',value};}
  if(peek()==='echo'){take('echo');take('(');const value=expr();take(')');take(';');return {type:'Echo',value};}
  if(peek()===':'){take(':');const name=id();take('(');const params=[];if(peek()!==')'){take('$');params.push(id());while(peek()===','){take(',');take('$');params.push(id());}}take(')');take('=');take('{');const body=[];while(peek()!=='}')body.push(stmt());take('}');take(';');return {type:'Method',name,params,body};}
  throw new SyntaxError('Unexpected token '+peek()+' at '+tokens[pos].offset);
 };
 const blueprints=[];
 while(peek()!=='<eof>'){take('.');const name=id();take('=');take('(');take(')');const body=[];while(peek()!=='break'&&peek()!=='.'&&peek()!=='<eof>')body.push(stmt());if(peek()==='break'){take('break');take(';');}blueprints.push({type:'Blueprint',name,body});}
 return {type:'Program',blueprints};
}
module.exports={parse};
