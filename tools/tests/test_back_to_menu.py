# Pause menu: Exit Game takes two taps, returns to the start screen with a fresh game, and Start plays again.
# Usage: python3 tests/test_back_to_menu.py <game folder> <port> [picture.png]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 820}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    pg.evaluate("for (let i = 0; i < 400; i++) update(0.05)")   # 20 seconds of play
    t0 = pg.evaluate("game.time")
    pg.click('#btnPause'); pg.wait_for_timeout(200)
    pg.click('#pmMenu'); pg.wait_for_timeout(200)
    armed = pg.evaluate("[document.getElementById('pmMenu').textContent, document.getElementById('overlay').style.display, game.time]")
    if len(sys.argv) > 3: pg.screenshot(path=sys.argv[3])
    pg.click('#pmMenu'); pg.wait_for_timeout(300)
    back = pg.evaluate("[document.getElementById('overlay').style.display, document.getElementById('pauseMenu').style.display, document.getElementById('ovTitle').textContent, document.getElementById('ovBtn').textContent, game.time, game.paused, game.ents.filter(e=>e.type==='settler').length]")
    pg.click('#ovBtn'); pg.wait_for_timeout(500)
    again = pg.evaluate("[document.getElementById('overlay').style.display, game.paused, game.time > 0]")
    r = {'timeBefore': t0, 'afterOneTap': armed, 'afterTwoTaps': back, 'afterStart': again}
    print(json.dumps(r)); print('errors', errs[:3])
    ok = (t0 > 19 and armed[1] == 'none' and armed[2] - t0 < 1 and back[0] == 'flex' and back[1] == 'none' and back[2] == 'Mini RTS'
          and back[3] == 'Start' and back[4] == 0 and back[5] and back[6] == 2 and again == ['none', False, True] and not errs)
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
