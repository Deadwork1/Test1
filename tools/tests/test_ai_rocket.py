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
      for (const withBuggies of [false, true]) {
        newGame(); const made={}; const P0=produce; produce=(b,u)=>{const ok=P0(b,u); if(ok&&b.team===1) made[u||'?']=(made[u||'?']||0)+1; return ok;}; deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
        let shown=false;
        for(let i=0;i<20*420;i++){ update(0.05); if(shown && !out.dbg && game.time>230){ const bs=game.ents.filter(e=>e.team===1&&e.type==='barracks'); out.dbg={seen:game.ai.seenBuggies, cash:game.credits[1], bq:bs.map(b=>b.qTypes.join(',')), src:runAI.toString().includes('wantRocket')}; }
          if(withBuggies && !shown && game.time>200){ const h=hqOf(1); if(h){ for(let k=0;k<3;k++){const u=spawn('buggy',0,h.x-260+k*20,h.y+150); u.passive=true; u.order=null;} shown=true; } }
          if(shown && game.time>215) for(const u of game.ents) if(u.team===0&&u.type==='buggy') u.hp=0;   // just a peek, then gone
        }
        const c={}; for(const e of game.ents) if(e.team===1&&isUnit(e)) c[e.type]=(c[e.type]||0)+1;
        c.seen=game.ai.seenBuggies; c.D=diff().label+' '+diff().rockets; c.rk=game.ents.filter(e=>e.team===1&&e.type==='rocket').length; c.trainedTotal=made; produce=P0; c.army=game.ents.filter(e=>e.team===1&&isCombat(e)).length; c.cash=Math.round(game.credits[1]); out[withBuggies?'AI saw 3 of your buggies':'AI never saw a buggy']=c;
      } return out; })()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
