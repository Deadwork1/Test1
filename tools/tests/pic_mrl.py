# Pictures of the Rocket Launcher (v5.69): a close-up, and one mid-salvo at a group of enemy soldiers.
# Usage: python3 tests/pic_mrl.py <game folder> <port> <out folder>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}, device_scale_factor=2)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      for(const t of [0,1]){ fog[t].exp.fill(1); fog[t].vis.fill(1); }
      let s=null; for(let k=0;k<5000&&!s;k++){ const x=300+Math.random()*(W-600), y=300+Math.random()*(H-600); let good=true; for(let d=-60;d<=360&&good;d+=15) for(let e=-80;e<=80&&good;e+=20) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ore.some(o=>o.amount>0&&Math.hypot(o.x-x-150,o.y-y)<260) && [0,1].every(t=>Math.hypot(hqOf(t).x-x,hqOf(t).y-y)>1100)) s={x,y}; }
      window.S=s; const m=spawn('mrl',0,s.x,s.y); m.hp=m.maxHp=1e9; m.angle=0; if('turret' in m) m.turret=0; window.M=m; const sp=spawn('soldier',0,s.x+200,s.y+70); sp.hp=sp.maxHp=1e9; for(let i=0;i<10;i++) update(0.05);
      game.selected=new Set(); cam.x=s.x; cam.y=s.y; setZoom(2.2); clampCam(); game.paused=true; })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=f'{out}/mrl_close.png')
    pg.evaluate("""(()=>{ game.paused=false; const s=S, grp=[]; for(let i=0;i<8;i++){ const g=spawn('soldier',1,s.x+260+(i%4)*16,s.y-12+Math.floor(i/4)*24); g.passive=true; g.hp=g.maxHp=1e9; grp.push(g); }
      M.order={type:'attack',target:grp[0].id};
      for(let k=0;k<400;k++){ for(const g of grp) g.order=null; for(const t of [0,1]) fog[t].vis.fill(1); update(0.05); if(game.grenades.some(q=>q.srcType==='mrl')) break; }
      window.GRP=grp; cam.x=s.x+150; cam.y=s.y; setZoom(1.5); clampCam(); game.paused=true; })()""")
    for i, steps in enumerate([6, 10, 12]):
        pg.evaluate("n=>{ game.paused=false; for(let k=0;k<n;k++){ for(const g of GRP) g.order=null; update(0.05); } game.paused=true; }", steps)
        pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/mrl_salvo{i+1}.png')
    b.close()
