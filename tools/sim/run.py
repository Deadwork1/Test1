import sys, http.server, threading, functools, json, time, random
from playwright.sync_api import sync_playwright
root, port, out, plan = sys.argv[1], int(sys.argv[2]), sys.argv[3], json.loads(sys.argv[4])
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
bot = open('sim/bot.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for g in plan:
      for attempt in range(3):
       try:
        pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{g['map']}'); localStorage.setItem('mini-rts-difficulty','{g['diff']}')")
        pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
        pg.evaluate(bot)
        t0 = time.time()
        r = pg.evaluate(f"runSim('{g['strat']}', {g.get('mins',25)})")
        r['pageErrors'] = errs[:3]; r['realSecs'] = round(time.time() - t0, 1); r['id'] = g['id']
        with open(out, 'a') as f: f.write(json.dumps(r) + '\n')
        pg.close(); break
       except Exception as ex:
        try: pg.close()
        except Exception: pass
    b.close()
srv.shutdown()
