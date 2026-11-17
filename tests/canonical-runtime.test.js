"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {parse,parseExpr,CanonicalRuntime,AnimationController}=require("../runtime/canonical-runtime");
const {Scene}=require("../runtime/creative-scene");
function mockDOM(){
 const elements=[],animations=[];
 const document={createElement(tag){
   const handlers={};
   const element={tag,style:{},addEventListener:(type,fn)=>{handlers[type]=fn;},
     animate(frames,opts){
       const animation={frames,opts,playing:false,paused:false,cancelled:false,
         effect:{updateTiming(obj){animation.opts.iterations=obj.iterations;}},
         pause(){this.paused=true;this.playing=false;},
         play(){this.playing=true;this.paused=false;},
         reverse(){this.reversed=true;},
         cancel(){this.cancelled=true;}};
       animations.push(animation);return animation;
     }};
   elements.push(element);return element;
 }};
 const mount={appendChild(){}};
 return {document,mount,elements,animations};
}
test("canonical parser builds expression AST from legacy-style .Main block",()=>{
 const ast=parse('.Main = ()\n  # speed = 5;\n  $ label = "My Game";\n  ? ready = true;\n  & hero = box("hero", 80, 80, "blue");\n  bounce(hero, 800);\n  break;');
 assert.equal(ast.type,"Program");
 assert.deepEqual(ast.body.map(n=>n.type),["declaration","declaration","declaration","declaration","statement"]);
 assert.equal(ast.body[4].value.name,"bounce");
 assert.deepEqual(parseExpr("intro.play()").method,"play");
});
test("typed primitives and object references are available by name",async()=>{
 const {document,mount}=mockDOM();
 const rt=new CanonicalRuntime({document,mount});
 await rt.execute('.Main = ()\n# speed = 5;\n$ label = "Hello";\n? active = true;\n& hero = box("hero", 80, 80, "blue");\nbreak;');
 assert.equal(rt.get("speed"),5);
 assert.equal(rt.get("label"),"Hello");
 assert.equal(rt.get("active"),true);
 assert.equal(rt.get("hero").id,"hero");
 assert.equal(rt.get("hero").style.width,"80px");
});
test("assignment creates a paused reusable animation while shorthand executes",async()=>{
 const {document,mount,animations}=mockDOM();
 const rt=new CanonicalRuntime({document,mount});
 await rt.execute('.Main = ()\n& hero = box("hero", 90, 90, "blue");\n& intro = bounce(hero, 900);\nintro.play();\nintro.pause();\nintro.loop();\nintro.reverse();\nspin(hero, 500);\nbreak;');
 assert.equal(rt.get("intro") instanceof AnimationController,true);
 assert.equal(animations.length,2);
 assert.equal(animations[0].paused,true);
 assert.equal(animations[0].opts.iterations,Infinity);
 assert.equal(animations[0].reversed,true);
 assert.equal(animations[1].playing,true);
 rt.dispose();assert.equal(animations.every(a=>a.cancelled),true);
});
test("assignment does not start or create animation until it is used",async()=>{
 const {document,mount,animations}=mockDOM();
 const rt=new CanonicalRuntime({document,mount});
 await rt.execute('.Main = ()\n& hero = box("hero", 90, 90, "blue");\n& intro = animate(hero, "fade", 500);\nbreak;');
 assert.equal(animations.length,0);
 assert.equal(rt.get("intro").kind,"animation");
});
test("type mismatches, method allowlist, unknown values and invalid syntax fail",async()=>{
 const {document,mount}=mockDOM();
 await assert.rejects(new CanonicalRuntime({document,mount}).execute('.Main = ()\n# count = "hello";\nbreak;'),/Type mismatch/);
 await assert.rejects(new CanonicalRuntime({document,mount}).execute('.Main = ()\nbounce(hero);\nbreak;'),/Unknown variable/);
 await assert.rejects(new CanonicalRuntime({document,mount}).execute('.Main = ()\n& hero = box("hero", 20, 20, "red");\nhero.remove();\nbreak;'),/Method not available/);
 assert.throws(()=>parse('.Main = ()\n# x = 3;\n'),/Unclosed Main/);
 assert.equal(parseExpr("hero.remove()").type,"method");
 assert.throws(()=>parseExpr('alert("oops");'),/Unexpected character/);
});
test("scene object shorthand works with a provided 2D model",async()=>{
 const scene=new Scene({width:320,height:180});
 const rt=new CanonicalRuntime({scene});
 await rt.execute('.Main = ()\n& hero = sprite("hero", 10, 10, 20, 20, "blue");\nmove(hero, 15, 0);\nbreak;');
 assert.equal(scene.object("hero").x,25);
});
test("extensions may add namespaced factories but no arbitrary method execution",async()=>{
 const rt=new CanonicalRuntime();
 rt.register("fx_answer",({args})=>({value:args[0]}));
 await rt.execute('.Main = ()\n& answer = fx_answer(42);\nbreak;');
 assert.equal(rt.get("answer").value,42);
 assert.throws(()=>rt.register("eval",()=>{}),/namespaced/);
});

test("dev server and existing project check accept canonical .Main pages",async()=>{
 const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
 const {makeProject,validateProject}=require("../hiro");
 const {serveProject}=require("../runtime/dev-server");
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"hiro-canonical-"));
 const project=path.join(temp,"app");
 makeProject(project);
 fs.writeFileSync(path.join(project,"app.scroll"),'.Main = ()\n# speed = 5;\n& hero = box("hero", 50, 50, "blue");\nbounce(hero, 600);\nbreak;');
 let running;
 try{
   assert.equal(validateProject(project),2);
   running=await serveProject(project,0,{watch:false});
   const origin="http://127.0.0.1:"+running.server.address().port;
   const shell=await (await fetch(origin+"/")).text();
   assert.match(shell,/canonical-runtime\.js/);
   const response=await fetch(origin+"/__hiro/page?path=/");
   assert.equal(response.status,200);
   assert.match(await response.text(),/# speed = 5;/);
 }finally{
   if(running)await running.close();
   fs.rmSync(temp,{recursive:true,force:true});
 }
});
