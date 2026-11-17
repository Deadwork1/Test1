import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2])
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(400)
    pg.screenshot(path='out/start_large.png')
    print(json.dumps(pg.evaluate("""(()=>{ const r={map:mapChoice, W, H};
      const P=(a,b,v,t)=>{const p=findPath(a.x,a.y,b.x,b.y,v,t); return p?p.length:null};
      r.startsOnGrass=START.map(s=>terrainAt(s.x,s.y)===T.GRASS);
      r.baseToBase=[P(START[0],START[1],true,0), P(START[0],START[1],false,0)];
      r.youToFields=ORE_FIELDS.map(f=>P(START[0],f,true,0)); r.enemyToFields=ORE_FIELDS.map(f=>P(START[1],f,true,1));
      r.oreOffGrass=game.ore.filter(o=>terrainAt(o.x,o.y)!==T.GRASS).length; r.ore=game.ore.length; r.totalOre=game.ore.reduce((s,o)=>s+o.amount,0);
      r.fieldsNodesOK = ORE_FIELDS.map(f=>game.ore.filter(o=>Math.hypot(o.x-f.x,o.y-f.y)<f.spread+5).length);
      const t0=performance.now(); for(let i=0;i<20;i++) findPath(START[0].x,START[0].y,START[1].x,START[1].y,true,0); r.msLongPath=((performance.now()-t0)/20).toFixed(2);
      return r;})()""")))
    pg.click('#ovBtn')
    pg.evaluate("for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;} const d=fogImg.data; for(let i=3;i<d.length;i+=4)d[i]=0; fogCtx.putImageData(fogImg,0,0); updateFog=()=>{}; game.paused=true; cam.x=W/2;cam.y=H/2;setZoom(0.1);clampCam(); MM.hidden=true;")
    pg.wait_for_timeout(300); pg.screenshot(path='out/large_map.png')
    print(errs[:3]); b.close()
srv.shutdown()
