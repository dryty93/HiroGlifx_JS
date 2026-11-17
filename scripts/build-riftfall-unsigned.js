#!/usr/bin/env node
"use strict";
/* Unsigned desktop developer installers, NEVER publishing or signing. */
const cp=require("node:child_process"),fs=require("node:fs"),path=require("node:path");
const {buildApp}=require("./stage-riftfall-desktop-app");
const root=path.resolve(__dirname,".."),project=buildApp({root}).out;
const cli=path.join(root,"node_modules","electron-builder","cli.js");
if(!fs.existsSync(cli))throw Error("Install electron-builder as a local dev dependency before packaging");
const targets={darwin:["--mac","zip"],win32:["--win","nsis"],linux:["--linux","AppImage"]};
const args=targets[process.platform];
if(!args)throw Error("Unsupported desktop platform "+process.platform);
const result=cp.spawnSync(process.execPath,[cli,"--projectDir",project,"--config",path.join(root,"desktop","electron-builder.yml"),
 ...args,"--publish","never"],{cwd:root,stdio:"inherit",env:{...process.env,CSC_IDENTITY_AUTO_DISCOVERY:"false"}});
if(result.error)throw result.error;
if(result.status!==0)process.exitCode=result.status||1;
