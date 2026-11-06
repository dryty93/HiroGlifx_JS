'use strict';
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HiroWorkspaceCore=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 function safeFilename(name){
  const base=String(name||'untitled.scroll').split(/[\\/]/).pop().replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,80);
  return (base||'untitled')+(base.endsWith('.scroll')?'':'.scroll');
 }
 function findNext(source,query,from=0,{caseSensitive=false,backwards=false}={}){
  if(!query)return null;
  const haystack=caseSensitive?source:source.toLowerCase(),needle=caseSensitive?query:query.toLowerCase();
  const start=Math.max(0,Math.min(source.length,from));
  let index=backwards?haystack.lastIndexOf(needle,start-1):haystack.indexOf(needle,start);
  if(index<0)index=backwards?haystack.lastIndexOf(needle):haystack.indexOf(needle);
  return index<0?null:{from:index,to:index+query.length};
 }
 function replaceAll(source,query,replacement,{caseSensitive=false}={}){
  if(!query)return {source,count:0};
  const value=caseSensitive?source:source.toLowerCase();
  const needle=caseSensitive?query:query.toLowerCase();
  let cursor=0,output='',count=0;
  for(;;){
   const next=value.indexOf(needle,cursor);
   if(next<0)break;
   output+=source.slice(cursor,next)+replacement;cursor=next+query.length;count++;
  }
  return {source:output+source.slice(cursor),count};
 }
 function symbolLine(source,name,kind='blueprint'){
  const rows=source.split(/\r?\n/);
  const prefix=kind==='method'?':'+name+'(':'.'+name+' ';
  const index=rows.findIndex(line=>line.trimStart().startsWith(prefix));
  return index<0?null:index+1;
 }
 return {safeFilename,findNext,replaceAll,symbolLine};
});
