import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8780), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8780/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{
      runAI=()=>{}; game.credits[0]=9000;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      placeBuilding(0,'refinery',hq.x+170,hq.y-110);
      for(let i=0;i<20*13;i++) update(0.05);
      const ref=game.ents.find(e=>e.type==='refinery');
      const ex=game.ents.find(e=>e.type==='extractor');
      ex.x=ref.x+10; ex.y=ref.y-ref.size/2-40; ex.cargo=150; ex.nav=null;   // loaded truck BEHIND the refinery
      ex.order={type:'harvest',node:game.ore[0].id,lastX:ex.x,lastY:ex.y,phase:'toBase'};
      window.trail=[]; for(let i=0;i<20*12;i++){update(0.05); trail.push([ex.x,ex.y,ex.order&&ex.order.phase]);}
      window.phases=[...new Set(trail.map(t=>t[2]))];
      const _d=draw; draw=function(){ _d(); const s=scale(); ctx.setTransform(scr.dpr*s,0,0,scr.dpr*s,scr.dpr*(scr.w/2-cam.x*s),scr.dpr*(scr.h/2-cam.y*s));
        ctx.strokeStyle='#ff3df5'; ctx.lineWidth=3; ctx.beginPath(); trail.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); };
      game.paused=true; cam.x=ref.x; cam.y=ref.y; setZoom(1.7); clampCam();
    })()""")
    pg.wait_for_timeout(300); pg.screenshot(path='out/route.png')
    print(pg.evaluate("phases"), errs); b.close()
srv.shutdown()
