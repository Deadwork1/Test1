import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ runAI=()=>{}; endGame=()=>{}; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); update(0.05);
      const hq=hqOf(0); const ents=findEntrances(0); const R={entrances:ents.length};
      // guards parked at the far entrance, idle
      const far=ents[ents.length-1], near=ents[0];
      const G=[]; for(let i=0;i<4;i++){const u=spawn('soldier',0,far.x-far.ux*40+i*12,far.y-far.uy*40); u.order=null; G.push(u);}
      // raiders walk in at the other side and go for the HQ
      const E=[]; for(let i=0;i<3;i++){const u=spawn('soldier',1,hq.x+(near.x-hq.x)*0.6+i*10,hq.y+(near.y-hq.y)*0.6); u.order={type:'attack',target:hq.id}; E.push(u);}
      R.guardDist=Math.round(Math.hypot(G[0].x-hq.x,G[0].y-hq.y));
      for(let t=0;t<20*30;t++) update(0.05);
      R.guardsResponded=G.filter(u=>Math.hypot(u.x-hq.x,u.y-hq.y)<R.guardDist-150 || u.hp<60).length; R.raidersLeft=E.filter(u=>u.hp>0).length; R.hqHp=Math.round(hq.hp);
      return R;})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
