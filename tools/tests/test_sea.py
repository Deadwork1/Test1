# The sea along the south edge (v5.57): the map is taller by SEA, nothing on the land moved (mirror symmetry and start spots unchanged),
# below the land there's a beach units can walk on (v5.59) and water they can't, the river's mouth stays water (no way round the river
# along the beach), nothing can be built on the beach, and units sent out to sea stop on the sand.
# Usage: python3 tests/test_sea.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 600}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for m in ['classic', 'large', 'huge']:
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
        r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{};
          let seaLand = 0, beach = 0, beachWater = 0, mouthDry = 0;
          for (let x = 12; x < W; x += 25) for (let y = H + 12; y < HT; y += 25) {
            const rx = riverX(y), nearMouth = Math.abs(x - rx) < seaChanW(y) + 30;
            if (y >= coastY(x) + 6 && terrainAt(x, y) !== T.WATER) seaLand++;                    // out at sea: must be water
            if (y < coastY(x) - 16 && !nearMouth) { beach++; if (!walkable(terrainAt(x, y), true)) beachWater++; }   // the sand: must be walkable
          }
          for (let y = H + 2; y < coastY(riverX(H)); y += 5) for (let dx = -seaChanW(y) + 14; dx <= seaChanW(y) - 14; dx += 6) if (walkable(terrainAt(riverX(y) + dx, y), false)) mouthDry++;   // across the river's mouth: never walkable
          const noBuild = !canPlace(0, 'power', START[0].x + 150, H + SEA * 0.15);
          const s0 = game.ents.find(e=>e.team===0&&e.type==='settler');
          const mirrored = Math.abs(START[1].x - (W - START[0].x)) < 1 && Math.abs(START[1].y - (H - START[0].y)) < 1 && s0.boarded && Math.abs(s0.x - START[0].x) < 1;   // (your Settler starts on its landing boat, v5.58; the computer may already have deployed)
          deploy(s0); const hq = hqOf(0);
          const u = spawn('soldier', 0, hq.x + 120, H - 120), t = spawn('light', 0, hq.x + 200, H - 120);
          for (const v of [u, t]) v.order = { type: 'move', x: v.x, y: HT - 20 };
          for (let i = 0; i < 600; i++) update(0.05);
          return JSON.stringify({ map: m, H, HT, sea: HT - H, seaLand, mirrored, soldierY: Math.round(u.y), tankY: Math.round(t.y), onSand: u.y > H && u.y < coastY(u.x) && t.y > H && t.y < coastY(t.x), seaLand, beach, beachWater, mouthDry, noBuild, rows: ROWS, fogRows: fogCanvas.height }); })()""".replace("map: m", f"map: '{m}'")))
        good = r['seaLand'] == 0 and r['beach'] > 0 and r['beachWater'] == 0 and r['mouthDry'] == 0 and r['noBuild'] and r['mirrored'] and r['onSand'] and r['fogRows'] * 50 == r['HT']
        print(('ok   ' if good else 'FAIL ') + json.dumps(r)); ok = ok and good
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
