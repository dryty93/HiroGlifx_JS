"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {parseExtended,ExpressiveRuntime}=require("../runtime/expressive-runtime");
const {makeProject,validateProject}=require("../hiro");
const {serveProject}=require("../runtime/dev-server");

function mock(){
 const nodes={};
 const document={title:"",createElement:tag=>({
  tag,style:{},textContent:"",value:"",handlers:{},
  addEventListener(event,fn){this.handlers[event]=fn;},
  removeEventListener(event){delete this.handlers[event];},
  animate(frames,opts){this.animation={frames,opts};return {cancel(){}};},
  setAttribute(){}
 })};
 const mount={style:{},appendChild(el){nodes[el.id]=el;}};
 return {document,mount,nodes};
}
test("class extension overrides named elements without duplicate IDs",async()=>{
 const program=[
 "extends Fancy Base",
 ".Main = ["," use Fancy header;"," ]",
 ".Base = [",' text heading "Old";'," box cube 30 30 blue;"," ]",
 ".Fancy = [",' text heading "New";'," ]"
 ].join("\n");
 const commands=parseExtended(program);
 assert.equal(commands.filter(c=>c.command==="text").length,1);
 const {document,mount,nodes}=mock();
 await new ExpressiveRuntime({document,mount}).execute(program);
 assert.equal(nodes["header-heading"].textContent,"New");
 assert.equal(nodes["header-cube"].style.width,"30px");
});
test("abilities and motion shorthand compile to approved underlying commands",()=>{
 const commands=parseExtended([
 "ability sparkle target => spin {target} 600 | color {target} purple",
 "box square 40 40 blue",
 "do sparkle square",
 "when click trigger => bounce square 800"
 ].join("\n"));
 assert.deepEqual(commands.map(x=>x.command),["box","animate","color","on"]);
 assert.deepEqual(commands[1].args,["square","spin","600"]);
 assert.deepEqual(commands[3].args,["click","trigger","=>","animate","square","bounce","800"]);
 assert.throws(()=>parseExtended("extends A B\n.A = [\n]\n.B = [\n]\nextends B A\nuse A first"),/Cyclic/);
});
test("short browser aliases and extensible host capabilities",async()=>{
 const calls=[];
 const r=new ExpressiveRuntime({browser:{
  open:async url=>calls.push(["open",url]),
  click:async selector=>calls.push(["click",selector]),
  read:async selector=>calls.push(["read",selector])
 }});
 await r.execute('web.open "https://example.com"\nweb.click "#go"\nweb.read "h1"');
 assert.deepEqual(calls.map(x=>x[0]),["open","click","read"]);
 r.registerCapability("game",{say:({args})=>calls.push(["say",args[0]])});
 await r.run("game.say",["Hello"]);
 assert.deepEqual(calls[3],["say","Hello"]);
 await assert.rejects(r.run("game.unknown",[]),/Unknown capability/);
});
test("CLI scaffolding, route discovery, HTTP serving and unknown page",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-cli-"));
 const project=path.join(dir,"demo");
 try{
  makeProject(project);
  assert.equal(validateProject(project),2);
  const dev=await serveProject(project,0,{watch:false});
  try{
   const port=dev.server.address().port,base="http://127.0.0.1:"+port;
   const home=await fetch(base+"/");
   assert.equal(home.status,200);
   assert.match(await home.text(),/EventSource/);
   const page=await fetch(base+"/__hiro/page?path=/");
   assert.match(await page.text(),/FancyHero/);
   const about=await fetch(base+"/__hiro/page?path=/about");
   assert.match(await about.text(),/separate/);
   assert.equal((await fetch(base+"/__hiro/page?path=/missing")).status,404);
   assert.equal((await fetch(base+"/__hiro/runtime/not-found.js")).status,404);
   assert.equal((await fetch(base+"/__hiro/page?path=/%2e%2e/secret")).status,404);
  }finally{await dev.close();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
