# The ruined bases: neutral ruins can't be hurt; Engineers capture them; broken (below half) they do nothing; repaired past half they work
# (Barracks trains, Power Plant speeds up, Radar sees far, tech tree); they can't be sold; knocked out they fall back to neutral ruins.
# Usage: python3 test_ruins.py <game folder> <port> [maps, default classic,large,huge]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
  newGame(); game.paused=false; runAI=()=>{};
  for (const s of game.ents.filter(e=>e.type==='settler')) { const h=spawn('hq',s.team,s.x,s.y); h.built=true; s.hp=0; s.deployed=true; }
  U(0.05);
  const ruins=game.ents.filter(e=>e.ruin && e.x<W/2), bar=ruins.find(e=>e.type==='barracks'), pow=ruins.find(e=>e.type==='power') || ruins.find(e=>e.type==='radar'), rad=ruins.find(e=>e.type==='radar');
  out.start = ruins.map(e=>e.type+':team'+e.team+' '+Math.round(e.hp/e.maxHp*100)+'%');
  bar.hp=1; U(0.05); out.neutralCantBeHurt = Math.round(bar.hp/bar.maxHp*100)+'%';
  // 3 engineers walk in through the jungle and capture all three
  const cx=ruins.reduce((s,e)=>s+e.x,0)/ruins.length, cy=ruins.reduce((s,e)=>s+e.y,0)/ruins.length;
  ruins.forEach((r,i)=>{ const e=spawn('engineer',0,cx+300+i*15,cy+250); e.order={type:'capture',target:r.id}; });
  let t=0; while (t<20*90 && ruins.some(r=>r.team!==0)) { U(0.05); t++; }
  out.capturedAfterSec = +(t/20).toFixed(1); out.afterCapture = ruins.map(e=>e.type+':team'+e.team+' '+Math.round(e.hp/e.maxHp*100)+'%');
  game.credits[0]=5000;
  const boost0=powerBoost(0);
  const radarSees = () => { const f=fog[0]; updateFog(); const x=rad.x+500, y=rad.y; return !!f.vis[cellIndex(x,y)]; };
  out.brokenRuin = { canTrainSoldier: produce(bar,'soldier'), barracksCountsForTech: hasBuilt(0,'barracks'), powerBoost: boost0, radarSees500Away: radarSees(), sellable: sellable(bar) };
  // repair crew: 3 new engineers repair the barracks
  const crew=[0,1,2].map(i=>spawn('engineer',0,bar.x-20+i*20,bar.y+bar.size/2+30));
  for (const e of crew) e.order={type:'repair',target:bar.id};
  t=0; while (t<20*60 && bar.hp<bar.maxHp*RUIN_WORKS) { U(0.05); t++; }
  out.barracksToHalfWith3EngineersSec = +(t/20).toFixed(1);
  for (const e of crew) e.order={type:'repair',target:pow.id};
  t=0; while (t<20*60 && pow.hp<pow.maxHp*RUIN_WORKS) { U(0.05); t++; }
  out.powerToHalfSec = +(t/20).toFixed(1);
  for (const e of crew) e.order={type:'repair',target:rad.id};
  t=0; while (t<20*60 && rad.hp<rad.maxHp*RUIN_WORKS) { U(0.05); t++; }
  out.radarToHalfSec = +(t/20).toFixed(1);
  for (const e of crew) e.order=null;
  out.workingRuin = { canTrainSoldier: produce(bar,'soldier'), barracksCountsForTech: hasBuilt(0,'barracks'), powerBoost: powerBoost(0), radarSees500Away: radarSees(), sellable: sellable(bar) };
  t=0; const before=game.ents.filter(e=>e.type==='soldier'&&e.team===0).length; while(t<20*15){U(0.05);t++;}
  out.soldierTrained = game.ents.filter(e=>e.type==='soldier'&&e.team===0).length - before;
  // knocked out: back to neutral ruin
  bar.hp=-5; U(0.05);
  out.knockedOut = { team: bar.team, hp: Math.round(bar.hp/bar.maxHp*100)+'%', stillThere: game.ents.includes(bar), barracksCountsForTech: hasBuilt(0,'barracks') };
  return out; })()
'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in (sys.argv[3] if len(sys.argv) > 3 else 'classic,large,huge').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, json.dumps(pg.evaluate(JS), indent=1), errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
