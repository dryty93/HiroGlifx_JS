"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {ScrollGame,parseProgram,expression}=require("../runtime/scroll-game-runtime");
const source=fs.readFileSync(path.resolve(__dirname,"../examples/arcade/pong.scroll"),"utf8");
const newPong=()=>new ScrollGame(source,{name:"pong"});
test("complete Pong logic and drawing parse from .scroll, not a JavaScript game factory",()=>{
 const program=parseProgram(source);
 assert.equal(program.methods.has("tick"),true);
 assert.equal(program.methods.has("draw"),true);
 assert.equal(program.declarations.length,13);
 const game=newPong();
 assert.equal(game.get("winningScore"),7);
 assert.equal(game.get("player"),260);
});
test("keyboard controls, pointer input, movement and computer paddle execute in HiroGlifx",()=>{
 const game=newPong();
 game.key("ArrowDown",true);
 game.tick(.05);
 assert.ok(game.get("player")>260);
 game.key("ArrowDown",false);
 game.click(400,380);
 game.tick(.05);
 assert.equal(game.get("player"),380);
 assert.ok(game.get("opponent")>260);
 assert.ok(game.get("ballX")>400);
});
test("wall and paddle collision expressions reverse ball velocity",()=>{
 const game=newPong();
 game.state.set("ballY",{type:"#",value:9});
 game.state.set("velocityY",{type:"#",value:-130});
 game.tick(.01);
 assert.ok(game.get("velocityY")>0);
 const hit=newPong();
 hit.state.set("ballX",{type:"#",value:40});
 hit.state.set("velocityX",{type:"#",value:-260});
 hit.state.set("ballY",{type:"#",value:260});
 hit.tick(.01);
 assert.ok(hit.get("velocityX")>0);
});
test("scoring, win conditions, messages and restart are in native .scroll",()=>{
 const game=newPong();
 game.state.set("ballX",{type:"#",value:807});
 game.tick(.016);
 assert.equal(game.score,1);
 assert.equal(game.get("ballX"),400);
 game.state.set("pScore",{type:"#",value:6});
 game.state.set("ballX",{type:"#",value:811});
 game.tick(.016);
 assert.equal(game.score,7);
 assert.equal(game.done,true);
 assert.match(game.message,/You win/);
 game.reset();
 assert.equal(game.score,0);assert.equal(game.done,false);
});
test("draw method performs native scroll Canvas instructions",()=>{
 const game=newPong(),operations=[];
 const ctx={
  fillStyle:"",font:"",textAlign:"",
  fillRect(...args){operations.push(["rect",...args]);},
  beginPath(){operations.push(["begin"]);},
  arc(...args){operations.push(["circle",...args]);},
  fill(){operations.push(["fill"]);},
  fillText(...args){operations.push(["text",...args]);}
 };
 game.render(ctx);
 assert.ok(operations.some(x=>x[0]==="rect"&&x[1]===18));
 assert.ok(operations.some(x=>x[0]==="circle"));
 assert.ok(operations.some(x=>x[0]==="text"));
});
test("native scroll forbids unsafe property access, unknown functions, loops and undeclared assignment",()=>{
 assert.throws(()=>expression("window.alert(1)"),/Unsupported character/);
 assert.throws(()=>parseProgram(".Main = ()\n: tick(dt) = [\nwhile true [\n]\n]\n: draw() = [\n]\nbreak;"),/Unsupported/);
 const bad='.Main = ()\n# x = 1;\n: tick(dt) = [\ny = 2;\n]\n: draw() = [\nclear("#000000");\n]\nbreak;';
 assert.throws(()=>new ScrollGame(bad).tick(.01),/undeclared variable/);
});
test("native game scripts type-check declared and reassigned values",()=>{
 const bad='.Main = ()\n# x = 2;\n: tick(dt) = [\nx = "not number";\n]\n: draw() = [\nclear("#000000");\n]\nbreak;';
 assert.throws(()=>new ScrollGame(bad).tick(.02),/expects number/);
});
test("standard HiroGlifx project checker recognizes complete native game scripts",()=>{
 const {resolveSource}=require("../runtime/package-manager");
 assert.equal(resolveSource(process.cwd(),source),source);
});
