'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadProgram}=require('../modules');
const {Runtime}=require('../runtime');
const {ModelRegistry,MockProvider}=require('../agents/provider');
const {ToolRegistry}=require('../agents/tools');
test('cross-file model agent composes into supervisor with contract',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hg-agent-'));
 try{
  fs.writeFileSync(path.join(dir,'Researcher.scroll'),'.Researcher = () @model = "mock"; @input = "string"; @output = "string"; :run($topic) = { return ai.reason($topic); };');
  fs.writeFileSync(path.join(dir,'Main.scroll'),'.Main = () I imports = Researcher; &r = Researcher(); :run() = { return r.run("topic"); };');
  const models=new ModelRegistry().register('mock',new MockProvider({topic:'report'}));
  const rt=new Runtime(loadProgram(path.join(dir,'Main.scroll')));
  assert.equal(await rt.invokeAsync('Main','run',[],{models}),'report');
  assert.equal(rt.trace.some(e=>e.event==='complete'&&e.agent==='Researcher'),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('cross-file tool capability does not escalate',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hg-agent-'));
 try{
  fs.writeFileSync(path.join(dir,'Worker.scroll'),'.Worker = () @tools = [echo]; :run() = { return tool.call("echo","ok"); };');
  fs.writeFileSync(path.join(dir,'Main.scroll'),'.Main = () I imports = Worker; &w = Worker(); :run() = { return w.run(); };');
  const tools=new ToolRegistry().register('echo',x=>x);
  await assert.rejects(()=>new Runtime(loadProgram(path.join(dir,'Main.scroll'))).invokeAsync('Main','run',[],{tools,permissions:['echo']}),/Permission denied/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
