# Every plateau on every map is an advantage point: a Rocket Soldier on the cliff edge and a Soldier on the low ground
# just below (both held in place). The one up top should see the one below, not be seen, and win without a scratch.
# Usage: python3 tests/test_highground_all.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    allok = True
    for m in ['classic', 'large', 'huge']:
        pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
        r = pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler');
          spawn('hq', 0, 60, H - 60); spawn('hq', 1, W - 60, 60);
          const plats = []; for (const pl of MAP.plateaus) { plats.push(pl); const [x, y] = [W - pl.x, H - pl.y]; plats.push({ ...pl, x, y, ramps: pl.ramps.map(a => a + Math.PI) }); }
          const out = [];
          for (const pl of plats) {
            // pick a spot on the cliff edge facing the low ground (away from the river/island and away from ramps), and a low spot 90 out
            let best = null;
            for (let k = 0; k < 72 && !best; k++) {
              const a = k * Math.PI / 36;
              if (pl.ramps.some(ra => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) < 0.7)) continue;
              let top = null;
              for (let d = 0; d < 400; d += 4) { const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d;
                if (elevAt(x, y) && terrainAt(x, y) === T.GRASS) top = { x, y }; else if (top && terrainAt(x, y) !== T.CLIFF) break; }
              if (!top) continue;
              let low = null;
              for (let d = 10; d < 200; d += 4) { const x = top.x + Math.cos(a) * d, y = top.y + Math.sin(a) * d;
                if (!elevAt(x, y) && terrainAt(x, y) === T.GRASS) { low = { x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 30 }; break; }
                if (terrainAt(x, y) === T.WATER) break; }
              if (low && !elevAt(low.x, low.y) && terrainAt(low.x, low.y) === T.GRASS && Math.hypot(low.x - top.x, low.y - top.y) < 110) best = { top, low };
            }
            if (!best) { out.push({ at: [pl.x, pl.y], skipped: true }); continue; }
            const me = spawn('rocket', 0, best.top.x, best.top.y), foe = spawn('soldier', 1, best.low.x, best.low.y);
            const pin = () => { me.x = best.top.x; me.y = best.top.y; foe.x = best.low.x; foe.y = best.low.y; for (const u of [me, foe]) if (u.order && u.order.type !== 'attack') u.order = null; };
            for (let i = 0; i < 20; i++) { update(0.05); pin(); }
            const seen = visibleAt(me.x, me.y, 1), sees = visibleAt(foe.x, foe.y, 0);
            for (let i = 0; i < 400 && foe.hp > 0 && me.hp > 0; i++) { update(0.05); pin(); }
            out.push({ at: [Math.round(pl.x), Math.round(pl.y)], gap: Math.round(Math.hypot(best.low.x - best.top.x, best.low.y - best.top.y)), upTopSees: sees, seenFromBelow: seen, upTopHp: Math.round(me.hp), belowHp: Math.max(0, Math.round(foe.hp)) });
            me.hp = 0; foe.hp = 0; update(0.05);
          }
          return out; })()""")
        for x in r:
            ok = x.get('skipped') or (x['upTopSees'] and not x['seenFromBelow'] and x['upTopHp'] == 55 and x['belowHp'] == 0)
            allok = allok and ok and not errs
            print(m, json.dumps(x), 'ok' if ok else 'PROBLEM')
        pg.close()
    print('PASS' if allok else 'FAIL')
    b.close()
srv.shutdown()
