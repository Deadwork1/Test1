import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8775), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8775/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{runAI=()=>{}; const x=START[0].x+200,y=START[0].y-120;
      for(let i=0;i<4;i++){const s=spawn('soldier',0,x+i*30,y); s.facing=-0.4+i*0.5;}
      for(let i=0;i<3;i++){const s=spawn('soldier',1,x+40+i*30,y-80); s.facing=2.2;}
      const m=spawn('soldier',0,x,y+60); m.order={type:'move',x:x+300,y:y+60};
      cam.x=x+50;cam.y=y-20;setZoom(2.2);clampCam();})()""")
    pg.wait_for_timeout(600); pg.screenshot(path='out/sold.png')
    print(errs); b.close()
srv.shutdown()
