# Pictures of each faction's Light Tank and Buggy (v5.74): Legion (blue/white) on the left, Ashen (red/black) on the right.
# Usage: python3 tests/pic_faction_vehicles.py <game folder> <port> <out.png>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 520}, device_scale_factor=2)
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-faction','legion'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      let s=null; for(let k=0;k<8000&&!s;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-40;d<=260&&good;d+=20) for(let e=-80;e<=80&&good;e+=20) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ore.some(o=>Math.hypot(o.x-x-110,o.y-y)<240) && !game.ents.some(o=>isBuilding(o)&&Math.hypot(o.x-x-110,o.y-y)<300)) s={x,y}; }
      const put=(t,team,dx,dy,face)=>{ const e=spawn(t,team,s.x+dx,s.y+dy); e.facing=face; e.turret=face; e.passive=true; e.order=null; return e; };
      put('light',0,0,-40,0.3); put('buggy',0,0,40,0.3); const lf=put('light',0,60,-40,0.3);
      put('light',1,200,-40,Math.PI-0.3); put('buggy',1,200,40,Math.PI-0.3); const af=put('light',1,140,-40,Math.PI-0.3);
      for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=s.x+100; cam.y=s.y; setZoom(2.4); clampCam();
      for(let i=0;i<2;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} for(const e of game.ents) if(e.passive) e.order=null; update(0.05); }
      lf.cooldown=STATS.light.cooldown-0.05; af.cooldown=STATS.light.cooldown-0.05; game.paused=true; game.selected=new Set(); })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=sys.argv[3])
    b.close()
