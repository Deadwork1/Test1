# The computer's wounded units left idle after a fight go to its Medbay (yours only go when you send them);
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
    r = {}
    # 1. your wounded idle soldiers stay where they are (only the computer's go by themselves)
    r['yours'] = pg.evaluate("""(()=>{ const step = s => { for (let i = 0; i < s * 20; i++) update(0.05); };
      runAI = () => {}; game.ents = game.ents.filter(e => e.type !== 'settler' && e.type !== 'hq');
      spawn('hq', 0, 400, 1950).built = true; spawn('hq', 1, 3200, 300).built = true;
      const med = spawn('medbay', 0, 1000, 1400); med.built = true; med.hp = med.maxHp; bldDirty = true;
      const s = spawn('soldier', 0, 1300, 1500); s.hp = 15; step(12);
      return { stayed: Math.hypot(s.x - 1300, s.y - 1500) < 15, hp: Math.round(s.hp) }; })()""")
    # 2. the computer: a wounded wave unit left idle goes to its Medbay; the HQ guard stands by its HQ
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r['computer'] = pg.evaluate("""(()=>{ const step = s => { for (let i = 0; i < s * 20; i++) update(0.05); };
      step(9 * 60); const hq = hqOf(1);
      const g = game.ents.filter(e => e.team === 1 && e.role === 'hqguard');
      let med = game.ents.find(e => e.team === 1 && e.type === 'medbay');
      if (!med) { med = spawn('medbay', 1, hq.x - 60, hq.y + 180); }
      med.built = true; med.hp = med.maxHp; bldDirty = true;
      const w = spawn('soldier', 1, med.x + 400, med.y); w.role = 'wave'; w.hp = 15; w.order = null;
      let sawHeal = false; for (let i = 0; i < 40 * 20; i++) { update(0.05); if (w.role === 'heal') sawHeal = true; if (w.hp <= 0) break; }
      return { hqGuards: g.length, nearHQ: g.filter(u => Math.hypot(u.x - hq.x, u.y - hq.y) < hq.size / 2 + 120).length, waveUnitWentToHeal: sawHeal, healed: w.hp >= w.maxHp * 0.9 }; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = r['yours']['stayed'] and r['computer']['hqGuards'] == 3 and r['computer']['nearHQ'] >= 2 and r['computer']['waveUnitWentToHeal'] and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
