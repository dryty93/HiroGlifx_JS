"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createPolicyAdapter}=require("../runtime/browser-policy");
function fixture() {
  let location="about:blank";
  const calls=[];
  const page={
    url:()=>location,
    goto:async target=>{location=target;calls.push("open");},
    locator:selector=>({
      click:async()=>calls.push("click"),
      fill:async()=>calls.push("type"),
      waitFor:async()=>calls.push("wait")
    }),
    screenshot:async()=>calls.push("screenshot")
  };
  return {page,calls};
}
test("blocks domains outside the allowlist and denies clicks by default",async()=>{
  const {page,calls}=fixture();
  const adapter=createPolicyAdapter(page,{allowedDomains:["example.com"]});
  assert.throws(()=>adapter.open("https://invalid.example/"),/Domain not allowed/);
  await adapter.open("https://example.com/");
  await assert.rejects(adapter.click("#purchase"),/requires approval/);
  assert.deepEqual(calls,["open"]);
});
test("records actions without recording typed values",async()=>{
  const {page,calls}=fixture(),logs=[];
  const adapter=createPolicyAdapter(page,{allowedDomains:["example.com"],approve:async()=>true,audit:entry=>logs.push(entry)});
  await adapter.open("https://example.com");
  await adapter.type("#query","private-value");
  await adapter.click("#search");
  await adapter.wait("h1");
  await adapter.screenshot("result.png");
  assert.deepEqual(calls,["open","type","click","wait","screenshot"]);
  assert.equal(JSON.stringify(logs).includes("private-value"),false);
  assert.equal(logs.every(x=>x.status==="ok"),true);
});
