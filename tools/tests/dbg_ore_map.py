# Where's the ore? For one map: each side's start, the ore fields (clusters of crystals) with their size and
# walking distance from each HQ, and a picture of the whole map with ore circled.
# Usage: python3 tests/dbg_ore_map.py <game folder> <port> <map: large|huge|classic|random> [random size] [map number] [out.png]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m = sys.argv[3]; rs = sys.argv[4] if len(sys.argv) > 4 else 'large'; seed = sys.argv[5] if len(sys.argv) > 5 else '1'; out = sys.argv[6] if len(sys.argv) > 6 else None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}, device_scale_factor=1)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html')
    pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-rsize','{rs}'); localStorage.setItem('mini-rts-seed','{seed}'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      const hq=[hqOf(0),hqOf(1)];
      // cluster crystals within 140 of each other
      const cl=[]; for(const o of game.ore){ if(o.amount<=0) continue; let c=cl.find(c=>c.some(q=>Math.hypot(q.x-o.x,q.y-o.y)<140)); if(c) c.push(o); else cl.push([o]); }
      // merge clusters that touch
      let merged=true; while(merged){ merged=false; for(let i=0;i<cl.length&&!merged;i++) for(let j=i+1;j<cl.length&&!merged;j++) if(cl[i].some(a=>cl[j].some(b=>Math.hypot(a.x-b.x,a.y-b.y)<140))){ cl[i].push(...cl[j]); cl.splice(j,1); merged=true; } }
      const walk=(a,b)=>{ try{ const pth=findPath(a.x,a.y,b.x,b.y,0); if(!pth||!pth.length) return null; let d=0,px=a.x,py=a.y; for(const q of pth){ d+=Math.hypot(q.x-px,q.y-py); px=q.x; py=q.y; } return Math.round(d);}catch(e){ return 'err:'+e.message; } };
      const fields=cl.map(c=>{ const x=c.reduce((s,o)=>s+o.x,0)/c.length, y=c.reduce((s,o)=>s+o.y,0)/c.length; return {x:Math.round(x),y:Math.round(y),n:c.length,amount:Math.round(c.reduce((s,o)=>s+o.amount,0)),
        d0:Math.round(Math.hypot(x-hq[0].x,y-hq[0].y)), d1:Math.round(Math.hypot(x-hq[1].x,y-hq[1].y)), w0:walk(hq[0],{x,y}), w1:walk(hq[1],{x,y})}; });
      return JSON.stringify({W,H,hq:hq.map(h=>({x:Math.round(h.x),y:Math.round(h.y)})),fields}); })()"""))
    print('map', m, rs, seed, 'size', r['W'], 'x', r['H'], 'you HQ', r['hq'][0], 'computer HQ', r['hq'][1])
    for f in sorted(r['fields'], key=lambda f: f['d0']):
        print(f"  field at ({f['x']},{f['y']}) crystals {f['n']:2d} ore {f['amount']:6d}  from you: straight {f['d0']:5d} walk {f['w0']}  | from computer: straight {f['d1']:5d} walk {f['w1']}")
    if out:
        pg.evaluate("""(()=>{ fog[0].exp.fill(1); fog[0].vis.fill(1); MM.hidden=true; cam.x=W/2; cam.y=H/2; setZoom(0); clampCam(); game.paused=true; })()""")
        pg.wait_for_timeout(500); pg.screenshot(path=out)
    b.close()
