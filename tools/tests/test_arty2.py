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
    print(json.dumps(pg.evaluate("""(()=>{ const R={};
      const fresh=()=>{ newGame(); runAI=()=>{}; endGame=()=>{}; game.ents=[]; bldDirty=true; };
      // 1) artillery + a spotter vs a lone guard tower
      { fresh(); const cx=1700, cy=1250;
        const T=spawn('tower',1,cx+260,cy); bldDirty=true; T.built=true; T.progress=1; T.hp=T.maxHp;
        fog[0].exp[cellIndex(T.x,T.y)]=1; const a=spawn('artillery',0,cx-60,cy); const sp=spawn('buggy',0,cx-10,cy+40); sp.passive=true;
        sp.order={type:'move',x:cx+40,y:cy+40};   // spotter at 220ish from tower, outside its 170 range
        a.order={type:'attack',target:T.id};
        let t=0; while(T.hp>0 && a.hp>0 && t<20*120){update(0.05);t++;}
        R.towerSiege={towerDead:T.hp<=0, secs:t/20, artyHp:a.hp, spotterHp:sp.hp}; }
      // 1b) tower vs artillery with no spotter
      { fresh(); const cx=1700, cy=1250; const T=spawn('tower',1,cx+260,cy); bldDirty=true; T.built=true; T.progress=1; T.hp=T.maxHp;
        const a=spawn('artillery',0,cx,cy); a.order={type:'attack',target:T.id}; let t=0; while(T.hp>0 && a.hp>0 && t<20*60){update(0.05);t++;}
        for(let i=0;i<fog[0].exp.length;i++);R.noSpotter={towerHp:T.hp, artyHp:a.hp, dist:Math.round(Math.hypot(a.x-T.x,a.y-T.y))}; }
      // 2) 2 artillery vs 4 soldiers charging
      { let w=0; for(let r=0;r<6;r++){ fresh(); const cx=1700, cy=1250; const A=[spawn('artillery',0,cx-100,cy-20),spawn('artillery',0,cx-100,cy+20)];
        const S=[]; for(let i=0;i<9;i++){const s=spawn('soldier',1,cx+150,cy-100+i*25); s.order={type:'attackmove',x:cx-150,y:cy}; S.push(s);}
        let t=0; while(A.some(u=>u.hp>0)&&S.some(u=>u.hp>0)&&t<20*60){update(0.05);t++;} if(A.some(u=>u.hp>0)) w++; }
        R.arty2_vs_sold9_equal={artyWins:w, of:6}; }
      // 3) 900$ artillery vs 900$ light tanks
      { let w=0; for(let r=0;r<6;r++){ fresh(); const cx=1700, cy=1250; const A=[spawn('artillery',0,cx-120,cy-20),spawn('artillery',0,cx-120,cy+20)];
        const S=[spawn('buggy',1,cx+150,cy-30),spawn('buggy',1,cx+150,cy),spawn('buggy',1,cx+150,cy+30)]; for(const s of S) s.order={type:'attackmove',x:cx-150,y:cy};
        let t=0; while(A.some(u=>u.hp>0)&&S.some(u=>u.hp>0)&&t<20*60){update(0.05);t++;} if(A.some(u=>u.hp>0)) w++; }
        R.arty2_vs_buggy3={artyWins:w, of:6}; }
      return R;})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
