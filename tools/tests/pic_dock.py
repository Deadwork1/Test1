import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    pg.evaluate("""(()=>{ window.U=update; window.update=()=>{}; window.RD=draw; window.draw=()=>{}; window.drawMinimap=()=>{};
      newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; spawn('hq',1,W-200,H-200).built=true;
      window.ref=spawn('refinery',0,500,500); ref.built=true; ref.progress=1; ref.hp=ref.maxHp; bldDirty=true;
      window.ex=spawn('extractor',0,500,700); ex.cargo=150; ex.order={type:'harvest', phase:'toBase', ref:ref.id, node:null};
      window.snap=()=>{ fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); cam.zoom=2.2*1.0; cam.x=500; cam.y=530; RD(); };
      return 0; })()""")
    shots=[]
    for want in ['docking','unloading','undocking']:
        ph = pg.evaluate(f"""(()=>{{ for(let i=0;i<20*30;i++){{ U(0.05); if(ex.order&&ex.order.phase==='{want}') {{ if('{want}'==='docking'){{ for(let k=0;k<40 && ex.order.phase==='docking' && !ex.order.aligned;k++) U(0.05); for(let k=0;k<8;k++) U(0.05); }} break; }} }} snap(); return ex.order&&ex.order.phase; }})()""")
        pg.locator('#c').screenshot(path=f'dock_{want}.jpg', type='jpeg', quality=92); shots.append(ph)
    print(shots, errs[:2])
    # gate: guard standing beside it vs a unit walking through
    pg.evaluate("""(()=>{ newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; spawn('hq',1,W-200,H-200).built=true;
      const g=spawn('gate',0,500,500); g.built=true; g.progress=1; g.vertical=false; g.hp=g.maxHp; bldDirty=true;
      for(const dx of [-50,50]){ const w=spawn('wall',0,500+dx+ (dx>0?0:0),500); w.built=true; w.progress=1; }
      window.guard=spawn('soldier',0,520,525); guard.order=null; for(let i=0;i<40;i++) U(0.05);
      fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); cam.zoom=2.2; cam.x=500; cam.y=500; RD(); return 0; })()""")
    pg.locator('#c').screenshot(path='gate_guard.jpg', type='jpeg', quality=92)
    pg.evaluate("""(()=>{ const w=spawn('soldier',0,480,580); w.order={type:'move',x:480,y:420}; for(let i=0;i<20*1.6;i++) U(0.05);
      fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); RD(); return 0; })()""")
    pg.locator('#c').screenshot(path='gate_through.jpg', type='jpeg', quality=92)
    b.close()
srv.shutdown()
