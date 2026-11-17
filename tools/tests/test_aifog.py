import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8838), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8838/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(pg.evaluate("""(()=>{
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
      const log=[]; let firstHarvest=null, found=null, firstHit=null;
      const hq=hqOf(0); const hp0=hq.hp;
      for(let i=0;i<20*400 && !game.over;i++){
        update(0.05);
        const t=i/20;
        if(firstHarvest===null && game.ents.some(e=>e.team===1&&e.type==='extractor'&&e.order&&e.order.phase==='mining')) firstHarvest=t;
        if(found===null && game.ai.known.size) found=t;
        if(firstHit===null && game.ents.some(e=>e.team===0&&e.hp<e.maxHp)) firstHit=t;
      }
      return {aiFirstMining:firstHarvest, aiFoundYourBase:found, firstDamageToYou:firstHit, over:game.over,
              aiExplored: Math.round(100*fog[1].exp.reduce((a,b)=>a+b,0)/fog[1].exp.length)+'%',
              ai: game.ents.filter(e=>e.team===1).map(e=>e.type).join(',')};
    })()"""), errs); b.close()
srv.shutdown()
