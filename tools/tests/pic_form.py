import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 640}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    print(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; const RD=draw; window.draw=()=>{}; window.drawMinimap=()=>{};
      newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; spawn('hq',1,W-200,H-200).built=true;
      const us=[]; const mk=(t,n)=>{for(let i=0;i<n;i++){ us.push(spawn(t,0,250+Math.random()*120,300+Math.random()*140)); }};
      mk('soldier',12); mk('grenadier',3); mk('rocket',3); mk('light',2); mk('heavy',1);
      game.selected=new Set(us.map(u=>u.id)); groupMove(us, 560, 330);
      let t=0; while(t<20*20 && us.some(u=>u.order)){ U(0.05); t++; }
      fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); cam.zoom=1.6; cam.x=560; cam.y=330; window.SELKEEP=game.selected; game.selected=new Set(); RD();
      return JSON.stringify({secs:(t/20).toFixed(1), arrived: us.filter(u=>!u.order).length+'/'+us.length, left: us.filter(u=>u.order).map(u=>({t:u.type,d:Math.round(Math.hypot(u.order.x-u.x,u.order.y-u.y)),blockN:u.blockN,nav:!!u.nav, pace:u.pace&&u.pace.toFixed(2), near: game.ents.filter(o=>o!==u&&Math.hypot(o.x-u.x,o.y-u.y)<45).map(o=>o.type+(o.order?'*':'')+'@'+Math.round(o.x-u.x)+','+Math.round(o.y-u.y)).join(' '), terr:[terrainAt(u.x+20,u.y),terrainAt(u.x+40,u.y)], swerve:u.swerve&&u.swerve.side}))}); })()"""), errs[:2])
    pg.locator('#c').screenshot(path='formation.jpg', type='jpeg', quality=92)
    b.close()
srv.shutdown()
