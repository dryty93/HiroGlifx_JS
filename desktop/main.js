"use strict";
/* Strict local-only Electron host for the staged Riftfall game. */
const path=require("node:path"),{pathToFileURL}=require("node:url");
const {app,BrowserWindow,protocol,net,session}=require("electron");
const guard=require("./security");

protocol.registerSchemesAsPrivileged([{
 scheme:"hiro-game",
 privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}
}]);
let window=null;
function createWindow(){
 const root=path.join(app.getAppPath(),"dist-web");
 guard.validateManifest(root);
 const win=new BrowserWindow({
   width:1420,height:900,minWidth:900,minHeight:650,
   title:"Riftfall | HiroGlifx",
   show:false,backgroundColor:"#091429",
   autoHideMenuBar:true,
   webPreferences:{
     nodeIntegration:false,
     contextIsolation:true,
     sandbox:true,
     webSecurity:true,
     allowRunningInsecureContent:false,
     webviewTag:false,
     devTools:false
   }
 });
 const contents=win.webContents;
 contents.setWindowOpenHandler(()=>({action:"deny"}));
 contents.on("will-navigate",(event,url)=>{
   if(!guard.allowedNavigation(url))event.preventDefault();
 });
 contents.on("will-redirect",(event,url)=>{
   if(!guard.allowedNavigation(url))event.preventDefault();
 });
 contents.on("did-fail-load",(_event,code,description,url)=>{
   console.error("Riftfall failed to load offline content",code,description,url);
 });
 win.once("ready-to-show",()=>win.show());
 win.loadURL(guard.ORIGIN+guard.GAME_PATH);
 window=win;return win;
}
app.whenReady().then(()=>{
 const root=path.join(app.getAppPath(),"dist-web");
 protocol.handle("hiro-game",async(request)=>{
   try{
     const {file,mime}=guard.resolveBundleUrl(request.url,root);
     const result=await net.fetch(pathToFileURL(file).toString(),{bypassCustomProtocolHandlers:true});
     if(!result.ok)return result;
     const headers=new Headers(result.headers);headers.set("Content-Type",mime);
     headers.set("X-Content-Type-Options","nosniff");
     headers.set("Cross-Origin-Opener-Policy","same-origin");
     return new Response(result.body,{status:result.status,statusText:result.statusText,headers});
   }catch(error){
     console.error("Blocked desktop resource request",error.message);
     return new Response("Not found",{status:404,headers:{"Content-Type":"text/plain"}});
   }
 });
 const ses=session.defaultSession;
 ses.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 ses.setPermissionCheckHandler(()=>false);
 ses.webRequest.onBeforeRequest({urls:["http://*/*","https://*/*"]},
   (_details,callback)=>callback({cancel:true}));
 createWindow();
 app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
}).catch(error=>{console.error("Riftfall desktop startup failed:",error);app.quit();});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
