# Pictures of each faction's Barracks and War Factory (v5.74): Legion (blue/white) on the left, Ashen (red/black) on the right;
# the War Factories are making something (door rolling up, the Ashen's welding sparks).
# Usage: python3 tests/pic_faction_buildings.py <game folder> <port> <out.png>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2)
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-faction','legion'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      let s=null; for(let k=0;k<8000&&!s;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-60;d<=330&&good;d+=20) for(let e=-90;e<=110&&good;e+=20) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ore.some(o=>Math.hypot(o.x-x-140,o.y-y)<300) && !game.ents.some(o=>isBuilding(o)&&Math.hypot(o.x-x-140,o.y-y)<350)) s={x,y}; }
      const mk=(t,team,dx,dy)=>{ const e=spawn(t,team,s.x+dx,s.y+dy); e.built=true; e.progress=1; e.hp=e.maxHp; return e; };
      mk('barracks',0,0,-40); const f0=mk('factory',0,0,70); mk('barracks',1,180,-40); const f1=mk('factory',1,180,70);
      for(const f of [f0,f1]){ f.queue=1; f.qTypes=['light']; f.trainT=TRAIN_TIME.light*slowOf(f)*0.3; }
      for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=s.x+90; cam.y=s.y+25; setZoom(1.9); clampCam();
      for(let i=0;i<3;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} update(0.05); for(const f of [f0,f1]) f.trainT=TRAIN_TIME.light*slowOf(f)*0.3; }
      game.selected=new Set(); window.HOLD=[f0,f1]; setInterval(()=>{ for(const f of HOLD){ f.queue=1; f.trainT=TRAIN_TIME.light*slowOf(f)*0.3; } }, 30); })()""")
    pg.wait_for_timeout(700); pg.screenshot(path=sys.argv[3])
    b.close()
