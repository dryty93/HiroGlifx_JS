"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {validate}=require("../runtime/preview-policy");
test("accepts reactive UI programs",()=>{
 const program='.Main = [\nstate count 0;\ntext tally "";\nbind text tally "Count {count}";\nbutton add "Add";\non click add => increment count;\n]';
 assert.equal(validate(program).length,5);
});
test("rejects browser and data commands",()=>{
 assert.throws(()=>validate('browser.open "https://example.com"'),/unavailable/);
 assert.throws(()=>validate('data.collection users'),/unavailable/);
 assert.throws(()=>validate('route GET \/health json "{}"'),/unavailable/);
 assert.throws(()=>validate('on click add => browser.open "https://example.com"'),/unsupported event/);
});
test("enforces source and command limits",()=>{
 assert.throws(()=>validate("a".repeat(20001)),/20 KB/);
 assert.throws(()=>validate(Array(301).fill('text item "hello"').join("\n")),/300 commands/);
});
