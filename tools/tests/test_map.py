import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8835), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8835/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(200)
    pg.screenshot(path='out/map_on.png')
    pg.tap('#btnMap'); pg.wait_for_timeout(200); pg.screenshot(path='out/map_off.png')
    hidden = pg.evaluate('MM.hidden'); cam0 = pg.evaluate('[cam.x,cam.y]')
    pg.touchscreen.tap(780, 120); pg.wait_for_timeout(100)   # where the minimap used to be: should NOT jump the camera now
    cam1 = pg.evaluate('[cam.x,cam.y]')
    pg.reload(); pg.wait_for_timeout(300)
    print('hidden after tap:', hidden, '| tap in old minimap spot moved camera:', cam0 != cam1, '| remembered after reload:', pg.evaluate('MM.hidden'), errs)
    b.close()
srv.shutdown()
