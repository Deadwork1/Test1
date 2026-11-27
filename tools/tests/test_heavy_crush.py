# v5.74: Heavy Tanks crush enemy Buggies and Rocket Bikes they drive over (as tanks crush infantry); Light Tanks don't, and
# nobody crushes their own side's.
# Usage: python3 tests/test_heavy_crush.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-faction','all'); localStorage.setItem('mini-rts-map','large')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); const U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      const open=r=>{ for(let k=0;k<6000;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-r;d<=r&&good;d+=15) for(let e=-40;e<=40&&good;e+=20) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ents.some(o=>Math.hypot(o.x-x,o.y-y)<r+80)) return {x,y}; } };
      const run=(tank, victim, vteam)=>{ const s=open(150); const t=spawn(tank,0,s.x-110,s.y); t.passive=true; t.hp=t.maxHp=1e9; const v=spawn(victim,vteam,s.x,s.y); v.passive=true; v.cooldown=1e9;
        t.order={type:'move',x:s.x+110,y:s.y}; let k=0; while(k<20*10 && v.hp>0 && t.order){ v.order=null; v.x=s.x; v.y=s.y; U(1); k++; } const res=v.hp<=0; t.hp=0; v.hp=0; U(2); return res; };
      return JSON.stringify({ heavyBuggy:run('heavy','buggy',1), heavyBike:run('heavy','bike',1), lightBuggy:run('light','buggy',1), heavyOwn:run('heavy','buggy',0), heavySoldier:run('heavy','soldier',1) }); })()"""))
    print(r)
    check(r['heavyBuggy'] and r['heavyBike'], 'a Heavy Tank crushes an enemy Buggy and an enemy Rocket Bike it drives over')
    check(r['heavySoldier'], 'and still crushes infantry')
    check(not r['lightBuggy'], "a Light Tank doesn't crush a Buggy")
    check(not r['heavyOwn'], "a Heavy Tank doesn't crush its own side's Buggy")
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
