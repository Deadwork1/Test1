# Forest sight: a soldier standing in a forest sees 70% as far as one on open grass. Prints how many fog squares
# each one lights up and saves a picture of both. Usage: python3 tests/pic_forest_sight.py <game folder> <port> <out.png>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel { display:none !important }")
    print(pg.evaluate("""(()=>{ game.paused=true; runAI=()=>{};
      game.ents = game.ents.filter(e=>e.type!=='settler');
      // the big jungle on Large is centred at (1100, 950); put one soldier deep inside it and one out on the grass beside it
      const a = spawn('soldier', 0, 1100, 950), c = spawn('soldier', 0, 1100, 1500);
      const count = s => { const keep = game.ents; game.ents = [s]; updateFog(); const n = fog[0].vis.reduce((x, v) => x + v, 0); game.ents = keep; return n; };
      const inF = count(a), outF = count(c); updateFog();
      cam.zoom = 0.62; cam.x = 1100; cam.y = 1200; draw(); window.draw = () => {};
      return 'in forest: ' + terrainAt(a.x, a.y) + ' sees ' + inF + ' squares; on grass: ' + terrainAt(c.x, c.y) + ' sees ' + outF + ' squares (ratio ' + (inF / outF).toFixed(2) + ', expected about 0.49)'; })()"""))
    pg.screenshot(path=sys.argv[3])
    print('errors', errs[:3])
    b.close()
srv.shutdown()
