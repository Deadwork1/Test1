# Extractor looks side by side: empty, half full and mining, full, and the computer's colours, for each art style.
# Usage: python3 tests/pic_extractor.py <game folder> <port> <out prefix> [styles, default classic,truck,tracked,silo]
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]; styles = (sys.argv[4] if len(sys.argv) > 4 else 'classic,truck,tracked,silo').split(',')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 200}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel, #money, #sellBox, #mm, #hint { display:none !important }")
    pg.evaluate("""(()=>{ runAI=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); window.updateFog=()=>{ fogCtx.clearRect(0,0,COLS,ROWS); }; updateFog(); MM.hidden=true;
      let c=null; for (let y=300;y<H-300&&!c;y+=25) for (let x=300;x<W-300&&!c;x+=25){ let ok=true; for(let k=-8;k<=8&&ok;k++) for(let j=-3;j<=3;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS||elevAt(x+k*25,y+j*25)){ok=false;break;} if(ok && !game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<260) && !game.ents.some(e=>Math.hypot(e.x-x,e.y-y)<260)) c={x,y}; }
      const mk=(team,dx,cargo,mining,face)=>{ const u=spawn('extractor',team,c.x+dx,c.y); u.cargo=cargo; u.mining=mining; u.facing=face; u.order={type:'move',x:u.x,y:u.y}; u.passive=true; return u; };
      mk(0,-105,0,false,-0.3); mk(0,-35,250,true,-0.3); mk(0,35,500,false,-0.3); mk(1,105,250,true,2.6);
      cam.zoom=6.5; cam.x=c.x; cam.y=c.y; game.selected=new Set(); game.paused=true; })()""")
    for s in styles:
        pg.evaluate(f"EXTRACTOR_STYLE='{s}'"); pg.wait_for_timeout(450); pg.screenshot(path=f'{out}_{s}.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
