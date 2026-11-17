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
      const kr=(att,target,n=1)=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const v=spawn(target,1,620,320); v.order=null; v.passive=true; if(v.maxHp){v.built=true; v.progress=1; v.hp=v.maxHp;}
        const A=[]; for(let i=0;i<n;i++){const g=spawn(att,0,400,290+i*25); g.order={type:'attack',target:v.id}; A.push(g);}
        let t=0; while(v.hp>0&&A.some(g=>g.hp>0)&&t<20*150){update(0.05);t++;} return v.hp<=0 ? (t*0.05).toFixed(1)+'s' : 'failed'; };
      const crushT=()=>{ let c=0; for(let r=0;r<10;r++){ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true;
        const tk=spawn('heavy',0,300,320); const inf=spawn('soldier',1,420,320+(Math.random()-.5)*10); inf.passive=true; inf.order=null;
        tk.order={type:'move',x:560,y:320}; tk.passive=true; for(let i=0;i<20*6;i++) update(0.05); if(inf.hp<=0) c++; } return c+'/10'; };
      return {
        '1 heavy vs 4 rockets ($700 v $800)': fight([['heavy',1]],[['rocket',4]]),
        '1 heavy vs 6 rockets': fight([['heavy',1]],[['rocket',6]]),
        '1 heavy + 4 soldiers vs 6 rockets ($1100 v $1200)': fight([['heavy',1],['soldier',4]],[['rocket',6]]),
        '1 light vs 2 rockets ($400 each)': fight([['light',1]],[['rocket',2]]),
        'time for 6 rockets to kill a heavy': kr('rocket','heavy',6) };})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
