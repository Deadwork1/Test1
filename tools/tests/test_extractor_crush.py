# Extractors run over enemy infantry they drive into (like tanks); they don't hurt vehicles or their own side.
# Usage: python3 tests/test_extractor_crush.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler');
      spawn('hq', 0, 80, H - 80); spawn('hq', 1, W - 80, 80);
      const out = {};
      const run = (victimType, team) => {
        const ex = spawn('extractor', 0, 1600, 1300), v = spawn(victimType, team, 1700, 1300);
        v.passive = true; v.cooldown = 99;
        for (let i = 0; i < 80; i++) { ex.order = { type: 'move', x: 1800, y: 1300 }; navigate(ex, 1800, 1300, 0.05); crush(ex); v.x = 1700; v.y = 1300; v.cooldown = 99; if (v.hp <= 0) break; }
        const res = { victimHp: Math.round(v.hp) }; ex.hp = 0; v.hp = 0; update(0.05); return res;
      };
      out.enemySoldier = run('soldier', 1); out.enemyEngineer = run('engineer', 1); out.enemyBuggy = run('buggy', 1); out.ownSoldier = run('soldier', 0);
      return out; })()""")
    print(json.dumps(r)); print('errors', errs[:3])
    ok = r['enemySoldier']['victimHp'] <= 0 and r['enemyEngineer']['victimHp'] <= 0 and r['enemyBuggy']['victimHp'] > 0 and r['ownSoldier']['victimHp'] > 0 and not errs
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
