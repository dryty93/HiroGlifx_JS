/* HiroGlifx Arcade — deterministic, dependency-free browser game models.
 * Rendering is optional Canvas 2D and kept separate from game state.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroArcade=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const GAME_IDS=["pong","snake","breakout","star-defense","tic-tac-toe"];
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 class ArcadeGame{
   constructor(name){
     if(!GAME_IDS.includes(name))throw new Error("Unknown arcade game: "+name);
     this.kind="arcade-game";this.name=name;this.width=800;this.height=520;
     this.keys=new Set();this.elapsed=0;this.score=0;this.done=false;this.message="";
     this.randomSeed=619;this.reset();
   }
   random(){
     let x=this.randomSeed;x^=x<<13;x^=x>>>17;x^=x<<5;
     this.randomSeed=x>>>0;return this.randomSeed/4294967296;
   }
   reset(){
     this.elapsed=0;this.score=0;this.done=false;this.message="";this.accum=0;
     this.keys.clear();this.randomSeed=619;
     if(this.name==="pong"){
       this.player=250;this.opponent=250;this.ball={x:400,y:260,vx:260,vy:140};
       this.pScore=0;this.oScore=0;
     }else if(this.name==="snake"){
       this.snake=[[9,9],[8,9],[7,9]];this.direction=[1,0];this.nextDir=[1,0];
       this.food=[14,9];this.widthCells=20;this.heightCells=13;
     }else if(this.name==="breakout"){
       this.paddle=400;this.ball={x:400,y:380,vx:180,vy:-260};
       this.bricks=[];
       for(let row=0;row<5;row++)for(let col=0;col<10;col++)
         this.bricks.push({x:38+col*74,y:65+row*34,alive:true,row});
       this.lives=3;
     }else if(this.name==="star-defense"){
       this.ship=400;this.shots=[];this.enemies=[];this.shotCooldown=0;this.enemyClock=0;this.lives=3;
       for(let r=0;r<3;r++)for(let c=0;c<9;c++)
         this.enemies.push({x:125+c*68,y:78+r*52,alive:true});
       this.enemyDirection=1;
     }else {
       this.cells=Array(9).fill("");this.turn="X";this.winner=null;
     }
     return this;
   }
   key(code,down){
     if(typeof code!=="string")return;
     if(down)this.keys.add(code);else this.keys.delete(code);
     if(!down||this.done)return;
     if(this.name==="snake"){
       const dir={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],
         ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]}[code];
       if(dir&&!(dir[0]===-this.direction[0]&&dir[1]===-this.direction[1]))this.nextDir=dir;
     }
   }
   click(x,y){
     if(this.done)return;
     if(this.name==="tic-tac-toe"){
       const col=Math.floor((x-205)/130),row=Math.floor((y-65)/130);
       if(row<0||row>2||col<0||col>2)return;
       const i=row*3+col;
       if(this.cells[i])return;
       this.cells[i]=this.turn;
       const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
       const winner=lines.find(a=>a.every(index=>this.cells[index]===this.turn));
       if(winner){this.winner=this.turn;this.done=true;this.message=this.turn+" wins!";}
       else if(this.cells.every(Boolean)){this.done=true;this.message="Draw!";}
       else this.turn=this.turn==="X"?"O":"X";
     }else if(["pong","breakout","star-defense"].includes(this.name))this.pointerX=clamp(x,30,770);
   }
   tick(dt){
     if(!Number.isFinite(dt)||dt<0||dt>.1)throw new Error("Invalid frame delta");
     if(this.done||this.name==="tic-tac-toe")return;
     this.elapsed+=dt;
     const left=this.keys.has("ArrowLeft")||this.keys.has("KeyA");
     const right=this.keys.has("ArrowRight")||this.keys.has("KeyD");
     const up=this.keys.has("ArrowUp")||this.keys.has("KeyW");
     const down=this.keys.has("ArrowDown")||this.keys.has("KeyS");
     if(this.name==="pong"){
       this.player=clamp(this.player+(down-up)*420*dt,45,475);
       if(this.pointerX!==undefined)this.player=clamp(this.pointerX,45,475);
       this.opponent+=clamp(this.ball.y-this.opponent,-285*dt,285*dt);
       const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
       if(b.y<12||b.y>508){b.y=clamp(b.y,12,508);b.vy*=-1;}
       if(b.x<42&&b.x>23&&Math.abs(b.y-this.player)<65&&b.vx<0){
         b.x=42;b.vx=Math.abs(b.vx)*1.04;b.vy+=(b.y-this.player)*2.2;
       }
       if(b.x>758&&b.x<780&&Math.abs(b.y-this.opponent)<65&&b.vx>0){
         b.x=758;b.vx=-Math.abs(b.vx)*1.04;b.vy+=(b.y-this.opponent)*2.2;
       }
       if(b.x<0||b.x>800){
         if(b.x>800)this.pScore++;else this.oScore++;
         this.score=this.pScore;
         if(this.pScore===7||this.oScore===7){this.done=true;this.message=this.pScore===7?"You win!":"CPU wins!";}
         b.x=400;b.y=260;b.vx=b.x<0?260:(this.pScore>this.oScore?-260:260);b.vy=140;
       }
     }
     if(this.name==="snake"){
       this.accum+=dt;
       if(this.accum>=.125){
         this.accum-=.125;this.direction=this.nextDir;
         const next=[this.snake[0][0]+this.direction[0],this.snake[0][1]+this.direction[1]];
         const eaten=next[0]===this.food[0]&&next[1]===this.food[1];
         const body=eaten?this.snake:this.snake.slice(0,-1);
         if(next[0]<0||next[0]>=20||next[1]<0||next[1]>=13||
            body.some(([x,y])=>x===next[0]&&y===next[1])){
           this.done=true;this.message="Game over · "+this.score+" apples";return;
         }
         this.snake.unshift(next);
         if(eaten){
           this.score++;
           if(this.snake.length>=260){this.done=true;this.message="Perfect board!";return;}
           for(let i=0;i<300;i++){
             const cell=[Math.floor(this.random()*20),Math.floor(this.random()*13)];
             if(!this.snake.some(p=>p[0]===cell[0]&&p[1]===cell[1])){this.food=cell;break;}
           }
         }else this.snake.pop();
       }
     }
     if(this.name==="breakout"){
       this.paddle=clamp(this.paddle+(right-left)*470*dt,62,738);
       if(this.pointerX!==undefined)this.paddle=clamp(this.pointerX,62,738);
       const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
       if(b.x<10||b.x>790){b.x=clamp(b.x,10,790);b.vx*=-1;}
       if(b.y<10){b.y=10;b.vy=Math.abs(b.vy);}
       if(b.y>=460&&b.y<=481&&Math.abs(b.x-this.paddle)<61&&b.vy>0){
         b.y=460;b.vy=-Math.abs(b.vy);b.vx+=(b.x-this.paddle)*2.5;
       }
       for(const brick of this.bricks){
         if(brick.alive&&Math.abs(b.x-(brick.x+31))<41&&Math.abs(b.y-(brick.y+12))<23){
           brick.alive=false;b.vy*=-1;this.score+=10;break;
         }
       }
       if(b.y>530){
         this.lives--;
         if(this.lives<=0){this.done=true;this.message="No lives left";}
         else this.ball={x:this.paddle,y:380,vx:180,vy:-260};
       }
       if(this.bricks.every(b=>!b.alive)){this.done=true;this.message="Brick champion!";}
     }
     if(this.name==="star-defense"){
       this.ship=clamp(this.ship+(right-left)*470*dt,30,770);
       if(this.pointerX!==undefined)this.ship=clamp(this.pointerX,30,770);
       this.shotCooldown=Math.max(0,this.shotCooldown-dt);
       if((this.keys.has("Space")||this.keys.has("Enter"))&&this.shotCooldown===0){
         this.shots.push({x:this.ship,y:443});this.shotCooldown=.22;
       }
       for(const shot of this.shots)shot.y-=490*dt;
       this.shots=this.shots.filter(s=>s.y>-10);
       const active=this.enemies.filter(e=>e.alive);
       if(active.length){
         if(active.some(e=>e.x<30||e.x>770)){this.enemyDirection*=-1;for(const e of active)e.y+=12;}
         for(const e of active)e.x+=this.enemyDirection*(34+(27-active.length)*2.4)*dt;
       }
       for(const shot of this.shots){
         const enemy=active.find(e=>e.alive&&Math.abs(e.x-shot.x)<20&&Math.abs(e.y-shot.y)<22);
         if(enemy){enemy.alive=false;shot.y=-100;this.score+=100;}
       }
       if(active.some(e=>e.alive&&e.y>425)){this.done=true;this.message="Invaders reached Earth";}
       if(this.enemies.every(e=>!e.alive)){this.done=true;this.message="Sector defended!";}
     }
   }
   render(ctx){
     if(!ctx)throw new Error("Canvas context required");
     const W=this.width,H=this.height;
     ctx.fillStyle="#0b1730";ctx.fillRect(0,0,W,H);
     ctx.save();
     const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
     const text=(label,x,y,size=20,color="#e6f7ff")=>{
       ctx.fillStyle=color;ctx.font="700 "+size+"px system-ui";ctx.textAlign="center";ctx.fillText(label,x,y);
     };
     if(this.name==="pong"){
       for(let y=0;y<520;y+=35)rect(398,y,4,20,"#274b73");
       rect(18,this.player-50,15,100,"#85e1ff");
       rect(767,this.opponent-50,15,100,"#c5a3ff");
       ctx.beginPath();ctx.arc(this.ball.x,this.ball.y,11,0,Math.PI*2);
       ctx.fillStyle="#fff3c3";ctx.fill();
       text(this.pScore+"       "+this.oScore,400,50,35);
     }else if(this.name==="snake"){
       for(let y=0;y<13;y++)for(let x=0;x<20;x++)rect(x*35+50,y*35+30,33,33,(x+y)%2?"#102942":"#142f4a");
       rect(this.food[0]*35+54,this.food[1]*35+34,25,25,"#fa7d8f");
       for(let i=this.snake.length-1;i>=0;i--){
         const [x,y]=this.snake[i];rect(x*35+52,y*35+32,29,29,i?"#5eceb0":"#bdfce0");
       }
       text("APPLES "+this.score,400,505,20);
     }else if(this.name==="breakout"){
       const colors=["#f87991","#feb36c","#f4dd80","#80daba","#87b5fd"];
       for(const b of this.bricks)if(b.alive)rect(b.x,b.y,65,26,colors[b.row]);
       rect(this.paddle-60,470,120,14,"#8deaff");
       ctx.beginPath();ctx.arc(this.ball.x,this.ball.y,9,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
       text("SCORE "+this.score+"     LIVES "+this.lives,400,29,19);
     }else if(this.name==="star-defense"){
       for(let i=0;i<80;i++){
         const x=(i*97+19)%800,y=(i*53+71+Math.round(this.elapsed*12))%520;
         rect(x,y,2,2,"#305679");
       }
       for(const e of this.enemies)if(e.alive){
         rect(e.x-15,e.y-12,30,24,"#aa9dff");
         rect(e.x-21,e.y+7,10,9,"#deccff");rect(e.x+11,e.y+7,10,9,"#deccff");
       }
       rect(this.ship-23,460,46,19,"#68deec");rect(this.ship-10,448,20,14,"#99f4ff");
       for(const shot of this.shots)rect(shot.x-3,shot.y,6,14,"#ffe391");
       text("SCORE "+this.score,400,30,20);
     }else{
       text("TWO-PLAYER TIC-TAC-TOE",400,45,22);
       for(let r=0;r<3;r++)for(let c=0;c<3;c++){
         rect(205+c*130,65+r*130,124,124,(r+c)%2?"#263b64":"#1d3257");
         const mark=this.cells[r*3+c];
         if(mark)text(mark,267+c*130,150+r*130,74,mark==="X"?"#7ed9ff":"#ffa5cd");
       }
       text(this.done?this.message:"TURN: "+this.turn,400,497,21);
     }
     if(this.done&&this.name!=="tic-tac-toe"){
       rect(145,193,510,136,"#122747");
       text(this.message,400,251,29,"#f4df9a");text("Select Restart to play again",400,294,16);
     }
     ctx.restore();
   }
 }
 return {ArcadeGame,GAME_IDS};
});