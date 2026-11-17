import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
bot = open('sim/bot_rec.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page()
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.evaluate(bot); pg.evaluate("runSim('turtle', 20)")
    r = pg.evaluate("""(()=>{ window.WAVEDBG=[]; for(let i=0;i<20*900 && !game.over;i++) simTick(); const d=window.WAVEDBG; const out=[]; let last=-99; for(const x of d){ if(x.t-last>=30){ out.push(x); last=x.t; } } return {waves: game.ai.wavesSent, samples: out}; })()""")
    print(r['waves']); [print(x) for x in r['samples'][:30]]
    b.close()
srv.shutdown()
