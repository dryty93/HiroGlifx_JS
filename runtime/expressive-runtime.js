/* HiroGlifx expressive applications: user-extensible classes, recipes, and shortcuts.
 * Deliberately compiles to established AppRuntime commands: no JavaScript evaluation.
 */
(function(root,factory){
  const base=typeof module==="object"&&module.exports?require("./scroll-runtime"):root.HiroGlifxRuntime;
  const app=typeof module==="object"&&module.exports?require("./app-runtime"):root.HiroGlifxApp;
  const api=factory(base,app);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.HiroGlifxExpressive=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(base,app){
  "use strict";
  const IDENT=/^[A-Za-z][\w-]*$/;
  const SHORTHANDS=new Set(["bounce","spin","pulse","fade","slide","shake","flip","float","pop","swing","zoom"]);
  const BROWSER={"web.open":"browser.open","web.click":"browser.click","web.fill":"browser.type",
    "web.wait":"browser.wait","web.snap":"browser.screenshot",
    "web.hover":"browser.hover","web.press":"browser.press","web.scroll":"browser.scroll","web.read":"browser.read"};
  function parseExtended(source){
    const parents=new Map(),recipes=new Map(),lines=[];
    let block=false;
    for(const [index,raw] of String(source).split(/\r?\n/).entries()){
      const line=raw.trim();
      if(/^\.[A-Za-z][\w-]*\s*=\s*\[$/.test(line))block=true;
      if(!block){
        const inherit=line.match(/^extends\s+([A-Za-z][\w-]*)\s+([A-Za-z][\w-]*)\s*;?$/);
        if(inherit){
          if(parents.has(inherit[1]))throw new Error("Line "+(index+1)+": duplicate extends");
          parents.set(inherit[1],inherit[2]); lines.push(""); continue;
        }
        const recipe=line.match(/^ability\s+([A-Za-z][\w-]*)\s+([A-Za-z][\w-]*)\s*=>\s*(.+?)\s*;?$/);
        if(recipe){
          if(recipes.has(recipe[1]))throw new Error("Duplicate ability: "+recipe[1]);
          const actions=recipe[3].split(/\s+\|\s+/).map(part=>{
            const tokens=base.tokenize(part.replace(/;$/,"").trim());
            if(!tokens.length)throw new Error("Empty ability command");
            return {command:tokens[0].toLowerCase(),args:tokens.slice(1),line:index+1};
          });
          if(actions.length>12)throw new Error("Ability exceeds 12 commands");
          recipes.set(recipe[1],{parameter:recipe[2],actions}); lines.push(""); continue;
        }
      }
      lines.push(raw);
      if(block && /^(?:\];?|\bbreak;?|\bend)$/.test(line))block=false;
    }
    const program=app.parseProgram(lines.join("\n"));
    const merged=new Map();
    function resolve(name,stack=[]){
      if(merged.has(name))return merged.get(name);
      if(stack.includes(name))throw new Error("Cyclic class inheritance: "+[...stack,name].join(" -> "));
      const own=program.components.get(name);
      if(!own)throw new Error("Unknown parent class: "+name);
      const parent=parents.get(name);
      let result=parent?[...resolve(parent,[...stack,name])]:[];
      for(const node of own){
        // Replacing an inherited element with the same ID is an intentional override.
        if(["text","button","box","input"].includes(node.command)){
          const index=result.findIndex(old=>old.command===node.command&&old.args[0]===node.args[0]);
          if(index>=0){result[index]=node;continue;}
        }
        result.push(node);
      }
      merged.set(name,result);return result;
    }
    for(const name of program.components.keys())resolve(name);
    for(const name of parents.keys())if(!program.components.has(name))throw new Error("Undefined child class: "+name);
    program.components=merged;
    function expandAbilities(nodes,stack=[]){
      const out=[];
      for(const node of nodes){
        if(node.command==="do"){
          const [name,value]=node.args;
          const recipe=recipes.get(name);
          if(!recipe||!value||node.args.length!==2)throw new Error("Line "+node.line+": invalid ability invocation");
          if(stack.includes(name)||stack.length>=8)throw new Error("Recursive ability: "+name);
          const calls=recipe.actions.map(action=>({
            ...action,
            args:action.args.map(arg=>arg==="{"+recipe.parameter+"}"?value:arg)
          }));
          out.push(...expandAbilities(calls,[...stack,name]));continue;
        }
        if(SHORTHANDS.has(node.command)){
          if(node.args.length<1||node.args.length>3)throw new Error("Line "+node.line+": invalid animation shortcut");
          out.push({...node,command:"animate",args:[node.args[0],node.command,node.args[1]||"700",...node.args.slice(2)]});continue;
        }
        if(BROWSER[node.command]){
          out.push({...node,command:BROWSER[node.command]});continue;
        }
        if(node.command==="when"){
          const [event,id,arrow,verb,...remaining]=node.args;
          if(arrow!=="=>"||!SHORTHANDS.has(verb))throw new Error("Line "+node.line+": when supports animation actions");
          out.push({...node,command:"on",args:[event,id,"=>","animate",remaining[0],verb,remaining[1]||"700",...remaining.slice(2)]});continue;
        }
        out.push(node);
      }
      return out;
    }
    program.main=expandAbilities(program.main);
    for(const [name,commands] of program.components)program.components.set(name,expandAbilities(commands));
    return app.expand(program);
  }
  class ExpressiveRuntime extends app.AppRuntime {
    constructor(options={}){
      super(options);
      this.capabilities=new Map();
    }
    registerCapability(prefix,commands){
      if(!IDENT.test(prefix)||!commands||typeof commands!=="object")throw new Error("Invalid capability");
      if(this.capabilities.has(prefix))throw new Error("Capability already registered");
      const handlers=new Map();
      for(const [name,fn] of Object.entries(commands)){
        if(!IDENT.test(name)||typeof fn!=="function")throw new Error("Invalid capability handler");
        handlers.set(name,fn);
      }
      this.capabilities.set(prefix,handlers);return this;
    }
    async execute(source){
      for(const node of parseExtended(source)){
        try{await this.run(node.command,node.args);}
        catch(error){throw new Error("Line "+node.line+": "+error.message,{cause:error});}
      }
      return this;
    }
    async run(command,args){
      if(command==="link"){
        if(args.length<3||!this.document||!this.mount)throw new Error("link needs id, label, and path");
        const [id,label,path]=args;
        if(!IDENT.test(id)||this.elements.has(id))throw new Error("Invalid or duplicate link id");
        if(!/^\/[A-Za-z0-9_/-]*$/.test(path)||path.includes("//")||path.includes(".."))throw new Error("Invalid local route");
        const element=this.document.createElement("a");
        element.id=id;element.textContent=label;element.href=path;
        element.style.display="inline-block";element.style.margin="12px";
        this.mount.appendChild(element);this.elements.set(id,element);return;
      }
      if(command.includes(".")){
        const [prefix,name,...remaining]=command.split(".");
        if(remaining.length===0&&this.capabilities.has(prefix)){
          const handler=this.capabilities.get(prefix).get(name);
          if(!handler)throw new Error("Unknown capability method: "+command);
          return handler({args:[...args],runtime:this});
        }
      }
      return super.run(command,args);
    }
  }
  return {parseExtended,ExpressiveRuntime};
});
