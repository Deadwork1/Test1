import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8789), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8789/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    pg.evaluate("runAI=()=>{}; game.credits[0]=3000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.selected=new Set([hqOf(0).id]);")
    hq = pg.evaluate("[hqOf(0).x,hqOf(0).y]")
    pg.tap('#btnTower'); pg.wait_for_timeout(100)
    tx,ty = hq[0]+150, hq[1]-90
    pg.touchscreen.tap(*toS(tx,ty)); pg.wait_for_timeout(100); pg.screenshot(path='out/tw0.png')
    pg.touchscreen.tap(*toS(tx,ty)); pg.wait_for_timeout(100)
    r = pg.evaluate("""(()=>{ const out={};
      const tw=game.ents.find(e=>e.type==='tower'); out.placed=!!tw; out.credits=Math.floor(game.credits[0]);
      for(let i=0;i<20*13;i++) update(0.05); out.built=tw.built;
      // 5 enemy soldiers walk at the tower
      const foes=[]; for(let i=0;i<5;i++){const f=spawn('soldier',1,tw.x+260+i*14,tw.y-30+i*10); f.order={type:'attackmove',x:tw.x,y:tw.y}; foes.push(f);}
      let t=0; while(foes.some(f=>f.hp>0) && tw.hp>0 && t<20*60){update(0.05);t++;}
      out.fightSecs=Math.round(t/20); out.towerHpLeft=Math.max(0,Math.round(tw.hp)); out.foesLeft=foes.filter(f=>f.hp>0).length;
      return out;})()""")
    print(json.dumps(r))
    pg.evaluate("(()=>{const tw=game.ents.find(e=>e.type==='tower'); if(tw){game.selected=new Set([tw.id]); cam.x=tw.x;cam.y=tw.y;setZoom(1.6);clampCam(); const f=spawn('soldier',1,tw.x+120,tw.y-60); f.order={type:'attackmove',x:tw.x,y:tw.y};} for(let i=0;i<12;i++)update(0.05);})()")
    pg.wait_for_timeout(200); pg.screenshot(path='out/tw1.png')
    print(errs); b.close()
srv.shutdown()
