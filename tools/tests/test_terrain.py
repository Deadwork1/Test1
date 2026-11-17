import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8782), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8782/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{
      const r={};
      const P=(a,b,v)=>{const p=findPath(a.x,a.y,b.x,b.y,v); return p?p.length:null};
      r.startsGrass=START.map(s=>terrainAt(s.x,s.y));
      r.baseToBase_vehicle=P(START[0],START[1],true); r.baseToBase_infantry=P(START[0],START[1],false);
      r.toFields=ORE_FIELDS.map(f=>P(START[0],f,true)); r.enemyToFields=ORE_FIELDS.map(f=>P(START[1],f,true));
      r.oreNotOnGrass=game.ore.filter(o=>terrainAt(o.x,o.y)!==T.GRASS).length;
      r.oreCount=game.ore.length;
      const t0=performance.now(); for(let i=0;i<50;i++) findPath(START[0].x,START[0].y,START[1].x,START[1].y,true); r.msPerLongPath=((performance.now()-t0)/50).toFixed(2);
      return r;})()""")), errs)
    # whole map screenshot
    pg.evaluate("for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;} game.paused=true; cam.x=W/2;cam.y=H/2;setZoom(0.45);clampCam(); const _u=updateFog; updateFog=()=>{_u(); }")
    pg.evaluate("(()=>{const f=fog[0]; f.vis.fill(1); const d=fogImg.data; for(let i=3;i<d.length;i+=4)d[i]=0; fogCtx.putImageData(fogImg,0,0);})()")
    pg.wait_for_timeout(200); pg.screenshot(path='out/t_map.png')
    b.close()
srv.shutdown()
