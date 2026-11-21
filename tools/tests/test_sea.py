# The sea along the south edge (v5.57): the map is taller by SEA, nothing on the land moved (mirror symmetry and start spots unchanged),
# the strip below the land is water, and units sent into it stop on the land.
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
          let landWater = 0, seaLand = 0;
          for (let x = 12; x < W; x += 25) { for (let y = H + 12; y < HT; y += 25) if (terrainAt(x, y) !== T.WATER) seaLand++; }
          const s0 = game.ents.find(e=>e.team===0&&e.type==='settler'), s1 = game.ents.find(e=>e.team===1&&e.type==='settler');
          const mirrored = Math.abs(s1.x - (W - s0.x)) < 1 && Math.abs(s1.y - (H - s0.y)) < 1;
          deploy(s0); const hq = hqOf(0);
          const u = spawn('soldier', 0, hq.x + 120, H - 120), t = spawn('light', 0, hq.x + 200, H - 120);
          for (const v of [u, t]) v.order = { type: 'move', x: v.x, y: HT - 20 };
          for (let i = 0; i < 600; i++) update(0.05);
          return JSON.stringify({ map: m, H, HT, sea: HT - H, seaLand, mirrored, soldierY: Math.round(u.y), tankY: Math.round(t.y), onLand: u.y < H && t.y < H, rows: ROWS, fogRows: fogCanvas.height }); })()""".replace("map: m", f"map: '{m}'")))
        good = r['seaLand'] == 0 and r['mirrored'] and r['onLand'] and r['fogRows'] * 50 == r['HT']
        print(('ok   ' if good else 'FAIL ') + json.dumps(r)); ok = ok and good
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
