import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8836), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8836/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print([pg.inner_text(f'#{i}') for i in ['btnBarracks','btnRefinery','btnPower','btnTower','btnWall','btnGate']])
    print('charged:', pg.evaluate("(()=>{runAI=()=>{}; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); const c0=game.credits[0]; for(let d=110;d<300;d+=10) for(let a=0;a<6.3;a+=0.3){ if(placeBuilding(0,'power',hq.x+Math.cos(a)*d,hq.y+Math.sin(a)*d)) return Math.round(c0-game.credits[0]); } })()"), errs)
    b.close()
srv.shutdown()
