/* Arcade catalog adapter for the canonical HiroGlifx expression runtime. */
(function(root,factory){
 const arcade=typeof module==="object"&&module.exports?require("./arcade-games"):root.HiroArcade;
 const chess=typeof module==="object"&&module.exports?require("./arcade-chess"):root.HiroChess;
 const api=factory(arcade,chess);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.HiroArcadeCanonical=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(arcade,chess){
 "use strict";
 const games=[...arcade.GAME_IDS,"chess"];
 function install(runtime){
   runtime.register("arcade_game",({args})=>{
     if(args.length!==1||!games.includes(args[0]))throw new Error("arcade_game requires a known game name");
     return args[0]==="chess"?new chess.ChessGame():new arcade.ArcadeGame(args[0]);
   });
   runtime.registerMethod("arcade-game","reset",({target,args})=>{
     if(args.length)throw new Error("reset() takes no parameters");return target.reset();
   });
   runtime.registerMethod("arcade-game","move",({target,args})=>{
     if(target.name!=="chess"||args.length<2||args.length>3)throw new Error("move(from,to[,promotion]) is for chess");
     return target.move(...args);
   });
   runtime.registerMethod("arcade-game","step",({target,args})=>{
     if(args.length!==1)throw new Error("step(seconds) requires one argument");
     return target.tick(args[0]);
   });
   return runtime;
 }
 return {install,games};
});