# Vehicles shouldn't wedge themselves on building edges.
# 1) An Extractor unloading at its Refinery is sent to ore on the far side of the building.
# 2) A tank attacks an enemy on the other side of a narrow gap between two of its own buildings (a Guard Tower and a
#    Power Plant): it should go round, not wedge in the gap.
# For each: how long it takes, and the longest time it spends pressed against a building without getting anywhere.
# Usage: python3 tests/test_building_edges.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; game.ents = game.ents.filter(e => e.type !== 'settler');
      spawn('hq', 1, W - 80, 80);
      const put = (t, team, x, y) => { const b = spawn(t, team, x, y); b.built = true; b.progress = 1; b.hp = b.maxHp; return b; };
      const watch = (u, done, secs) => {   // run until done(); track the longest spell pressed against a building without moving
        let t = 0, worst = 0, since = null, ax = u.x, ay = u.y;
        for (; t < secs && !done(); t += 0.05) {
          update(0.05);
          const touching = !u.docked && game.ents.some(b => isBuilding(b) && b.hp > 0 && edgeDist(u.x, u.y, b) < u.r + 2);   // (sitting in the bay unloading doesn't count)
          if (touching && Math.hypot(u.x - ax, u.y - ay) < 6) { since = since === null ? t : since; worst = Math.max(worst, t - since); }
          else { since = null; ax = u.x; ay = u.y; }
        }
        return { secs: +t.toFixed(1), done: done(), worstStuckSecs: +worst.toFixed(1) };
      };
      const out = {};
      // 1) extractor at its refinery, ore behind the building
      const hq = put('hq', 0, 300, 1950), ref = put('refinery', 0, 600, 1900);
      game.ore = game.ore.filter(o => Math.hypot(o.x - 600, o.y - 1900) > 400);
      const node = { id: game.nextId++, x: 600, y: 1740, amount: 500, max: 500, rot: 0 }; game.ore.push(node);
      const ex = game.ents.find(e => e.type === 'extractor' && e.team === 0) || spawn('extractor', 0, ref.x, ref.y + 70);
      const d = dockOf(ref); ex.x = d.pad.x; ex.y = d.pad.y; ex.cargo = 150; ex.order = { type: 'harvest', node: node.id, phase: 'unloading', ref: ref.id, t: 0 }; ex.docked = true; ref.dockedBy = ex.id;
      update(0.05);
      startHarvest(ex, node);   // you tap the ore while it's unloading
      out.extractorToOre = watch(ex, () => Math.hypot(ex.x - node.x, ex.y - node.y) < 40 || ex.mining, 40);
      // 2) tank behind a narrow gap between its own tower and power plant, attacking an enemy beyond it
      const tw = put('cannon', 0, 1000, 1500), pw = put('power', 0, 1000 + 22 + 30 + 34, 1500);   // (a Cannon Turret, size 44, since v5.64)   // edges about 34 apart
      const tank = spawn('light', 0, 1043, 1640), foe = spawn('soldier', 1, 1043, 1250); foe.passive = true;
      tank.order = { type: 'attack', target: foe.id };
      out.gapBetween = Math.round((pw.x - halfX(pw)) - (tw.x + halfX(tw)));
      out.tankAttack = watch(tank, () => foe.hp <= 0, 40);
      return JSON.stringify(out); })()"""))
    print(json.dumps(r)); print('errors', errs[:3])
    ok = r['extractorToOre']['done'] and r['extractorToOre']['worstStuckSecs'] < 1.5 and r['tankAttack']['done'] and r['tankAttack']['worstStuckSecs'] < 1.5 and not errs
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
