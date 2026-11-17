"use strict";
const {UserStore}=require("./auth-server");
const [file,name,role]=process.argv.slice(2);
if(!file||!name||!role||!process.env.HIROGLIFX_PASSWORD){
  console.error("Usage: HIROGLIFX_PASSWORD='your-long-secret' node runtime/create-user.js <users.json> <name> <reader|writer|admin>");
  process.exitCode=1;
}else{
  try{
    new UserStore(file).add(name,process.env.HIROGLIFX_PASSWORD,role);
    console.log("User created:",name,"("+role+")");
  }catch(error){console.error(error.message);process.exitCode=1;}
}
