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
    print(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out=[];
      for (const team of [0,1]) { newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true;
        spawn('hq',team,team?2000:300,team?300:1200).built=true;
        const tgt=spawn('refinery',1-team,1000,700); tgt.built=true; tgt.progress=1; spawn('hq',1-team,team?300:2000,team?1200:300).built=true; bldDirty=true;
        const en=spawn('engineer',team,1000,850); en.order={type:'capture',target:tgt.id};
        for(let i=0;i<20*15;i++) U(0.05);
        out.push({engineerTeam:team, refineryNowTeam:tgt.team, engineerStillInGame: game.ents.includes(en), engineersLeft: game.ents.filter(e=>e.type==='engineer').length}); }
      return JSON.stringify(out); })()"""), errs)
    b.close()
srv.shutdown()
