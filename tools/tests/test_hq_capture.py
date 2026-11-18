# HQ capture: your Engineer taking the enemy HQ wins ("captured"), the computer's Engineer taking yours loses,
# and the computer's raids don't set out for your HQ (it can only be taken in passing).
# Usage: python3 tests/test_hq_capture.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    res = {}
    for case in ('win', 'lose', 'raid'):
        pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','classic'); localStorage.setItem('mini-rts-difficulty','hard')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
        res[case] = pg.evaluate("""(kind)=>{ game.ents = game.ents.filter(e => e.type !== 'settler');
          const mine = spawn('hq', 0, 500, 1100), theirs = spawn('hq', 1, 1500, 500); mine.built = theirs.built = true;
          if (kind === 'raid') {   // the computer knows only about your HQ: no raid should be planned against it
            game.ai.known.set(mine.id, {}); return { raidPlan: aiRaidPlan(spawn('engineer', 1, 1500, 600)) };
          }
          runAI = () => {};
          const [team, target] = kind === 'win' ? [0, theirs] : [1, mine];
          const en = spawn('engineer', team, target.x, target.y + 90); en.order = { type: 'capture', target: target.id };
          for (let i = 0; i < 20 * 20 && !game.over; i++) update(0.05);
          return { over: game.over, text: document.getElementById('ovText').textContent, hqTeam: target.team }; }""", case)
        res[case + 'Errors'] = errs[:2]; pg.close()
    print(json.dumps(res, indent=1))
    ok = (res['win']['over'] == 'win' and 'captured' in res['win']['text'] and res['lose']['over'] == 'lose' and 'captured' in res['lose']['text']
          and res['raid']['raidPlan'] is None and not any(res[k] for k in res if k.endswith('Errors')))
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAIL')
