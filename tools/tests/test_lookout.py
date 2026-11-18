# River lookout plateaus (Huge map): from the edge of the plateau by the island, units can shoot enemies standing on
# the island's shore, and those enemies can't see up to shoot back. Usage: python3 tests/test_lookout.py <game folder> <port> [map: huge (default) or large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','"+(sys.argv[3] if len(sys.argv)>3 else 'huge')+"')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ const pinned = []; const step=(s)=>{ for(let i=0;i<s*20;i++) { update(0.05); for (const [u, x, y] of pinned) { u.x = x; u.y = y; if (u.order && u.order.type !== 'attack') u.order = null; } } };   // both hold their ground
      runAI=()=>{}; game.paused=false;
      game.ents = game.ents.filter(e => e.type !== 'settler'); spawn('hq', 0, 200, H - 200); spawn('hq', 1, W - 200, 200);   // keep both sides "alive"
      // the high-ground tile on your lookout that is closest to the island
      let best = null, bd = 1e9;
      for (let rr = 0; rr < TROWS; rr++) for (let c = 0; c < TCOLS; c++) { const i = rr * TCOLS + c; if (!elev[i] || terrain[i] !== T.GRASS) continue;
        const x = c * TC + TC / 2, y = rr * TC + TC / 2; if (x > W / 2 || y < H / 2) continue;
        const d = Math.hypot(x - ISLAND.x, y - ISLAND.y); if (d < bd) { bd = d; best = { x, y }; } }
      // an island spot on the shore, straight across the channel
      const ux = (ISLAND.x - best.x) / bd, uy = (ISLAND.y - best.y) / bd;
      const shore = { x: ISLAND.x - ux * (ISLAND.r - 50), y: ISLAND.y - uy * (ISLAND.r - 50) };
      const out = { edge: [Math.round(best.x), Math.round(best.y)], shore: [Math.round(shore.x), Math.round(shore.y)], gap: Math.round(Math.hypot(shore.x - best.x, shore.y - best.y)) };
      // rocket soldier up top vs a soldier on the island shore
      const me = spawn('rocket', 0, best.x, best.y), foe = spawn('soldier', 1, shore.x, shore.y); pinned.push([me, best.x, best.y], [foe, shore.x, shore.y]);
      step(1); out.foeSeesMe = visibleAt(me.x, me.y, 1); out.iSeeFoe = visibleAt(foe.x, foe.y, 0);
      step(20); out.foeHp = Math.max(0, Math.round(foe.hp)); out.myHp = Math.round(me.hp);
      // and the other way round: a rocket soldier on the island shore can't hit a soldier up on the lookout
      foe.hp = 0; me.hp = 0; step(0.1);
      const up = spawn('soldier', 0, best.x, best.y), below = spawn('rocket', 1, shore.x, shore.y); pinned.length = 0; pinned.push([up, best.x, best.y], [below, shore.x, shore.y]); step(15);
      out.reverse = { soldierUpTopHp: Math.round(up.hp), rocketOnIslandHp: Math.max(0, Math.round(below.hp)) };
      return out; })()""")
    print(json.dumps(r)); print('errors', errs[:3])
    ok = r['foeHp'] == 0 and r['myHp'] == 55 and not r['foeSeesMe'] and r['reverse']['soldierUpTopHp'] == 60 and not errs   # a soldier (range 85) up top can't quite reach a rocket on the shore 88 away, but it isn't hurt either
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
