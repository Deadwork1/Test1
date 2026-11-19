# The computer's SAM Sites go where your aircraft fly most (v5.49.1): it keeps a heat map of where it has seen them and builds
# under the busiest spot it can cover. Here one of your helicopters (kept alive, out of missiles) hovers over one spot by its
# base, then another; each SAM Site should go up close enough to cover the spot it was hovering over.
# Usage: python3 test_sam_heat.py <game folder> <port> [difficulty, default hard] [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.maxHp=hq.hp=1e9; game.paused=false;
 const step=(sec,f)=>{ for(let k=0;k<sec*20;k++){ U(0.05); if(f) f(); } };
 step(420);   // let it build up its base (it needs a Power Plant for SAM Sites)
 const ehq=hqOf(1); const away=Math.atan2(H/2-ehq.y, W/2-ehq.x);
 const spots=[0.9,-0.9].map(da=>({x:ehq.x+Math.cos(away+da)*330, y:ehq.y+Math.sin(away+da)*330}));
 const pad=spawn('helipad',0,hq.x-170,hq.y+40); pad.built=true; pad.progress=1; const h=releaseUnit(pad,'heli');
 out.spots=spots.map(s=>[s.x|0,s.y|0]); out.sams=[];
 for (const s of spots) {
   h.landed=false; h.alt=1; h.x=s.x; h.y=s.y;
   const n0=game.ents.filter(e=>e.team===1&&e.type==='sam').length; let k=0;
   while (k<20*150 && game.ents.filter(e=>e.team===1&&e.type==='sam').length===n0) { h.hp=h.maxHp; h.ammo=0; h.x=s.x+Math.cos(k/40)*30; h.y=s.y+Math.sin(k/40)*30; h.order={type:'move',x:h.x,y:h.y,arrived:true}; U(0.05); k++; }
   const sam=game.ents.filter(e=>e.team===1&&e.type==='sam').slice(n0)[0];
   out.sams.push(sam ? {afterSec:+(k/20).toFixed(1), at:[sam.x|0,sam.y|0], distToSpot:Math.round(Math.hypot(sam.x-s.x,sam.y-s.y)), covers: Math.hypot(sam.x-s.x,sam.y-s.y) <= STATS.sam.range, distToHQ:Math.round(Math.hypot(sam.x-ehq.x,sam.y-ehq.y))} : 'none in 150 s');
 }
 out.hottest=Object.entries(game.ai.airHeat||{}).sort((a,b)=>b[1]-a[1]).slice(0,3);
 return out; })()'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    d = sys.argv[3] if len(sys.argv) > 3 else 'hard'
    for m in (sys.argv[4] if len(sys.argv) > 4 else 'large').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-difficulty','{d}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, d, json.dumps(pg.evaluate(JS)), 'errors', errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
