import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8793), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8793/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    pg.evaluate("runAI=()=>{}; game.credits[0]=6000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.selected=new Set([hqOf(0).id]);")
    hq = pg.evaluate("[hqOf(0).x,hqOf(0).y]")
    pg.tap('#btnFactory'); pg.wait_for_timeout(80)
    fx,fy = hq[0]+170, hq[1]-110
    pg.touchscreen.tap(*toS(fx,fy)); pg.wait_for_timeout(80); pg.touchscreen.tap(*toS(fx,fy)); pg.wait_for_timeout(80)
    print('factory placed:', pg.evaluate("game.ents.some(e=>e.type==='factory')"))
    pg.evaluate("for(let i=0;i<20*15;i++) update(0.05); const f=game.ents.find(e=>e.type==='factory'); game.selected=new Set([f.id]);")
    print('produce label:', pg.inner_text('#btnProduce'))
    pg.tap('#btnProduce'); pg.tap('#btnProduce')
    pg.evaluate("for(let i=0;i<20*4;i++) update(0.05)")
    pg.evaluate("(()=>{const f=game.ents.find(e=>e.type==='factory'); cam.x=f.x; cam.y=f.y+20; setZoom(1.8); clampCam();})()")
    pg.wait_for_timeout(150); pg.screenshot(path='out/bg0.png')
    r = pg.evaluate("""(()=>{ const out={};
      for(let i=0;i<20*12;i++) update(0.05);
      const bugs=game.ents.filter(e=>e.type==='buggy'&&e.team===0); out.buggies=bugs.length;
      // speed test: drive 500 units on open ground
      const bg=bugs[0]; const sx=bg.x, sy=bg.y; bg.order={type:'move',x:bg.x,y:bg.y-400}; let t=0; while(bg.order&&t<400){update(0.05);t++;}
      out.secsFor400=(t/20).toFixed(1);
      // forest: vehicle path avoids forest at (430,620)
      const p=findPath(430,800,430,450,true,0); out.pathAvoidsForest = !!p && p.every(q=>terrainAt(q.x,q.y)!==T.FOREST);
      // 1 buggy vs 2 soldiers
      bg.hp=bg.maxHp; bg.x=sx; bg.y=sy-500; bg.order=null; game.selected=new Set();
      const f1=spawn('soldier',1,bg.x+60,bg.y-60), f2=spawn('soldier',1,bg.x+80,bg.y-40);
      for(let i=0;i<20*20;i++) update(0.05);
      out.buggyVs2Soldiers={buggyHp:Math.max(0,Math.round(bg.hp)), soldiersLeft:[f1,f2].filter(f=>f.hp>0).length};
      return out;})()""")
    print(json.dumps(r))
    print(errs); b.close()
srv.shutdown()
