import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8768), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8768/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(pg.evaluate("""(()=>{
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
      const hq=hqOf(0); placeBuilding(0,'refinery',hq.x+150,hq.y-60);
      const credits=Math.floor(game.credits[0]);
      for(let i=0;i<20*14;i++) update(0.05);
      const ex=game.ents.filter(e=>e.type==='extractor');
      return {mine: ex.filter(e=>e.team===0).length, mineIdle: ex.filter(e=>e.team===0).every(e=>!e.order), enemy: ex.filter(e=>e.team===1).length, creditsAfterPlace: credits, creditsNow: Math.floor(game.credits[0])};
    })()"""), errs); b.close()
srv.shutdown()
