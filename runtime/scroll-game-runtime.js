/* HiroGlifx native game-script interpreter: declarative state + game loop + draw.
 * No JS eval, Function, globals, arbitrary property access, imports or unbounded loops.
 * Browser and Node compatible; a host supplies a Canvas 2D context for draw().
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroScrollGame=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const ID=/^[a-zA-Z_][a-zA-Z0-9_]*$/;
 const TYPES={"#":"number","$":"string","?":"boolean"};
 const START=/^\.Main\s*=\s*\(\)\s*$/;
 const PRESET_METHOD=/^:\s*(tick|draw)\s*\(\s*(dt)?\s*\)\s*=\s*\[$/;
 const DECL=/^([#$?])\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/;
 const ASSIGN=/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/;
 const CALL=/^(.+);$/;
 const OPS=["||","&&","==","!=","<=",">=","+","-","*","/","%","<",">","!"];
 const precedence={"||":1,"&&":2,"==":3,"!=":3,"<":4,">":4,"<=":4,">=":4,"+":5,"-":5,"*":6,"/":6,"%":6};
 function tokens(source){
   const out=[];let i=0;
   while(i<source.length){
     if(/\s/.test(source[i])){i++;continue;}
     const char=source[i];
     if(char==='"'||char==="'"){
       const q=char;let word="",end=false;i++;
       while(i<source.length){
         if(source[i]===q){i++;end=true;break;}
         if(source[i]==="\\"){
           const next=source[++i];
           if(!["\\",q,"n","t"].includes(next))throw new SyntaxError("Invalid escape sequence");
           word+=next==="n"?"\n":next==="t"?"\t":next;i++;
         }else word+=source[i++];
       }
       if(!end)throw new SyntaxError("Unclosed string");
       out.push({kind:"literal",value:word});continue;
     }
     const num=source.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
     if(num){out.push({kind:"literal",value:Number(num[0])});i+=num[0].length;continue;}
     const ident=source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
     if(ident){out.push({kind:"name",value:ident[0]});i+=ident[0].length;continue;}
     if("(),".includes(char)){out.push({kind:char,value:char});i++;continue;}
     const op=OPS.find(o=>source.startsWith(o,i));
     if(!op)throw new SyntaxError("Unsupported character "+char);
     out.push({kind:"op",value:op});i+=op.length;
   }
   return out;
 }
 function expression(source){
   const parts=tokens(source);let i=0;
   const peek=()=>parts[i];
   const take=(kind,value)=>{
     const item=parts[i++];
     if(!item||item.kind!==kind||(value!==undefined&&item.value!==value))
       throw new SyntaxError("Expected "+(value||kind));
     return item;
   };
   function atom(){
     const first=peek();
     if(!first)throw new SyntaxError("Missing expression");
     if(first.kind==="op"&&["-","!","+"].includes(first.value)){
       i++;return {tag:"unary",op:first.value,a:parse(7)};
     }
     if(first.kind==="("){
       i++;const inner=parse(0);take(")");return inner;
     }
     if(first.kind==="literal"){i++;return {tag:"literal",value:first.value};}
     if(first.kind!=="name")throw new SyntaxError("Expected name or literal");
     i++;
     if(first.value==="true"||first.value==="false")return {tag:"literal",value:first.value==="true"};
     if(peek()?.kind!=="(")return {tag:"name",name:first.value};
     i++;const args=[];
     if(peek()?.kind!==")"){
       do{args.push(parse(0));if(peek()?.kind!==",")break;i++;}while(true);
     }
     take(")");
     return {tag:"call",name:first.value,args};
   }
   function parse(min){
     let left=atom();
     while(peek()?.kind==="op"){
       const op=peek().value,priority=precedence[op];
       if(!priority||priority<min)break;
       i++;left={tag:"binary",op,left,right:parse(priority+1)};
     }
     return left;
   }
   const ast=parse(0);
   if(i!==parts.length)throw new SyntaxError("Unexpected trailing expression");
   return ast;
 }
 function parseProgram(source){
   const lines=String(source).split(/\r?\n/);
   if(lines.length>1600||String(source).length>100000)throw new Error("Game source too large");
   let started=false,finished=false,method=null;
   const program={declarations:[],methods:new Map()};
   const stack=[];
   for(let i=0;i<lines.length;i++){
     const line=lines[i].trim(),lineNumber=i+1;
     if(!line||line.startsWith("//"))continue;
     try{
       if(!started){
         if(!START.test(line))throw new Error("Expected .Main = ()");
         started=true;continue;
       }
       if(finished)throw new Error("Unexpected commands after break");
       if(!method){
         if(line==="break;"){finished=true;continue;}
         const declaration=line.match(DECL);
         if(declaration){
           const [_,type,name,initial]=declaration;
           if(program.declarations.some(x=>x.name===name)||name==="dt")throw new Error("Duplicate or reserved variable "+name);
           program.declarations.push({type,name,initial:expression(initial),line:lineNumber});
           continue;
         }
         const methodStart=line.match(PRESET_METHOD);
         if(methodStart){
           const name=methodStart[1];
           if(program.methods.has(name))throw new Error("Duplicate method "+name);
           if((name==="tick")!==Boolean(methodStart[2]))throw new Error("tick requires dt; draw takes no arguments");
           method={name,body:[],line:lineNumber};
           stack.push(method.body);continue;
         }
         throw new Error("Expected declaration or : tick(dt) / : draw()");
       }
       if(line==="]"){
         if(stack.length>1){stack.pop();continue;}
         if(stack.length!==1)throw new Error("Unexpected end of method");
         program.methods.set(method.name,method.body);method=null;stack.pop();continue;
       }
       const matchIf=line.match(/^if\s+(.+)\s+\[$/);
       if(matchIf){
         const child={tag:"if",condition:expression(matchIf[1]),body:[],line:lineNumber};
         stack[stack.length-1].push(child);stack.push(child.body);
         if(stack.length>10)throw new Error("Nested conditions exceed 8 levels");
         continue;
       }
       const assign=line.match(ASSIGN);
       if(assign){
         stack[stack.length-1].push({tag:"assign",name:assign[1],value:expression(assign[2]),line:lineNumber});
         continue;
       }
       const call=line.match(CALL);
       if(call){
         const ast=expression(call[1]);
         if(ast.tag!=="call")throw new Error("Expected action call");
         stack[stack.length-1].push({tag:"action",value:ast,line:lineNumber});
         continue;
       }
       throw new Error("Unsupported statement");
     }catch(error){throw new SyntaxError("Line "+lineNumber+": "+error.message);}
   }
   if(!started||!finished||method)throw new SyntaxError("Expected complete .Main block and break");
   if(!program.methods.has("tick")||!program.methods.has("draw"))
     throw new SyntaxError("Game must define : tick(dt) and : draw()");
   return program;
 }
 const builtin={
   abs:x=>Math.abs(x),min:(...a)=>Math.min(...a),max:(...a)=>Math.max(...a),
   clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
   floor:Math.floor,ceil:Math.ceil,round:Math.round,
   sign:Math.sign,sqrt:Math.sqrt
 };
 class ScrollGame{
   constructor(source,{name="pong"}={}){
     this.program=parseProgram(source);this.source=source;
     this.kind="arcade-game";this.name=name;this.width=800;this.height=520;
     this.keys=new Set();this.ctx=null;this.renderCalls=[];this.elapsed=0;
     this.reset();
   }
   reset(){
     this.state=new Map();this.keys.clear();this.elapsed=0;this.pointer=null;
     let budget={n:15000};
     for(const declaration of this.program.declarations){
       const value=this.eval(declaration.initial,{dt:0},budget);
       const expected=TYPES[declaration.type];
       if(typeof value!==expected)throw new Error("Line "+declaration.line+": "+declaration.name+" must be "+expected);
       this.state.set(declaration.name,{type:declaration.type,value});
     }
     return this;
   }
   get(key){return this.state.get(key)?.value;}
   get score(){return this.get("pScore")??this.get("score")??0;}
   get done(){return this.get("done")||false;}
   get message(){return this.get("message")||"";}
   key(code,pressed){if(pressed)this.keys.add(code);else this.keys.delete(code);}
   click(x,y){this.pointer={x,y};}
   action(name,args,mode){
     if(name==="key"){
       if(args.length!==1||typeof args[0]!=="string")throw new Error("key(name) requires one string");
       return this.keys.has(args[0])?1:0;
     }
     if(name==="pointer"){
       if(args.length!==1||!["x","y"].includes(args[0]))throw new Error("pointer expects x or y");
       return this.pointer?.[args[0]]??-1;
     }
     if(Object.prototype.hasOwnProperty.call(builtin,name)){
       if(!args.length||args.some(x=>typeof x!=="number"))throw new Error("Numeric function "+name+" requires numbers");
       return builtin[name](...args);
     }
     if(mode!=="draw")throw new Error("Draw action "+name+" is only available in draw");
     const ctx=this.ctx;
     if(!ctx)throw new Error("Canvas context required");
     if(name==="clear"&&args.length===1){
       ctx.fillStyle=this.color(args[0]);ctx.fillRect(0,0,800,520);return 0;
     }
     if(name==="rect"&&args.length===5){
       args.slice(0,4).forEach(x=>this.number(x));
       ctx.fillStyle=this.color(args[4]);ctx.fillRect(...args.slice(0,4));return 0;
     }
     if(name==="circle"&&args.length===4){
       args.slice(0,3).forEach(x=>this.number(x));
       ctx.beginPath();ctx.arc(args[0],args[1],args[2],0,Math.PI*2);
       ctx.fillStyle=this.color(args[3]);ctx.fill();return 0;
     }
     if(name==="text"&&(args.length===5||args.length===4)){
       const [label,x,y,size,color="#e6f7ff"]=args;
       this.number(x);this.number(y);this.number(size);
       ctx.fillStyle=this.color(color);ctx.font="700 "+size+"px system-ui";
       ctx.textAlign="center";ctx.fillText(String(label),x,y);return 0;
     }
     throw new Error("Unknown game function "+name+" or invalid arguments");
   }
   color(x){if(typeof x!=="string"||!/^#[0-9a-fA-F]{6}$/.test(x))throw new Error("Color must be #RRGGBB");return x;}
   number(x){if(typeof x!=="number"||!Number.isFinite(x)||Math.abs(x)>1e9)throw new Error("Invalid finite number");return x;}
   eval(node,scope,budget,mode="tick"){
     if(--budget.n<0)throw new Error("Game instruction budget exceeded");
     if(node.tag==="literal")return node.value;
     if(node.tag==="name"){
       if(Object.prototype.hasOwnProperty.call(scope,node.name))return scope[node.name];
       if(!this.state.has(node.name))throw new Error("Unknown variable "+node.name);
       return this.get(node.name);
     }
     if(node.tag==="unary"){
       const x=this.eval(node.a,scope,budget,mode);
       if(node.op==="!")return !x;
       if(typeof x!=="number")throw new Error("Unary number expected");
       return node.op==="-"?-x:x;
     }
     if(node.tag==="binary"){
       const l=this.eval(node.left,scope,budget,mode);
       if(node.op==="&&")return l&&this.eval(node.right,scope,budget,mode);
       if(node.op==="||")return l||this.eval(node.right,scope,budget,mode);
       const r=this.eval(node.right,scope,budget,mode);
       switch(node.op){
         case "+":return typeof l==="string"||typeof r==="string"?String(l)+String(r):this.number(l+r);
         case "-":return this.number(l-r);
         case "*":return this.number(l*r);
         case "/":return this.number(l/r);
         case "%":return this.number(l%r);
         case "<":return l<r;case ">":return l>r;
         case "<=":return l<=r;case ">=":return l>=r;
         case "==":return l===r;case "!=":return l!==r;
         default:throw new Error("Unknown operator "+node.op);
       }
     }
     if(node.tag==="call"){
       const args=node.args.map(x=>this.eval(x,scope,budget,mode));
       return this.action(node.name,args,mode);
     }
     throw new Error("Invalid game expression");
   }
   statements(nodes,scope,budget,mode){
     for(const node of nodes){
       if(--budget.n<0)throw new Error("Game instruction budget exceeded");
       try{
         if(node.tag==="if"){
           if(this.eval(node.condition,scope,budget,mode))this.statements(node.body,scope,budget,mode);
         }else if(node.tag==="assign"){
           const variable=this.state.get(node.name);
           if(!variable)throw new Error("Cannot assign undeclared variable "+node.name);
           const value=this.eval(node.value,scope,budget,mode);
           if(typeof value!==TYPES[variable.type])throw new Error("Variable "+node.name+" expects "+TYPES[variable.type]);
           this.state.set(node.name,{...variable,value});
         }else this.eval(node.value,scope,budget,mode);
       }catch(error){throw new Error("Line "+node.line+": "+error.message,{cause:error});}
     }
   }
   tick(dt){
     this.number(dt);if(dt<0||dt>.1)throw new Error("Invalid frame delta");
     if(this.done)return;
     this.elapsed+=dt;
     this.statements(this.program.methods.get("tick"),{dt},{n:15000},"tick");
   }
   render(ctx){
     if(!ctx)throw new Error("Canvas context required");
     this.ctx=ctx;
     try{this.statements(this.program.methods.get("draw"),{dt:0},{n:15000},"draw");}
     finally{this.ctx=null;}
   }
 }
 return {parseProgram,expression,ScrollGame};
});