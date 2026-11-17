import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8868), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8868/index.html'); pg.wait_for_timeout(300)
    print(json.dumps(pg.evaluate("""(()=>{ difficulty='normal'; newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); hqOf(0).hp=hqOf(0).maxHp=1e9;
      for(let i=0;i<20*170;i++) update(0.05);   // just before its first wave would leave
      const ehq=hqOf(1); const before=game.ents.filter(e=>e.team===1&&isCombat(e)).map(e=>e.role||'gathering');
      const raid=[]; for(let i=0;i<6;i++){ const u=spawn('soldier',0,ehq.x-260+i*12,ehq.y+260); u.order={type:'attackmove',x:ehq.x,y:ehq.y}; raid.push(u);}
      let maxFighting=0; for(let i=0;i<20*30;i++){ update(0.05); maxFighting=Math.max(maxFighting, game.ents.filter(e=>e.team===1&&isCombat(e)&&e.order&&e.order.type==='attack'&&raid.some(r=>r.id===e.order.target)).length); }
      return {aiArmyBeforeRaid: before, aiUnitsFightingRaidersAtOnce:maxFighting, raidersLeft: raid.filter(r=>r.hp>0).length, wavesSentDuringRaid: game.ai.wavesSent||0};})()""")), errs)
    b.close()
srv.shutdown()
