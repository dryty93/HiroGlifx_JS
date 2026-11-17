/* Phase 13: canonical expressions for a constrained HiroGlifx .Main = () block.
 * No eval, dynamic property access, arbitrary JavaScript or browser navigation.
 */
(function(root,factory){
 const base=typeof module==="object"&&module.exports?require("./scroll-runtime"):root.HiroGlifxRuntime;
 const api=factory(base);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroCanonical=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(base){
 "use strict";
 const NAME=/^[A-Za-z_][A-Za-z0-9_]*$/;
 const TYPES={"#":"number","$":"string","?":"boolean","&":"object"};
 const PRESETS=new Set(Object.keys(base.effects));
 function lex(source){
   const tokens=[];let i=0;
   while(i<source.length){
     const ch=source[i];
     if(/\s/.test(ch)){i++;continue;}
     if("(),.".includes(ch)){tokens.push({kind:ch,value:ch});i++;continue;}
     if(ch==='"'||ch==="'"){
       const quote=ch;let text="";i++;let closed=false;
       while(i<source.length){
         if(source[i]===quote){closed=true;i++;break;}
         if(source[i]==="\\"){
           i++;
           if(i>=source.length)break;
           const escaped=source[i++];
           if(!['"',"'","\\","n","t"].includes(escaped))throw new SyntaxError("Invalid escape");
           text+=escaped==="n"?"\n":escaped==="t"?"\t":escaped;
         }else text+=source[i++];
       }
       if(!closed)throw new SyntaxError("Unclosed string literal");
       tokens.push({kind:"literal",value:text});continue;
     }
     const number=source.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
     if(number){tokens.push({kind:"literal",value:Number(number[0])});i+=number[0].length;continue;}
     const ident=source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
     if(ident){tokens.push({kind:"identifier",value:ident[0]});i+=ident[0].length;continue;}
     throw new SyntaxError("Unexpected character "+ch);
   }
   return tokens;
 }
 function parseExpr(source){
   const tokens=lex(source);let i=0;
   const peek=()=>tokens[i];
   const take=kind=>{
     const token=tokens[i++];
     if(!token||token.kind!==kind)throw new SyntaxError("Expected "+kind);
     return token;
   };
   function args(){
     take("(");const values=[];
     if(peek()?.kind!==")"){
       do{values.push(expression());if(peek()?.kind!==",")break;take(",");}
       while(true);
     }
     take(")");return values;
   }
   function expression(){
     const token=peek();
     if(!token)throw new SyntaxError("Expression expected");
     let node;
     if(token.kind==="literal"){i++;node={type:"literal",value:token.value};}
     else if(token.kind==="identifier"){
       i++;
       if(token.value==="true"||token.value==="false")node={type:"literal",value:token.value==="true"};
       else node={type:"reference",name:token.value};
     }else throw new SyntaxError("Expected literal or identifier");
     if(peek()?.kind==="("){
       if(node.type!=="reference")throw new SyntaxError("Cannot call a literal");
       node={type:"call",name:node.name,args:args()};
     }
     if(peek()?.kind==="."){
       take(".");const method=take("identifier").value;
       node={type:"method",target:node,method,args:args()};
     }
     return node;
   }
   const ast=expression();
   if(i!==tokens.length)throw new SyntaxError("Unexpected trailing expression");
   return ast;
 }
 function parse(source){
   const nodes=[];let block=false,seen=false;
   const lines=String(source).split(/\r?\n/);
   lines.forEach((raw,i)=>{
     const line=raw.trim();
     if(!line||line.startsWith("//")||line.startsWith("# "))return;
     if(/^\.Main\s*=\s*\(\)\s*$/.test(line)||/^\.Main\s*=\s*\[\s*$/.test(line)){
       if(block||seen)throw new SyntaxError("Line "+(i+1)+": duplicate/nested Main");
       block=true;seen=true;return;
     }
     if(/^(break;|\];?|end)$/.test(line)){
       if(!block)throw new SyntaxError("Line "+(i+1)+": unexpected block end");
       block=false;return;
     }
     if(!block)throw new SyntaxError("Line "+(i+1)+": expected .Main = ()");
     const statement=line.replace(/;$/,"").trim();
     const declaration=statement.match(/^([#$?&])\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
     try{
       if(declaration)nodes.push({type:"declaration",kind:declaration[1],name:declaration[2],value:parseExpr(declaration[3]),line:i+1});
       else nodes.push({type:"statement",value:parseExpr(statement),line:i+1});
     }catch(error){throw new SyntaxError("Line "+(i+1)+": "+error.message);}
   });
   if(block)throw new SyntaxError("Unclosed Main block");
   if(!seen)throw new SyntaxError("Missing .Main = () block");
   return {type:"Program",body:nodes};
 }
 class AnimationController {
   constructor(target,preset,duration,options){
     this.target=target;this.preset=preset;this.duration=duration;this.options=options||{};
     this.animation=null;this.kind="animation";
   }
   _create(){
     if(this.animation)return this.animation;
     if(typeof this.target?.animate!=="function")throw new Error("Animation target must be a DOM element");
     // Web Animations API starts immediately; pause it before exposing the controller.
     this.animation=this.target.animate(base.effects[this.preset],{
       duration:this.duration,iterations:this.options.loop?Infinity:1,
       easing:"ease-in-out",fill:"both"
     });
     this.animation.pause();
     return this.animation;
   }
   play(){this._create().play();return this;}
   pause(){this._create().pause();return this;}
   reverse(){this._create().reverse();return this;}
   loop(){this.options.loop=true;
     if(this.animation)this.animation.effect.updateTiming({iterations:Infinity});
     return this;
   }
   cancel(){if(this.animation)this.animation.cancel();return this;}
 }
 class CanonicalRuntime {
   constructor({document=null,mount=null,scene=null}={}){
     this.document=document;this.mount=mount||document?.body||null;
     this.scene=scene;this.values=new Map();this.elements=new Map();this.controllers=[];
     this.factories=new Map();
   }
   register(name,fn){
     if(!NAME.test(name)||!name.includes("_")||typeof fn!=="function")throw new Error("Extension factories require namespaced names like fx_glow");
     if(this.factories.has(name))throw new Error("Duplicate factory "+name);
     this.factories.set(name,fn);return this;
   }
   _type(value){
     if(value instanceof AnimationController)return "object";
     if(value!==null&&typeof value==="object")return "object";
     return typeof value;
   }
   _number(value,min,max,label){
     if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new Error("Invalid "+label);
     return value;
   }
   _createBox(name,width,height,color){
     if(!this.document||!this.mount)throw new Error("DOM runtime required for box");
     if(typeof name!=="string"||!NAME.test(name)||this.elements.has(name))throw new Error("Invalid or duplicate box ID");
     this._number(width,1,4096,"width");this._number(height,1,4096,"height");
     if(typeof color!=="string"||!/^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]+$/.test(color))throw new Error("Invalid color");
     const el=this.document.createElement("div");el.id=name;
     el.style.width=width+"px";el.style.height=height+"px";el.style.background=color;el.style.borderRadius="14px";
     this.mount.appendChild(el);this.elements.set(name,el);return el;
   }
   async _invoke(name,args){
     if(this.factories.has(name))return this.factories.get(name)({args:[...args],runtime:this});
     if(name==="box"){
       if(args.length!==4)throw new Error("box(id, width, height, color) requires four arguments");
       return this._createBox(...args);
     }
     if(name==="sprite"){
       if(args.length!==6||!this.scene)throw new Error("sprite requires a 2D scene and six arguments");
       return this.scene.add(...args);
     }
     if(name==="move"){
       if(args.length!==3||!this.scene)throw new Error("move requires sprite, dx and dy plus a scene");
       const [sprite,dx,dy]=args;
       if(!sprite||typeof sprite!=="object"||this.scene.objects.get(sprite.name)!==sprite)
         throw new Error("Not a sprite in current scene");
       return this.scene.move(sprite.name,dx,dy);
     }
     if(name==="animate"||PRESETS.has(name)){
       const [target,preset,duration]=name==="animate"?args:[args[0],name,args[1]??700];
       if(name==="animate"&&args.length!==3)throw new Error("animate(target, preset, duration) expected");
       if(!PRESETS.has(preset))throw new Error("Unknown animation "+preset);
       if(!target||typeof target.animate!=="function")throw new Error("Animation target must be an existing DOM object");
       this._number(duration,1,120000,"duration");
       const controller=new AnimationController(target,preset,duration);this.controllers.push(controller);return controller;
     }
     throw new Error("Unknown callable "+name);
   }
   async _evaluate(node){
     if(node.type==="literal")return node.value;
     if(node.type==="reference"){
       if(!this.values.has(node.name))throw new Error("Unknown variable "+node.name);
       return this.values.get(node.name).value;
     }
     if(node.type==="call")return this._invoke(node.name,await Promise.all(node.args.map(x=>this._evaluate(x))));
     if(node.type==="method"){
       const target=await this._evaluate(node.target);
       if(!(target instanceof AnimationController)||!["play","pause","reverse","loop","cancel"].includes(node.method))
         throw new Error("Method not available on this object: "+node.method);
       if(node.args.length)throw new Error("Controller methods take no arguments");
       return target[node.method]();
     }
     throw new Error("Invalid AST node");
   }
   async execute(source){
     const ast=typeof source==="string"?parse(source):source;
     if(ast?.type!=="Program"||!Array.isArray(ast.body))throw new Error("Invalid AST");
     for(const node of ast.body){
       try{
         if(node.type==="declaration"){
           if(this.values.has(node.name))throw new Error("Already declared: "+node.name);
           const value=await this._evaluate(node.value);
           const expected=TYPES[node.kind];
           if(expected!==this._type(value))throw new Error("Type mismatch for "+node.kind+node.name+"; expected "+expected);
           this.values.set(node.name,{kind:node.kind,value});
         }else{
           const result=await this._evaluate(node.value);
           // Shorthand animation statements play automatically; assigned controllers stay idle.
           if(result instanceof AnimationController&&node.value.type==="call")result.play();
         }
       }catch(error){throw new Error("Line "+node.line+": "+error.message,{cause:error});}
     }
     return this;
   }
   get(name){return this.values.get(name)?.value;}
   dispose(){for(const controller of this.controllers)controller.cancel();this.controllers=[];this.values.clear();this.elements.clear();}
 }
 return {parse,parseExpr,CanonicalRuntime,AnimationController};
});