# Pictures: civilians leaving their houses after you capture a village's Derrick, and the top bar / panel with the
# game clock and the Sell button. Usage: python3 tests/pic_civilians.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=true; const step=(s)=>{ for(let i=0;i<s*20;i++) update(0.05); }; game.paused=false;
      for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s);
      const d=game.ents.filter(e=>e.type==='derrick').sort((a,b)=>a.x-b.x)[0];
      const en=spawn('engineer',0,d.x-40,d.y+70); en.order={type:'capture',target:d.id};
      for (let i=0;i<4;i++) spawn('soldier',0,d.x-20+i*16,d.y+130);
      step(6); game.paused=true; fog[0].vis.fill(1); fog[0].exp.fill(1); window.updateFog=()=>{};
      fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
      cam.zoom=2.0; cam.x=d.x; cam.y=d.y+20;
      game.selected=new Set(game.ents.filter(e=>e.type==='civilian').map(e=>e.id)); })()""")
    pg.wait_for_timeout(600)
    pg.screenshot(path=out + '_village.png')
    # close-up of a few civilians
    pg.evaluate("""(()=>{ const c=game.ents.filter(e=>e.type==='civilian'); game.selected=new Set(); cam.zoom=4.2; cam.x=c[0].x+10; cam.y=c[0].y; })()""")
    pg.wait_for_timeout(400)
    pg.screenshot(path=out + '_close.png', clip={'x': 250, 'y': 150, 'width': 400, 'height': 300})
    # HUD: a Barracks selected shows Sell; the clock sits next to your money
    pg.evaluate("""(()=>{ const hq=hqOf(0); const bar=spawn('barracks',0,hq.x+150,hq.y-20); bar.built=true; bar.progress=1;
      game.time=754; game.selected=new Set([bar.id]); cam.zoom=1.2; cam.x=hq.x+80; cam.y=hq.y; })()""")
    pg.wait_for_timeout(600)
    pg.screenshot(path=out + '_hud.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
