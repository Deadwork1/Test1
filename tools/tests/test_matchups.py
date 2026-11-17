# Equal-money fights on open ground, each run 6 times with random spreads. No AI brain, units just fight.
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ runAI=()=>{};
      const fight=(blue, red, runs=6)=>{ let bw=0, rw=0, left=[];
        for(let r=0;r<runs;r++){ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
          const cx=1500, cy=1200; const B=[],R=[];
          blue.forEach(([t,n])=>{for(let i=0;i<n;i++) B.push(spawn(t,0,cx-110+Math.random()*40,cy-60+Math.random()*120));});
          red.forEach(([t,n])=>{for(let i=0;i<n;i++) R.push(spawn(t,1,cx+110-Math.random()*40,cy-60+Math.random()*120));});
          for(const u of B) u.order={type:'attackmove',x:cx+150,y:cy}; for(const u of R) u.order={type:'attackmove',x:cx-150,y:cy};
          let t=0; while(B.some(u=>u.hp>0)&&R.some(u=>u.hp>0)&&t<20*90){update(0.05);t++;}
          const b=B.filter(u=>u.hp>0).length, rr=R.filter(u=>u.hp>0).length; if(b>rr) bw++; else if(rr>b) rw++; left.push(b+'v'+rr); }
        return {blueWins:bw, redWins:rw, survivors:left.join(' ')}; };
      const cost=(arr)=>arr.reduce((s,[t,n])=>s+COST[t]*n,0);
      const M={};
      const add=(name,blue,red)=>{ M[name]={cost:cost(blue)+' vs '+cost(red), ...fight(blue,red)}; };
      add('8 grenadiers vs 13 soldiers (equal $)', [['grenadier',8]], [['soldier',13]]);
      add('5 grenadiers vs 8 soldiers', [['grenadier',5]], [['soldier',8]]);
      add('6 grenadiers vs 4 buggies (equal $)', [['grenadier',6]], [['buggy',4]]);
      add('10 soldiers vs 4 buggies (equal $)', [['soldier',10]], [['buggy',4]]);
      add('mix 4 sol+3 gren vs 9 soldiers', [['soldier',4],['grenadier',3]], [['soldier',9]]);
      return M;})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
