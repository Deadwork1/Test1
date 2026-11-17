import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8821), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8821/index.html'); pg.wait_for_timeout(300)
    print(json.dumps(pg.evaluate("""(()=>{ difficulty='normal'; newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); hqOf(0).hp=hqOf(0).maxHp=1e9;
      const log=[]; const _ap=aiPlace; aiPlace=(hq,t)=>{const r=_ap(hq,t); log.push([Math.round(game.time),t,r]); return r;};
      const _pt=aiPlaceTower; aiPlaceTower=(hq)=>{const r=_pt(hq); log.push([Math.round(game.time),'tower*',r]); return r;};
      for(let i=0;i<20*330;i++) update(0.05);
      const valid={}; for(const t of ['refinery','tower','barracks']){ let n=0; for(let x=0;x<W;x+=20) for(let y=0;y<H;y+=20) if(canPlace(1,t,x,y)) n++; valid[t]=n; }
      return {log:log.slice(-12), valid, cash:Math.floor(game.credits[1]), sent:game.ai.wavesSent, ext:game.ents.filter(e=>e.team===1&&e.type==='extractor').length, cant:game.ai.cantPlace};})()""")), errs)
    b.close()
srv.shutdown()
