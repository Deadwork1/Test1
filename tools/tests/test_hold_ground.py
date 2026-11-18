# Snipers and units on high ground hold their ground when idle: they shoot what comes into range but don't chase
# it off. An idle Sniper on a plateau edge, an enemy walking past below (in range, then away): the Sniper must not
# leave the high ground. An idle Soldier on flat ground still goes after an enemy it can see.
# Usage: python3 tests/test_hold_ground.py <game folder> <port>
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
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler'); spawn('hq', 0, 80, H - 80); spawn('hq', 1, W - 80, 80);
      const out = {};
      // a high spot on the cliff edge of a (non-lookout) plateau and a low spot 120 out from it
      const pl = MAP.plateaus.find(q => !q.overhang && q.y > 1500);
      let top = null, a0 = 0;
      for (let k = 0; k < 72 && !top; k++) { const a = k * Math.PI / 36; if (pl.ramps.some(ra => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) < 0.8)) continue;
        let t = null; for (let d = 0; d < 300; d += 4) { const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d; if (elevAt(x, y) && terrainAt(x, y) === T.GRASS) t = { x, y }; else if (t && terrainAt(x, y) !== T.CLIFF) break; }
        if (t) { const lx = t.x + Math.cos(a) * 120, ly = t.y + Math.sin(a) * 120; if (!elevAt(lx, ly) && terrainAt(lx, ly) === T.GRASS) { top = t; a0 = a; } } }
      const sn = spawn('sniper', 0, top.x, top.y);
      // the enemy walks along the foot of the cliff, past the sniper (from 260 to one side to 260 to the other)
      const px = -Math.sin(a0), py = Math.cos(a0), bx = top.x + Math.cos(a0) * 120, by = top.y + Math.sin(a0) * 120;
      const foe = spawn('soldier', 1, bx - px * 260, by - py * 260); foe.passive = true; foe.cooldown = 99;
      let shots = 0, last = foe.hp, maxMove = 0;
      for (let i = 0; i < 20 * 25; i++) {
        foe.order = { type: 'move', x: bx + px * 260, y: by + py * 260 }; foe.cooldown = 99; foe.hp = Math.max(foe.hp, 1);
        update(0.05);
        if (foe.hp < last) shots++; last = foe.hp; foe.hp = foe.maxHp; last = foe.maxHp;
        maxMove = Math.max(maxMove, Math.hypot(sn.x - top.x, sn.y - top.y));
      }
      out.sniper = { shotsAtPasserBy: shots, furthestFromSpot: Math.round(maxMove), stillOnHighGround: !!elevAt(sn.x, sn.y) };
      sn.hp = 0; foe.hp = 0; update(0.05);
      // an enemy standing below, in sight (220) but out of range (high ground: 192): the sniper must not go after it
      const sn2 = spawn('sniper', 0, top.x, top.y), far = spawn('soldier', 1, top.x + Math.cos(a0) * 210, top.y + Math.sin(a0) * 210); far.passive = true;
      const fx = far.x, fy = far.y; let move2 = 0;
      for (let i = 0; i < 20 * 15; i++) { update(0.05); far.x = fx; far.y = fy; far.cooldown = 99; move2 = Math.max(move2, Math.hypot(sn2.x - top.x, sn2.y - top.y)); }
      out.sniperVsEnemyOutOfRange = { visible: visibleAt(fx, fy, 0), furthestFromSpot: Math.round(move2), stillOnHighGround: !!elevAt(sn2.x, sn2.y) };
      sn2.hp = 0; far.hp = 0; update(0.05);
      // a soldier on flat ground still goes after an enemy it can see but can't reach yet
      const so = spawn('soldier', 0, 1600, 2600), en = spawn('soldier', 1, 1600, 2460); en.passive = true;
      for (let i = 0; i < 20 * 4; i++) { update(0.05); en.x = 1600; en.y = 2460; en.cooldown = 99; }
      out.flatSoldierMovedTowardEnemy = Math.round(2600 - so.y);
      return JSON.stringify(out); })()"""))
    print(json.dumps(r)); print('errors', errs[:3])
    ok = r['sniperVsEnemyOutOfRange']['visible'] and r['sniperVsEnemyOutOfRange']['furthestFromSpot'] < 25 and r['sniper']['shotsAtPasserBy'] > 0 and r['sniper']['furthestFromSpot'] < 25 and r['sniper']['stillOnHighGround'] and r['flatSoldierMovedTowardEnemy'] > 20 and not errs
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
