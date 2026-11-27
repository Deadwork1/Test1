# Where does the computer plan its walls? For each map: its entrances (gaps), whether each became a wall plan, or whether
# it fell back to the straight wall 330 in front of its HQ; distance of each gate from its HQ. Optional picture.
# Usage: python3 tests/dbg_wallplans.py <game folder> <port> <map> [random size] [map number] [out.png]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m = sys.argv[3]; rs = sys.argv[4] if len(sys.argv) > 4 else 'large'; seed = sys.argv[5] if len(sys.argv) > 5 else '1'; out = sys.argv[6] if len(sys.argv) > 6 else None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 640})
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html')
    pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-rsize','{rs}'); localStorage.setItem('mini-rts-seed','{seed}'); localStorage.setItem('mini-rts-difficulty','hard'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      const hq=hqOf(1), ents=findEntrances(1), plans=ents.map(planGapWall);
      const used = (typeof aiWallPlans==='function' ? (aiWallPlans(hq).length ? 'WALLS (sealed)' : 'NO WALLS (open base)') + ' / ' : '') + (plans.filter(Boolean).length ? 'gaps' : 'fallback straight wall');
      const pl = plans.filter(Boolean).length ? plans.filter(Boolean) : [aiWallPlan(hq)];
      window.PL=pl; window.ENT=ents;
      return JSON.stringify({hq:{x:Math.round(hq.x),y:Math.round(hq.y)}, used, entrances: ents.map((e,i)=>({x:Math.round(e.x),y:Math.round(e.y),d:Math.round(Math.hypot(e.x-hq.x,e.y-hq.y)),width:Math.round(Math.hypot(e.bx-e.ax,e.by-e.ay)),plan:!!plans[i]})),
        gates: pl.map(p=>({x:Math.round(p.gate.x),y:Math.round(p.gate.y),d:Math.round(Math.hypot(p.gate.x-hq.x,p.gate.y-hq.y)),tiles:p.tiles.length}))}); })()"""))
    print(m, rs, seed, json.dumps(r))
    if out:
        pg.evaluate("""(()=>{ const hq=hqOf(1); for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=hq.x-250; cam.y=hq.y+200; setZoom(0.7); clampCam(); for(let i=0;i<3;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} update(0.05); } game.paused=true;
          const cv=document.querySelector('canvas'), c2=cv.getContext('2d');
          const over=()=>{ const s=scale(), dpr=cv.width/scr.w, P=(x,y)=>[((x-cam.x)*s+scr.w/2)*dpr, ((y-cam.y)*s+scr.h/2)*dpr]; c2.save(); c2.setTransform(1,0,0,1,0,0);
            for(const p of PL){ c2.fillStyle='rgba(255,60,60,0.85)'; for(const t of p.tiles){ const [x,y]=P(t.x,t.y); c2.fillRect(x-5*dpr,y-5*dpr,10*dpr,10*dpr); } const [gx,gy]=P(p.gate.x,p.gate.y); c2.fillStyle='#ffe14d'; c2.fillRect(gx-8*dpr,gy-8*dpr,16*dpr,16*dpr); }
            c2.strokeStyle='#5cf'; c2.lineWidth=2*dpr; for(const e of ENT){ const [ax,ay]=P(e.ax,e.ay), [bx,by]=P(e.bx,e.by); c2.beginPath(); c2.moveTo(ax,ay); c2.lineTo(bx,by); c2.stroke(); }
            c2.restore(); }; const d0=draw; draw=()=>{ d0(); over(); }; })()""")
        pg.wait_for_timeout(600); pg.screenshot(path=out)
    b.close()
