# The Headquarters (140 across) fits where each side's Settler starts, on every map, and the deployed HQ is drawn without errors.
# Usage: python3 tests/test_hq_fits.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in ('classic', 'large', 'huge'):
        pg = b.new_page(viewport={'width': 500, 'height': 400}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
        r = pg.evaluate("""(()=>{ const out = { size: STATS.hq.size };
          for (const s of game.ents.filter(e => e.type === 'settler' && e.hp > 0)) deploy(s);   // the computer may already have deployed its own
          for (let i = 0; i < 40; i++) update(0.05);
          for (const t of [0, 1]) { const h = hqOf(t); out['team' + t] = !!h && Math.hypot(h.x - START[t].x, h.y - START[t].y) < 5; } draw(); return out; })()""")
        print(m, json.dumps(r), errs[:2]); ok = ok and r['size'] == 140 and r['team0'] and r['team1'] and not errs; pg.close()
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
