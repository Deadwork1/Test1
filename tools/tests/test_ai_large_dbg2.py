import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
port=int(sys.argv[2]); mapc=sys.argv[3]; diffs=sys.argv[4].split(',')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{mapc}')"); pg.reload(); pg.wait_for_timeout(300)
    for d in diffs:
        pg.evaluate(f"difficulty='{d}'")
        r = pg.evaluate("""(()=>{ newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
          deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
          for(let d=110; d<300; d+=10) for(let a=-1.2;a<0.4;a+=0.2){const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if(game.ents.filter(e=>e.type==='tower'&&e.team===0).length<2&&canPlace(0,'tower',x,y)){game.credits[0]+=500;placeBuilding(0,'tower',x,y); for(let i=0;i<5;i++)update(0.01);} }
          game.ents.filter(e=>e.type==='tower'&&e.team===0).forEach(t=>{t.built=true;t.progress=1;t.hp=t.maxHp;});
          const topUp=()=>{ const n=game.ents.filter(e=>e.team===0&&e.type==='soldier').length; for(let i=n;i<6;i++){ spawn('soldier',0,hq.x+60+Math.random()*60,hq.y-80-Math.random()*60);} };
          const waves=[]; let last=0, firstSeen=null; const t0=performance.now(); let built={grenadier:0,engineer:0}, seen=new Set(), repairs=0;
          for(let i=0;i<20*300 && !game.over;i++){ update(0.05); if(i%(20*20)===0) topUp();
            const ws=game.ai.wavesSent||0; if(ws!==last){ waves.push({t:Math.round(game.time), size:game.ents.filter(e=>e.team===1&&e.role==='wave').length}); last=ws; }
            if(firstSeen===null && game.ents.some(e=>e.team===1&&isCombat(e)&&Math.hypot(e.x-hq.x,e.y-hq.y)<400)) firstSeen=Math.round(game.time);
            for(const e of game.ents) if(e.team===1&&(e.type==='grenadier'||e.type==='engineer')&&!seen.has(e.id)){seen.add(e.id); built[e.type]++;}
            if(i%20===0 && game.ents.some(e=>e.team===1&&e.type==='engineer'&&e.working)) repairs++;
            if(i%(20*60)===0){ const m=game.ents.filter(e=>e.team===1); const bk=m.find(e=>e.type==='barracks'); (window._log=window._log||[]).push([Math.round(game.time), Math.floor(game.credits[1]), m.filter(isCombat).length, bk?bk.qTypes.join('/')+'|'+bk.built:'none', JSON.stringify(game.ai.cantPlace||{}), game.ai.buildUntil|0]); }
          }
          const c={}; game.ents.filter(e=>e.team===1).forEach(e=>c[e.type]=(c[e.type]||0)+1);
          const lg=window._log; window._log=[]; const bad = game.ents.filter(e=>e.team===1&&isCombat(e)).length===0 && !(game.ai.wavesSent); return {log: bad?lg:'ok', bk: bad? (()=>{const b=game.ents.find(e=>e.team===1&&e.type==='barracks'); return b&&{x:Math.round(b.x),y:Math.round(b.y),built:b.built,q:b.qTypes, door:frontDoor(b), doorTerrain:terrainAt(frontDoor(b).x,frontDoor(b).y)};})():null, map:mapChoice, difficulty, over:game.over, aiBuiltGrenadiers:built.grenadier, aiBuiltEngineers:built.engineer, aiEngineerRepairSecs:repairs, waves, firstEnemyAtYourBase:firstSeen, msPerSimSecond:((performance.now()-t0)/game.time).toFixed(1), aiNow:c}; })()""")
        print(json.dumps(r))
    print('ERRORS', errs[:3]); b.close()
srv.shutdown()
