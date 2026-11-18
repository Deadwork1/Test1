# Civilians, the game clock and selling buildings (Huge map).
# - capturing a village's Derrick the first time brings 2 civilians out of each house, on the capturer's side; not again after
# - civilians are weaker than soldiers: 1 soldier beats 1 civilian
# - the clock shows game time as m:ss
# - selling refunds half the price (plus queued units), needs a second tap, and the HQ can't be sold
# Usage: python3 tests/test_civ_sell.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ const out={}; const step=(s)=>{ for(let i=0;i<s*20;i++) update(0.05); };
      runAI=()=>{}; game.paused=false;
      for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s);
      const d = game.ents.filter(e=>e.type==='derrick').sort((a,b)=>a.x-b.x)[0];
      const en = spawn('engineer',0,d.x-60,d.y+90); en.order = { type:'capture', target:d.id }; step(8);
      out.civiliansAfterCapture = game.ents.filter(e=>e.type==='civilian').map(e=>e.team);
      // knocked back to neutral and taken again by the enemy: no more villagers
      d.hp = -1; step(0.1); const en2 = spawn('engineer',1,d.x+60,d.y+90); en2.order = { type:'capture', target:d.id }; step(8);
      out.derrickTeam = d.team; out.civiliansAfterRecapture = game.ents.filter(e=>e.type==='civilian').length;
      // 1 soldier vs 1 civilian, out in the open
      const s = spawn('soldier',1,800,1400), c = spawn('civilian',0,870,1400); step(20);
      out.duel = { soldierHp: Math.max(0, Math.round(s.hp)), civilianHp: Math.max(0, Math.round(c.hp)) };
      // clock
      game.time = 754.6; updateHUD();
      out.clock = document.getElementById('clock').textContent;
      // selling
      const hq = hqOf(0); const bar = spawn('barracks', 0, hq.x + 150, hq.y); bar.built = true; bar.progress = 1;
      game.credits[0] = 1000; produce(bar, 'soldier'); produce(bar, 'grenadier');   // $260 queued (grenadier may be locked: then just the soldier)
      const queued = bar.qTypes.reduce((s, t) => s + COST[t], 0), before = game.credits[0];
      game.selected = new Set([bar.id]); updateHUD();
      const btn = document.getElementById('btnSell');
      sellShownAt -= SELL_SETTLE + 1;   // (as if you'd looked at it for a moment: Sell ignores clicks for a second after it appears)
      out.sellLabel = btn.textContent; btn.click(); updateHUD(); out.armedLabel = btn.textContent;
      out.stillThereAfterOneTap = !!byId(bar.id);
      sellArmedAt -= SELL_CONFIRM_GAP + 1;   // (and the second tap comes a moment later, not as a double-click)
      btn.click(); step(0.1);
      out.soldGone = !byId(bar.id); out.refund = Math.round(game.credits[0] - before - 0.1 * 1); out.expected = 150 + queued;
      game.selected = new Set([hq.id]); updateHUD(); out.hqSellShown = btn.style.display !== 'none';
      return out; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = (r['civiliansAfterCapture'] == [0] * 6 and r['derrickTeam'] == 1 and r['civiliansAfterRecapture'] <= 6 and r['duel']['civilianHp'] == 0 and r['duel']['soldierHp'] > 0
          and r['clock'] == '12:34' and r['stillThereAfterOneTap'] and r['soldGone'] and abs(r['refund'] - r['expected']) <= 1 and not r['hqSellShown'] and not errs)
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
