import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2]); d=sys.argv[3]
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(300)
    pg.evaluate(f"difficulty='{d}'")
    rows = pg.evaluate("""(()=>{ newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.hp=hq.maxHp=1e9;
      const out=[]; let earned=0; const _c=game.credits; 
      for(let i=1;i<=20*420;i++){ update(0.05);
        if(i%(20*30)===0){ const m=game.ents.filter(e=>e.team===1); const of=t=>m.filter(e=>e.type===t).length;
          out.push([Math.round(game.time), Math.floor(game.credits[1]), 'army',m.filter(isCombat).length, 'ext',of('extractor'), 'ref',of('refinery'), 'tow',of('tower'), 'wall',of('wall'), 'known',game.ai.known.size, 'wave',game.ai.waveSize,
            'gath', m.filter(e=>isCombat(e)&&!e.role).length]); } }
      return out; })()""")
    for r in rows: print(r)
    print('ERRORS', errs[:3]); b.close()
srv.shutdown()
