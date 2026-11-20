# The computer's helicopters (v5.49): on Normal and Hard it builds a Helipad (1 / 2) after its second wave once it has a War Factory,
# a helicopter for each, raids your Extractors / Artillery it can see (else a Refinery it knows), flies home to reload,
# and builds SAM Sites (1 / 2) once it has seen your aircraft. Your HQ is made unbreakable so the game lasts.
# Usage: python3 test_ai_heli.py <game folder> <port> [difficulties, default normal,hard] [map, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={log:[]};
 deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.maxHp=hq.hp=1e9; game.paused=false;
 const put=(t,x,y)=>{ const b=spawn(t,0,x,y); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
 const ref=put('refinery',hq.x+170,hq.y-60); releaseUnit(ref); const keep=[ref]; for (const [t,dx,dy] of [['power',-170,-60],['barracks',0,-200],['power',-150,170]]) keep.push(put(t,hq.x+dx,hq.y+dy));   // (patched up every step, so the raids always have something to go for)
 const step=(sec)=>{ for(let k=0;k<sec*20;k++){ U(0.05); for (const b of keep) if (b.hp>0 && b.team===0) b.hp=b.maxHp; for (const e of game.ents) if(e.team===0&&e.type==='extractor'&&!e.order) autoHarvest(e); if(game.over) break; } };
 let t0=0, raided=0, shown=false;
 for (let m=1;m<=24 && !game.over;m++){ step(60);
   const hs=game.ents.filter(e=>e.team===1&&e.air);
   out.log.push({min:m, pads:game.ents.filter(e=>e.team===1&&e.type==='helipad').length, helis:hs.length, flying:hs.filter(h=>!h.landed).length, sams:game.ents.filter(e=>e.team===1&&e.type==='sam').length, sent:game.ai.wavesSent||0, factory:game.ents.some(e=>e.team===1&&e.type==='factory'&&e.built), cash:Math.round(game.credits[1]), army:game.ents.filter(e=>e.team===1&&isCombat(e)&&!e.air).length, atHome:game.ents.filter(e=>e.team===1&&isCombat(e)&&!e.air&&!e.role).length, waveSize:game.ai.waveSize});
   if (m===14 && !shown) { shown=true; const pad=put('helipad',hq.x-170,hq.y+40); const h=releaseUnit(pad,'heli'); const eh=hqOf(1); if(eh){ h.order={type:'move',x:eh.x-300,y:eh.y+200}; } }   // let it see one of yours
 }
 const r=buildReport(); out.result=r.result; out.enemyHelisMade=r.made.enemy.heli||0; out.enemyHeli=r.byUnit.enemy.heli||null; out.heliKilled=r.whoKilled.enemy.heli||null; out.samKilled=r.whoKilled.enemy.sam||null; out.seenAir=!!game.ai.seenAir;
 out.yourExtractorsLost=r.lost.you.extractor||0;
 return out; })()
'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    m = sys.argv[4] if len(sys.argv) > 4 else 'large'
    for d in (sys.argv[3] if len(sys.argv) > 3 else 'normal,hard').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-difficulty','{d}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        r = pg.evaluate(JS); log = r.pop('log')
        print(d, json.dumps(r)); print('  per minute:', ' '.join(f"{x['min']}:{x['pads']}p{x['helis']}h{x['flying']}f{x['sams']}s/w{x['sent']}{'F' if x['factory'] else ''}a{x['army']}/{x['atHome']}~{x['waveSize']}" for x in log)); print('  errors', errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
