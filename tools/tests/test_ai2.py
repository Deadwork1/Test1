import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2]); diffs=sys.argv[3].split(',')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(300)
    for d in diffs:
        pg.evaluate(f"difficulty='{d}'")
        r = pg.evaluate("""(()=>{ newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
          // player: HQ + 4 soldiers guarding at home, HQ very tough so the game runs long
          deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.hp=hq.maxHp=1e9;
          const waves=[]; let lastSize=null, firstWaveAt=null, maxHit=0;
          for(let i=0;i<20*480;i++){ update(0.05);
            const ws=game.ai.waveSize; if(lastSize!==null && ws!==lastSize){ const n=game.ents.filter(e=>e.team===1&&e.role==='wave').length; waves.push({t:Math.round(game.time),size:n}); if(firstWaveAt===null) firstWaveAt=Math.round(game.time);} lastSize=ws;
            const near=game.ents.filter(e=>e.team===1&&isCombat(e)&&Math.hypot(e.x-hq.x,e.y-hq.y)<400).length; maxHit=Math.max(maxHit,near);
          }
          const c={}; game.ents.filter(e=>e.team===1).forEach(e=>c[e.type]=(c[e.type]||0)+1);
          return {difficulty, waves:waves.slice(0,6), mostEnemyUnitsAtYourBaseAtOnce:maxHit, ai:c,
                  roles:game.ents.filter(e=>e.team===1&&isCombat(e)).reduce((m,e)=>{m[e.role||'gathering']=(m[e.role||'gathering']||0)+1;return m;},{})}; })()""")
        print(json.dumps(r))
    print('ERRORS', errs[:3]); b.close()
srv.shutdown()
