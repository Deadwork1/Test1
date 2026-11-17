import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
port=9603; root='..'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
bot = open('bot.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page()
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn'); pg.evaluate(bot)
    print(pg.evaluate("""(()=>{ const log=[]; const U0=window.runSim; 
      // patch: sample inside via setInterval-free hook: wrap autoHarvest to sample
      const ah=window.autoHarvest; let last=-99; window.autoHarvest=(x)=>{ if(game.time-last>20){ last=game.time; log.push({t:Math.round(game.time), cash:Math.round(game.credits[0]), bld:game.ents.filter(e=>e.team===0&&isBuilding(e)).map(e=>e.type+(e.built?'':'*')).join(','), units:game.ents.filter(e=>e.team===0&&isUnit(e)).map(e=>e.type).join(','), START_CREDITS, INCOME}); } return ah(x); };
      const r=U0('mixed',5); return JSON.stringify(log,null,0); })()"""))
    b.close()
srv.shutdown()
