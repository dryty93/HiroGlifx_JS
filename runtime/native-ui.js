/* Native, bounded HiroGlifx DOM runtime. UI components are authored in .scroll. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.HiroNativeUI=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const ID=/^[A-Za-z_][A-Za-z0-9_]*$/;
const CLASS=/^\.([A-Za-z_]\w*)\s*=\s*\(([A-Za-z_]\w*)?\)$/;
const FIELD=/^([#$?])\s*([A-Za-z_]\w*)\s*=\s*(.+);$/;
const METHOD=/^:\s*([A-Za-z_]\w*)\s*\(self\)\s*=\s*\[$/;
const TAGS=new Set("main header footer nav section article aside div h1 h2 h3 h4 p span small strong em ul li a button form label input textarea select option figure".split(" "));
const ATTRS=new Set("href type name placeholder required disabled value autocomplete role aria-label aria-expanded aria-current aria-live aria-describedby for title tabindex min max".split(" "));
const EVENT=new Set(["click","input","change","submit"]);
function words(line){const tokens=line.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)||[];return tokens.map(t=>t[0]==='"'?JSON.parse(t):t[0]==="'"?t.slice(1,-1):t);}
function compile(source){
 if(typeof source!=="string"||source.length>250000)throw Error("UI source limit exceeded");
 const defs=new Map();let cls=null,method=null,header=false;
 for(const [index,raw] of source.split(/\r?\n/).entries()){
  let line=raw.trim();if(!line||line.startsWith("//"))continue;
  if(!header){if(!/^ui (application|library)$/.test(line))throw Error("Expected ui application or ui library");header=line;continue;}
  if(/^import [a-z][a-z0-9-]*;?$/.test(line)&&!cls)continue;
  if(!cls){const m=line.match(CLASS);if(!m)throw Error("Expected UI class at line "+(index+1));if(defs.has(m[1]))throw Error("Duplicate class "+m[1]);cls={name:m[1],parent:m[2],fields:new Map(),methods:new Map()};continue;}
  if(method){if(line==="]"){method=null;continue;}if(line.endsWith(";"))line=line.slice(0,-1);const a=words(line);if(!a.length)continue;method.push({op:a[0],args:a.slice(1),line:index+1});continue;}
  if(line==="break;"){defs.set(cls.name,cls);cls=null;continue;}
  const f=line.match(FIELD);if(f){let value=f[1]==="$"?JSON.parse(f[3]):f[1]==="#"?Number(f[3]):f[3]==="true";if(typeof value!==({"$":"string","#":"number","?":"boolean"})[f[1]]||f[1]==="?"&&!/^(true|false)$/.test(f[3]))throw Error("Bad typed field");cls.fields.set(f[2],{kind:f[1],value});continue;}
  const m=line.match(METHOD);if(!m)throw Error("Invalid UI class declaration line "+(index+1));if(cls.methods.has(m[1]))throw Error("Duplicate method");method=[];cls.methods.set(m[1],method);
 }
 if(cls||method)throw Error("Unclosed UI class/method");
 const classes=new Map();
 function resolve(name,stack=[]){if(classes.has(name))return classes.get(name);if(stack.includes(name)||stack.length>20)throw Error("Inheritance cycle/depth");const d=defs.get(name);if(!d)throw Error("Unknown parent "+name);const p=d.parent?resolve(d.parent,[...stack,name]):null;const fields=new Map(p?.fields||[]),methods=new Map(p?.methods||[]);for(const [key,entry] of d.fields){if(fields.has(key)&&fields.get(key).kind!==entry.kind)throw Error("Incompatible override "+key);fields.set(key,entry);}for(const [key,steps] of d.methods)methods.set(key,steps);const c={name,fields,methods};classes.set(name,c);return c;}
 if(defs.size>160)throw Error("Too many UI classes");for(const key of defs.keys())resolve(key);
 if(header==="ui application"&&!classes.has("Main"))throw Error("Missing .Main UI class");
 for(const c of classes.values())for(const [method,steps] of c.methods)for(const s of steps){
  const [a,b,d]=s.args;const n=s.args.length;
  if(method==="render"){
   if(!((s.op==="element"&&n===3&&ID.test(a)&&TAGS.has(b))||(s.op==="component"&&n===3&&ID.test(a)&&ID.test(b))||(s.op==="prop"&&n===3)||(s.op==="text"&&n===2)||(s.op==="class"&&n===2)||(s.op==="attr"&&n===3&&(ATTRS.has(b)||/^data-[a-z0-9-]+$/.test(b)))||(s.op==="on"&&n===3&&EVENT.has(b))||(s.op==="bind"&&n===2)))throw Error("Invalid render command at line "+s.line);
  }else if(!((s.op==="set"&&n===2)||(s.op==="increment"&&n>=1&&n<=2)||(s.op==="toggle"&&n===1)||(s.op==="navigate"&&n===1)))throw Error("Invalid action at line "+s.line);
 }
 return {classes,header};
}
const CSS="main{max-width:none;margin:0;padding:0}#app{max-width:none;margin:0;padding:0}:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;--bg:#090d1b;--surface:#141d33;--text:#f5f7ff;--muted:#a4b0c6;--accent:#9d8aff;--border:#34405c;color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);line-height:1.55}button,input,textarea{font:inherit}a{color:inherit;text-decoration:none}:focus-visible{outline:3px solid #65e5c5;outline-offset:3px}.hg-wrap{max-width:1180px;margin:auto;padding:0 24px}.hg-nav{display:flex;justify-content:space-between;align-items:center;padding:26px 0;gap:20px}.hg-brand{font-size:24px;font-weight:800;letter-spacing:-.05em}.hg-links{display:flex;gap:22px;color:var(--muted)}.hg-hero{max-width:850px;padding:105px 0 85px}.hg-eyebrow{color:#66dfbc;text-transform:uppercase;font-size:12px;letter-spacing:.22em;font-weight:800}.hg-display{font-size:clamp(3rem,7vw,6.5rem);line-height:1.02;letter-spacing:-.075em;margin:20px 0}.hg-lead{font-size:clamp(1.1rem,2vw,1.4rem);max-width:650px;color:var(--muted)}.hg-actions{display:flex;gap:15px;flex-wrap:wrap;margin-top:32px}.hg-button{margin:0;display:inline-flex;padding:13px 23px;border-radius:999px;background:#293550;color:white;border:1px solid var(--border);font-weight:750;cursor:pointer;transition:transform .2s,box-shadow .2s}.hg-button:hover{transform:translateY(-3px);box-shadow:0 12px 30px #0005}.hg-button-primary{background:var(--accent);color:#120d29;border:0}.hg-button-success{background:#6de4c2;color:#09251d;border:0}.hg-section{padding:50px 0 100px}.hg-title{font-size:clamp(2rem,4vw,3.6rem);letter-spacing:-.06em}.hg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.hg-card{border:1px solid var(--border);border-radius:20px;background:linear-gradient(140deg,#1c2944,var(--surface));padding:30px;box-shadow:0 28px 60px #0004}.hg-card p{color:var(--muted)}.hg-dash{display:grid;grid-template-columns:230px 1fr;min-height:100vh}.hg-sidebar{background:var(--surface);padding:30px;border-right:1px solid var(--border)}.hg-panel{padding:38px}.hg-metric{font-size:3rem;font-weight:850;letter-spacing:-.07em}.hg-muted{color:var(--muted)}.hg-form{max-width:650px;margin:60px auto;padding:40px;border-radius:20px;background:var(--surface);border:1px solid var(--border)}.hg-field{display:grid;gap:8px;margin:20px 0}.hg-input{padding:13px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--text);width:100%}.hg-note{color:#6de4c2;font-weight:700}.hg-hidden{display:none}[data-hg-theme=light]{--bg:#f5f7fc;--surface:#fff;--text:#152139;--muted:#566580;--accent:#7667e6;--border:#dbe1ed;color-scheme:light}@media(max-width:750px){.hg-grid{grid-template-columns:1fr}.hg-dash{grid-template-columns:1fr}.hg-hero{padding:64px 0}.hg-panel{padding:22px}.hg-form{margin:25px 15px;padding:25px}.hg-links{gap:12px;font-size:14px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}";
class NativeUIRuntime{
 constructor({document,mount}){this.document=document;this.mount=mount;this.instances=new Map();this.listeners=[];this.serial=0;this.program=null;this.dead=false;}
 execute(source){this.dispose();this.dead=false;this.program=compile(source);this.style=this.document.createElement("style");this.style.textContent=CSS;this.document.head.appendChild(this.style);this.root=this.spawn("Main");this.call(this.root,"mount");this.refresh();return this;}
 spawn(name){const cls=this.program.classes.get(name);if(!cls)throw Error("Unknown component "+name);const fields=Object.create(null);for(const [k,v] of cls.fields)fields[k]=v.value;const obj={id:++this.serial,type:name,fields,children:new Map(),mounted:false};this.instances.set(obj.id,obj);return obj;}
 tmpl(value,obj){return String(value).replace(/\{([A-Za-z_]\w*)\}/g,(_,key)=>Object.hasOwn(obj.fields,key)?String(obj.fields[key]):"");}
 call(obj,method){const steps=this.program.classes.get(obj.type).methods.get(method)||[];if(method==="render")return steps;for(const step of steps){const [key,raw]=step.args;const decl=this.program.classes.get(obj.type).fields.get(key);if(step.op==="navigate"){const path=this.tmpl(key,obj);if(!/^\/[A-Za-z0-9_/-]*$/.test(path))throw Error("Unsafe navigation");this.document.defaultView.location.assign(path);continue;}if(!decl)throw Error("Unknown state "+key);let next=step.op==="toggle"?!obj.fields[key]:step.op==="increment"?obj.fields[key]+Number(raw||1):this.tmpl(raw,obj);if(step.op==="set"){if(decl.kind==="#")next=Number(next);if(decl.kind==="?")next=next==="true";}this.assign(obj,key,next);this.refresh();}}
 assign(obj,key,val){const def=this.program.classes.get(obj.type).fields.get(key);if(!def||typeof val!==({"$":"string","#":"number","?":"boolean"})[def.kind]||(typeof val==="number"&&!Number.isFinite(val)))throw Error("Bad prop "+key);obj.fields[key]=val;}
 refresh(){if(this.dead)return;for(const [el,event,fn] of this.listeners)el.removeEventListener(event,fn);this.listeners=[];const focus=this.document.activeElement?.id;const frag=this.document.createDocumentFragment();this.render(this.root,frag,0);this.mount.replaceChildren(frag);if(focus){const el=this.document.getElementById(focus);if(el)el.focus();}}
 render(obj,parent,depth){if(depth>30)throw Error("UI nesting limit");const wrapper=this.document.createElement("div");wrapper.style.display="contents";wrapper.dataset.hiroComponent=obj.type;parent.appendChild(wrapper);const refs=new Map([["root",wrapper]]);const children=[];const steps=this.call(obj,"render");
  for(const {op,args,line} of steps){const [a,b,c]=args;const node=id=>{if(!refs.has(id))throw Error("Unknown UI node "+id+" line "+line);return refs.get(id);};
   if(op==="element"){if(refs.has(a))throw Error("Duplicate UI id");const el=this.document.createElement(b);el.id="hg-"+obj.id+"-"+a;node(c).appendChild(el);refs.set(a,el);}
   else if(op==="component"){let child=obj.children.get(b);if(!child){child=this.spawn(a);obj.children.set(b,child);}if(child.type!==a)throw Error("Child type changed");const slot=this.document.createElement("span");slot.style.display="contents";node(c).appendChild(slot);children.push({child,parent:slot});}
   else if(op==="prop"){const child=obj.children.get(a);if(!child)throw Error("Unknown child "+a);const decl=this.program.classes.get(child.type).fields.get(b);if(!decl)throw Error("Unknown child prop "+b);const str=this.tmpl(c,obj);this.assign(child,b,decl.kind==="#"?Number(str):decl.kind==="?"?str==="true":str);}
   else if(op==="text")node(a).textContent=this.tmpl(b,obj);
   else if(op==="class"){const cls=this.tmpl(b,obj);if(!/^[\w\s-]*$/.test(cls))throw Error("Bad CSS class");node(a).className=cls;}
   else if(op==="attr"){const val=this.tmpl(c,obj);if(b==="href"&&!/^\/(?!\/)[A-Za-z0-9_/?#=&%-]*$|^#[A-Za-z0-9_-]+$/.test(val))throw Error("Unsafe href");node(a).setAttribute(b,val);}
   else if(op==="bind"){const el=node(a);if(!Object.hasOwn(obj.fields,b))throw Error("Unknown bound field");el.value=String(obj.fields[b]);const fn=()=>{const decl=this.program.classes.get(obj.type).fields.get(b);this.assign(obj,b,decl.kind==="#"?Number(el.value):decl.kind==="?"?el.checked:el.value);};el.addEventListener("input",fn);this.listeners.push([el,"input",fn]);}
   else if(op==="on"){if(!this.program.classes.get(obj.type).methods.has(c))throw Error("Missing handler "+c);const el=node(a),fn=e=>{if(b==="submit")e.preventDefault();this.call(obj,c);};el.addEventListener(b,fn);this.listeners.push([el,b,fn]);}
  }
  for(const item of children)this.render(item.child,item.parent,depth+1);
  if(!obj.mounted){obj.mounted=true;this.call(obj,"mount");}
 }
 dispose(){for(const [el,event,fn] of this.listeners)el.removeEventListener(event,fn);this.listeners=[];if(this.program)for(const obj of [...this.instances.values()].reverse())if(obj.mounted)this.call(obj,"unmount");this.instances.clear();this.mount.replaceChildren();this.style?.remove();this.style=null;this.program=null;this.dead=true;}
}
return {compile,NativeUIRuntime,CSS};
});