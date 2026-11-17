import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8776), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8776/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{runAI=()=>{}; game.credits[0]=5000;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      placeBuilding(0,'barracks',hq.x+140,hq.y-20); placeBuilding(0,'refinery',hq.x+40,hq.y-150);
      for(let i=0;i<20*13;i++) update(0.05);
      const r=game.ents.find(e=>e.type==='refinery'); game.selected=new Set([r.id]);
      const bk=game.ents.find(e=>e.type==='barracks'); produce(bk);
      cam.x=hq.x+60;cam.y=hq.y-70;setZoom(1.9);clampCam();})()""")
    pg.wait_for_timeout(500); pg.screenshot(path='out/bld.png')
    print(errs); b.close()
srv.shutdown()
