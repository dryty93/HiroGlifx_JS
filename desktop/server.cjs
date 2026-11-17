"use strict";
/* Loopback-only static asset host; avoids file:// fetch/CORS for .scroll and glTF. */
const http=require("node:http"),path=require("node:path"),fs=require("node:fs");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
 ".css":"text/css; charset=utf-8",".scroll":"text/plain; charset=utf-8",
 ".gltf":"model/gltf+json",".glb":"model/gltf-binary",".wasm":"application/wasm",
 ".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg"};
function createServer(root){
 root=path.resolve(root);
 return http.createServer((req,res)=>{
   if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405);res.end();return;}
   let url;try{url=new URL(req.url,"http://localhost");}catch{res.writeHead(400);res.end();return;}
   let rel;try{rel=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
   if(rel==="/")rel="/riftfall.html";
   if(rel.includes("\\")||rel.includes("\0")){res.writeHead(400);res.end();return;}
   const file=path.resolve(root,"."+rel);
   if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   fs.stat(file,(error,stat)=>{
     if(error||!stat.isFile()){res.writeHead(404);res.end();return;}
     const ext=path.extname(file).toLowerCase();
     res.writeHead(200,{"Content-Type":mime[ext]||"application/octet-stream",
       "X-Content-Type-Options":"nosniff","Cache-Control":"no-store",
       "Cross-Origin-Resource-Policy":"same-origin"});
     if(req.method==="HEAD"){res.end();return;}
     fs.createReadStream(file).on("error",()=>res.destroy()).pipe(res);
   });
 });
}
module.exports={createServer};
