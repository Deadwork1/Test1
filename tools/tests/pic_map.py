# Whole-map overview picture with fog lifted.
# Usage: python3 tests/pic_map.py <game folder> <port> <map> <out.jpg> [width height]
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m, out = sys.argv[3], sys.argv[4]
vw, vh = (int(sys.argv[5]), int(sys.argv[6])) if len(sys.argv) > 6 else (1600, 1000)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': vw, 'height': vh}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    print(m, pg.evaluate("""(()=>{ game.paused=true; for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s);
      window.drawMinimap=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
      const HH=(typeof HT!=='undefined'?HT:H), fitS=Math.min(scr.w/W, scr.h/HH); cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=HH/2; draw(); window.draw=()=>{};
      return W+'x'+H+' ore '+game.ore.length; })()"""), errs[:3])
    pg.locator('#c').screenshot(path=out, type='jpeg', quality=88); pg.close()
    b.close()
srv.shutdown()
