import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const tk=spawn('heavy',0,1400,1200); const inf=spawn('soldier',1,1500,1200); inf.passive=true; inf.order=null;
        tk.order={type:'move',x:1600,y:1200}; tk.passive=true; const log=[];
        for(let i=0;i<20*6;i++){ update(0.05); if(i%10==0) log.push([Math.round(tk.x),Math.round(tk.y),Math.round(inf.x),Math.round(inf.y),inf.hp>0, tk.rolling, tk.order&&tk.order.type]); } return log; })()""")), errs)
    b.close()
srv.shutdown()
