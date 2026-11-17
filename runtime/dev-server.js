"use strict";
/** Zero-dependency local dev server: fixed runtime assets and project .scroll pages. */
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const rootRuntime=path.resolve(__dirname);
const {resolveSource}=require("./package-manager");
const allowedRuntime=new Set(["scroll-runtime.js","app-runtime.js","expressive-runtime.js","canonical-runtime.js","native-ui.js"]);
const html=[
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>HiroGlifx App</title><style>*{box-sizing:border-box}body{font:16px system-ui;margin:0;background:#0b1220;color:#edf4ff}',
'#app{max-width:900px;margin:auto;padding:36px}#app p{font-size:20px}button{padding:12px 20px;border:0;border-radius:8px;background:#60a5fa;cursor:pointer;margin:12px}',
'input{padding:12px;border:1px solid #6b809d;border-radius:8px;background:#1c3048;color:white}a{color:#95c5ff}#notice{margin:18px;color:#ffb4b4;white-space:pre-wrap}</style>',
'</head><body><div id="app"></div><pre id="notice" role="status"></pre>',
'<script src="/__hiro/runtime/scroll-runtime.js"></script>',
'<script src="/__hiro/runtime/app-runtime.js"></script>',
'<script src="/__hiro/runtime/expressive-runtime.js"></script>',
'<script src="/__hiro/runtime/canonical-runtime.js"></script>',
'<script src="/__hiro/runtime/native-ui.js"></script>',
'<script>(function(){"use strict";const mount=document.querySelector("#app"),notice=document.querySelector("#notice");let instance=null;',
'async function render(){try{const response=await fetch("/__hiro/page?path="+encodeURIComponent(location.pathname),{cache:"no-store"});',
'if(!response.ok)throw new Error(response.status===404?"No page defined for "+location.pathname:"Cannot load page");',
'const source=await response.text();if(instance)instance.dispose();mount.replaceChildren();',
'instance=/^ui application$/m.test(source) ? new HiroNativeUI.NativeUIRuntime({document,mount}) : /^\\.Main\\s*=\\s*\\(\\)\\s*$/m.test(source) ? new HiroCanonical.CanonicalRuntime({document,mount}) : new HiroGlifxExpressive.ExpressiveRuntime({document,mount});await instance.execute(source);notice.textContent="";',
'}catch(error){notice.textContent=error.message;}}',
'const events=new EventSource("/__hiro/events");events.addEventListener("reload",render);render();})();</script></body></html>'
].join("\n");
function findPage(project,pathname){
 if(typeof pathname!=="string"||!/^\/[a-zA-Z0-9/_-]*$/.test(pathname)||pathname.includes("//")||pathname.includes(".."))return null;
 const name=pathname==="/"? "app.scroll" :path.join("pages",pathname.slice(1)+".scroll");
 const target=path.resolve(project,name);
 if(!target.startsWith(path.resolve(project)+path.sep))return null;
 return target;
}
function ensureSafeTarget(target,base){
 const baseReal=fs.realpathSync(base),fileReal=fs.realpathSync(target);
 if(!fileReal.startsWith(baseReal+path.sep))throw new Error("Path outside project");
}
async function serveProject(project,port=3000,{watch=true}={}){
 project=path.resolve(project);
 if(!fs.statSync(project).isDirectory())throw new Error("Project directory required");
 const number=Number(port);
 if(!Number.isInteger(number)||number<0||number>65535)throw new Error("Invalid port");
 const clients=new Set();
 const send=(response,status,body,type)=>{
   response.writeHead(status,{"Content-Type":type||"text/plain; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
   response.end(body);
 };
 const server=http.createServer((request,response)=>{
   if(request.method!=="GET")return send(response,405,"Method not allowed");
   const url=new URL(request.url,"http://localhost");
   try{
     if(url.pathname==="/__hiro/events"){
       response.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-store","Connection":"keep-alive"});
       response.write(": connected\n\n");clients.add(response);
       request.on("close",()=>clients.delete(response));return;
     }
     if(url.pathname==="/__hiro/page"){
       const file=findPage(project,url.searchParams.get("path")||"/");
       if(!file||!fs.existsSync(file))return send(response,404,"Page not found");
       ensureSafeTarget(file,project);
       return send(response,200,resolveSource(project,fs.readFileSync(file,"utf8")),"text/plain; charset=utf-8");
     }
     if(url.pathname.startsWith("/__hiro/runtime/")){
       const filename=url.pathname.slice("/__hiro/runtime/".length);
       if(!allowedRuntime.has(filename))return send(response,404,"Not found");
       return send(response,200,fs.readFileSync(path.join(rootRuntime,filename)),"text/javascript; charset=utf-8");
     }
     if(/^\/assets\/[A-Za-z0-9_./-]+$/.test(url.pathname)&&!url.pathname.includes("..")&&!url.pathname.includes("//")){
       const rel=url.pathname.slice(1);
       const mime={".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".avif":"image/avif"};
       const type=mime[path.extname(rel).toLowerCase()];
       if(!type)return send(response,404,"Not found");
       const file=path.resolve(project,rel);
       if(!file.startsWith(project+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return send(response,404,"Not found");
       ensureSafeTarget(file,project);
       return send(response,200,fs.readFileSync(file),type);
     }
     if(url.pathname==="/favicon.ico")return send(response,404,"Not found");
     if(!/^\/[a-zA-Z0-9/_-]*$/.test(url.pathname))return send(response,404,"Not found");
     return send(response,200,html,"text/html; charset=utf-8");
   }catch(error){console.error(error);return send(response,500,"Dev server error");}
 });
 await new Promise((resolve,reject)=>server.once("error",reject).listen(number,"127.0.0.1",resolve));
 const watchers=[];
 if(watch){
   const signal=()=>{for(const client of clients)if(!client.destroyed)client.write("event: reload\ndata: changed\n\n");};
   for(const dir of [project,path.join(project,"pages"),path.join(project,"packages")]){
     if(fs.existsSync(dir)&&fs.statSync(dir).isDirectory())watchers.push(fs.watch(dir,{persistent:false},(event,name)=>{
       if(name&&(/\.scroll$/.test(String(name))||/\.json$/.test(String(name))))signal();
     }));
   }
 }
 return {server,close:async()=>{
   for(const watcher of watchers)watcher.close();
   for(const client of clients)client.end();
   await new Promise(resolve=>server.close(resolve));
 }};
}
module.exports={serveProject,findPage,html};
