"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {ScrollGame,parseProgram,expression}=require("../runtime/scroll-game-runtime");
function game(id){
 const source=fs.readFileSync(path.join(__dirname,"../examples/arcade/"+id+".scroll"),"utf8");
 assert.equal(source.includes('arcade_game("'+id+'")'),false);
 const result=new ScrollGame(source,{name:id});
 assert.ok(result.program.methods.has("tick"));
 assert.ok(result.program.methods.has("draw"));
 return result;
}
const step=(g,n=1)=>{for(let i=0;i<n;i++)g.tick(1/60);};
const set=(g,key,value)=>{const old=g.state.get(key);assert.ok(old);g.state.set(key,{...old,value});};
const idx=s=>(8-Number(s[1]))*8+"abcdefgh".indexOf(s[0]);
const move=(g,from,to,promo="q")=>g.invoke("legalMove",[idx(from),idx(to),promo,true],{n:4000000,loops:2000000},"input");
function fromFen(fen){
 const rows=fen.split("/"),array=[];
 for(const row of rows)for(const c of row){
   if(/[1-8]/.test(c))for(let i=0;i<Number(c);i++)array.push(".");
   else array.push(c);
 }
 assert.equal(array.length,64);return array;
}
test("all six complete native HiroGlifx scripts parse and render",()=>{
 for(const id of ["pong","snake","breakout","star-defense","chess","tic-tac-toe"]){
   const g=game(id),calls=[];
   const ctx={
     fillStyle:"",font:"",textAlign:"",
     fillRect(...a){calls.push(["rect",...a]);},
     fillText(...a){calls.push(["text",...a]);},
     beginPath(){},arc(){},fill(){}
   };
   g.render(ctx);
   assert.ok(calls.length>10,id+" must draw a real game");
 }
});
test("Snake: HiroGlifx movement, food, tail growth, wall death and reset",()=>{
 const g=game("snake");
 set(g,"food",190);step(g,8);
 assert.equal(g.score,1);
 assert.equal(g.get("snake").length,4);
 assert.equal(g.get("food")===190,false);
 set(g,"snake",[199,198,197]);set(g,"direction",1);set(g,"nextDirection",1);
 step(g,9);assert.equal(g.done,true);
 g.reset();assert.equal(g.done,false);assert.equal(g.score,0);
});
test("Snake: key event changes direction while preventing reversal",()=>{
 const g=game("snake");
 g.key("ArrowLeft",true);
 assert.equal(g.get("nextDirection"),1);
 g.key("ArrowUp",true);
 assert.equal(g.get("nextDirection"),0);
});
test("Breakout: script collision kills brick, scores and expires lives",()=>{
 const g=game("breakout");
 set(g,"ballX",69);set(g,"ballY",78);set(g,"velocityX",0);set(g,"velocityY",0);
 step(g);
 assert.equal(g.get("remaining"),49);assert.equal(g.score,10);
 assert.equal(g.get("bricks")[0],0);
 set(g,"lives",1);set(g,"ballY",531);step(g);
 assert.equal(g.done,true);assert.match(g.message,/No lives/);
});
test("Star Defense: script shoots enemy, computes score and detects win",()=>{
 const g=game("star-defense");
 g.get("shots").push([125,78]);step(g);
 assert.equal(g.get("enemies")[0],0);
 assert.equal(g.score,100);
 set(g,"remaining",0);step(g);
 assert.equal(g.done,true);assert.match(g.message,/defended/);
});
test("Tic-Tac-Toe: scripted local turns, occupied-cell rejection and X win",()=>{
 const g=game("tic-tac-toe");
 const click=i=>g.click(205+(i%3)*130+20,65+Math.floor(i/3)*130+20);
 click(0);assert.equal(g.get("turn"),-1);
 click(0);assert.equal(g.get("moves"),1);
 click(3);click(1);click(4);click(2);
 assert.equal(g.done,true);assert.match(g.message,/X wins/);
 g.reset();assert.equal(g.get("moves"),0);
});
test("Chess: opening has correct board and Fool's Mate is legal checkmate",()=>{
 const g=game("chess");
 assert.equal(g.get("board").length,64);
 assert.equal(g.get("board")[59],"Q");
 assert.equal(g.get("board")[3],"q");
 for(const [f,t] of [["f2","f3"],["e7","e5"],["g2","g4"],["d8","h4"]])
   assert.equal(move(g,f,t),true,f+t);
 assert.equal(g.done,true);
 assert.match(g.message,/Black wins by checkmate/);
 assert.equal(g.get("moves"),4);
 assert.equal(g.undo(),true);assert.equal(g.done,false);
 assert.equal(g.get("moves"),3);
});
test("Chess: legal castling, en passant and four promotions from .scroll",()=>{
 const castle=game("chess");
 set(castle,"board",fromFen("r3k2r/8/8/8/8/8/8/R3K2R"));
 assert.equal(move(castle,"e1","g1"),true);
 assert.equal(castle.get("board")[61],"R");
 assert.equal(castle.get("board")[63],".");
 const ep=game("chess");
 set(ep,"board",fromFen("4k3/8/8/3pP3/8/8/8/4K3"));
 set(ep,"rights",0);set(ep,"ep",idx("d6"));
 assert.equal(move(ep,"e5","d6"),true);
 assert.equal(ep.get("board")[idx("d5")],".");
 for(const promo of ["q","r","b","n"]){
   const g=game("chess");
   set(g,"board",fromFen("4k3/P7/8/8/8/8/8/4K3"));
   set(g,"rights",0);
   assert.equal(move(g,"a7","a8",promo),true,promo);
   assert.equal(g.get("board")[0],promo.toUpperCase());
 }
});
test("Chess: illegal moves, king exposure and stalemate are detected",()=>{
 const g=game("chess");
 assert.equal(move(g,"e2","e5"),false);
 assert.equal(move(g,"e1","e2"),false);
 const pinned=game("chess");
 set(pinned,"board",fromFen("4r1k1/8/8/8/8/8/4R3/4K3"));
 set(pinned,"rights",0);
 assert.equal(move(pinned,"e2","d2"),false);
 const stale=game("chess");
 set(stale,"board",fromFen("7k/5Q2/6K1/8/8/8/8/8"));
 set(stale,"turn",-1);set(stale,"rights",0);
 assert.equal(stale.invoke("hasLegalMoves",[],{n:4000000,loops:2000000},"input"),false);
 assert.equal(stale.invoke("inCheck",[stale.get("board"),-1],{n:4000000,loops:2000000},"input"),false);
});
test("HiroGlifx bounded loops, arrays and methods reject unsafe operations",()=>{
 const g=game("snake");
 assert.throws(()=>expression("constructor.constructor('evil')"),/Unsupported character/);
 assert.throws(()=>g.invoke("tick",[],{n:100,loops:10},"tick"),/wrong argument/);
 assert.throws(()=>g.functionBuiltin("set",[[1,2],3,4],{n:10,loops:10},"tick"),/Index out of bounds/);
 assert.throws(()=>g.tick(.9),/Invalid frame delta/);
 const source='.Main = ()\n& list = filled(2, 0);\n: tick(dt) = [\nwhile true [\npush(list, 1);\n]\n]\n: draw() = [\nclear("#000000");\n]\nbreak;';
 const runaway=new ScrollGame(source);
 assert.throws(()=>runaway.tick(.01),/budget|limit/i);
});