'use strict';
const {createHmac,timingSafeEqual}=require('node:crypto');
class ApprovalAuthority {
 constructor(secret,{clock=Date.now}={}){
  if(typeof secret!=='string'||secret.length<32)throw Error('Approval secret must be at least 32 characters');
  this.secret=secret;this.clock=clock;
 }
 sign({runId,stepId,planHash,expiresAt,approver}){
  if(!runId||!stepId||!planHash||!approver||!Number.isSafeInteger(expiresAt)||expiresAt<=this.clock())throw Error('Invalid approval claims');
  const claims={runId,stepId,planHash,expiresAt,approver};
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature=createHmac('sha256',this.secret).update(payload).digest('base64url');
  return payload+'.'+signature;
 }
 verify(token,{runId,stepId,planHash}){
  if(typeof token!=='string')return false;
  const parts=token.split('.');if(parts.length!==2)return false;
  const [payload,signature]=parts;
  const expected=createHmac('sha256',this.secret).update(payload).digest();
  let actual;
  try{actual=Buffer.from(signature,'base64url');}catch{return false;}
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
  let claims;
  try{claims=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{return false;}
  return claims.runId===runId&&claims.stepId===stepId&&claims.planHash===planHash&&typeof claims.approver==='string'&&claims.approver.length>0&&Number.isSafeInteger(claims.expiresAt)&&claims.expiresAt>this.clock();
 }
}
module.exports={ApprovalAuthority};
