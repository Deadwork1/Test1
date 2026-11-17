import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8774), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8774/index.html'); pg.wait_for_timeout(400)
    pg.screenshot(path='out/n0.png')
    pg.tap('#ovNotes'); pg.wait_for_timeout(200); pg.screenshot(path='out/n1.png')
    sh = pg.evaluate("[document.getElementById('notesBody').scrollHeight, document.getElementById('notesBody').clientHeight]")
    pg.tap('#notesClose'); pg.wait_for_timeout(100)
    pg.tap('#ovBtn'); pg.wait_for_timeout(200)
    print('scroll/visible heights', sh, 'game running:', not pg.evaluate('game.paused'), errs)
    b.close()
srv.shutdown()
