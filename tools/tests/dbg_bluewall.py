import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.evaluate(open('sim/bot.js').read())
    print(pg.evaluate("""(()=>{ const log=[]; const PB=window.placeBuilding; window.placeBuilding=(t,ty,x,y,v)=>{const ok=PB(t,ty,x,y,v); if(t===0&&(ty==='gate'||ty==='tower')) log.push([ty,Math.round(x),Math.round(y),ok,Math.round(game.time), Math.round(game.credits[0])]); return ok;};
      const r=runSim('mixed', 6); const ents=findEntrances(0); return JSON.stringify({ents:ents.map(c=>[Math.round(c.x),Math.round(c.y)]), plans:ents.map(planGapWall).map(p=>p&&{gate:p.gate,n:p.tiles.length}), log, gates:game.ents.filter(e=>e.team===0&&e.type==='gate').length, walls:game.ents.filter(e=>e.team===0&&e.type==='wall').length, built:r.playerBuilt}); })()"""), errs[:3])
    b.close()
srv.shutdown()
