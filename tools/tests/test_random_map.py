# Random maps (v5.60): rolls many map numbers on each size and checks each one loads, passes its own check (HQ fits, every ore field,
# the island, the enemy, the village and the ruins can be reached), how many re-rolls it needed and how long loading took;
# the same number gives the same map; and saves whole-map pictures of a few.
# Usage: python3 tests/test_random_map.py <game folder> <port> [maps per size, default 20] [out prefix for pictures]
import sys, http.server, threading, functools, json, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
n = int(sys.argv[3]) if len(sys.argv) > 3 else 20; pic = sys.argv[4] if len(sys.argv) > 4 else None
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1600, 'height': 1070}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url)
    for size in ['classic', 'large', 'huge']:
        rows = []
        for i in range(n):
            seed = 1000 + i * 7919
            pg.evaluate(f"localStorage.setItem('mini-rts-map','random'); localStorage.setItem('mini-rts-rsize','{size}'); localStorage.setItem('mini-rts-seed','{seed}')")
            t0 = time.time(); pg.goto(url); pg.wait_for_function("window.gameLoaded || typeof MAP !== 'undefined'"); load = time.time() - t0
            r = pg.evaluate("({ok: mapPlayable(), attempt: MAP.attempt, fields: MAP.fields.length, plateaus: MAP.plateaus.length, ridges: MAP.ridges.length, forests: MAP.forests.length, ruins: (MAP.ruins||[]).length, label: document.getElementById('randNum').textContent})")
            r['seed'] = seed; r['load'] = round(load, 2); rows.append(r)
            if not r['ok']: ok = False
        bad = [r for r in rows if not r['ok']]
        print(size, 'maps', len(rows), 'unplayable', len(bad), 'max re-rolls', max(r['attempt'] for r in rows), 'avg re-rolls %.1f' % (sum(r['attempt'] for r in rows) / len(rows)),
              'fields', sorted(set(r['fields'] for r in rows)), 'plateaus', sorted(set(r['plateaus'] for r in rows)), 'ruins', sorted(set(r['ruins'] for r in rows)), 'load max %.2fs' % max(r['load'] for r in rows))
        # the same number rolls the same map
        pg.evaluate(f"localStorage.setItem('mini-rts-seed','{rows[0]['seed']}')"); pg.goto(url); pg.wait_for_function("typeof MAP !== 'undefined'")
        a = pg.evaluate("JSON.stringify(MAP)"); pg.goto(url); pg.wait_for_function("typeof MAP !== 'undefined'")
        if a != pg.evaluate("JSON.stringify(MAP)"): ok = False; print('FAIL: same number gave a different map')
        if pic:
            for j, seed in enumerate([rows[1]['seed'], rows[2]['seed']]):
                pg.evaluate(f"localStorage.setItem('mini-rts-seed','{seed}')"); pg.goto(url); pg.wait_for_timeout(2000); pg.click('#ovBtn')
                pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
                pg.evaluate("""(()=>{ game.paused=true; for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s); game.ents=game.ents.filter(e=>e.hp>0); window.drawMinimap=()=>{};
                  fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); window.updateFog=()=>{};
                  const fitS=Math.min(scr.w/W, scr.h/HT); cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=HT/2; })()""")
                pg.wait_for_timeout(500); pg.screenshot(path=f'{pic}_{size}_{seed}.png')
    pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
