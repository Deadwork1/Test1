# Direct fire can't pass through rock. A Sniper behind the rock wall above your base (Huge map) can't hit an enemy on
# the far side, even when a friend over there can see it; a Grenadier can lob over the rock; a Sniper with a clear
# view does hit. Usage: python3 tests/test_rock_fire.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler'); spawn('hq', 0, 300, 2700); spawn('hq', 1, 4500, 300);
      const out = {};
      // the rock wall above your base runs along about y 2240-2300; the enemy stands just north of it at (450, 2190)
      const duel = (type, sx, sy, spotter, fy = 2190) => {
        const s = spawn(type, 0, sx, sy), foe = spawn('soldier', 1, 450, fy); foe.passive = true;
        const spot = spotter ? spawn('engineer', 0, 450, fy - 100) : null;   // a friend on the far side who can see the enemy
        let hits = 0, last = foe.hp;
        for (let i = 0; i < 20 * 15; i++) { update(0.05); s.x = sx; s.y = sy; foe.x = 450; foe.y = fy; foe.cooldown = 99; if (spot) { spot.x = 450; spot.y = fy - 100; spot.hp = spot.maxHp; spot.order = null; }
          if (foe.hp < last) { hits++; last = foe.hp; } if (foe.hp <= 0) break; }
        const res = { rockBetween: terrainAt(sx, (sy + fy) / 2) === T.ROCK, enemyVisible: visibleAt(450, fy, 0), enemyHp: Math.max(0, Math.round(foe.hp)), hits };
        s.hp = 0; foe.hp = 0; if (spot) spot.hp = 0; update(0.05); return res; };
      out.sniperAlone = duel('sniper', 450, 2330, false);
      out.sniperWithSpotter = duel('sniper', 450, 2330, true);
      out.grenadierWithSpotter = duel('grenadier', 450, 2304, true, 2214);   // within its throwing range (95), rock in between
      out.sniperClearView = duel('sniper', 450, 2090, false);
      return JSON.stringify(out); })()"""))
    print(json.dumps(r)); print('errors', errs[:3])
    ok = (r['sniperAlone']['hits'] == 0 and r['sniperWithSpotter']['enemyVisible'] and r['sniperWithSpotter']['hits'] == 0
          and r['grenadierWithSpotter']['enemyHp'] < 60 and r['sniperClearView']['enemyHp'] == 0 and not errs)
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
