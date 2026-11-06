'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,Runtime}=require('../runtime');
const {normalizeLayout,usesLayout}=require('../language/layout');

const legacy='.Worker = ($base) :add($x) = { return $base + $x; }; .Main = () I imports = Worker; &w = Worker(5); :run() = { return w.add(7); };';
const layout=[
 '.Worker = ($base)',
 '    :add($x):',
 '        return $base + $x',
 '',
 '.Main = ()',
 '    I imports = Worker',
 '    &w = Worker(5)',
 '    :run():',
 '        return w.add(7)'
].join('\n');

test('indentation syntax produces same AST and result as legacy syntax',()=>{
 assert.equal(usesLayout(layout),true);
 assert.deepEqual(parse(layout),parse(legacy));
 assert.equal(new Runtime(parse(layout)).invoke('Main'),12);
 assert.equal(normalizeLayout(legacy),legacy);
});

test('four-space nested if else while and newline termination',()=>{
 const source=[
 '.Main = ()',
 '    :run():',
 '        $total = 0',
 '        while $total < 3:',
 '            $total = $total + 1',
 '        if $total == 3:',
 '            return "done"',
 '        else:',
 '            return "wrong"'
 ].join('\n');
 assert.equal(new Runtime(parse(source)).invoke('Main'),'done');
});

test('comments, quoted colons, nested object and array literals',()=>{
 const source=[
 '.Main = ()',
 '    @role = "Assistant: testing"',
 '    :run():',
 '        // comment',
 '        $record = {',
 '            name: "Taylor",',
 '            values: [',
 '                4,',
 '                9',
 '            ]',
 '        }',
 '        return $record.values[1]'
 ].join('\n');
 assert.equal(new Runtime(parse(source)).invoke('Main'),9);
});

test('nested branch is scoped to its block',()=>{
 const source='.Main = ()\n    :run():\n        if true:\n            $private = 4\n        return $private';
 assert.throws(()=>new Runtime(parse(source)).invoke('Main'),/Undefined variable private/);
});

test('four-space indentation is enforced',()=>{
 const source='.Main = ()\n  :run():\n    return 1';
 assert.throws(()=>parse(source),/multiples of four/);
});

test('tabs rejected in layout syntax',()=>{
 const source='.Main = ()\n\t:run():\n\t\treturn 1';
 assert.throws(()=>parse(source),/Tabs are not permitted/);
});

test('empty method block is rejected',()=>{
 const source='.Main = ()\n    :run():\n.Main2 = ()';
 assert.throws(()=>parse(source),/Missing indented body/);
});

test('else without matching if is rejected',()=>{
 const source='.Main = ()\n    :run():\n        else:\n            return 1';
 assert.throws(()=>parse(source),/else without matching if/);
});

test('inconsistent indentation rejected',()=>{
 const source='.Main = ()\n    :run():\n            return 1';
 assert.throws(()=>parse(source),/Unexpected indentation/);
});

test('legacy brace syntax remains supported with nested object and array',()=>{
 const source='.Main = () :run() = { return {value:[1,2]}.value[1]; };';
 assert.equal(new Runtime(parse(source)).invoke('Main'),2);
});
