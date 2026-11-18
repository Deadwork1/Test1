# Oil Derrick checks on the Huge or Large map: neutral can't be hurt, an engineer captures it, it pays $100 every 15s,
# knocking it out returns it to neutral, the win check ignores it, and the computer goes and takes one.
# Usage: python3 tests/test_derrick.py <game folder> <port> [map: huge (default) or large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','"+(sys.argv[3] if len(sys.argv)>3 else 'huge')+"'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ const out={}; const step=(s)=>{ for(let i=0;i<s*20;i++) update(0.05); };
      const realAI = runAI; runAI=()=>{}; game.paused=false;
      for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s);
      const ds = game.ents.filter(e=>e.type==='derrick'); out.derricks = ds.length; out.houses = game.ents.filter(e=>e.type==='house').length;
      const d = ds.sort((a,b)=>a.x-b.x)[0];
      // 1. neutral can't be hurt: a light tank of each side parked next to it never picks it, and splash is shrugged off
      const t0 = spawn('light',0,d.x-90,d.y+80), t1 = spawn('light',1,d.x+90,d.y+80);
      d.hp -= 300; step(1); out.neutralHp = d.hp + '/' + d.maxHp;
      out.tankTargets = [t0,t1].map(t => findEnemyNear(t, 400) ? findEnemyNear(t, 400).type : null);
      t0.hp = 0; t1.hp = 0; step(0.1);
      // 2. an engineer captures it
      const en = spawn('engineer',0,d.x-60,d.y+90); en.order = { type:'capture', target:d.id };
      step(10); out.afterCapture = d.team; out.engineerUsed = !byId(en.id);
      // 3. it pays $100 every 15s (plus the $1/s trickle everyone gets)
      const c0 = game.credits[0]; step(45); out.paid45s = Math.round(game.credits[0]-c0-45);
      // 4. win check ignores derricks: with only a derrick left you'd lose
      out.buildAreaHasDerrick = buildAreaSources(0).some(s=>s.b.type==='derrick');
      // 5. knocked out -> back to neutral, not destroyed
      d.hp = -5; step(0.1); out.afterKnockout = { team: d.team, alive: !!byId(d.id), hp: d.hp };
      // 6. the computer (Normal) sends an engineer for a derrick it has found
      runAI = realAI; game.credits[1] = 3000;
      fog[1].exp.fill(1);   // let it know the map
      let taken = null; for (let s = 0; s < 600 && !taken; s += 5) { step(5); const g = game.ents.find(e=>e.type==='derrick'&&e.team===1); if (g) taken = Math.round(game.time); }
      out.aiTookDerrickAt = taken;
      return out; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = (r['derricks'] == 2 and r['houses'] == 6 and r['neutralHp'] == '600/600' and 'derrick' not in r['tankTargets'] and r['afterCapture'] == 0
          and r['engineerUsed'] and r['paid45s'] == 300 and not r['buildAreaHasDerrick'] and r['afterKnockout']['team'] == 2 and r['afterKnockout']['alive']
          and r['aiTookDerrickAt'] and not errs)
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
