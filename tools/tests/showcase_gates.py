import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8810), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=3); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8810/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; game.credits[0]=9000;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
      for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;}
      // open patch north-east of HQ
      const c0=12, r0=36;   // tiles
      const W_=(c,r)=>spawn('wall',0,c*TC+TC/2,r*TC+TC/2);
      for(let c=c0;c<c0+9;c++) if(c!==c0+4 && c!==c0+5) W_(c,r0);       // straight run with a gap for the gate
      for(let r=r0+1;r<r0+4;r++) W_(c0,r);                                // corner going down
      for(let k=1;k<4;k++) W_(c0+8+k, r0+k);                             // diagonal
      rebuildBuildingGrid();
      const f1=fitGate((c0+5)*TC, r0*TC+TC/2, 0); placeBuilding(0,'gate',f1.x,f1.y,f1.vertical);          // gate in the gap
      for(let r=r0+5;r<r0+10;r++) if(r!==r0+6 && r!==r0+7) W_(c0+13,r);   // a vertical wall...
      rebuildBuildingGrid();
      const f2=fitGate((c0+13)*TC+TC/2, (r0+7)*TC, 0); placeBuilding(0,'gate',f2.x,f2.y,f2.vertical);     // ...with an upright gate
      const g2=game.ents.filter(e=>e.type==='gate')[1];
      const u=spawn('soldier',0,(c0+13)*TC-30,(r0+7)*TC); u.passive=true;
      const tw=spawn('tower',0,(c0+2)*TC+TC/2,(r0+6)*TC); tw.built=true; tw.progress=1; tw.hp=tw.maxHp;
      const foe=spawn('soldier',1,(c0+7)*TC,(r0+8)*TC); foe.hp=1e9; foe.passive=true;
      rebuildBuildingGrid();
      for(let i=0;i<12;i++) update(0.05);
      game.selected=new Set([tw.id]);
      cam.x=(c0+9)*TC; cam.y=(r0+4)*TC; setZoom(2.2); clampCam();
      const _u=update; update=(dt)=>{ _u(dt); for(const e of game.ents) if(e.type==='gate'&&e.id===g2.id) e.openK=1; };
    })()""")
    pg.wait_for_timeout(900)
    pg.evaluate("document.getElementById('panel').style.display='none'; document.getElementById('top').style.display='none';")
    pg.wait_for_timeout(100)
    pg.screenshot(path='out/gates.png')
    print(errs, page_info if False else ''); b.close()
srv.shutdown()
