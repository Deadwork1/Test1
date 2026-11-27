# Pictures for the factions (v5.74): the start screen's faction picker, and each faction's own units side by side
# (you as The Legion, top row blue/white; the computer as The Ashen, bottom row red/black).
# Usage: python3 tests/pic_factions.py <game folder> <port> <out folder>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 900}, device_scale_factor=2)
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-faction','legion'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/factions_menu.png')
    pg.set_viewport_size({'width': 900, 'height': 560})
    pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      let s=null; for(let k=0;k<6000&&!s;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-30;d<=400&&good;d+=25) for(let e=-90;e<=90&&good;e+=30) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ore.some(o=>Math.hypot(o.x-x-180,o.y-y)<260)) s={x,y}; }
      const row=(team,types,dy)=>types.forEach((t,i)=>{ const e=spawn(t,team,s.x+i*62,s.y+dy); e.passive=true; e.facing=0; e.order=null; if(STATS[t].size){ e.built=true; e.progress=1; e.hp=e.maxHp; } });
      row(0,['heavy','heli','grenadier','mrl','mg','missile'],-70);
      row(1,['flamer','flametank','sniper','rocket','cannon','laser'],70);
      for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=s.x+155; cam.y=s.y; setZoom(1.5); clampCam(); for(let i=0;i<2;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} for(const e of game.ents) if(e.passive){ e.order=null; } update(0.05); } game.paused=true; game.selected=new Set(); })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=f'{out}/factions_units.png')
    b.close()
