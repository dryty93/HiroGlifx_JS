'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {parse}=require('./parser');
function loadProgram(entry,{root=path.dirname(path.resolve(entry)),maxFiles=128}={}){
 const base=path.resolve(root),seen=new Set(),active=new Set(),blueprints=new Map();
 function visit(file){
  const full=path.resolve(file);
  if(full!==base&&!full.startsWith(base+path.sep))throw Error('Import outside project root: '+file);
  if(active.has(full))throw Error('Circular file import: '+full);
  if(seen.has(full))return;
  if(seen.size>=maxFiles)throw Error('Module limit exceeded');
  active.add(full);
  const program=parse(fs.readFileSync(full,'utf8'));
  for(const bp of program.blueprints){
   if(blueprints.has(bp.name))throw Error('Duplicate blueprint '+bp.name);
   blueprints.set(bp.name,bp);
  }
  seen.add(full);
  const directory=path.dirname(full);
  for(const bp of program.blueprints)for(const statement of bp.body)if(statement.type==='Import')
   for(const name of statement.names){
    if(blueprints.has(name))continue;
    const candidate=path.join(directory,name+'.scroll');
    if(fs.existsSync(candidate))visit(candidate);
   }
  active.delete(full);
 }
 visit(entry);
 for(const bp of blueprints.values())for(const statement of bp.body)
  if(statement.type==='Import')for(const name of statement.names)
   if(!blueprints.has(name))throw Error('Unresolved blueprint import '+name);
 return {type:'Program',blueprints:[...blueprints.values()]};
}
module.exports={loadProgram};
