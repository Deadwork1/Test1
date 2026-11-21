# Checks an Extractor's load (v5.52): fills to $500 at the ore, then the money trickles in over 10 s in the Refinery
# (whole dollars, $500 in all for you; the computer gets its difficulty's share), and a load cut short keeps the rest on board.
# Usage: python3 tests/test_trickle.py <game folder> <port> [out picture prefix]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
pic = sys.argv[3] if len(sys.argv) > 3 else None
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{};
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const ore = findOre(hq.x, hq.y, 99999, 0, false);
      const ref = spawn('refinery', 0, hq.x + 170, hq.y - 20); ref.built = true; ref.progress = 1; ref.hp = ref.maxHp;
      const ex = spawn('extractor', 0, ref.x, ref.y + 90);
      const oreStart = ore.amount;
      startHarvest(ex, ore);
      const log = []; let t = 0, filled = null, start = null, phases = [];
      let c0 = game.stats[0].earned;
      while (t < 400) { update(0.05); t += 0.05;
        const ph = ex.order && ex.order.phase; if (phases[phases.length-1] !== ph) phases.push(ph);
        if (filled === null && ph === 'toBase') filled = Math.round(ex.cargo);
        if (ph === 'unloading') { if (start === null) { start = t; c0 = game.stats[0].earned; } if (((t - start) % 1) < 0.05) log.push(game.stats[0].earned - c0); }
        if (start !== null && ph !== 'unloading') break; }
      const got = game.stats[0].earned - c0, secs = start !== null ? +(t - start).toFixed(1) : null;
      return JSON.stringify({ filled, got, secs, log, phases, oreStart: Math.round(oreStart), cargoLeft: ex.cargo }); })()"""))
    print('your load:', r)
    if r['filled'] != 500 or r['got'] != 500 or not (9.8 <= r['secs'] <= 10.3) or len(set(r['log'])) < 8: ok = False; print('FAIL: load / pay-out')
    # cut short: order it away half-way through unloading
    r2 = json.loads(pg.evaluate("""(()=>{ const ex = game.ents.filter(e=>e.type==='extractor'&&e.team===0&&e.hp>0).pop();
      let t=0; while (t < 400 && !(ex.order && ex.order.phase==='unloading')) { update(0.05); t+=0.05; }
      startHarvest(ex, findOre(ex.x, ex.y, 99999, 0, false)); t=0; while (t < 400 && !(ex.order && ex.order.phase==='unloading')) { update(0.05); t+=0.05; }
      const c0 = game.stats[0].earned; let u=0; while (u < 5) { update(0.05); u+=0.05; }
      if (pic) {}
      const paid = game.stats[0].earned-c0, left = ex.cargo; ex.order = { type:'move', x: ex.x+60, y: ex.y+200 };
      for (let i=0;i<40;i++) update(0.05);
      return JSON.stringify({ paid, left: Math.round(left), after: Math.round(ex.cargo), total: Math.round(paid + ex.cargo) }); })()""".replace('if (pic) {}', '')))
    print('cut short:', r2)
    if not (230 <= r2['paid'] <= 270 and abs(r2['total'] - 500) <= 1): ok = False; print('FAIL: cut short')
    # the computer gets its difficulty's share of the load (Hard: 112% until v5.61, now 100%)
    r3 = json.loads(pg.evaluate("""(()=>{ const ex = spawn('extractor', 1, 500, 500); const ref = game.ents.find(e=>e.type==='refinery'&&e.team===1) || spawn('refinery',1,W-600,H-600);
      ref.built=true; ex.cargo = 500; ex.x = ref.x; ex.y = ref.y; ex.order = { type:'harvest', ref: ref.id, phase:'unloading', t:0, load:500, paid:0, shown:0, shownAt:0 };
      const c0 = game.stats[1].earned; for (let i=0;i<220;i++) update(0.05); return JSON.stringify({ got: game.stats[1].earned-c0, diff: game.difficulty || null, mult: diff().income }); })()"""))
    print('computer:', r3)
    if r3['got'] != round(500 * r3['mult']): ok = False; print('FAIL: computer pay')
    if pic:
        pg.evaluate("""(()=>{ const ex = game.ents.filter(e=>e.type==='extractor'&&e.team===0&&e.hp>0).pop(); const ref = game.ents.find(e=>e.type==='refinery'&&e.team===0);
          startHarvest(ex, findOre(ex.x, ex.y, 99999, 0, false));
          let t=0; while (t < 400 && !(ex.order && ex.order.phase==='unloading' && ex.order.t > 4.6)) { update(0.05); t+=0.05; }
          game.paused = true; cam.zoom = 2.6; cam.x = ref.x; cam.y = ref.y + 10; game.selected = new Set([ex.id]); })()""")
        pg.wait_for_timeout(600); pg.screenshot(path=pic + '_unload.png')
    print('errors', errs[:3])
    if errs: ok = False
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
