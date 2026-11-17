"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {UserStore}=require("../runtime/auth-server");
test("password verifier and roles work",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hg-user-"));
  try {
    const file=path.join(dir,"users.json");
    const store=new UserStore(file);
    store.add("sampleUser","long-demo-password-123","reader");
    assert.equal(store.verify("sampleUser","incorrect"),null);
    assert.deepEqual(store.verify("sampleUser","long-demo-password-123"),{name:"sampleUser",role:"reader"});
    assert.equal(fs.readFileSync(file,"utf8").includes("long-demo-password-123"),false);
    assert.throws(()=>store.add("bad","short","reader"),/Password/);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
