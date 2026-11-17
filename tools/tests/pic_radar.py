# Radar pictures: a close-up, and the fog around your base on the Large map without and with a Radar.
# Usage: python3 tests/pic_radar.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel { display:none !important }")
    print(pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=true;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const put=(t,x,y)=>{ const b=spawn(t,0,x,y); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      put('power', hq.x+120, hq.y-10); put('barracks', hq.x-10, hq.y+130);
      updateFog(); const before = fog[0].vis.reduce((a,v)=>a+v,0);
      window.__radar = put('radar', hq.x+130, hq.y+110); window.__hq = hq;
      return 'fog squares seen without radar: ' + before; })()"""))
    pg.evaluate("(()=>{ __radar.hp=0; game.ents=game.ents.filter(e=>e!==__radar); updateFog(); cam.zoom=0.62; cam.x=__hq.x+330; cam.y=__hq.y-200; game.selected=new Set(); })()")
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_before.png')
    print(pg.evaluate("(()=>{ __radar.hp=__radar.maxHp; game.ents.push(__radar); bldDirty=true; updateFog(); return 'with radar: ' + fog[0].vis.reduce((a,v)=>a+v,0); })()"))
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_after.png')
    pg.evaluate("(()=>{ cam.zoom=3.4; cam.x=__radar.x; cam.y=__radar.y; game.selected=new Set([__radar.id]); })()")
    pg.wait_for_timeout(500); pg.screenshot(path=out + '_close.png', clip={'x': 200, 'y': 80, 'width': 500, 'height': 400})
    print('errors', errs[:3])
    b.close()
srv.shutdown()
