# Close-up pictures of a neutral village on the Huge map, neutral and after you capture its Oil Derrick.
# Usage: python3 tests/pic_village.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    setup = """(owned)=>{ game.paused=true; window.drawMinimap=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1);
      fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
      const d=game.ents.filter(e=>e.type==='derrick').sort((a,b)=>a.x-b.x)[0];
      if (owned) { d.team=0; } cam.zoom=1.9; cam.x=d.x; cam.y=d.y+10; window.updateFog=()=>{}; draw(); return d.x+','+d.y; }"""
    print('village at', pg.evaluate(setup, False))
    pg.locator('#c').screenshot(path=out + '_neutral.png')
    pg.evaluate(setup, True); pg.wait_for_timeout(500); pg.evaluate("draw()")
    pg.locator('#c').screenshot(path=out + '_owned.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
