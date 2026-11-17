# Finds units walking into buildings: plays a simulated game and logs every unit whose centre ends up inside a
# building's footprint (docking extractors and units in their own gate are fine). Prints the first few cases.
# Usage: python3 tests/dbg_inbuilding.py <game folder> <port> <map> <difficulty> <strategy> [minutes]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m, d, s = sys.argv[3:6]; mins = int(sys.argv[6]) if len(sys.argv) > 6 else 15
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    seed = int(sys.argv[7]) if len(sys.argv) > 7 else 1
    pg.add_init_script(f"(()=>{{ let s={seed}*7919+13; Math.random=()=>((s=(s*16807)%2147483647)/2147483647); }})()")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-difficulty','{d}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ window.__inb = []; window.__stuck = 0; const U = update; let last = new Map();
      update = function (dt) { U(dt);
        for (const e of game.ents) {
          if (!isUnit(e) || e.docked || e.type === 'extractor' || e.type === 'settler') { e.__touch = 0; continue; }
          const moving = game.time - (e.movedAt || -9) < 0.1;
          let hit = null;
          for (const bb of game.ents) {
            if (!isBuilding(bb) || (isWallType(bb.type) && bb.team === e.team && bb.type === 'gate')) continue;
            if (edgeDist(e.x, e.y, bb) < e.r + 1.5) { hit = bb; break; }   // up against it (separate() keeps it at exactly its radius)
          }
          if (!e.__anchor || !(hit && moving)) e.__anchor = { x: e.x, y: e.y };
          const crowd = hit && game.ents.some(o => o !== e && isUnit(o) && Math.abs(o.x - e.x) < 30 && Math.abs(o.y - e.y) < 30 && Math.hypot(o.x - e.x, o.y - e.y) < 30);
          e.__touch = hit && moving && !crowd && Math.hypot(e.x - e.__anchor.x, e.y - e.__anchor.y) < 12 ? (e.__touch || 0) + dt : 0;   // alone, not pushed by a crowd
          if (e.__touch >= 1) window.__stuck += dt;
          if (e.__touch >= 1 && !e.__reported) {
            e.__reported = true;
            const o = e.order, bb = hit;
            if (window.__inb.length < 40) window.__inb.push({ t: Math.round(game.time), unit: e.type, team: e.team, bld: bb.type, bteam: bb.team, built: bb.built,
              at: [Math.round(e.x), Math.round(e.y)], bAt: [Math.round(bb.x), Math.round(bb.y)], order: o && { type: o.type, x: Math.round(o.x || 0), y: Math.round(o.y || 0), target: o.target && (byId(o.target) || {}).type, slot: !!o.slot },
              nav: e.nav ? { fail: e.nav.fail, len: e.nav.path.length, i: e.nav.i, next: e.nav.path[e.nav.i] && [Math.round(e.nav.path[e.nav.i].x), Math.round(e.nav.path[e.nav.i].y)], breaking: e.nav.breaking } : null,
              home: e.home && [Math.round(e.home.x), Math.round(e.home.y)], role: e.role || null });
          }
          if (!e.__touch) e.__reported = false;
        }
      }; })()""")
    pg.evaluate(open('sim/bot.js').read())
    r = pg.evaluate(f"runSim('{s}', {mins})")
    cases = pg.evaluate("window.__inb")
    print(r['winner'], r['minutes'], 'cases', len(cases), 'stuck-seconds', round(pg.evaluate('window.__stuck')))
    for c in cases[:40]: print(json.dumps(c))
    print('errors', errs[:3])
    b.close()
srv.shutdown()
