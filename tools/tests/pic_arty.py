import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=3); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn'); pg.wait_for_timeout(100)
    pg.evaluate("""(()=>{ runAI=()=>{}; endGame=()=>{}; for(const e of game.ents) if(isUnit(e)) e.hp=0; update(0.05);
      const x=1700,y=1250;
      const mk=(t,tm,px,py,f)=>{const u=spawn(t,tm,px,py); u.facing=f; u.turret=f; u.passive=true; u.order=null; return u;};
      mk('light',0,x-40,y-45,0); mk('artillery',0,x+40,y-45,0); mk('heavy',0,x+150,y-45,0);
      mk('light',1,x-40,y+35,Math.PI); const a=mk('artillery',1,x+60,y+35,Math.PI); a.turret=Math.PI-0.3; a.cooldown=STATS.artillery.cooldown; mk('heavy',1,x+150,y+35,Math.PI);
      game.effects=[]; game.grenades=[]; game.rockets=[];
      for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;} fog[0].vis.fill(1); const d=fogImg.data; for(let i=3;i<d.length;i+=4)d[i]=0; fogCtx.putImageData(fogImg,0,0); updateFog=()=>{}; hiddenFrom=()=>false; cam.x=x+48; cam.y=y-5; setZoom(3.2); clampCam(); game.paused=true; MM.hidden=true; game.selected=new Set();
      document.getElementById('panel').style.display='none'; document.getElementById('top').style.display='none'; })()""")
    pg.wait_for_timeout(300); pg.screenshot(path='out/arty.png')
    print(errs[:3]); b.close()
srv.shutdown()
