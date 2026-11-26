# v5.70 picture: a Barracks going up, the HQ selected, its build buttons greyed out with "wait NN%".
# Usage: python3 tests/pic_one_build.py <game folder> <port> <out.png>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 860}, device_scale_factor=2, has_touch=True)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      const hq=hqOf(0); game.credits[0]=1500;
      for(let k=0;k<4000;k++){ const a=Math.random()*6.3, d=hq.size/2+70+Math.random()*80, x=hq.x+Math.cos(a)*d, y=hq.y+Math.sin(a)*d; if(Math.abs(y-hq.y)<60 && canPlace(0,'barracks',x,y)){ placeBuilding(0,'barracks',x,y); break; } }
      for(let i=0;i<20*4.5;i++) update(0.05);
      game.selected=new Set([hq.id]); cam.x=hq.x; cam.y=hq.y; clampCam(); })()""")
    pg.wait_for_timeout(800)
    pg.screenshot(path=sys.argv[3])
    b.close()
