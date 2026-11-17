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
          const cx=420, cy=320; const B=[],R=[];
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
      const kr=(target)=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const v=spawn(target,1,620,320); v.order=null; v.passive=true; if(v.maxHp){v.built=true; v.progress=1; v.hp=v.maxHp;} const g=spawn('sniper',0,420,320); g.order={type:'attack',target:v.id};
        let t=0; while(v.hp>0&&g.hp>0&&t<20*120){update(0.05);t++;} return (t*0.05).toFixed(1)+'s'+(g.hp<=0?' (sniper died)':''); };
      return {
        '2 snipers vs 5 soldiers ($500 each)': fight([['sniper',2]],[['soldier',5]]),
        '4 snipers vs 10 soldiers ($1000 each)': fight([['sniper',4]],[['soldier',10]]),
        '4 snipers vs 6 grenadiers': fight([['sniper',4]],[['grenadier',6]]),
        '4 snipers vs 5 rockets': fight([['sniper',4]],[['rocket',5]]),
        '4 snipers vs 4 buggies': fight([['sniper',4]],[['buggy',4]]),
        '2 snipers vs 1 buggy': fight([['sniper',2]],[['buggy',1]]),
        'army 6 sol+2 snp vs 11 soldiers ($1100 each)': fight([['soldier',6],['sniper',2]],[['soldier',11]]),
        'one sniper kills': {soldier: kr('soldier'), engineer: kr('engineer'), buggy: kr('buggy'), barracks: kr('barracks')} };})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
