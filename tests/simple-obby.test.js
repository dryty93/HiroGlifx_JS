"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {compile,starter,THEMES,SOUNDS}=require("../runtime/simple-obby");
const {CanonicalRuntime}=require("../runtime/canonical-runtime");
const {install:installObby}=require("../runtime/obby-canonical");
const {install:installBlueprints}=require("../runtime/canonical-blueprints");
const example=fs.readFileSync(path.resolve(__dirname,"../examples/simple-obby/soda-splash.scroll"),"utf8");

test("readable directions compile into native HiroGlifx canonical level objects",()=>{
 const result=compile(example);
 assert.equal(result.title,"Soda Splash");
 assert.equal(result.theme,"soda");
 assert.equal(result.speed,7);
 assert.equal(result.jump,10);
 assert.equal(result.sound,"bubbles");
 assert.equal(result.stages.length,3);
 assert.equal(result.tiles.length,12);
 assert.match(result.canonical,/& world = obby_world\(\)/);
 assert.match(result.canonical,/obby_moving\(world/);
 assert.match(result.canonical,/obby_vanish\(world/);
 assert.match(result.canonical,/obby_spinner\(world/);
 assert.match(result.canonical,/obby_tile\(world, "goal"/);
 assert.match(result.canonical,/obby_player\(world, "hero"/);
});
test("Soda Splash source creates a real 3D world using existing canonical game runtime",async()=>{
 const design=compile(example);
 const rt=installObby(new CanonicalRuntime());
 const canonical=installBlueprints(rt,design.canonical);
 await rt.execute(canonical);
 const world=rt.get("world");
 assert(world&&world.kind==="obby-world");
 assert.equal(world.tiles.size,design.tiles.length);
 assert.equal(world.modifiers.size,3);
 assert.equal(world.tiles.get("save1").kind,"checkpoint");
 assert.equal(world.tiles.get("goal").kind,"finish");
 assert.equal(world.player.id,"hero");
 world.moveSpeed=design.speed;world.jumpSpeed=design.jump;
 assert.equal(world.moveSpeed,7);
 const before=world.elapsed;
 for(let i=0;i<40;i++)world.step(.016);
 assert(world.elapsed>before);
 assert.equal(world.player.grounded,true);
 assert.equal(world.currentStage,1);
 rt.dispose();
});
test("course editor starts from usable, single-source readable directions",()=>{
 const design=compile(starter());
 assert.deepEqual(design.tiles.map(t=>t.name),compile(example).tiles.map(t=>t.name));
 assert.deepEqual([...THEMES],["sky","soda","candy","neon","ice"]);
 assert.deepEqual([...SOUNDS],["bubbles","glass","arcade","soft","off"]);
 assert(!starter().includes("function("));
 assert(!starter().includes("BABYLON"));
});
test("all seven simple commands validate object geometry, IDs and semantics",()=>{
 const prefix='game "Test"\ntheme sky\nplayer at 0 2 0\nstage 1 "Start"\nplatform first at 0 0 0 size 4\n';
 const end='\nfinish goal at 22 0 0 size 5\n';
 for(const line of [
  "lava lava1 at 5 0 0 size 4",
  "checkpoint save at 5 0 0 size 4",
  "moving glide at 5 0 0 size 4 axis z range 1 period 3",
  "vanishing flash at 5 0 0 size 4 delay 1.2",
  "spinner hazard at 5 0 0 size 4 range 1 period 3"
 ]){
  const compiled=compile(prefix+line+end);
  assert.equal(compiled.count,3);
 }
});
test("game authoring rejects unsafe code, collisions and invalid course limits",()=>{
 const base='game "Test"\nplayer at 0 2 0\nstage 1 "Start"\nplatform start at 0 0 0 size 5\n';
 const end='finish goal at 10 0 0 size 5\n';
 const bad=[
  "javascript alert(1)",
  "platform bad-name at 5 0 0 size 4",
  "platform start at 5 0 0 size 4",
  "platform platform2 at 5 0 0 size 2000",
  "moving glide at 5 0 0 size 4 axis y range 1 period 3",
  "vanishing gone at 5 0 0 size 4 delay 90",
  "spinner hazard at 5 0 0 size 3 range Infinity period 3",
  "theme script",
  "sound exploit",
  'stage 3 "Skipped"'
 ];
 for(const line of bad)assert.throws(()=>compile(base+line+"\n"+end),/Line \d+:/,line);
 assert.throws(()=>compile(base),/finish platform/);
 assert.throws(()=>compile(base+end+"\n"+end),/Duplicate object/);
 assert.throws(()=>compile("game \"Missing\"\nstage 1 \"Start\"\nplatform a at 0 0 0 size 5\n"+end),/player/);
 assert.throws(()=>compile(base+Array.from({length:101},(_,i)=>"platform b"+i+" at 5 0 0 size 4").join("\n")+"\n"+end),/Maximum 100/);
 assert.throws(()=>compile("x".repeat(24001)),/oversized/);
});
test("HTML workshop loads native compiler, editor and original game renderer",()=>{
 const html=fs.readFileSync(path.resolve(__dirname,"../simple-obby.html"),"utf8");
 for(const match of ["runtime/simple-obby.js","runtime/obby-babylon.js","runtime/obby-canonical.js","courseEditor","playDirections","compileStatus","HiroSimpleObby.compile"])assert(html.includes(match),match);
 assert(html.includes("examples/simple-obby/soda-splash.scroll"));
 const start=html.lastIndexOf("<script>"),end=html.lastIndexOf("</script>");
 assert(start>=0&&end>start);
 const {Script}=require("node:vm");
 assert.doesNotThrow(()=>new Script(html.slice(start+8,end)));
});
