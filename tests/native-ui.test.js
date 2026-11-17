"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {compile,NativeUIRuntime}=require("../runtime/native-ui");
const {installLocal,resolveSource}=require("../runtime/package-manager");
const ROOT=path.resolve(__dirname,"..");
const LIB=fs.readFileSync(path.join(ROOT,"examples/native-ui-library/main.scroll"),"utf8");
function page(name){return fs.readFileSync(path.join(ROOT,"examples/native-ui",name),"utf8");}
function makeProject(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-ui-"));
 fs.mkdirSync(path.join(dir,"pages"));fs.copyFileSync(path.join(ROOT,"examples/native-ui/app.scroll"),path.join(dir,"app.scroll"));
 for(const name of ["dashboard","form","experiences","studio"])fs.copyFileSync(path.join(ROOT,"examples/native-ui/pages",name+".scroll"),path.join(dir,"pages",name+".scroll"));
 installLocal(dir,path.join(ROOT,"examples/native-ui-library"));return dir;
}
function fakeDOM(){
 const nodes=[];const create=tag=>({
  tagName:tag.toUpperCase(),children:[],dataset:{},style:{setProperty(name,value){this[name]=value;}},classList:{values:new Set(),add(value){this.values.add(value);},contains(value){return this.values.has(value);}},attributes:{},listeners:{},value:"",id:"",textContent:"",
  appendChild(node){this.children.push(node);return node;},
  remove(){this.removed=true;},
  replaceChildren(...items){this.children=[...items];},
  setAttribute(k,v){this.attributes[k]=v;},
  addEventListener(k,v){this.listeners[k]=v;},removeEventListener(k){delete this.listeners[k];},
  focus(){doc.activeElement=this;}
 });
 const doc={activeElement:null,head:create("head"),defaultView:{location:{assign(){throw Error("navigation")}}},
  createElement:tag=>{const el=create(tag);nodes.push(el);return el;},
  createDocumentFragment:()=>create("fragment"),
  getElementById:id=>nodes.find(x=>x.id===id)};
 const mount=create("main");return {document:doc,mount,nodes};
}
test("class compiler preserves polymorphism, typed overrides and inherited methods",()=>{
 const result=compile("ui application\n"+LIB.replace("ui library","")+"\n"+page("pages/dashboard.scroll").replace("ui application","").replace("import native-ui",""));
 const parent=result.classes.get("Button"),child=result.classes.get("PrimaryButton"),counter=result.classes.get("CounterButton");
 assert.equal(parent.fields.get("count").value,0);assert.equal(child.fields.get("variant").value,"primary");
 assert.notEqual(child.methods.get("render"),parent.methods.get("render"));
 assert.notEqual(counter.methods.get("activate"),parent.methods.get("activate"));
 assert.throws(()=>compile('ui library\n.A = ()\n $ value = "x";\n break;\n.B = (A)\n # value = 3;\n break;'),/Incompatible override/);
 assert.throws(()=>compile('ui library\n.A = (B)\n break;\n.B = (A)\n break;'),/Inheritance cycle/);
});
test("verified native-ui imports compile across all three applications",()=>{
 const dir=makeProject();
 try{for(const file of ["app.scroll","pages/dashboard.scroll","pages/form.scroll"]){const source=resolveSource(dir,fs.readFileSync(path.join(dir,file),"utf8"));assert.equal(compile(source).header,"ui application");}}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("DOM renderer mounts nested imported classes and dispatches stateful events",()=>{
 const dir=makeProject();try{
 const source=resolveSource(dir,page("pages/dashboard.scroll"));const dom=fakeDOM();
 const runtime=new NativeUIRuntime(dom).execute(source);
 assert(dom.nodes.some(x=>x.dataset.hiroComponent==="MetricCard"));
 const button=dom.nodes.find(x=>x.tagName==="BUTTON"&&x.textContent==="Clicked 0 times");
 assert(button);button.listeners.click();
 assert(dom.nodes.some(x=>x.tagName==="BUTTON"&&x.textContent==="Clicked 1 times"));
 runtime.dispose();assert.equal(dom.mount.children.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("text escaping, malicious attributes, handlers and input form events",()=>{
 const dir=makeProject();try{
 const dom=fakeDOM(),runtime=new NativeUIRuntime(dom).execute(resolveSource(dir,page("pages/form.scroll")));
 const input=dom.nodes.find(x=>x.attributes.name==="name");
 assert(input);input.value="<img src=x onerror=alert(1)>";input.listeners.input();
 const email=dom.nodes.find(x=>x.attributes.name==="email");email.value="user@example.com";email.listeners.input();
 const form=dom.nodes.find(x=>x.tagName==="FORM");form.listeners.submit({preventDefault(){}});
 assert(dom.nodes.some(x=>x.tagName==="P"&&x.textContent.includes("<img src=x onerror=alert(1)>")));
 assert(!dom.nodes.some(x=>x.tagName==="IMG"));
 runtime.dispose();
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element link a root;\n attr link onclick "alert(1)";\n ]\n break;'),/Invalid render command/);
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element canvas canvas root;\n ]\n break;'),/Invalid render command/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("production build emits standalone route pages without unsafe inline source injection",()=>{
 const {buildProject}=require("../hiro");const dir=makeProject();
 try{
  const files=buildProject(dir);assert.equal(files.length,5);
  for(const route of ["index.html","dashboard/index.html","form/index.html","experiences/index.html","studio/index.html"]){
   const content=fs.readFileSync(path.join(dir,"dist",route),"utf8");
   assert(content.includes("HiroNativeUI.NativeUIRuntime"));
   assert(content.includes("/assets/native-ui.js"));
  }
  assert(fs.readFileSync(path.join(dir,"dist/assets/native-ui.js"),"utf8").includes("NativeUIRuntime"));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test("experience components compile with inherited visual variants and safe declarative effects",()=>{
 const classes=compile(LIB).classes;
 assert(classes.has("CinematicHero")&&classes.has("BentoShowcase")&&classes.has("ShowcaseCarousel"));
 assert(classes.has("PricingPanel")&&classes.has("FAQItem")&&classes.has("PhotoTile"));
 assert.notEqual(classes.get("EditorialHero").methods.get("render"),classes.get("CinematicHero").methods.get("render"));
 assert.notEqual(classes.get("BentoWide").methods.get("render"),classes.get("BentoTile").methods.get("render"));
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element panel div root;\n motion panel javascript;\n ]\n break;'),/Invalid render command/);
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element panel div root;\n attr panel style "background:url(javascript:evil)";\n ]\n break;'),/Invalid render command/);
});


test("unsafe media URLs are rejected at the DOM boundary",()=>{
 const dom=fakeDOM();
 const source='ui application\n.Main = ()\n : render(self) = [\n element image img root;\n attr image src "javascript:alert(1)";\n ]\n break;';
 const runtime=new NativeUIRuntime(dom);
 assert.throws(()=>runtime.execute(source),/Unsafe media URL/);
 runtime.dispose();
});
test("motion reveals and bounded slide state work with the browser abstraction",()=>{
 const dom=fakeDOM();
 const source='ui application\n.Main = ()\n # active = 0;\n : render(self) = [\n element panel div root;\n motion panel reveal;\n element track div panel;\n slide track active;\n element button button panel;\n on button click next;\n ]\n : next(self) = [\n cycle active 0 2;\n ]\n break;';
 const rt=new NativeUIRuntime(dom).execute(source);
 const activeTrack=()=>dom.nodes.filter(x=>x.id==="hg-1-track").at(-1);
 assert.equal(activeTrack().style["--hg-slide"],"0");
 const button=dom.nodes.filter(x=>x.id==="hg-1-button").at(-1);
 button.listeners.click();assert.equal(activeTrack().style["--hg-slide"],"1");
 const second=dom.nodes.filter(x=>x.id==="hg-1-button").at(-1);second.listeners.click();
 const third=dom.nodes.filter(x=>x.id==="hg-1-button").at(-1);third.listeners.click();
 assert.equal(activeTrack().style["--hg-slide"],"0");
 const panel=dom.nodes.filter(x=>x.id==="hg-1-panel").at(-1);
 assert.equal(panel.classList.contains("hg-in-view"),true);
 rt.dispose();
});
test("static build includes verified local showcase imagery",()=>{
 const {buildProject}=require("../hiro"),dir=makeProject();
 try{
  fs.mkdirSync(path.join(dir,"assets"));
  fs.copyFileSync(path.join(ROOT,"examples/native-ui/assets/studio-placeholder.svg"),path.join(dir,"assets/studio-placeholder.svg"));
  buildProject(dir);
  assert(fs.existsSync(path.join(dir,"dist/assets/studio-placeholder.svg")));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
