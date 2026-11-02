'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ApprovalAuthority}=require('../agents/approvals');
const secret='s'.repeat(48);
test('approval is scoped to run, step and plan',()=>{
 const authority=new ApprovalAuthority(secret,{clock:()=>1000});
 const token=authority.sign({runId:'r1',stepId:'publish',planHash:'abc',approver:'reviewer',expiresAt:2000});
 assert.equal(authority.verify(token,{runId:'r1',stepId:'publish',planHash:'abc'}),true);
 assert.equal(authority.verify(token,{runId:'r2',stepId:'publish',planHash:'abc'}),false);
 assert.equal(authority.verify(token,{runId:'r1',stepId:'other',planHash:'abc'}),false);
 assert.equal(authority.verify(token,{runId:'r1',stepId:'publish',planHash:'changed'}),false);
 assert.equal(authority.verify(token+'x',{runId:'r1',stepId:'publish',planHash:'abc'}),false);
});
test('expired approval is rejected',()=>{
 const issuer=new ApprovalAuthority(secret,{clock:()=>1000});
 const token=issuer.sign({runId:'r1',stepId:'publish',planHash:'abc',approver:'reviewer',expiresAt:2000});
 assert.equal(new ApprovalAuthority(secret,{clock:()=>2001}).verify(token,{runId:'r1',stepId:'publish',planHash:'abc'}),false);
});
test('weak signing secrets are rejected',()=>assert.throws(()=>new ApprovalAuthority('short'),/at least 32/));
