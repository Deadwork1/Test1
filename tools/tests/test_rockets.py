import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ runAI=()=>{};
      const fight=(blue, red, runs=10)=>{ let bw=0, rw=0, left=[], secs=0;
        for(let r=0;r<runs;r++){ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
          const cx=1500, cy=1200; const B=[],R=[];
          blue.forEach(([t,n])=>{for(let i=0;i<n;i++) B.push(spawn(t,0,cx-110+Math.random()*40,cy-60+Math.random()*120));});
          red.forEach(([t,n])=>{for(let i=0;i<n;i++) R.push(spawn(t,1,cx+110-Math.random()*40,cy-60+Math.random()*120));});
          for(const u of B) u.order={type:'attackmove',x:cx+150,y:cy}; for(const u of R) u.order={type:'attackmove',x:cx-150,y:cy};
          let t=0; while(B.some(u=>u.hp>0)&&R.some(u=>u.hp>0)&&t<20*90){update(0.05);t++;}
          secs+=t*0.05;
          const b=B.filter(u=>u.hp>0).length, rr=R.filter(u=>u.hp>0).length; if(b>rr) bw++; else if(rr>b) rw++; left.push(b+'v'+rr); }
        return bw+'-'+rw+'  ['+left.join(' ')+']  avg '+(secs/runs).toFixed(1)+'s'; };
      const kill=(target)=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const v=spawn(target,1,1600,1200); v.order=null; const g=spawn('buggy',0,1480,1200); g.order={type:'attack',target:v};
        let t=0; while(v.hp>0&&g.hp>0&&t<20*60){update(0.05);t++;} return (t*0.05).toFixed(1)+'s'+(g.hp<=0?' (buggy died)':''); };
      const run=(vi)=>{ STATS.rocket.vsInfantry=vi; return {
        '1 rocket vs 1 buggy': fight([['rocket',1]],[['buggy',1]]),
        '2 rockets vs 2 buggies ($400 v $500)': fight([['rocket',2]],[['buggy',2]]),
        '5 rockets vs 4 buggies ($1000 each)': fight([['rocket',5]],[['buggy',4]]),
        '5 rockets vs 10 soldiers ($1000 each)': fight([['rocket',5]],[['soldier',10]]),
        '3 rockets vs 3 soldiers': fight([['rocket',3]],[['soldier',3]]),
        '5 rockets vs 6 grenadiers': fight([['rocket',5]],[['grenadier',6]]),
        'army 6 sol+2 rkt vs army 6 sol+2 buggies ($1000 v $1100)': fight([['soldier',6],['rocket',2]],[['soldier',6],['buggy',2]]),
        'army 4 sol+2 gren+2 rkt vs 5 buggies': fight([['soldier',4],['grenadier',2],['rocket',2]],[['buggy',5]]) }; };
      const kr=(target)=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const v=spawn(target,1,1650,1200); v.order=null; if(v.maxHp){v.built=true; v.progress=1; v.hp=v.maxHp;} const g=spawn('rocket',0,1480,1200); g.order={type:'attack',target:v.id};
        let t=0; while(v.hp>0&&t<20*120){update(0.05);t++;} return (t*0.05).toFixed(1)+'s'; };
      const out={'after vehicle-first targeting': run(0.4)};
      STATS.rocket.vsInfantry=0.4;
      out['one rocket soldier destroys'] = {buggy: kr('buggy'), extractor: kr('extractor'), barracks: kr('barracks'), tower: kr('tower')};
      return out;})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
