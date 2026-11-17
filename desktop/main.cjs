"use strict";
/* Development desktop launcher. Requires local, verified dist/riftfall assets. */
const {app,BrowserWindow}=require("electron");
const path=require("node:path"),fs=require("node:fs");
const {createServer}=require("./server.cjs");
const root=path.resolve(__dirname,"../dist/riftfall");
let server=null;
async function open(){
 if(!fs.existsSync(path.join(root,"manifest.json")))
   throw Error("Offline bundle missing. Run node scripts/prepare-riftfall-desktop.js");
 server=createServer(root);
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
 const address=server.address(),origin="http://127.0.0.1:"+address.port;
 const win=new BrowserWindow({width:1380,height:900,minWidth:760,minHeight:520,
   backgroundColor:"#08111f",webPreferences:{
     nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
     allowRunningInsecureContent:false,devTools:!app.isPackaged
   }});
 win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
 win.webContents.on("will-navigate",(event,url)=>{if(!url.startsWith(origin+"/"))event.preventDefault();});
 await win.loadURL(origin+"/riftfall.html");
}
app.whenReady().then(open).catch(error=>{console.error(error.message);app.exit(1);});
app.on("before-quit",()=>server?.close());
app.on("window-all-closed",()=>app.quit());
