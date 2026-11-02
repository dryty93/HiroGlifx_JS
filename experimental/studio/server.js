'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {parse,Runtime}=require('../runtime');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const MAX_SOURCE=100000;
function handler(req,res){
 const send=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
 if(req.method==='GET'&&req.url==='/')return send(200,html,'text/html; charset=utf-8');
 if(req.method==='GET'&&req.url==='/app.js')return send(200,fs.readFileSync(path.join(__dirname,'app.js'),'utf8'),'application/javascript; charset=utf-8');
 if(req.method!=='POST'||req.url!=='/api/analyze')return send(404,{error:'Not found'});
 let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>MAX_SOURCE){req.destroy();}});req.on('end',()=>{
  try{
   const data=JSON.parse(raw);if(typeof data.source!=='string'||data.source.length>MAX_SOURCE)throw Error('Invalid source');
   const program=parse(data.source),blueprints=program.blueprints.map(bp=>({name:bp.name,imports:bp.body.filter(x=>x.type==='Import').flatMap(x=>x.names),instances:bp.body.filter(x=>x.type==='Instance').map(x=>({name:x.name,blueprint:x.blueprint})),methods:bp.body.filter(x=>x.type==='Method').map(x=>x.name)}));
   if(data.run!==true)return send(200,{blueprints});
   const logs=[],rt=new Runtime(program,{log:x=>logs.push(String(x)),maxSteps:2000,maxDepth:8});
   const result=rt.invoke(data.agent||'Main',data.method||'run');
   return send(200,{blueprints,result:result===undefined?null:result,trace:rt.trace,logs});
  }catch(e){return send(400,{error:e.message});}
 });
}
function start({port=8787,host='127.0.0.1'}={}){const server=http.createServer(handler);server.listen(port,host);return server;}
if(require.main===module){const server=start({port:Number(process.env.PORT)||8787});server.on('listening',()=>console.log('HiroGlifx Studio: http://127.0.0.1:'+server.address().port));}
module.exports={handler,start};
