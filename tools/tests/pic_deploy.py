# The Settler truck, its landing boat and the deploy animation (v5.59), as pictures.
# Usage: python3 tests/pic_deploy.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 600, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel, #money, #sellBox, #mm, #hint, #bottom { display:none !important }")
    # the boat on its way in, with the truck on deck
    pg.evaluate("(()=>{ MM.hidden=true; game.paused=false; let t=0; while (t<30 && game.landing.y > game.landing.stopY + 25) { update(0.02); t+=0.02; } game.paused=true; cam.x=game.landing.x; cam.y=game.landing.y-40; cam.zoom=2.6; })()")
    pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_boat.png')
    # the truck coming up the beach, then on open ground
    pg.evaluate("(()=>{ game.paused=false; let t=0; while (t<30 && !(game.landing && game.landing.phase==='leave')) { update(0.02); t+=0.02; } game.paused=true; const s=game.ents.find(e=>e.team===0&&e.type==='settler'); cam.x=s.x; cam.y=s.y+40; cam.zoom=2.6; })()")
    pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_ashore.png')
    pg.evaluate("(()=>{ game.paused=false; let t=0; const s=game.ents.find(e=>e.team===0&&e.type==='settler'); while (t<30 && s.order) { update(0.02); t+=0.02; } s.facing=0.5; game.paused=true; cam.x=s.x; cam.y=s.y; cam.zoom=4; game.selected=new Set(); window.__s=s; })()")
    pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_truck.png')
    # deploy, step by step
    pg.evaluate("(()=>{ deploy(__s); game.ents=game.ents.filter(e=>e.hp>0); window.__hq=hqOf(0); game.selected=new Set(); cam.zoom=2.2; cam.x=__hq.x; cam.y=__hq.y; })()")
    for k in [0.08, 0.25, 0.45, 0.62, 0.76, 0.86, 1.0]:
        pg.evaluate(f"(()=>{{ __hq.unfold={k}; }})()"); pg.wait_for_timeout(250); pg.screenshot(path=f'{out}_u{int(k*100):03d}.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
