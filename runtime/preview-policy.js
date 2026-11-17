/* Phase 6: allowlisted preview programs. Never execute browser or server commands. */
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./app-runtime"):root.HiroGlifxApp);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.HiroGlifxPreviewPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(app){
  "use strict";
  const ALLOWED=new Set(["page","background","text","button","box","center","color","animate","on","state","set","increment","input","bind"]);
  const ACTIONS=new Set(["color","animate","center","set","increment"]);
  function validate(source){
    if(typeof source!=="string" || source.length>20000)throw new Error("Preview source must be at most 20 KB");
    const program=app.parseProgram(source);
    const instructions=app.expand(program);
    if(instructions.length>300)throw new Error("Preview cannot exceed 300 commands");
    const created=new Set();
    for(const node of instructions){
      if(!ALLOWED.has(node.command))throw new Error("Line "+node.line+": command unavailable in preview: "+node.command);
      if(["text","button","box","input"].includes(node.command)){
        const id=node.args[0];
        if(!id || created.has(id))throw new Error("Line "+node.line+": invalid or duplicate element: "+id);
        created.add(id);
      }
      if(node.command==="animate" && node.args[3]==="infinite" && instructions.length>150)
        throw new Error("Too many commands for infinite animations");
      if(node.command==="on"){
        if(!["click","input","mouseenter","mouseleave"].includes(node.args[0]) || node.args[2]!=="=>" || !ACTIONS.has(node.args[3]))
          throw new Error("Line "+node.line+": unsupported event action");
      }
    }
    return instructions;
  }
  return {validate};
});
