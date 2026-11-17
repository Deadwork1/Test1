import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8783), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8783/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(1500)
    pg.evaluate("deploy(game.ents.find(e=>e.team===0&&e.type==='settler'))")
    pg.tap('#btnPause'); pg.wait_for_timeout(200)
    t1=pg.evaluate('game.time'); pg.wait_for_timeout(500); t2=pg.evaluate('game.time')
    pg.tap('#pmRestart'); pg.wait_for_timeout(150); pg.screenshot(path='out/pause.png')
    label=pg.inner_text('#pmRestart')
    pg.tap('#pmRestart'); pg.wait_for_timeout(300)
    print('frozen while paused:', t1==t2, '| confirm label:', label, '| after restart: HQ?', pg.evaluate("!!hqOf(0)"), 'settler?', pg.evaluate("game.ents.some(e=>e.team===0&&e.type==='settler')"), 'running:', not pg.evaluate('game.paused'), 'menu hidden:', pg.evaluate("getComputedStyle(pauseMenu).display")=='none')
    pg.tap('#btnPause'); pg.tap('#pmResume'); pg.wait_for_timeout(100)
    print('resume works:', not pg.evaluate('game.paused'), errs); b.close()
srv.shutdown()
