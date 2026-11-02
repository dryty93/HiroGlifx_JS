'use strict';
const {tokenize}=require('./lexer');
function decodeString(raw) {
 if(raw[0]==='"') return JSON.parse(raw);
 const inner=raw.slice(1,-1);
 return inner.replace(/\\\\/g,'\\').replace(/\\'/g,"'").replace(/\\n/g,'\n').replace(/\\t/g,'\t');
}
function parse(source) {
 const tokens=tokenize(source); let pos=0;
 const peek=()=>tokens[pos].value;
 const take=(expected)=>{const t=tokens[pos];if(expected!==undefined&&t.value!==expected)throw new SyntaxError('Expected '+expected+' at '+t.offset+', found '+t.value);pos++;return t.value;};
 const id=()=>{const t=tokens[pos];if(t.kind!=='id')throw new SyntaxError('Expected identifier at '+t.offset);pos++;return t.value;};
 const precedence={'||':1,'&&':2,'==':3,'!=':3,'===':3,'!==':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6};
 const atom=()=>{
  let node;
  if(tokens[pos].kind==='string')node={type:'Literal',value:decodeString(take())};
  else if(tokens[pos].kind==='number')node={type:'Literal',value:Number(take())};
  else if(['true','false','null'].includes(peek())){const v=take();node={type:'Literal',value:v==='null'?null:v==='true'};}
  else if(peek()==='!'||peek()==='-'){const op=take();node={type:'Unary',op,arg:atom()};}
  else if(peek()==='('){take('(');node=expr(0);take(')');}
  else if(peek()==='['){take('[');const elements=[];if(peek()!==']'){elements.push(expr());while(peek()===','){take(',');elements.push(expr());}}take(']');node={type:'Array',elements};}
  else if(peek()==='{'){take('{');const entries=[];if(peek()!=='}'){do{const key=tokens[pos].kind==='string'?decodeString(take()):id();take(':');entries.push({key,value:expr()});if(peek()!==',')break;take(',');}while(true);}take('}');node={type:'Object',entries};}
  else if(peek()==='$'){take('$');node={type:'Variable',name:id()};}
  else {const name=id();node={type:'Name',name};}
  while(peek()==='['||peek()==='.'){
   if(peek()==='['){take('[');const key=expr();take(']');node={type:'Access',target:node,key};continue;}
   take('.');const property=id();
   if(peek()==='('){take('(');const args=argsList();take(')');if(node.type!=='Name')throw new SyntaxError('Method calls require an agent instance');node={type:'Call',target:node.name,method:property,args};}
   else node={type:'Access',target:node,key:{type:'Literal',value:property}};
  }
  return node;
 };
 const expr=(min=0)=>{
  let left=atom();
  while(precedence[peek()]!==undefined&&precedence[peek()]>=min){
   const op=take(),right=expr(precedence[op]+1);
   left={type:'Binary',op,left,right};
  }
  return left;
 };
 const argsList=()=>{const args=[];if(peek()!==')'){args.push(expr());while(peek()===','){take(',');args.push(expr());}}return args;};
 const block=()=>{take('{');const body=[];while(peek()!=='}'){if(peek()==='<eof>')throw new SyntaxError('Unclosed block');body.push(stmt());}take('}');return body;};
 const stmt=()=>{
  if(peek()==='if'){
   take('if');take('(');const condition=expr();take(')');const then=block();
   let otherwise=[];if(peek()==='else'){take('else');otherwise=block();}
   if(peek()===';')take(';');return {type:'If',condition,then,otherwise};
  }
  if(peek()==='while'){
   take('while');take('(');const condition=expr();take(')');const body=block();
   if(peek()===';')take(';');return {type:'While',condition,body};
  }
  if(peek()==='I'){take('I');take('imports');take('=');const names=[id()];while(peek()==='~'){take('~');names.push(id());}take(';');return {type:'Import',names};}
  if(peek()==='&'){take('&');const name=id();take('=');const blueprint=id();take('(');const args=argsList();take(')');take(';');return {type:'Instance',name,blueprint,args};}
  if(peek()==='$'){take('$');const name=id();take('=');const value=expr();take(';');return {type:'Assign',name,value};}
  if(peek()==='return'){take('return');const value=expr();take(';');return {type:'Return',value};}
  if(peek()==='echo'){take('echo');take('(');const value=expr();take(')');take(';');return {type:'Echo',value};}
  if(peek()===':'){take(':');const name=id();take('(');const params=[];if(peek()!==')'){take('$');params.push(id());while(peek()===','){take(',');take('$');params.push(id());}}take(')');take('=');const body=block();take(';');return {type:'Method',name,params,body};}
  throw new SyntaxError('Unexpected token '+peek()+' at '+tokens[pos].offset);
 };
 const blueprints=[];
 while(peek()!=='<eof>'){
  take('.');const name=id();take('=');take('(');
  const params=[];
  if(peek()!==')'){
   take('$');params.push(id());
   while(peek()===','){take(',');take('$');params.push(id());}
  }
  take(')');
  const body=[];
  while(peek()!=='break'&&peek()!=='.'&&peek()!=='<eof>')body.push(stmt());
  if(peek()==='break'){take('break');take(';');}
  blueprints.push({type:'Blueprint',name,params,body});
 }
 return {type:'Program',blueprints};
}
module.exports={parse};
