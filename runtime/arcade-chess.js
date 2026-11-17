/* Browser chess rules for HiroGlifx Arcade.
 * Legal moves: checks, castling, en passant, promotion, mate, stalemate and draws.
 * Local two-player play; no computer opponent.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroChess=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const FEN="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
 const glyph={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};
 const offsets={n:[-33,-31,-18,-14,14,18,31,33],b:[-17,-15,15,17],r:[-16,-1,1,16],k:[-17,-16,-15,-1,1,15,16,17]};
 const on=i=>i>=0&&i<128&&!(i&0x88);
 const side=p=>!p||p==="."?0:p===p.toUpperCase()?1:-1;
 const square=i=>"abcdefgh"[i&7]+(8-(i>>4));
 const index=s=>(8-Number(s[1]))*16+"abcdefgh".indexOf(s[0]);
 const coord=m=>square(m[0])+square(m[1])+(m[2]||"");
 function fenParse(fen){
   const p=fen.trim().split(/\s+/),b=Array(128).fill(".");
   const rows=p[0].split("/");
   if(rows.length!==8||!["w","b"].includes(p[1])||!/^(?:-|K?Q?k?q?)$/.test(p[2])||
     !/^(?:-|[a-h][36])$/.test(p[3]))throw new Error("Invalid chess FEN");
   rows.forEach((row,r)=>{
     let col=0;for(const char of row){
       if(/[1-8]/.test(char))col+=Number(char);
       else {if(!/[prnbqkPRNBQK]/.test(char)||col>7)throw new Error("Invalid FEN piece");b[r*16+col++]=char;}
     }
     if(col!==8)throw new Error("Invalid FEN rank");
   });
   if(b.filter(x=>x==="K").length!==1||b.filter(x=>x==="k").length!==1)
     throw new Error("FEN requires exactly one king per color");
   return {b,t:p[1]==="w"?1:-1,c:(p[2].includes("K")?1:0)|(p[2].includes("Q")?2:0)|
     (p[2].includes("k")?4:0)|(p[2].includes("q")?8:0),ep:p[3]==="-"?-1:index(p[3]),
     half:Number(p[4]||0),full:Number(p[5]||1)};
 }
 function attacked(s,target,by){
   for(let f=0;f<128;f++){
     if(!on(f)||side(s.b[f])!==by)continue;
     const p=s.b[f].toLowerCase();
     if(p==="p"){if(target===f-16*by-1||target===f-16*by+1)return true;continue;}
     for(const d of offsets[p]||offsets.k){
       for(let t=f+d;on(t);t+=d){
         if(t===target)return true;
         if(s.b[t]!=="."||p==="n"||p==="k")break;
       }
     }
   }
   return false;
 }
 const check=(s,color=s.t)=>attacked(s,s.b.indexOf(color===1?"K":"k"),-color);
 function apply(s,m){
   const [f,t,promo,flag]=m,b=s.b.slice(),piece=b[f],captured=b[t];let c=s.c;
   b[f]=".";b[t]=promo?(s.t===1?promo.toUpperCase():promo):piece;
   if(flag==="ep")b[t+16*s.t]=".";
   if(flag==="castle"){
     const rf=t>f?f+3:f-4,rt=t>f?f+1:f-1;b[rt]=b[rf];b[rf]=".";
   }
   if(piece==="K")c&=~3;if(piece==="k")c&=~12;
   const rookBits={119:1,112:2,7:4,0:8};
   if(piece.toLowerCase()==="r")c&=~(rookBits[f]||0);
   if(captured.toLowerCase()==="r")c&=~(rookBits[t]||0);
   return {b,t:-s.t,c,ep:piece.toLowerCase()==="p"&&Math.abs(t-f)===32?(t+f)/2:-1,
     half:piece.toLowerCase()==="p"||captured!=="."||flag==="ep"?0:s.half+1,
     full:s.full+(s.t===-1?1:0)};
 }
 function pseudo(s){
   const moves=[];
   for(let f=0;f<128;f++){
     if(!on(f)||side(s.b[f])!==s.t)continue;
     const piece=s.b[f].toLowerCase();
     const add=(t,flag="")=>{
       if(s.b[t].toLowerCase()==="k")return;
       if(piece==="p"&&(t>>4===0||t>>4===7))
         for(const promo of ["q","r","b","n"])moves.push([f,t,promo,flag]);
       else moves.push([f,t,"",flag]);
     };
     if(piece==="p"){
       const t=f-16*s.t;
       if(on(t)&&s.b[t]==="."){
         add(t);const two=t-16*s.t;
         if((f>>4)===(s.t===1?6:1)&&s.b[two]===".")add(two);
       }
       for(const d of [-1,1]){
         const to=t+d;if(!on(to))continue;
         if(side(s.b[to])===-s.t)add(to);
         else if(to===s.ep&&s.b[to]==="."&&s.b[to+16*s.t]===(s.t===1?"p":"P"))add(to,"ep");
       }
     }else{
       for(const d of offsets[piece]||offsets.k){
         for(let t=f+d;on(t);t+=d){
           if(side(s.b[t])===s.t)break;
           add(t);if(s.b[t]!=="."||piece==="n"||piece==="k")break;
         }
       }
       const home=s.t===1?116:4,rook=s.t===1?"R":"r",bits=s.t===1?[1,2]:[4,8];
       if(piece==="k"&&f===home&&!check(s)){
         if((s.c&bits[0])&&s.b[f+3]===rook&&s.b[f+1]==="."&&s.b[f+2]==="."&&
           !attacked(s,f+1,-s.t)&&!attacked(s,f+2,-s.t))add(f+2,"castle");
         if((s.c&bits[1])&&s.b[f-4]===rook&&s.b[f-1]==="."&&s.b[f-2]==="."&&s.b[f-3]==="."&&
           !attacked(s,f-1,-s.t)&&!attacked(s,f-2,-s.t))add(f-2,"castle");
       }
     }
   }
   return moves;
 }
 const legal=s=>pseudo(s).filter(m=>!check(apply(s,m),s.t));
 const stateKey=s=>s.b.join("")+":"+s.t+":"+s.c+":"+s.ep;
 function insufficient(s){
   const pieces=[];
   for(let i=0;i<128;i++)if(on(i)&&s.b[i]!=="."&&!/[kK]/.test(s.b[i]))
     pieces.push([s.b[i].toLowerCase(),((i>>4)+(i&7))%2]);
   return !pieces.length||(pieces.length===1&&["b","n"].includes(pieces[0][0]))||
     (pieces.every(p=>p[0]==="b")&&new Set(pieces.map(p=>p[1])).size===1);
 }
 class ChessGame{
   constructor(startFen=FEN){
     this.kind="arcade-game";this.name="chess";this.width=800;this.height=520;
     this.startFen=startFen;this.history=[];this.moves=[];this.selected=-1;this.promotion="q";
     this.reset();
   }
   reset(){this.history=[fenParse(this.startFen)];this.moves=[];this.selected=-1;this.done=false;this.score=0;this.message="White to move";return this;}
   get s(){return this.history[this.history.length-1];}
   get choices(){return legal(this.s);}
   status(){
     const s=this.s,options=this.choices;
     if(!options.length)return {done:true,message:check(s)?(s.t===1?"Black":"White")+" wins by checkmate":"Draw by stalemate"};
     if(insufficient(s))return {done:true,message:"Draw · insufficient material"};
     if(s.half>=150)return {done:true,message:"Draw · 75-move rule"};
     const repeats=this.history.filter(item=>stateKey(item)===stateKey(s)).length;
     if(repeats>=5)return {done:true,message:"Draw · fivefold repetition"};
     return {done:false,message:(s.t===1?"White":"Black")+" to move"+(check(s)?" · Check":"")};
   }
   move(from,to,promotion="q"){
     if(this.status().done)return false;
     const f=typeof from==="number"?from:index(from),t=typeof to==="number"?to:index(to);
     const move=this.choices.find(m=>m[0]===f&&m[1]===t&&m[2]===(m[2]?promotion:""));
     if(!move)return false;
     this.history.push(apply(this.s,move));this.moves.push(coord(move));this.selected=-1;
     const status=this.status();this.done=status.done;this.message=status.message;
     return true;
   }
   undo(){
     if(this.history.length===1)return false;
     this.history.pop();this.moves.pop();this.selected=-1;this.done=false;
     this.message=this.status().message;return true;
   }
   click(x,y){
     const file=Math.floor((x-192)/52),rank=Math.floor((y-52)/52);
     if(file<0||file>7||rank<0||rank>7||this.status().done)return false;
     const to=rank*16+file;
     if(this.selected>=0&&this.move(this.selected,to,this.promotion))return true;
     this.selected=side(this.s.b[to])===this.s.t?to:-1;return false;
   }
   key(code,down){if(down&&["KeyQ","KeyR","KeyB","KeyN"].includes(code))this.promotion=code[3].toLowerCase();}
   tick(){}
   render(ctx){
     ctx.fillStyle="#0b1730";ctx.fillRect(0,0,800,520);
     const options=this.choices.filter(m=>m[0]===this.selected);
     for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++){
       const i=rank*16+file,x=192+file*52,y=52+rank*52;
       ctx.fillStyle=(rank+file)%2?"#b58863":"#f0d9b5";ctx.fillRect(x,y,52,52);
       if(i===this.selected){ctx.fillStyle="#facc1570";ctx.fillRect(x,y,52,52);}
       if(options.some(m=>m[1]===i)){ctx.fillStyle="#267644aa";ctx.beginPath();ctx.arc(x+26,y+26,9,0,Math.PI*2);ctx.fill();}
       const p=this.s.b[i];
       if(p!=="."){
         ctx.font="43px Georgia,serif";ctx.textAlign="center";ctx.textBaseline="middle";
         ctx.lineWidth=2;ctx.strokeStyle=side(p)===1?"#262323":"#f3dfc7";
         ctx.fillStyle=side(p)===1?"#fff8e5":"#202128";
         ctx.strokeText(glyph[p],x+26,y+27);ctx.fillText(glyph[p],x+26,y+27);
       }
     }
     ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.font="bold 19px system-ui";
     ctx.fillStyle="#d6eaff";ctx.fillText(this.message,400,32);
     ctx.font="14px system-ui";ctx.fillStyle="#a1bcd6";
     ctx.fillText("Local 2-player chess · click a piece then destination · Q/R/B/N sets promotion",400,497);
   }
 }
 return {ChessGame,fenParse,legal,apply,check,FEN};
});