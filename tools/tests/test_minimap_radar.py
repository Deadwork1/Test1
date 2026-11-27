# v5.71: no minimap (and no Map button) until you have a finished Radar; a Satellite Radar counts; lose it and it goes.
# Usage: python3 tests/test_minimap_radar.py <game folder> <port> [picture folder]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
pics = sys.argv[3] if len(sys.argv) > 3 else None
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 860}, device_scale_factor=2, has_touch=True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal'); localStorage.removeItem('mini-rts-minimap')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      window.hq=hqOf(0); game.credits[0]=20000;
      window.place=t=>{ for(let k=0;k<4000;k++){ const a=Math.random()*6.3, d=hq.size/2+60+Math.random()*240, x=hq.x+Math.cos(a)*d, y=hq.y+Math.sin(a)*d; if(canPlace(0,t,x,y)&&placeBuilding(0,t,x,y)) return game.ents[game.ents.length-1]; } };
      window.state=()=>{ updateHUD(); return {btn: document.getElementById('btnMap').style.display!=='none', on: minimapOn(), info: document.getElementById('info') ? document.getElementById('info').textContent : ''}; };
      window.finish=()=>{ let k=0; while(goingUp(0).length && k<20*60){ U(1); k++; } }; })()""")
    pg.wait_for_timeout(300)
    if pics: pg.screenshot(path=f'{pics}/mm_none.png')
    r = json.loads(pg.evaluate("""(()=>{ const o={start:state()}; place('power'); finish(); const rd=place('radar'); U(20); o.building=state(); finish(); o.built=state(); return JSON.stringify(o); })()"""))
    pg.wait_for_timeout(300)
    if pics: pg.screenshot(path=f'{pics}/mm_radar.png')
    r2 = json.loads(pg.evaluate("""(()=>{ const rd=game.ents.find(e=>e.team===0&&e.type==='radar'); rd.hp=0; U(5); const o={lost:state()};
      const s=spawn('satellite',0,hq.x+150,hq.y-200); s.built=true; s.progress=1; s.hp=s.maxHp; U(2); o.sat=state(); return JSON.stringify(o); })()"""))
    print(r, r2)
    check(not r['start']['btn'] and not r['start']['on'], 'no minimap and no Map button at the start')
    check(not r['building']['on'], 'still none while the Radar is going up')
    check(r['built']['btn'] and r['built']['on'], 'the Radar finishes: minimap and Map button appear')
    check(not r2['lost']['btn'] and not r2['lost']['on'], 'Radar destroyed: minimap gone again')
    check(r2['sat']['on'], 'a Satellite Radar brings it back')
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
