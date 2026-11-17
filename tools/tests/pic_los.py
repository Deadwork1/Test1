import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
root, port = sys.argv[1], int(sys.argv[2])
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','classic')")
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    print(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; const RD=draw; window.draw=()=>{}; window.drawMinimap=()=>{};
      newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; spawn('hq',1,W-200,H-200).built=true;
      // find a long horizontal rock ridge and put a soldier just below it, an enemy just above it
      let best=null; for(let y=200;y<H-200;y+=25) for(let x=200;x<W-200;x+=25){ let n=0; for(let k=-4;k<=4;k++) if(terrainAt(x+k*25,y)===T.ROCK) n++; if(n===9 && terrainAt(x,y+60)===T.GRASS && terrainAt(x,y-60)===T.GRASS){ best={x,y}; break; } if(best) break; }
      const me=spawn('soldier',0,best.x,best.y+55); me.passive=true; me.order=null;
      const foe=spawn('soldier',1,best.x+10,best.y-70); foe.passive=true; foe.order=null;
      const side=spawn('soldier',1,best.x+190,best.y+40); side.passive=true; side.order=null;
      for(let i=0;i<4;i++) U(0.05);
      window.TT={best, foeSeen:visibleAt(foe.x,foe.y,0), sideSeen:visibleAt(side.x,side.y,0)};
      cam.zoom=1.4; cam.x=best.x; cam.y=best.y; RD(); return JSON.stringify(window.TT); })()"""), errs[:2])
    pg.locator('#c').screenshot(path='los.jpg', type='jpeg', quality=90)
    b.close()
srv.shutdown()
