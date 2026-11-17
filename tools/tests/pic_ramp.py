import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 700}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')"); pg.wait_for_timeout(800)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html', wait_until='domcontentloaded'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    spots = pg.evaluate("""(()=>{ window.update=()=>{}; window.drawMinimap=()=>{}; const pl=MAP.plateaus[0]; return pl.ramps.map(ra=>{ let d=0; while(elevAt(pl.x+Math.cos(ra)*d, pl.y+Math.sin(ra)*d)) d+=4; return {x:pl.x+Math.cos(ra)*d, y:pl.y+Math.sin(ra)*d}; }); })()""")
    for k, sp in enumerate(spots):
        pg.evaluate(f"""(()=>{{ const RD=window._RD||(window._RD=draw); window.draw=()=>{{}}; game.ents=[]; fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
           cam.zoom=2.4; cam.x={sp['x']}; cam.y={sp['y']}; RD(); return 0; }})()""")
        pg.locator('#c').screenshot(path=f'ramp_{k}.jpg', type='jpeg', quality=92)
    pg.evaluate(f"""(()=>{{ const pl=MAP.plateaus[0]; cam.zoom=1.25; cam.x=pl.x; cam.y=pl.y+30; window._RD(); return 0; }})()""")
    pg.locator('#c').screenshot(path='ramp_plateau.jpg', type='jpeg', quality=92)
    print(spots, errs[:2])
    b.close()
srv.shutdown()
