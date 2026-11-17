import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(pg.evaluate("""(()=>{ newGame(); const bad=(cx,cy)=>{let n=0; for(let x=cx-260;x<=cx+260;x+=10) for(let y=cy-110;y<=cy+110;y+=10) if(terrainAt(x,y)!==T.GRASS) n++; return n;};
      const out={here:bad(1500,1200)}; let best=null; for(let x=400;x<3200;x+=50) for(let y=300;y<2000;y+=50){const n=bad(x,y); if(!best||n<best.n) best={x,y,n};} out.best=best; return out; })()"""))
    b.close()
srv.shutdown()
