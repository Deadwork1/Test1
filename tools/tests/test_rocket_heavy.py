# Rocket Soldiers against Heavy Tanks (v5.50): rockets do 2x to Heavy Tanks (was 1.5x) and the computer's Rocket Soldiers gang up on
# a Heavy Tank they can see. 12 enemy Rocket Soldiers meet 3 of your Heavy Tanks escorted by 4 Buggies on open grass, with the
# computer's brain running. Reports what died on each side and when the first Heavy Tank fell.
# Usage: python3 test_rocket_heavy.py <game folder> <port> [trials, default 3]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''((seed)=>{ const U=update; window.update=()=>{}; window.draw=()=>{};
 deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.paused=false; fog[0].vis.fill(1); fog[1].vis.fill(1); fog[0].exp.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{};
 for (let k=0;k<40;k++) U(0.05);   // let the computer deploy
 let c=null; for (let y=500;y<H-500&&!c;y+=25) for (let x=W*0.35;x<W*0.65&&!c;x+=25){ let ok=true; for(let i=-12;i<=12&&ok;i++) for(let j=-5;j<=5;j++) if(terrainAt(x+i*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok) c={x,y}; }
 const rk=[]; for (let k=0;k<12;k++) rk.push(spawn('rocket',1,c.x+120+(k%4)*18,c.y+(Math.floor(k/4)-1)*20+seed));
 const mine=[]; for (let k=0;k<3;k++) mine.push(spawn('heavy',0,c.x-200,c.y+(k-1)*45)); for (let k=0;k<4;k++) mine.push(spawn('buggy',0,c.x-160+(k%2)*30,c.y-80+Math.floor(k/2)*160));
 for (const u of mine) u.order={type:'attackmove',x:c.x+400,y:c.y};
 let firstHeavy=null, k=0; while (k<20*60) { U(0.05); k++; if (firstHeavy===null && mine.slice(0,3).some(u=>u.hp<=0)) firstHeavy=+(k/20).toFixed(1); if (rk.every(r=>r.hp<=0) || mine.every(u=>u.hp<=0)) break; }
 return {heaviesLost: mine.slice(0,3).filter(u=>u.hp<=0).length, buggiesLost: mine.slice(3).filter(u=>u.hp<=0).length, rocketsLost: rk.filter(r=>r.hp<=0).length, firstHeavyDownSec: firstHeavy, sec:+(k/20).toFixed(1)}; })'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for t in range(int(sys.argv[3]) if len(sys.argv) > 3 else 3):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print('trial', t, json.dumps(pg.evaluate(JS + f'({t*5})')), 'errors', errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
