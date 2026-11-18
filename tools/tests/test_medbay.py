# Medbay: needs a Barracks; units walk onto it (it doesn't block them); heals up to 5 infantry or 1 vehicle at a time
# (first come, first served); tapping it with units selected sends them on; the computer sends its wounded to its own.
# Usage: python3 tests/test_medbay.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 500, 'height': 400}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ const out = {}; const step = s => { for (let i = 0; i < s * 20; i++) update(0.05); };
      runAI = () => {}; game.ents = game.ents.filter(e => e.type !== 'settler' && e.type !== 'hq');
      const hq = spawn('hq', 0, 400, 1950); hq.built = true; spawn('hq', 1, 3200, 300).built = true;
      out.lockedWithoutBarracks = missingFor(0, 'medbay').join(',');
      spawn('barracks', 0, 600, 1800).built = true; out.lockedWithBarracks = missingFor(0, 'medbay').join(',');
      const med = spawn('medbay', 0, 1000, 1400); med.built = true; med.hp = med.maxHp; bldDirty = true; step(0.1);
      // 1. seven hurt soldiers on the pad: only 5 heal
      const sol = []; for (let k = 0; k < 7; k++) { const s = spawn('soldier', 0, med.x + [0,-19,19,-19,19,0,-8][k], med.y + [0,-15,-15,15,15,26,-26][k]); s.hp = 20; sol.push(s); }
      step(2); out.healing7 = med.healing; out.healedCount = sol.filter(s => s.hp > 20).length; out.soldierHpAfter2s = Math.round(sol[0].hp);
      step(12); out.allFullAfterMore = sol.every(s => s.hp === s.maxHp);
      for (const s of sol) s.hp = 0; step(0.1);
      // 2. a hurt tank first, then infantry: only the tank heals
      const tank = spawn('light', 0, med.x, med.y); tank.hp = 100; step(1);
      const late = spawn('soldier', 0, med.x - 19, med.y - 15); late.hp = 20; step(2);
      out.tankHealPerSec = Math.round((tank.hp - 100) / 3); out.infantryWaitsForTank = late.hp === 20; out.healingWithTank = med.healing;
      tank.hp = 0; late.hp = 0; step(0.1);
      // 3. units walk straight across the pad (it doesn't block them)
      const walker = spawn('light', 0, med.x - 120, med.y); walker.order = { type: 'move', x: med.x + 120, y: med.y };
      let maxOff = 0, t = 0; for (; t < 15 && walker.order; t += 0.05) { update(0.05); if (Math.abs(walker.x - med.x) < 30) maxOff = Math.max(maxOff, Math.abs(walker.y - med.y)); }
      out.tankCrossedPad = { arrived: !walker.order, secs: Math.round(t * 10) / 10, sidewaysOnPad: Math.round(maxOff) }; walker.hp = 0; step(0.1);
      // 4. select units and tap the Medbay: they go and stand on it
      const sel = []; for (let k = 0; k < 6; k++) { const s = spawn('soldier', 0, med.x - 200 + k * 15, med.y + 150); s.hp = 30; sel.push(s); }
      game.selected = new Set(sel.map(s => s.id)); handleTap(med.x + 30, med.y - 30); step(12);
      out.tapSent = { onPad: medbayOccupants(med).length, healedFull: sel.filter(s => s.hp === s.maxHp).length };
      for (const s of sel) s.hp = 0; step(0.1);
      return out; })()""")
    # 5. the computer: a wounded guard at home goes to its Medbay and heals
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r['ai'] = pg.evaluate("""(()=>{ const step = s => { for (let i = 0; i < s * 20; i++) update(0.05); };
      step(3); const hq = hqOf(1); const med = spawn('medbay', 1, hq.x - 60, hq.y + 170); med.built = true; med.hp = med.maxHp; bldDirty = true;
      const hurt = []; for (let k = 0; k < 4; k++) { const s = spawn('soldier', 1, hq.x - 200 + k * 20, hq.y + 60); s.hp = 15; hurt.push(s); }
      let sawHeal = false; for (let i = 0; i < 30 * 20; i++) { update(0.05); if (hurt.some(s => s.role === 'heal')) sawHeal = true; }
      const healed = hurt.filter(s => s.hp >= s.maxHp * 0.95).length;
      return { sawHealRole: sawHeal, healed, roles: hurt.map(s => s.role || null), onPadOrDone: sawHeal && healed >= 1 }; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = (r['lockedWithoutBarracks'] == 'barracks' and r['lockedWithBarracks'] == '' and r['healing7'] == 5 and r['healedCount'] == 5
          and r['allFullAfterMore'] and 14 <= r['tankHealPerSec'] <= 16 and r['infantryWaitsForTank'] and r['healingWithTank'] == 1
          and r['tankCrossedPad']['arrived'] and r['tankCrossedPad']['sidewaysOnPad'] < 10 and r['tapSent']['healedFull'] >= 5
          and r['ai']['onPadOrDone'] and not errs)
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
