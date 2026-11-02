'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {CheckpointStore}=require('../agents/checkpoints');
test('in-memory checkpoint roundtrip',async()=>{
 const store=new CheckpointStore();await store.save('run_1',{status:'paused',step:3});
 assert.deepEqual(await store.load('run_1'),{status:'paused',step:3});
});
test('file checkpoint survives new store instance',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hg-checkpoints-'));
 try{
  await new CheckpointStore({directory}).save('run_2',{completed:['a','b']});
  assert.deepEqual(await new CheckpointStore({directory}).load('run_2'),{completed:['a','b']});
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('checkpoint id rejects path traversal',async()=>{
 await assert.rejects(()=>new CheckpointStore().save('../bad',{}),/Invalid checkpoint id/);
});
