import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.evaluate(open('sim/bot.js').read())
    print(pg.evaluate("""(()=>{ const log=[]; const PB=window.placeBuilding; let n=0;
      window.placeBuilding=(t,ty,x,y,v)=>{ const ok=PB(t,ty,x,y,v); if(t===0&&ty==='tech'&&n<3){n++; log.push({ok, credits:Math.round(game.credits[0]), unlocked:unlocked(0,'tech'), canPlace:canPlace(0,'tech',x,y), inArea:inBuildArea(0,x,y), free:siteIsFree(x,y,70), size:STATS.tech.size});} return ok; };
      const UL=window.unlocked; let calls=0; 
      const r=runSim('heavy',10); return JSON.stringify({log, built:r.playerBuilt, prod:r.produced[0]}); })()"""), errs)
    b.close()
srv.shutdown()
