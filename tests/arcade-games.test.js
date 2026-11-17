"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {ArcadeGame,GAME_IDS}=require("../runtime/arcade-games");
const {ChessGame,legal,fenParse}=require("../runtime/arcade-chess");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install,games}=require("../runtime/arcade-canonical");
function frame(game,seconds=1){for(let i=0;i<Math.round(seconds*60);i++)game.tick(1/60);}
test("all six arcades are instantiable by canonical scroll source",async()=>{
 assert.equal(games.length,6);
 for(const id of games){
   const code=fs.readFileSync(path.join(__dirname,"../examples/arcade/"+id+".scroll"),"utf8");
   const runtime=install(new CanonicalRuntime());
   await runtime.execute(code);
   assert.equal(runtime.get("game").name,id);
   assert.equal(runtime.get("game").kind,"arcade-game");
 }
});
test("Pong has a playable ball, paddle control and score reset",()=>{
 const g=new ArcadeGame("pong");
 const start=g.ball.x;
 frame(g,.5);
 assert.notEqual(g.ball.x,start);
 const y=g.player;g.key("ArrowDown",true);frame(g,.2);g.key("ArrowDown",false);
 assert.ok(g.player>y);
 g.ball.x=810;g.tick(1/60);
 assert.equal(g.pScore,1);
 g.reset();assert.equal(g.pScore,0);
});
test("Snake turns, collects food, grows, and detects wall collision",()=>{
 const g=new ArcadeGame("snake");
 g.food=[10,9];frame(g,.14);
 assert.equal(g.score,1);
 assert.equal(g.snake.length,4);
 g.snake=[[19,3],[18,3],[17,3]];
 g.direction=[1,0];g.nextDir=[1,0];frame(g,.14);
 assert.equal(g.done,true);
});
test("Breakout destroys bricks and Star Defense shoots enemies",()=>{
 const b=new ArcadeGame("breakout");
 b.ball={x:b.bricks[0].x+31,y:b.bricks[0].y+12,vx:0,vy:0};
 b.tick(1/60);
 assert.equal(b.bricks[0].alive,false);
 assert.equal(b.score,10);
 const s=new ArcadeGame("star-defense");
 const enemy=s.enemies[0];
 s.shots=[{x:enemy.x,y:enemy.y}];
 s.tick(1/60);
 assert.equal(enemy.alive,false);
 assert.equal(s.score,100);
});
test("Tic Tac Toe rejects occupied cells and detects X win",()=>{
 const g=new ArcadeGame("tic-tac-toe");
 const tap=i=>g.click(205+(i%3)*130+50,65+Math.floor(i/3)*130+50);
 tap(0);tap(3);tap(1);tap(4);tap(2);
 assert.equal(g.winner,"X");assert.equal(g.done,true);
 assert.equal(g.cells[2],"X");
 g.reset();tap(0);tap(0);assert.equal(g.turn,"O");
});
test("Chess starts with 20 legal moves; Fool's Mate is checkmate",()=>{
 const g=new ChessGame();
 assert.equal(legal(g.s).length,20);
 for(const [from,to] of [["f2","f3"],["e7","e5"],["g2","g4"],["d8","h4"]])
   assert.equal(g.move(from,to),true,from+" "+to);
 assert.equal(g.done,true);
 assert.match(g.message,/Black wins by checkmate/);
 assert.equal(g.move("a2","a3"),false);
 assert.equal(g.undo(),true);
 assert.equal(g.done,false);
});
test("Chess castling, en passant and all four promotions obey rules",()=>{
 const castle=new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
 assert.equal(castle.move("e1","g1"),true);
 assert.equal(castle.s.b[117],"R"); // f1
 assert.equal(castle.s.b[119],"."); // h1
 const ep=new ChessGame("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
 assert.equal(ep.move("e5","d6"),true);
 assert.equal(ep.s.b[51],"."); // d5
 for(const p of ["q","r","b","n"]){
   const g=new ChessGame("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
   assert.equal(g.move("a7","a8",p),true);
   assert.equal(g.s.b[0],p.toUpperCase());
 }
});
test("Chess rejects illegal moves and handles stalemate",()=>{
 const g=new ChessGame();
 assert.equal(g.move("e2","e5"),false);
 assert.equal(g.s.b[100],"P");
 const stalemate=new ChessGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
 assert.equal(stalemate.status().done,true);
 assert.match(stalemate.status().message,/stalemate/);
});
test("Arcade factories reject unknown games without executing arbitrary JS",async()=>{
 const runtime=install(new CanonicalRuntime());
 await assert.rejects(runtime.execute('.Main = ()\n & game = arcade_game("javascript:alert(1)");\n break;'),/known game name/);
 assert.throws(()=>new ArcadeGame("not-real"),/Unknown arcade game/);
});
