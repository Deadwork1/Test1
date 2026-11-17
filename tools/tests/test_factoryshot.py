# draws every building and unit type for a few hundred frames and fails on ANY error, so a missing draw function can't slip through again
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=3); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1;
      const types=['hq','barracks','refinery','power','tower','factory','wall','gate','soldier','buggy','extractor','settler'];
      let x=300; for(const t of types){ for(const team of [0,1]){ const e=spawn(t,team,x,team?560:420); if(isBuilding(e)){e.built=true;e.progress=1;e.hp=e.maxHp;} } x+=110; }
      const pw=game.ents.find(e=>e.type==='factory'&&e.team===0); pw.queue=1; pw.qTypes=['buggy']; pw.trainT=4; cam.x=pw.x; cam.y=pw.y+20; setZoom(2.2); clampCam(); window._pw=pw;
    })()""")
    pg.wait_for_timeout(1500)
    pg.evaluate("document.getElementById('panel').style.display='none'; document.getElementById('top').style.display='none'")
    pg.wait_for_timeout(100); pg.screenshot(path='out/factory.png')
    pg.evaluate("cam.x=W/2; cam.y=500; setZoom(0.6); clampCam();"); pg.wait_for_timeout(500)
    print('ERRORS:', errs[:3]); b.close()
srv.shutdown()
