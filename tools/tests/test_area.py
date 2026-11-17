import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8802), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8802/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ runAI=()=>{}; game.credits[0]=9000; const out={};
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      // furthest valid barracks spot from the HQ, then a spot just beyond the HQ's reach past it
      let best=null; for(let x=0;x<W;x+=10) for(let y=0;y<H;y+=10){ if(canPlace(0,'barracks',x,y)){const d=Math.hypot(x-hq.x,y-hq.y); if(!best||d>best.d) best={x,y,d};} }
      out.firstSpot=best;
      const ang=Math.atan2(best.y-hq.y,best.x-hq.x); let far=null;
      for(let d=best.d+100; d<best.d+260; d+=10){ const x=hq.x+Math.cos(ang)*d,y=hq.y+Math.sin(ang)*d; if(siteIsFree(x,y,74)){far={x,y}; break;} }
      out.far=far; out.farBefore=canPlace(0,'barracks',far.x,far.y);
      out.placedStep=placeBuilding(0,'barracks',best.x,best.y);
      out.farWhileBuilding=canPlace(0,'barracks',far.x,far.y);
      for(let i=0;i<20*13;i++) update(0.05);
      out.farAfterBuilt=canPlace(0,'barracks',far.x,far.y);
      game.placing={type:'barracks',ghost:null}; game.paused=true; cam.x=hq.x+250; cam.y=hq.y-120; setZoom(0.75); clampCam();
      return out;})()""")
    print(json.dumps(r)); pg.wait_for_timeout(200); pg.screenshot(path='out/area.png')
    print(errs); b.close()
srv.shutdown()
