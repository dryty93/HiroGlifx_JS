'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Runtime,parse}=require('../runtime');
test('valid input and output contracts',async()=>{
 const source='.Main = () @input = {topic:"string"}; @output = "string"; :run($input) = { return $input.topic; };';
 assert.equal(await new Runtime(parse(source)).invokeAsync('Main','run',[{topic:'hello'}]),'hello');
});
test('reject invalid input',async()=>{
 const source='.Main = () @input = {topic:"string"}; :run($input) = { return "ok"; };';
 await assert.rejects(()=>new Runtime(parse(source)).invokeAsync('Main','run',[{topic:12}]),/input.topic expected string/);
});
test('reject invalid output',async()=>{
 const source='.Main = () @output = "number"; :run() = { return "wrong"; };';
 await assert.rejects(()=>new Runtime(parse(source)).invokeAsync('Main'),/output expected number/);
});
