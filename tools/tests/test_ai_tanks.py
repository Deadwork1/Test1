import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ const out={};
      for (const dif of ['easy','normal','hard']) { difficulty=dif;
        newGame(); deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
        // a stout player base so the game runs the full 12 minutes
        const h=hqOf(0); for(const [dx,dy] of [[-120,0],[120,0],[0,-120]]){ const t=spawn('tower',0,h.x+dx,h.y+dy); t.built=true; t.progress=1; t.hp=t.maxHp=99999; } h.hp=h.maxHp=99999; bldDirty=true;
        const made={}; const P0=produce; produce=(b,u)=>{const ok=P0(b,u); if(ok&&b.team===1){const k=u||PRODUCES[b.type][0]; made[k]=(made[k]||0)+1;} return ok;};
        const firstAt={};
        for(let i=0;i<20*720;i++){ update(0.05); if(i%200===0) for(const e of game.ents) if(e.team===1&&isBuilding(e)&&e.built&&!(e.type in firstAt)) firstAt[e.type]=Math.round(game.time); }
        produce=P0;
        out[dif]={trained:made, buildingsFirstFinishedAt:firstAt, wavesSent:game.ai.wavesSent||0, over:game.over||null};
      } return out; })()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
