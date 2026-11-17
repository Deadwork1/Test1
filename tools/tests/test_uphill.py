# Shooting uphill: units on low ground firing at something on a plateau do half damage, except Grenadiers and
# Artillery (lobbed, full damage). Each shooter fires at a target on high ground (a friendly spotter stands beside it
# so the shooter can see it) and at the same target on flat ground; prints damage per second for both.
# Usage: python3 tests/test_uphill.py <game folder> <port>
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
    r = pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler');
      spawn('hq', 0, 60, H - 60); spawn('hq', 1, W - 60, 60);
      // the corner plateau at (760, 470): a high spot on its cliff edge and a low spot straight out from it
      const pl = MAP.plateaus.find(q => q.x === 760);
      let top = null, low = null;
      for (let k = 0; k < 72 && !low; k++) {
        const a = k * Math.PI / 36; if (pl.ramps.some(ra => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) < 0.8)) continue;
        let t = null; for (let d = 0; d < 300; d += 4) { const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (elevAt(x, y) && terrainAt(x, y) === T.GRASS) t = { x, y }; else if (t && terrainAt(x, y) !== T.CLIFF) break; }
        if (!t) continue;
        const l = { x: t.x + Math.cos(a) * 75, y: t.y + Math.sin(a) * 75 };
        if (!elevAt(l.x, l.y) && terrainAt(l.x, l.y) === T.GRASS) { top = t; low = l; }
      }
      // a flat comparison: same gap, out on open grass
      const flatT = { x: 1500, y: 2350 }, flatS = { x: 1500 + (low.x - top.x), y: 2350 + (low.y - top.y) };
      const test = (type, tgt, from) => {
        const target = spawn('soldier', 1, tgt.x, tgt.y), spot = spawn('engineer', 0, tgt.x + 14, tgt.y + 14), s = spawn(type, 0, from.x, from.y);
        target.passive = true; let dealt = 0, last = target.hp; const secs = 24;
        for (let i = 0; i < secs * 20; i++) {
          update(0.05);
          target.x = tgt.x; target.y = tgt.y; target.order = null; target.cooldown = 99;   // a dummy that never fights back or moves
          s.x = from.x; s.y = from.y; spot.x = tgt.x + 14; spot.y = tgt.y + 14; spot.hp = spot.maxHp;
          if (s.order && s.order.type !== 'attack') s.order = null;
          if (!s.order || s.order.target !== target.id) s.order = { type: 'attack', target: target.id };
          dealt += Math.max(0, last - target.hp); target.hp = 1e6; last = 1e6; target.maxHp = 1e6;
        }
        target.hp = 0; spot.hp = 0; s.hp = 0; update(0.05);
        return dealt / secs;
      };
      const out = { gap: Math.round(Math.hypot(low.x - top.x, low.y - top.y)) };
      for (const type of ['soldier', 'rocket', 'sniper', 'light', 'heavy', 'grenadier']) {
        const up = test(type, top, low), flat = test(type, flatT, flatS);
        out[type] = { uphillDps: +up.toFixed(1), flatDps: +flat.toFixed(1), ratio: flat ? +(up / flat).toFixed(2) : null };
      }
      return out; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = not errs
    for t, want in [('soldier', .5), ('rocket', .5), ('sniper', .5), ('light', .5), ('heavy', .5), ('grenadier', 1)]:
        ratio = r[t]['ratio']
        if ratio is None or abs(ratio - want) > 0.2: ok = False; print('unexpected', t, ratio)
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
