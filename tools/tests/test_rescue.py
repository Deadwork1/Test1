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
    print(json.dumps(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out=[];
      for (const team of [0,1]) {
        newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true;
        const bx=team?2000:400, by=team?400:1100, foeTeam=1-team;
        const ref=spawn('refinery',team,bx,by); ref.built=true; ref.progress=1; ref.hp=ref.maxHp; spawn('hq',foeTeam,team?300:2100,team?1200:300).built=true; bldDirty=true;
        const D=[]; for(let i=0;i<6;i++){ const u=spawn('soldier',team,bx+(team?-1:1)*(260+(i%3)*18),by+220+Math.floor(i/3)*18); u.order=null; D.push(u); }   // parked around a corner, out of sight of the attack
        const A=[]; for(let i=0;i<3;i++){ const u=spawn('soldier',foeTeam,bx+(team?1:-1)*80,by-60+i*20); u.order={type:'attack',target:ref.id}; A.push(u); }
        let t=0, firstMove=null; const hp0=ref.hp;
        while(t<20*40 && A.some(a=>a.hp>0) && ref.hp>0){ U(0.05); t++; if(firstMove===null && D.some(d=>d.order)) firstMove=t*0.05; }
        out.push({side: team?'computer':'player', defendersReacted: firstMove!==null ? firstMove.toFixed(1)+'s' : 'never', attackersKilledIn: A.every(a=>a.hp<=0) ? (t*0.05).toFixed(1)+'s' : 'not killed', refineryHp: Math.max(0,Math.round(ref.hp))+'/'+hp0, defendersLost: D.filter(d=>d.hp<=0).length});
      } return out; })()""")), errs[:2])
    b.close()
srv.shutdown()
