import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2]); diffs=sys.argv[3].split(',')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(300)
    for d in diffs:
        pg.evaluate(f"difficulty='{d}'")
        r = pg.evaluate("""(()=>{ newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
          deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
          // a defended player base that never attacks: 2 towers + 6 soldiers, topped up as they die
          const spots=[]; for(let d=110; d<300 && spots.length<2; d+=10) for(let a=-1.2;a<0.4;a+=0.2){const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if(spots.length<2&&canPlace(0,'tower',x,y)){game.credits[0]+=500;placeBuilding(0,'tower',x,y); for(let i=0;i<5;i++)update(0.01);} }
          game.ents.filter(e=>e.type==='tower'&&e.team===0).forEach(t=>{t.built=true;t.progress=1;t.hp=t.maxHp;});
          const topUp=()=>{ const n=game.ents.filter(e=>e.team===0&&e.type==='soldier').length; for(let i=n;i<6;i++){ spawn('soldier',0,hq.x+60+Math.random()*60,hq.y-80-Math.random()*60);} };
          const waves=[]; let last=game.ai.wavesSent||0, maxAt=0;
          for(let i=0;i<20*600 && !game.over;i++){ update(0.05); if(i%(20*20)===0) topUp();
            const ws=game.ai.wavesSent||0; if(ws!==last){ waves.push({t:Math.round(game.time), size:game.ents.filter(e=>e.team===1&&e.role==='wave').length}); last=ws; }
            maxAt=Math.max(maxAt, game.ents.filter(e=>e.team===1&&isCombat(e)&&Math.hypot(e.x-hq.x,e.y-hq.y)<380).length);
          }
          const c={}; game.ents.filter(e=>e.team===1).forEach(e=>c[e.type]=(c[e.type]||0)+1);
          return {difficulty, over:game.over, at:Math.round(game.time), waves, mostAtYourBaseAtOnce:maxAt, aiNow:c}; })()""")
        print(json.dumps(r))
    print('ERRORS', errs[:3]); b.close()
srv.shutdown()
