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
 for(const name of ["dashboard","form","experiences","studio","catalog","catalog-heroes","catalog-portfolios","catalog-stories","catalog-conversion"])fs.copyFileSync(path.join(ROOT,"examples/native-ui/pages",name+".scroll"),path.join(dir,"pages",name+".scroll"));
 installLocal(dir,path.join(ROOT,"examples/native-ui-library"));return dir;
}
function fakeDOM(){
 const nodes=[];const create=tag=>({
  tagName:tag.toUpperCase(),children:[],dataset:{},style:{setProperty(name,value){this[name]=value;}},classList:{values:new Set(),add(value){this.values.add(value);},contains(value){return this.values.has(value);}},attributes:{},listeners:{},value:"",id:"",textContent:"",
  appendChild(node){this.children.push(node);return node;},
  remove(){this.removed=true;},
  replaceChildren(...items){this.children=[...items];},
  setAttribute(k,v){this.attributes[k]=v;if(k==="type")this.type=v;},
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
  const files=buildProject(dir);assert.equal(files.length,10);
  for(const route of ["index.html","dashboard/index.html","form/index.html","experiences/index.html","studio/index.html","catalog/index.html","catalog-heroes/index.html","catalog-portfolios/index.html","catalog-stories/index.html","catalog-conversion/index.html"]){
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
 assert.equal(dom.nodes.filter(x=>x.id==="hg-1-panel").at(-1).classList.contains("hg-in-view"),true,"reveal stays visible after state change");
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


test("one-command UI starter installs the experience package and all preview routes",()=>{
 const {makeNativeProject,validateProject,buildProject}=require("../hiro");
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-ui-starter-")),dir=path.join(parent,"new-studio");
 try{
  makeNativeProject(dir);
  assert.equal(validateProject(dir),10);
  assert(fs.existsSync(path.join(dir,"hiro.lock.json")));
  assert(fs.existsSync(path.join(dir,"packages/native-ui/main.scroll")));
  assert(fs.existsSync(path.join(dir,"assets/studio-placeholder.svg")));
  assert.equal(buildProject(dir).length,10);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});


test("all 28 new native experience classes compile with typed inherited API",()=>{
 const ui=compile(LIB);
 const names=["ExperienceBlock","SplitHero","GlassHero","ProductHero","PosterHero","OrbitHero","VideoHero","CollagePortfolio","HorizontalPortfolio","EditorialPortfolio","CaseStudyFeature","StickyScrollytelling","TimelineStory","ProcessSteps","StatsStrip","BeforeAfterSlider","ProductMockup","IntegrationCloud","FeatureSpotlight","QuoteWall","MagazineGrid","PeopleGrid","TabbedShowcase","ComparisonTable","NewsletterCTA","MagneticCTA","MegaFooter","NotFoundExperience"];
 for(const name of names){
  const cls=ui.classes.get(name);
  assert(cls&&cls.methods.has("render"),"missing native render for "+name);
  assert(cls.fields.has("title"),"missing inherited typed title for "+name);
 }
 assert.equal(names.length,28);
 assert.notEqual(ui.classes.get("ProductHero").methods.get("render"),ui.classes.get("SplitHero").methods.get("render"));
 assert.notEqual(ui.classes.get("EditorialPortfolio").methods.get("render"),ui.classes.get("CollagePortfolio").methods.get("render"));
});
test("all native catalog category routes compile through verified package imports",()=>{
 const dir=makeProject();
 try{
  for(const file of ["catalog","catalog-heroes","catalog-portfolios","catalog-stories","catalog-conversion"]){
   const src=resolveSource(dir,page("pages/"+file+".scroll"));
   assert(compile(src).classes.has("Main"),file);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("comparison slider and tabbed showcase are bound to native typed state",()=>{
 const src="ui application\n"+LIB.replace(/^ui library\s*/,"")+"\n.Main = ()\n : render(self) = [\n element page main root;\n component BeforeAfterSlider compare page;\n component TabbedShowcase tabs page;\n ]\n break;";
 const dom=fakeDOM(),runtime=new NativeUIRuntime(dom).execute(src);
 const slider=dom.nodes.find(x=>x.tagName==="INPUT"&&x.attributes.type==="range");
 assert(slider,"native comparison slider missing");
 assert.equal(dom.nodes.find(x=>x.style["--hg-wipe"]==="50")!==undefined,true);
 slider.value="75";slider.listeners.input();
 assert(dom.nodes.some(x=>x.style["--hg-wipe"]==="75"),"native slider did not update comparison");
 assert.equal(dom.nodes.filter(x=>x.tagName==="INPUT"&&x.attributes.type==="range").length,1,"dragging must not remount range input");
 const tab=dom.nodes.filter(x=>x.tagName==="BUTTON"&&x.textContent==="Switch showcase view").at(-1);
 assert(tab,"tab control");
 tab.listeners.click();
 assert(dom.nodes.filter(x=>x.tagName==="ARTICLE").some(x=>x.style.display==="none"),"tab visibility should change");
 runtime.dispose();
});
test("unsafe CSS variable expressions are prohibited by the native compiler",()=>{
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element panel div root;\n stylevar panel --unsafe width;\n ]\n break;'),/Invalid render command/);
 assert.throws(()=>compile('ui application\n.Main = ()\n : render(self) = [\n element panel div root;\n motion panel javascript;\n ]\n break;'),/Invalid render command/);
});


test("UI CLI discovers every installed experience and scaffolds native .scroll routes safely",()=>{
 const {uiClasses,createUIPage,validateProject}=require("../hiro");
 const dir=makeProject();
 try{
  const names=uiClasses(dir);
  for(const name of ["SplitHero","StickyScrollytelling","BeforeAfterSlider","MagneticCTA","NotFoundExperience"])
   assert(names.has(name),"missing "+name);
  const file=createUIPage(dir,"SplitHero","my-hero");
  const src=fs.readFileSync(file,"utf8");
  assert(src.includes("import native-ui"));
  assert(src.includes("component SplitHero experience page;"));
  assert.equal(validateProject(dir),11);
  assert.throws(()=>createUIPage(dir,"SplitHero","my-hero"),/already exists/);
  assert.throws(()=>createUIPage(dir,"NoSuchComponent","missing"),/Unknown UI component/);
  assert.throws(()=>createUIPage(dir,"SplitHero","../outside"),/Invalid UI route/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
