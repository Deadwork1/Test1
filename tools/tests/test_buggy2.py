import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8796), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8796/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{const _ai=runAI; runAI=()=>{}; const x=START[0].x+250,y=START[0].y-150;
      const a=spawn('buggy',0,x,y); a.facing=-0.3; const b2=spawn('buggy',0,x+40,y+30); b2.facing=0.8; b2.order={type:'move',x:x+300,y:y+30};
      const s=spawn('soldier',1,x+120,y-40); s.hp=1e9; a.order={type:'attack',target:s.id};
      cam.x=x+40;cam.y=y;setZoom(2.2);clampCam(); window._ai=_ai;})()""")
    pg.wait_for_timeout(700); pg.screenshot(path='out/bg1.png')
    r = pg.evaluate("""(()=>{ newGame(); runAI=window._ai; game.paused=false; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); hqOf(0).hp=hqOf(0).maxHp=1e9; let firstBuggy=null;
      for(let i=0;i<20*420 && !game.over;i++){ update(0.05); if(firstBuggy===null && game.ents.some(e=>e.team===1&&e.type==='buggy')) firstBuggy=Math.round(game.time);}
      const ai=game.ents.filter(e=>e.team===1).map(e=>e.type); const c={}; ai.forEach(t=>c[t]=(c[t]||0)+1); return {difficulty, firstBuggy, over:game.over, at:Math.round(game.time), ai:c}; })()""")
    print(json.dumps(r), errs); b.close()
srv.shutdown()
