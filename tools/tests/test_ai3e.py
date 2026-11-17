import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2]); d=sys.argv[3]
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(300)
    pg.evaluate(f"difficulty='{d}'")
    rows = pg.evaluate("""(()=>{ newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const spots=[]; for(let d=110; d<300 && spots.length<2; d+=10) for(let a=-1.2;a<0.4;a+=0.2){const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if(spots.length<2&&canPlace(0,'tower',x,y)){game.credits[0]+=500;placeBuilding(0,'tower',x,y); spots.push(1); for(let i=0;i<5;i++)update(0.01);} }
      game.ents.filter(e=>e.type==='tower'&&e.team===0).forEach(t=>{t.built=true;t.progress=1;t.hp=t.maxHp;});
      const topUp=()=>{ const n=game.ents.filter(e=>e.team===0&&e.type==='soldier').length; for(let i=n;i<6;i++){ spawn('soldier',0,hq.x+60+Math.random()*60,hq.y-80-Math.random()*60);} };
      const out=[]; let earned=0; const _c=game.credits; 
      for(let i=1;i<=20*420;i++){ update(0.05); if(i%(20*20)===0) topUp();
        if(i%(20*30)===0){ const m=game.ents.filter(e=>e.team===1); const of=t=>m.filter(e=>e.type===t).length;
          out.push([Math.round(game.time), Math.floor(game.credits[1]), 'army',m.filter(isCombat).length, 'ext',of('extractor'), 'ref',of('refinery'), 'tow',of('tower'), 'wall',of('wall'), 'known',game.ai.known.size, 'wave',game.ai.waveSize,
            'gath', m.filter(e=>isCombat(e)&&!e.role).length, 'guard', m.filter(e=>e.role==='guard').length, 'wavers', m.filter(e=>e.role==='wave').length, 'scout', m.filter(e=>e.role==='scout').length, 'q', m.filter(e=>e.type==='barracks').map(b=>b.qTypes.join('/')).join('|'), 'blocked', JSON.stringify(game.ai.cantPlace||{})]);
          if(i%(20*60)===0){ const refs=m.filter(e=>e.type==='refinery'); out.push(m.filter(e=>e.type==='extractor').map(x=>{const o=x.order; const n=o&&o.node&&oreById(o.node); return (o?(o.type==='harvest'?o.phase:o.type):'idle')+(n?'@'+Math.round(Math.min(...refs.map(r=>Math.hypot(r.x-n.x,r.y-n.y)))):'')+(x.outOfOre?'!':'');}).join(', ')); } } }
      return out; })()""")
    for r in rows: print(r)
    print('ERRORS', errs[:3]); b.close()
srv.shutdown()
