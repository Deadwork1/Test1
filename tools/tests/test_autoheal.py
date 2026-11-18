# Wounded units left idle after a fight go to the Medbay, heal and walk back (5 infantry or 1 vehicle at a time; any order cancels it);
# the computer keeps an HQ guard by its Headquarters (Normal 2, Hard 3).
# Usage: python3 tests/test_autoheal.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 500, 'height': 400}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ const out = {}; const step = s => { for (let i = 0; i < s * 20; i++) update(0.05); };
      runAI = () => {}; game.ents = game.ents.filter(e => e.type !== 'settler' && e.type !== 'hq');
      spawn('hq', 0, 400, 1950).built = true; spawn('hq', 1, 3200, 300).built = true;
      const med = spawn('medbay', 0, 1000, 1400); med.built = true; med.hp = med.maxHp; bldDirty = true;
      // seven wounded soldiers standing idle 300 away: 5 go, 2 wait; after healing they walk back
      const sol = []; for (let k = 0; k < 7; k++) { const s = spawn('soldier', 0, 1300 + (k % 4) * 20, 1500 + Math.floor(k / 4) * 20); s.hp = 20; sol.push(s); }
      step(5); out.headingToMedbay = sol.filter(s => s.healTo === med.id).length;
      step(15); out.healedFirstFive = sol.filter(s => s.hp === s.maxHp).length;
      step(25); out.allHealed = sol.filter(s => s.hp === s.maxHp).length; out.backHome = sol.filter(s => Math.hypot(s.x - 1330, s.y - 1510) < 80).length;
      for (const s of sol) s.hp = 0; step(0.1);
      // a healthy unit doesn't go; a wounded one you order elsewhere doesn't go back
      const fine = spawn('soldier', 0, 1300, 1500); fine.hp = 50; const told = spawn('soldier', 0, 1320, 1500); told.hp = 10;
      step(5); told.order = { type: 'move', x: 1500, y: 1700 }; step(8);
      out.healthyStays = !fine.healTo; out.orderCancels = !told.healTo && Math.hypot(told.x - 1500, told.y - 1700) < 30;
      fine.hp = 0; told.hp = 0; step(0.1);
      // a wounded tank goes alone
      const tk = spawn('light', 0, 1300, 1550); tk.hp = 100; const s2 = spawn('soldier', 0, 1330, 1550); s2.hp = 10;
      step(4); out.tankAndSoldier = { tank: tk.healTo === med.id, soldier: s2.healTo === med.id };
      return out; })()""")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r['hqGuard'] = pg.evaluate("""(()=>{ for (let i = 0; i < 9 * 60 * 20; i++) update(0.05); const hq = hqOf(1);
      const g = game.ents.filter(e => e.team === 1 && e.role === 'hqguard');
      return { count: g.length, nearHQ: g.filter(u => Math.hypot(u.x - hq.x, u.y - hq.y) < hq.size / 2 + 120).length, minutes: 9 }; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = (r['headingToMedbay'] == 5 and r['allHealed'] == 7 and r['backHome'] >= 5 and r['healthyStays'] and r['orderCancels']
          and r['tankAndSoldier']['tank'] != r['tankAndSoldier']['soldier'] and r['hqGuard']['count'] == 3 and r['hqGuard']['nearHQ'] >= 2 and not errs)
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
