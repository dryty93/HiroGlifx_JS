'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {loadProgram}=require('../modules');const {Runtime}=require('../runtime');
test('load imported agent blueprint from adjacent file',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hg-'));
 try{
  fs.writeFileSync(path.join(dir,'Worker.scroll'),'.Worker = () :run($x) = { return $x; };');
  fs.writeFileSync(path.join(dir,'Main.scroll'),'.Main = () I imports = Worker; &w = Worker(); :run() = { return w.run("ok"); };');
  assert.equal(new Runtime(loadProgram(path.join(dir,'Main.scroll'))).invoke('Main'),'ok');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('reject missing blueprint',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hg-'));
 try{fs.writeFileSync(path.join(dir,'Main.scroll'),'.Main = () I imports = Missing; :run() = { return "ok"; };');
 assert.throws(()=>loadProgram(path.join(dir,'Main.scroll')),/Unresolved blueprint/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
