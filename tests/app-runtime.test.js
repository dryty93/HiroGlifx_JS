"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { AppRuntime, parseProgram, expand } = require("../runtime/app-runtime");
function mockDOM() {
  const nodes = {};
  const document = {
    title:"",
    createElement:tag=>({
      tag,style:{},value:"",textContent:"",handlers:{},
      setAttribute(name,value){this[name]=value;},
      addEventListener(type,fn){this.handlers[type]=fn;},
      removeEventListener(type){delete this.handlers[type];},
      animate(){return {cancel(){}};}
    })
  };
  const mount={style:{},appendChild(node){nodes[node.id]=node;}};
  return {document,mount,nodes};
}
test("compiles .Main blocks and reusable components without code execution",()=>{
  const tree=parseProgram('.Card = [\ntext label "Hey";\n]\n.Main = [\nuse Card first;\nuse Card second;\n]');
  const instructions=expand(tree);
  assert.deepEqual(instructions.map(x=>x.args[0]),["first-label","second-label"]);
  assert.throws(()=>parseProgram('.Main = [\ntext x hi'),/Unclosed block/);
  assert.throws(()=>expand(parseProgram("use Missing id")) ,/Unknown component/);
});
test("reactive counter and text bindings update on button clicks",async()=>{
  const {document,mount,nodes}=mockDOM(),app=new AppRuntime({document,mount});
  await app.execute('.Main = [\nstate count 0;\ntext tally "";\nbind text tally "Count: {count}";\nbutton add "Add";\non click add => increment count;\n]');
  assert.equal(nodes.tally.textContent,"Count: 0");
  nodes.add.handlers.click();
  assert.equal(nodes.tally.textContent,"Count: 1");
  app.dispose();
  assert.equal(nodes.add.handlers.click,undefined);
});
test("form input updates state and greeting",async()=>{
  const {document,mount,nodes}=mockDOM(),app=new AppRuntime({document,mount});
  await app.execute('state name friend\ninput field "Name"\nbind input field name\non input field => set name @value\ntext greeting ""\nbind text greeting "Hi {name}"');
  assert.equal(nodes.field.value,"friend");
  nodes.field.value="Sam";
  nodes.field.handlers.input();
  assert.equal(app.state.get("name"),"Sam");
  assert.equal(nodes.greeting.textContent,"Hi Sam");
});
test("rejects invalid state mutation and duplicate IDs",async()=>{
  const {document,mount}=mockDOM(),app=new AppRuntime({document,mount});
  await assert.rejects(app.execute("increment missing"),/Line 1/);
  await assert.rejects(app.execute("state count hello\nincrement count"),/numeric state/);
  await assert.rejects(app.execute("input field ok\ninput field again"),/duplicate element id/);
});
