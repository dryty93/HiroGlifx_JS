'use strict';
// Independent expression engine for the upcoming parser integration.
// No eval(), Function(), or execution of arbitrary JavaScript.
function lex(input){
 const re=/\s+|(?:\d+(?:\.\d+)?)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|[A-Za-z_][A-Za-z_0-9]*|===|!==|==|!=|<=|>=|&&|\|\||[()+*\/<>=!-]|./gy;
 const out=[];let m;
 while((m=re.exec(input))){const s=m[0];if(/^\s+$/.test(s))continue;if(!/^(?:\d+(?:\.\d+)?|"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z_0-9]*|===|!==|==|!=|<=|>=|&&|\|\||[()+*\/<>=!-])$/.test(s))throw SyntaxError('Unexpected token '+s);out.push(s);}
 return out;
}
function parseExpression(input){
 const tokens=lex(input);let i=0;
 const precedence={'||':1,'&&':2,'==':3,'!=':3,'===':3,'!==':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6,'/':6};
 function atom(){
  const t=tokens[i++];if(t===undefined)throw SyntaxError('Expected expression');
  if(t==='('){const n=expr(0);if(tokens[i++]!==')')throw SyntaxError('Expected )');return n;}
  if(t==='!'||t==='-')return {type:'Unary',op:t,arg:atom()};
  if(/^\d/.test(t))return {type:'Literal',value:Number(t)};
  if(t[0]==='"')return {type:'Literal',value:JSON.parse(t)};
  if(t==='true'||t==='false'||t==='null')return {type:'Literal',value:t==='null'?null:t==='true'};
  if(/^[A-Za-z_]/.test(t))return {type:'Identifier',name:t};
  throw SyntaxError('Invalid expression atom '+t);
 }
 function expr(min){let left=atom();while(precedence[tokens[i]]>=min){const op=tokens[i++],p=precedence[op];const right=expr(p+1);left={type:'Binary',op,left,right};}return left;}
 const result=expr(0);if(i!==tokens.length)throw SyntaxError('Unexpected trailing token '+tokens[i]);return result;
}
function evaluateExpression(node,env={}){
 if(node.type==='Literal')return node.value;
 if(node.type==='Identifier'){if(!Object.hasOwn(env,node.name))throw Error('Undefined identifier '+node.name);return env[node.name];}
 if(node.type==='Unary'){const x=evaluateExpression(node.arg,env);return node.op==='!'?!x:-x;}
 if(node.type==='Binary'){
  const a=evaluateExpression(node.left,env);
  if(node.op==='&&')return a&&evaluateExpression(node.right,env);
  if(node.op==='||')return a||evaluateExpression(node.right,env);
  const b=evaluateExpression(node.right,env);
  switch(node.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '==':case '===':return a===b;case '!=':case '!==':return a!==b;case '<':return a<b;case '>':return a>b;case '<=':return a<=b;case '>=':return a>=b;}
 }
 throw Error('Unsupported AST node '+node.type);
}
module.exports={parseExpression,evaluateExpression};
