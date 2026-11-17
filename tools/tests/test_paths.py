import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in ['classic','large']:
        pg = b.new_page(); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, pg.evaluate("""(()=>{ newGame(); const out={fail:[], ore:game.ore.length};
          for (const t of [0,1]) { const s=START[t];
            for (const o of game.ore) if(!findPath(s.x,s.y,o.x,o.y,true)) out.fail.push('team'+t+' extractor->ore '+Math.round(o.x)+','+Math.round(o.y));
            const f=START[1-t]; if(!findPath(s.x,s.y,f.x,f.y,true)) out.fail.push('team'+t+' tank->enemy base'); }
          out.fail=out.fail.slice(0,8); return JSON.stringify(out); })()"""))
        pg.close()
    b.close()
srv.shutdown()
