import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8853), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8853/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ runAI=()=>{}; const log=[];
      const en2=spawn('engineer',0,1000,1800); const sh=spawn('soldier',1,1070,1800); sh.order={type:'attack',target:en2.id};
      for(let t=0;t<60;t++){ update(0.05); if(t%10===0) log.push({t, enHp:en2.hp, shOrder:sh.order&&sh.order.type, cd:+sh.cooldown.toFixed(2), vis1:visibleAt(en2.x,en2.y,1), hidden:hiddenFrom(en2,1), terr:terrainAt(en2.x,en2.y)}); }
      return log;})()""")), errs)
    b.close()
srv.shutdown()
