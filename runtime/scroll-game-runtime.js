/* HiroGlifx game-script interpreter v2: authored rules, arrays, bounded loops and functions.
 * No eval / Function / dynamic JS property access / network / file access.
 * All browser drawing is restricted to whitelisted Canvas commands.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroScrollGame=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const TYPES={"#":"number","$":"string","?":"boolean","&":"object"};
 const ID=/^[A-Za-z_][A-Za-z_0-9]*$/;
 const PRECEDENCE={"||":1,"&&":2,"==":3,"!=":3,"<":4,">":4,"<=":4,">=":4,"+":5,"-":5,"*":6,"/":6,"%":6};
 const OPERATORS=["||","&&","==","!=","<=",">=","+","-","*","/","%","<",">","!"];
 function lex(src){
   const out=[];let i=0;
   while(i<src.length){
     if(/\s/.test(src[i])){i++;continue;}
     const ch=src[i];
     if(ch==='"'||ch==="'"){
       const q=ch;let result="",closed=false;i++;
       while(i<src.length){
         if(src[i]===q){i++;closed=true;break;}
         if(src[i]==="\\"){
           const next=src[++i];
           if(!["\\","n","t",q].includes(next))throw new SyntaxError("Invalid escape");
           result+=next==="n"?"\n":next==="t"?"\t":next;i++;
         }else result+=src[i++];
       }
       if(!closed)throw new SyntaxError("Unterminated string");
       out.push({kind:"literal",value:result});continue;
     }
     const num=src.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
     if(num){out.push({kind:"literal",value:Number(num[0])});i+=num[0].length;continue;}
     const name=src.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/);
     if(name){out.push({kind:"name",value:name[0]});i+=name[0].length;continue;}
     if("(),".includes(ch)){out.push({kind:ch,value:ch});i++;continue;}
     const op=OPERATORS.find(k=>src.startsWith(k,i));
     if(!op)throw new SyntaxError("Unsupported character "+ch);
     out.push({kind:"op",value:op});i+=op.length;
   }
   return out;
 }
 function expression(src){
   const tokens=lex(src);let i=0;
   const peek=()=>tokens[i];
   const take=kind=>{
     const t=tokens[i++];
     if(!t||t.kind!==kind)throw new SyntaxError("Expected "+kind);
     return t;
   };
   function atom(){
     const t=peek();if(!t)throw new SyntaxError("Expected expression");
     if(t.kind==="op"&&["!","+","-"].includes(t.value)){
       i++;return {tag:"unary",op:t.value,a:parse(7)};
     }
     if(t.kind==="("){i++;const node=parse(0);take(")");return node;}
     if(t.kind==="literal"){i++;return {tag:"literal",value:t.value};}
     if(t.kind!=="name")throw new SyntaxError("Expected variable or literal");
     i++;
     if(t.value==="true"||t.value==="false")return {tag:"literal",value:t.value==="true"};
     if(peek()?.kind!=="(")return {tag:"name",name:t.value};
     i++;
     const args=[];
     if(peek()?.kind!==")"){
       do{args.push(parse(0));if(peek()?.kind!==",")break;i++;}while(true);
     }
     take(")");
     return {tag:"call",name:t.value,args};
   }
   function parse(min){
     let left=atom();
     while(peek()?.kind==="op"){
       const op=peek().value,prec=PRECEDENCE[op];
       if(!prec||prec<min)break;
       i++;left={tag:"binary",op,left,right:parse(prec+1)};
     }
     return left;
   }
   const ast=parse(0);
   if(i!==tokens.length)throw new SyntaxError("Unexpected trailing expression");
   return ast;
 }
 function parseProgram(source){
   const content=String(source),lines=content.split(/\r?\n/);
   if(content.length>180000||lines.length>4000)throw new Error("Game script exceeds source limit");
   let started=false,ended=false,method=null;
   const program={declarations:[],methods:new Map()};
   const stack=[];
   for(let i=0;i<lines.length;i++){
     const line=lines[i].trim(),number=i+1;
     if(!line||line.startsWith("//"))continue;
     try{
       if(!started){
         if(line!==".Main = ()")throw new Error("Expected .Main = ()");
         started=true;continue;
       }
       if(ended)throw new Error("Extra code after break");
       if(!method){
         if(line==="break;"){ended=true;continue;}
         const decl=line.match(/^([#$?&])\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+);$/);
         if(decl){
           if(program.declarations.some(d=>d.name===decl[2]))throw new Error("Duplicate variable "+decl[2]);
           program.declarations.push({tag:"decl",type:decl[1],name:decl[2],value:expression(decl[3]),line:number});
           continue;
         }
         const match=line.match(/^:\s*([A-Za-z_][A-Za-z_0-9]*)\s*\(([^)]*)\)\s*=\s*\[$/);
         if(!match)throw new Error("Expected typed declaration or : method(args) = [");
         const name=match[1],args=match[2].trim()?match[2].split(",").map(v=>v.trim()):[];
         if(program.methods.has(name)||!args.every(v=>ID.test(v))||new Set(args).size!==args.length)throw new Error("Duplicate method or invalid parameters");
         if((name==="tick"&&(args.length!==1||args[0]!=="dt"))||
           (name==="draw"&&args.length!==0)||
           (name==="click"&&args.join(",")!=="x,y")||
           (name==="keyEvent"&&args.join(",")!=="code,pressed"))throw new Error("Invalid built-in method signature");
         method={name,args,body:[]};stack.push(method.body);continue;
       }
       if(line==="]"){
         if(stack.length>1){stack.pop();continue;}
         if(stack.length!==1)throw new Error("Unexpected closing bracket");
         program.methods.set(method.name,method);method=null;stack.pop();continue;
       }
       const bucket=stack[stack.length-1];
       const ifMatch=line.match(/^if\s+(.+)\s+\[$/);
       if(ifMatch){
         const node={tag:"if",condition:expression(ifMatch[1]),body:[],line:number};
         bucket.push(node);stack.push(node.body);
       }else{
         const forMatch=line.match(/^for\s+([A-Za-z_][A-Za-z_0-9]*)\s+from\s+(.+)\s+to\s+(.+)\s+\[$/);
         const whileMatch=line.match(/^while\s+(.+)\s+\[$/);
         if(forMatch){
           const node={tag:"for",name:forMatch[1],from:expression(forMatch[2]),to:expression(forMatch[3]),body:[],line:number};
           bucket.push(node);stack.push(node.body);
         }else if(whileMatch){
           const node={tag:"while",condition:expression(whileMatch[1]),body:[],line:number};
           bucket.push(node);stack.push(node.body);
         }else if(line.startsWith("return ")&&line.endsWith(";")){
           bucket.push({tag:"return",value:expression(line.slice(7,-1)),line:number});
         }else if(line==="break;"||line==="continue;"){
           bucket.push({tag:line==="break;"?"break":"continue",line:number});
         }else{
           const local=line.match(/^let\s+([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+);$/);
           const assign=line.match(/^([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+);$/);
           if(local){
             bucket.push({tag:"local",name:local[1],value:expression(local[2]),line:number});
           }else if(assign){
             bucket.push({tag:"assign",name:assign[1],value:expression(assign[2]),line:number});
           }else if(line.endsWith(";")){
             const ast=expression(line.slice(0,-1));
             if(ast.tag!=="call")throw new Error("Expected method call");
             bucket.push({tag:"action",value:ast,line:number});
           }else throw new Error("Unsupported statement");
         }
       }
       if(stack.length>12)throw new Error("Block nesting limit exceeded");
     }catch(error){throw new SyntaxError("Line "+number+": "+error.message);}
   }
   if(!started||!ended||method||stack.length)throw new SyntaxError("Incomplete .Main block");
   if(!program.methods.has("tick")||!program.methods.has("draw"))
     throw new SyntaxError("Game requires : tick(dt) and : draw() methods");
   return program;
 }
 const functions={
   abs:Math.abs,min:Math.min,max:Math.max,
   clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
   floor:Math.floor,ceil:Math.ceil,round:Math.round,sign:Math.sign,sqrt:Math.sqrt,
   sin:Math.sin,cos:Math.cos
 };
 class ScrollGame{
   constructor(source,{name="game",classes=null}={}){
     this.program=parseProgram(source);this.source=source;
     this.kind="arcade-game";this.name=name;this.width=800;this.height=520;
     this.keys=new Set();this.pointer=null;this.elapsed=0;this.ctx=null;
     this.randomState=7919;this.callDepth=0;
     this.classes=classes;
     this.reset();
   }
   typeOf(value){return Array.isArray(value)?"object":typeof value;}
   requireNumber(value){
     if(typeof value!=="number"||!Number.isFinite(value)||Math.abs(value)>1e9)
       throw new Error("Expected finite number");
     return value;
   }
   requireArray(value){
     if(!Array.isArray(value))throw new Error("Expected HiroGlifx array");
     return value;
   }
   requireIndex(index,size){
     if(!Number.isInteger(index)||index<0||index>=size)throw new Error("Index out of bounds");
     return index;
   }
   reset(){
     this.state=new Map();this.keys.clear();this.pointer=null;this.elapsed=0;
     this.randomState=7919;this.callDepth=0;
     const budget={n:100000,loops:100000};
     for(const decl of this.program.declarations){
       const value=this.evaluate(decl.value,Object.create(null),budget,"setup");
       if(this.typeOf(value)!==TYPES[decl.type])throw new Error("Line "+decl.line+": "+decl.name+" must be "+TYPES[decl.type]);
       this.state.set(decl.name,{type:decl.type,value});
     }
     if(this.program.methods.has("init"))this.invoke("init",[],budget,"setup");
     return this;
   }
   get(name){return this.state.get(name)?.value;}
   get score(){return this.get("pScore")??this.get("score")??0;}
   get done(){return Boolean(this.get("done"));}
   get message(){return this.get("message")??"";}
   key(code,pressed){
     if(pressed)this.keys.add(code);else this.keys.delete(code);
     if(this.program.methods.has("keyEvent"))
       this.invoke("keyEvent",[code,Boolean(pressed)],{n:200000,loops:200000},"input");
   }
   click(x,y){
     this.pointer={x,y};
     if(this.program.methods.has("click"))
       return this.invoke("click",[x,y],{n:500000,loops:500000},"input");
   }
   functionBuiltin(name,args,budget,mode){
     if(name==="key"){
       if(args.length!==1||typeof args[0]!=="string")throw new Error("key(name) requires string");
       return this.keys.has(args[0])?1:0;
     }
     if(name==="pointer"){
       if(args.length!==1||!["x","y"].includes(args[0]))throw new Error("pointer expects x or y");
       return this.pointer?.[args[0]]??-1;
     }
     if(Object.prototype.hasOwnProperty.call(functions,name)){
       if(!args.length||args.some(x=>typeof x!=="number"))throw new Error("Numeric function "+name+" requires numbers");
       return this.requireNumber(functions[name](...args));
     }
     if(name==="array"){
       if(args.length>8192)throw new Error("Array too large");
       return args.slice();
     }
     if(name==="filled"){
       if(args.length!==2||!Number.isInteger(args[0])||args[0]<0||args[0]>8192)
         throw new Error("filled(size,value) requires size <= 8192");
       return Array(args[0]).fill(args[1]);
     }
     if(name==="chars"){
       if(args.length!==1||typeof args[0]!=="string"||args[0].length>8192)
         throw new Error("chars(text) expects a bounded string");
       return [...args[0]];
     }
     if(name==="get"){
       if(args.length!==2)throw new Error("get(array,index)");
       const arr=this.requireArray(args[0]);return arr[this.requireIndex(args[1],arr.length)];
     }
     if(name==="set"){
       if(args.length!==3)throw new Error("set(array,index,value)");
       const arr=this.requireArray(args[0]);arr[this.requireIndex(args[1],arr.length)]=args[2];
       return args[2];
     }
     if(name==="len"){
       if(args.length!==1||!(Array.isArray(args[0])||typeof args[0]==="string"))
         throw new Error("len(value) requires string or array");
       return args[0].length;
     }
     if(name==="clone"){
       if(args.length!==1)throw new Error("clone(array)");
       return this.requireArray(args[0]).slice();
     }
     if(name==="push"||name==="unshift"){
       if(args.length!==2)throw new Error(name+"(array,value)");
       const arr=this.requireArray(args[0]);
       if(arr.length>=8192)throw new Error("Array limit exceeded");
       return arr[name](args[1]);
     }
     if(name==="pop"||name==="shift"){
       if(args.length!==1)throw new Error(name+"(array)");
       return this.requireArray(args[0])[name]();
     }
     if(name==="removeAt"){
       if(args.length!==2)throw new Error("removeAt(array,index)");
       const arr=this.requireArray(args[0]);
       return arr.splice(this.requireIndex(args[1],arr.length),1)[0];
     }
     if(name==="char"){
       if(args.length!==2||typeof args[0]!=="string")
         throw new Error("char(text,index)");
       return args[0][this.requireIndex(args[1],args[0].length)];
     }
     if(name==="lower"||name==="upper"){
       if(args.length!==1||typeof args[0]!=="string")throw new Error(name+"(text)");
       return name==="lower"?args[0].toLowerCase():args[0].toUpperCase();
     }
     if(name==="indexOf"){
       if(args.length!==2||!(typeof args[0]==="string"||Array.isArray(args[0])))
         throw new Error("indexOf(arrayOrString,value)");
       return args[0].indexOf(args[1]);
     }
     if(name==="random"){
       if(args.length)throw new Error("random() accepts no arguments");
       let x=this.randomState;
       x^=x<<13;x^=x>>>17;x^=x<<5;
       this.randomState=x>>>0;
       return this.randomState/4294967296;
     }
     if(this.program.methods.has(name))return this.invoke(name,args,budget,mode);
     if(mode!=="draw")throw new Error("Rendering "+name+" only permitted in draw()");
     const ctx=this.ctx;if(!ctx)throw new Error("Canvas context required");
     if(name==="clear"&&args.length===1){
       ctx.fillStyle=this.color(args[0]);ctx.fillRect(0,0,800,520);return 0;
     }
     if(name==="rect"&&args.length===5){
       args.slice(0,4).forEach(n=>this.requireNumber(n));
       ctx.fillStyle=this.color(args[4]);ctx.fillRect(...args.slice(0,4));return 0;
     }
     if(name==="circle"&&args.length===4){
       args.slice(0,3).forEach(n=>this.requireNumber(n));
       ctx.beginPath();ctx.arc(args[0],args[1],args[2],0,Math.PI*2);
       ctx.fillStyle=this.color(args[3]);ctx.fill();return 0;
     }
     if(name==="text"&&(args.length===4||args.length===5)){
       const [label,x,y,size,color="#e6f7ff"]=args;
       [x,y,size].forEach(n=>this.requireNumber(n));
       ctx.fillStyle=this.color(color);
       ctx.font="700 "+size+"px system-ui";ctx.textAlign="center";
       ctx.fillText(String(label),x,y);return 0;
     }
     throw new Error("Unknown function "+name);
   }
   color(value){
     if(typeof value!=="string"||!/^#[0-9a-fA-F]{6}$/.test(value))
       throw new Error("Color must be #RRGGBB");
     return value;
   }
   evaluate(node,scope,budget,mode){
     if(--budget.n<0)throw new Error("Game instruction budget exceeded");
     if(node.tag==="literal")return node.value;
     if(node.tag==="name"){
       if(Object.prototype.hasOwnProperty.call(scope,node.name))return scope[node.name];
       if(!this.state.has(node.name))throw new Error("Unknown variable "+node.name);
       return this.get(node.name);
     }
     if(node.tag==="unary"){
       const v=this.evaluate(node.a,scope,budget,mode);
       if(node.op==="!")return !v;
       this.requireNumber(v);return node.op==="-"?-v:v;
     }
     if(node.tag==="binary"){
       const l=this.evaluate(node.left,scope,budget,mode);
       if(node.op==="&&")return l&&this.evaluate(node.right,scope,budget,mode);
       if(node.op==="||")return l||this.evaluate(node.right,scope,budget,mode);
       const r=this.evaluate(node.right,scope,budget,mode);
       if(node.op==="+"){
         if(typeof l==="string"||typeof r==="string")return String(l)+String(r);
         return this.requireNumber(l+r);
       }
       if(node.op==="-")return this.requireNumber(l-r);
       if(node.op==="*")return this.requireNumber(l*r);
       if(node.op==="/")return this.requireNumber(l/r);
       if(node.op==="%")return this.requireNumber(l%r);
       if(node.op==="<")return l<r;
       if(node.op===">")return l>r;
       if(node.op==="<=")return l<=r;
       if(node.op===">=")return l>=r;
       if(node.op==="==")return l===r;
       if(node.op==="!=")return l!==r;
       throw new Error("Unknown operator "+node.op);
     }
     if(node.tag==="call"){
       const args=node.args.map(x=>this.evaluate(x,scope,budget,mode));
       return this.functionBuiltin(node.name,args,budget,mode);
     }
     throw new Error("Unknown expression");
   }
   executeStatements(nodes,scope,budget,mode){
     for(const node of nodes){
       if(--budget.n<0)throw new Error("Game instruction budget exceeded");
       try{
         if(node.tag==="if"){
           if(this.evaluate(node.condition,scope,budget,mode)){
             const result=this.executeStatements(node.body,scope,budget,mode);
             if(result)return result;
           }
         }else if(node.tag==="for"){
           const from=this.evaluate(node.from,scope,budget,mode);
           const to=this.evaluate(node.to,scope,budget,mode);
           if(!Number.isInteger(from)||!Number.isInteger(to)||Math.abs(to-from)>8192)
             throw new Error("Invalid bounded for loop");
           const previous=Object.prototype.hasOwnProperty.call(scope,node.name);
           const old=scope[node.name];
           for(let i=from;i<to;i++){
             if(--budget.loops<0)throw new Error("Loop budget exceeded");
             scope[node.name]=i;
             const result=this.executeStatements(node.body,scope,budget,mode);
             if(result?.tag==="return"){if(previous)scope[node.name]=old;else delete scope[node.name];return result;}
             if(result?.tag==="break")break;
           }
           if(previous)scope[node.name]=old;else delete scope[node.name];
         }else if(node.tag==="while"){
           let counter=0;
           while(this.evaluate(node.condition,scope,budget,mode)){
             if(++counter>8192||--budget.loops<0)throw new Error("Loop budget exceeded");
             const result=this.executeStatements(node.body,scope,budget,mode);
             if(result?.tag==="return")return result;
             if(result?.tag==="break")break;
           }
         }else if(node.tag==="local"){
           scope[node.name]=this.evaluate(node.value,scope,budget,mode);
         }else if(node.tag==="assign"){
           const val=this.evaluate(node.value,scope,budget,mode);
           if(Object.prototype.hasOwnProperty.call(scope,node.name)){
             scope[node.name]=val;
           }else{
             const declaration=this.state.get(node.name);
             if(!declaration)throw new Error("Cannot assign undeclared variable "+node.name);
             if(this.typeOf(val)!==TYPES[declaration.type])
               throw new Error("Variable "+node.name+" expects "+TYPES[declaration.type]);
             this.state.set(node.name,{...declaration,value:val});
           }
         }else if(node.tag==="action"){
           this.evaluate(node.value,scope,budget,mode);
         }else if(node.tag==="return"){
           return {tag:"return",value:this.evaluate(node.value,scope,budget,mode)};
         }else if(node.tag==="break"||node.tag==="continue"){
           return {tag:node.tag};
         }
       }catch(error){
         if(error.message?.startsWith("Line "+node.line+":"))throw error;
         throw new Error("Line "+node.line+": "+error.message,{cause:error});
       }
     }
     return null;
   }
   invoke(name,args,budget,mode){
     const method=this.program.methods.get(name);
     if(!method||method.args.length!==args.length)throw new Error("Unknown method or wrong argument count: "+name);
     if(++this.callDepth>32){this.callDepth--;throw new Error("Maximum function call depth exceeded");}
     const scope=Object.create(null);
     for(let i=0;i<args.length;i++)scope[method.args[i]]=args[i];
     try{
       const result=this.executeStatements(method.body,scope,budget,mode);
       return result?.tag==="return"?result.value:null;
     }finally{this.callDepth--;}
   }
   tick(dt){
     this.requireNumber(dt);
     if(dt<0||dt>.1)throw new Error("Invalid frame delta");
     if(this.done)return;
     this.elapsed+=dt;
     this.invoke("tick",[dt],{n:200000,loops:100000},"tick");
   }
   render(ctx){
     if(!ctx)throw new Error("Canvas context required");
     this.ctx=ctx;
     try{this.invoke("draw",[],{n:300000,loops:100000},"draw");}
     finally{this.ctx=null;}
   }
   undo(){
     if(!this.program.methods.has("undo"))return false;
     return this.invoke("undo",[],{n:500000,loops:500000},"input")||false;
   }
 }
 return {ScrollGame,parseProgram,expression};
});