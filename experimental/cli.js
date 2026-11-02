#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const {Runtime}=require('./runtime');const {loadProgram}=require('./modules');
const filename=process.argv[2];if(!filename){console.error('Usage: node experimental/cli.js <file.scroll> [Blueprint] [method]');process.exit(2);}
try{const program=loadProgram(path.resolve(filename));const runtime=new Runtime(program);const agent=process.argv[3]||'Main';const method=process.argv[4]||'run';const result=runtime.invoke(agent,method);console.log(JSON.stringify({result,trace:runtime.trace},null,2));}catch(err){console.error(err.message);process.exitCode=1;}
