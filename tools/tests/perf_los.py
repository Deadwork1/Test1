import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    print(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; newGame(); game.paused=false; runAI=()=>{};
      for(let i=0;i<120;i++){ const u=spawn('soldier',i%2,300+Math.random()*3000,200+Math.random()*1800); u.passive=true; u.order={type:'move',x:300+Math.random()*3000,y:200+Math.random()*1800}; }
      let t0=performance.now(); for(let i=0;i<200;i++) U(0.05); const a=(performance.now()-t0)/200;
      t0=performance.now(); for(let i=0;i<200;i++) U(0.05); const b=(performance.now()-t0)/200;
      return 'ms per update: first 200 (filling cache) '+a.toFixed(2)+', next 200 '+b.toFixed(2)+', cache size '+losCache.size; })()"""))
    b.close()
srv.shutdown()
