'use strict';
const primitives=new Set(['string','number','boolean','null','array','object','any']);
function validate(value,schema,label='value'){
 if(typeof schema==='string'){
  if(!primitives.has(schema))throw Error('Unsupported schema type '+schema);
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(schema!=='any'&&type!==schema)throw TypeError(label+' expected '+schema+', got '+type);
  return value;
 }
 if(!schema||typeof schema!=='object'||Array.isArray(schema))throw TypeError('Invalid schema at '+label);
 const keys=Object.keys(schema);
 if(value===null||typeof value!=='object'||Array.isArray(value))throw TypeError(label+' expected object');
 for(const key of keys){
  if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe schema key');
  if(!Object.hasOwn(value,key))throw TypeError(label+'.'+key+' is required');
  validate(value[key],schema[key],label+'.'+key);
 }
 return value;
}
module.exports={validate};
