import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8804), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8804/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    pg.evaluate("runAI=()=>{}; game.credits[0]=9000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.selected=new Set([hqOf(0).id]);")
    spot = pg.evaluate("(()=>{const hq=hqOf(0); for(let d=120; d<300; d+=10) for(let a=0;a<6.28;a+=0.3){const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if(canPlace(0,'power',x,y)) return [x,y];} })()")
    pg.tap('#btnPower'); pg.wait_for_timeout(60); pg.touchscreen.tap(*toS(*spot)); pg.wait_for_timeout(60); pg.touchscreen.tap(*toS(*spot)); pg.wait_for_timeout(60)
    r = pg.evaluate("""(()=>{ const out={placedByTap: game.ents.some(e=>e.type==='power')};
      const hq=hqOf(0);
      const spotFor=(t)=>{for(let d=120; d<340; d+=10) for(let a=0;a<6.28;a+=0.25){const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if(canPlace(0,t,x,y)) return [x,y];}};
      const bs=spotFor('barracks'); placeBuilding(0,'barracks',bs[0],bs[1]);
      let t=0; const bk=game.ents.find(e=>e.type==='barracks'); while(!bk.built&&t<1000){update(0.05);t++;} out.barracksBuild_s_with1plant=(t/20).toFixed(1);
      out.boostWith1=powerBoost(0);
      const time=()=>{produce(bk,'soldier'); let n=0; const c0=game.ents.filter(e=>e.type==='soldier').length; while(game.ents.filter(e=>e.type==='soldier').length===c0&&n<1000){update(0.05);n++;} return (n/20).toFixed(1);};
      out.soldier_s_1plant=time();
      for(let i=0;i<3;i++){const s2=spotFor('power'); placeBuilding(0,'power',s2[0],s2[1]);} for(let i=0;i<20*10;i++) update(0.05);
      out.plants=game.ents.filter(e=>e.type==='power'&&e.built).length; out.boostNow=powerBoost(0);
      out.soldier_s_now=time();
      const pw=game.ents.find(e=>e.type==='power'); game.selected=new Set([pw.id]); cam.x=pw.x; cam.y=pw.y; setZoom(1.8); clampCam();
      return out;})()""")
    print(json.dumps(r)); pg.wait_for_timeout(200)
    print('info:', pg.inner_text('#info'), '| chip:', pg.inner_text('#powerChip'))
    pg.screenshot(path='out/power.png'); print(errs); b.close()
srv.shutdown()
