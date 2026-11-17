import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    print(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{};
        newGame(); game.paused=false; deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
        const h=hqOf(0); game.credits[0]=5000; let ref=null; for(let a=0;a<6.3&&!ref;a+=0.3) if(placeBuilding(0,'refinery',h.x+Math.cos(a)*170,h.y+Math.sin(a)*170)) ref=game.ents.find(e=>e.type==='refinery'&&e.team===0);
        for(let i=0;i<20*30;i++) U(0.05); game.ai.known.set(ref.id,{x:ref.x,y:ref.y});
        const en=spawn('engineer',1,3000,400); const plan=aiRaidPlan(en);
        return JSON.stringify({plan, refBuilt:ref.built, cap:canCapture(ref), knownKeys:[...game.ai.known.keys()], refId:ref.id}); })()"""), errs)
    b.close()
srv.shutdown()
