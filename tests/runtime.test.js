"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { Runtime, tokenize, parse } = require("../runtime/scroll-runtime");
const { createPlaywrightAdapter } = require("../runtime/playwright-adapter");

test("tokenizes quoted arguments, blanks, and comments", () => {
  assert.deepEqual(tokenize('text title "Hello world"'), ["text","title","Hello world"]);
  assert.deepEqual(tokenize("# comment"), []);
  assert.equal(parse('page "One"\n\nbox cube 50 50 red').length, 2);
});
test("executes visual commands with DOM adapter and event actions", async () => {
  const nodes = {};
  const makeElement = tag => ({
    tag, style:{}, textContent:"", listeners:{}, animations:[],
    addEventListener(event, fn){this.listeners[event]=fn;},
    removeEventListener(event){delete this.listeners[event];},
    animate(frames, opts) {
      const animation = {frames,opts,cancel(){this.cancelled=true;}};
      this.animations.push(animation); return animation;
    }
  });
  const mount = {style:{},children:[],appendChild(e){this.children.push(e);nodes[e.id]=e;}};
  const document = {title:"",createElement:makeElement};
  const runtime = new Runtime({document,mount});
  await runtime.execute('page "Test site"\nbackground blue\nbox square 80 60 red\nbutton go "Click me"\non click go => color square purple\nanimate square bounce 1000 infinite');
  assert.equal(document.title, "Test site");
  assert.equal(nodes.square.style.width, "80px");
  assert.equal(nodes.square.animations[0].opts.iterations, Infinity);
  nodes.go.listeners.click();
  assert.equal(nodes.square.style.background, "purple");
  runtime.dispose();
  assert.equal(nodes.go.listeners.click, undefined);
  assert.equal(nodes.square.animations[0].cancelled, true);
});
test("rejects unsafe or invalid commands", async () => {
  const runtime = new Runtime();
  await assert.rejects(runtime.execute("browser.open javascript:alert(1)"), /Browser adapter required/);
  await assert.rejects(runtime.execute("route GET /health json nope"), /Line 1: Invalid route JSON/);
  await assert.rejects(runtime.execute("unknown foo"), /Line 1: Unknown command/);
});
test("browser adapter forwards commands, and validates URLs", async () => {
  const calls = [];
  const page = {
    goto: async value => calls.push(["open", value]),
    locator: selector => ({
      click: async () => calls.push(["click", selector]),
      fill: async value => calls.push(["type",selector,value]),
      waitFor: async () => calls.push(["wait",selector])
    }),
    screenshot: async options => calls.push(["screenshot",options.path])
  };
  const runtime = new Runtime({browser:createPlaywrightAdapter(page)});
  await runtime.execute('browser.open "https://example.com"\nbrowser.click "#go"\nbrowser.type "#q" "hello world"\nbrowser.wait "#result"\nbrowser.screenshot "result.png"');
  assert.deepEqual(calls.map(x=>x[0]), ["open","click","type","wait","screenshot"]);
  await assert.rejects(runtime.execute("browser.open file:///etc/passwd"), /Only http\(s\)/);
  await assert.rejects(runtime.execute('browser.screenshot "../bad.png"'), /relative .png path/);
});
test("API routes return configured JSON and 404 for misses", async () => {
  const runtime = new Runtime();
  await runtime.execute('route GET /health json \'{"ok":true}\'');
  const serve = http.createServer((req,res)=>runtime.handler(req,res));
  await new Promise(resolve=>serve.listen(0,"127.0.0.1",resolve));
  try {
    const port=serve.address().port;
    const good=await fetch("http://127.0.0.1:"+port+"/health");
    assert.equal(good.status,200);
    assert.deepEqual(await good.json(),{ok:true});
    const bad=await fetch("http://127.0.0.1:"+port+"/missing");
    assert.equal(bad.status,404);
  } finally { await new Promise(resolve=>serve.close(resolve)); }
});
