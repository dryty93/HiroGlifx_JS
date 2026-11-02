'use strict';
class OpenAIProvider {
 constructor({apiKey=process.env.OPENAI_API_KEY,baseURL='https://api.openai.com/v1',fetchImpl=globalThis.fetch,timeoutMs=30000}={}){
  if(!apiKey)throw Error('OPENAI_API_KEY required');
  if(typeof fetchImpl!=='function')throw Error('fetch implementation required');
  this.apiKey=apiKey;this.baseURL=baseURL.replace(/\/$/,'');this.fetch=fetchImpl;this.timeoutMs=timeoutMs;
 }
 async generate({model='gpt-4.1-mini',prompt}={}){
  if(typeof prompt!=='string'||!prompt.trim())throw TypeError('prompt required');
  const response=await this.fetch(this.baseURL+'/responses',{method:'POST',headers:{'Authorization':'Bearer '+this.apiKey,'Content-Type':'application/json'},body:JSON.stringify({model,input:prompt}),signal:AbortSignal.timeout(this.timeoutMs)});
  if(!response.ok)throw Error('Model request failed with HTTP '+response.status);
  const data=await response.json();
  const text=(data.output||[]).flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text).join('');
  if(!text)throw Error('Model returned no output text');
  return {text,model:data.model||model,usage:{inputTokens:data.usage?.input_tokens||0,outputTokens:data.usage?.output_tokens||0}};
 }
}
module.exports={OpenAIProvider};
