# Pictures of the faction crests (v5.74): the start screen's faction buttons, both sides' HQs with their crests and banners,
# and the results screen.
# Usage: python3 tests/pic_crests.py <game folder> <port> <out folder>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 900}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-faction','legion'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.locator('#factionRow').screenshot(path=f'{out}/crest_buttons.png')
    pg.set_viewport_size({'width': 900, 'height': 520}); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      const h0=hqOf(0), h1=hqOf(1);
      // put a copy of each HQ (and a Barracks with its banner) side by side somewhere open, just for the picture
      let s=null; for(let k=0;k<8000&&!s;k++){ const x=500+Math.random()*(W-1000), y=500+Math.random()*(H-1000); let good=true; for(let d=-120;d<=420&&good;d+=25) for(let e=-110;e<=110&&good;e+=25) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ore.some(o=>Math.hypot(o.x-x-150,o.y-y)<330)) s={x,y}; }
      const mk=(t,team,dx,dy)=>{ const e=spawn(t,team,s.x+dx,s.y+dy); e.built=true; e.progress=1; e.hp=e.maxHp; return e; };
      mk('hq',0,0,0); mk('hq',1,300,0);
      for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=s.x+150; cam.y=s.y; setZoom(1.25); clampCam(); for(let i=0;i<2;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} update(0.05); } game.paused=true; game.selected=new Set(); })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=f'{out}/crest_hqs.png')
    pg.set_viewport_size({'width': 430, 'height': 900})
    pg.evaluate("(()=>{ game.paused=false; endGame(true); })()")
    pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}/crest_results.png')
    print('errors', errs)
    b.close()
