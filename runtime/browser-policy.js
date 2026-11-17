"use strict";
/** Permissioned Playwright adapter; wrap the Phase 1 adapter in an explicit policy.
 * This is a defense-in-depth MVP, not a complete browser sandbox.
 */
const {createPlaywrightAdapter}=require("./playwright-adapter");
function createPolicyAdapter(page,options={}) {
  const allowed = new Set((options.allowedDomains || []).map(x=>String(x).toLowerCase()));
  if (!allowed.size || [...allowed].some(x=>!/^[a-z0-9.-]+$/.test(x))) throw new Error("At least one valid allowed domain is required");
  const approve = options.approve || (async()=>false);
  const audit = options.audit || (()=>{});
  const base=createPlaywrightAdapter(page);
  const normalized = value => {
    const url=new URL(value);
    if (!["https:","http:"].includes(url.protocol)) throw new Error("Only HTTP(S) navigation");
    if (url.username || url.password) throw new Error("URL credentials are forbidden");
    if (!allowed.has(url.hostname.toLowerCase())) throw new Error("Domain not allowed: "+url.hostname);
    return url.href;
  };
  const current = () => {
    const url=page.url();
    if(url && url!=="about:blank") normalized(url);
  };
  const record = (action,metadata,status) => audit({action,metadata,status,time:new Date().toISOString()});
  const invoke=async(action,metadata,fn,needsApproval=false) => {
    if(needsApproval) {
      const yes=await approve({action,metadata});
      if(yes!==true){record(action,metadata,"denied");throw new Error("Action requires approval: "+action);}
    }
    try {
      const output=await fn();
      current();
      record(action,metadata,"ok");
      return output;
    }catch(error){record(action,metadata,"failed");throw error;}
  };
  return {
    open:url=> {
      const target=normalized(url);
      return invoke("open",{domain:new URL(target).hostname},()=>base.open(target));
    },
    click:selector=> {
      current();
      return invoke("click",{selector},()=>base.click(selector),true);
    },
    type:(selector,value)=> {
      current();
      return invoke("type",{selector,characters:String(value).length},()=>base.type(selector,value),true);
    },
    wait:selector=> {
      current();
      return invoke("wait",{selector},()=>base.wait(selector));
    },
    screenshot:filename=> {
      current();
      return invoke("screenshot",{file:filename},()=>base.screenshot(filename));
    }
  };
}
module.exports={createPolicyAdapter};
