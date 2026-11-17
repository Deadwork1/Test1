import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8785), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8785/index.html'); pg.wait_for_timeout(400)
    pg.screenshot(path='out/start.png')
    for d in ['easy','normal','hard']:
        pg.click(f'#diffRow button[data-d="{d}"]')
        r = pg.evaluate("""(()=>{ newGame(); game.paused=false;
          deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
          let at3=null, firstHit=null;
          for(let i=0;i<20*420 && !game.over;i++){ update(0.05);
            if(i===20*180) at3=game.ents.filter(e=>e.team===1&&e.type==='soldier').length;
            if(firstHit===null && game.ents.some(e=>e.team===0&&e.hp<e.maxHp)) firstHit=Math.round(game.time); }
          return {difficulty, enemySoldiersAt3min:at3, firstAttackOnYou_s:firstHit, overAt_s: game.over?Math.round(game.time):null}; })()""")
        print(json.dumps(r))
    print('stored:', pg.evaluate("localStorage.getItem('mini-rts-difficulty')"), errs); b.close()
srv.shutdown()
