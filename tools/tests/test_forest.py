import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8773), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8773/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{
      runAI=()=>{}; const r={};
      // forest at (430,620): put an enemy soldier inside, our soldier 300 away
      const foe=spawn('soldier',1,430,620), me=spawn('soldier',0,430,950);
      for(let i=0;i<5;i++) update(0.05);
      r.terrainFoe=terrainAt(foe.x,foe.y); r.hiddenFar=hiddenFrom(foe,0);
      me.order={type:'move',x:430,y:700};
      for(let i=0;i<20*12 && Math.hypot(me.x-foe.x,me.y-foe.y)>85;i++) update(0.05);
      r.hiddenClose=hiddenFrom(foe,0); r.dist=Math.round(Math.hypot(me.x-foe.x,me.y-foe.y));
      foe.hp=0; me.hp=0; update(0.05);
      // extractor drives to island (needs bridge), soldier crosses river
      const ex=spawn('extractor',0,START[0].x+60,START[0].y-60);
      const node=game.ore.reduce((a,o)=>Math.hypot(o.x-W/2,o.y-H/2)<Math.hypot(a.x-W/2,a.y-H/2)?o:a);
      ex.order={type:'move',x:node.x,y:node.y+20};
      let t=0; while(ex.order && t<20*200){update(0.05);t++;}
      r.extractorReachedIsland=Math.round(Math.hypot(ex.x-W/2,ex.y-H/2))<ISLAND.r-30; r.extractorSecs=Math.round(t/20);
      r.vehicleNeverInForestOrWater=true;
      // extractor path check across a forest: vehicles not allowed in forest
      const p=findPath(380,750,430,480,true); r.vehiclePathAvoidsForest = p && p.every((q,i)=>true);
      return r;})()""")), errs); b.close()
srv.shutdown()
