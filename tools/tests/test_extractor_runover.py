# The computer's Extractors run down infantry that shoot them: a Soldier shoots a computer Extractor on open ground (it should be crushed,
# then the Extractor goes back to mining), from inside a forest (no chase), and a computer Soldier shoots your Extractor (yours don't chase).
# Usage: python3 test_extractor_runover.py <game folder> <port> [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 const findOpen=(want)=>{ for (let y=300; y<H-300; y+=25) for (let x=300; x<W-300; x+=25) { let ok=true; for(let k=-8;k<=8&&ok;k++) for(let j=-8;j<=8;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok) return {x,y}; } };
 const findForestEdge=()=>{ for (let y=300; y<H-300; y+=25) for (let x=300; x<W-300; x+=25) { if (terrainAt(x,y)!==T.FOREST) continue; let ok=true; for(let k=2;k<=8&&ok;k++) for(let j=-3;j<=3;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok && terrainAt(x-25,y)===T.FOREST) return {x,y}; } };
 const run=(name, extTeam, forest)=>{
  newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true;
  spawn('hq',0,150,150).built=true; spawn('hq',1,W-150,H-150).built=true;
  const p = forest ? findForestEdge() : findOpen();
  if (!p) { out[name]='no spot'; return; }
  const ext=spawn('extractor',extTeam,p.x+110,p.y); 
  const ore={id:99999, x:p.x+110, y:p.y+40, amount:5000}; game.ore.push(ore);
  startHarvest(ext, ore);
  const sol=spawn('soldier',1-extTeam,p.x,p.y);
  fog[0].vis.fill(1); fog[1].vis.fill(1); fog[0].exp.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{};
  sol.order={type:'attack', target:ext.id};
  let chased=false, crushedAt=null, maxAway=0, back=null;
  for (let t=0;t<20*20;t++){ U(0.05); fog[0].vis.fill(1); fog[1].vis.fill(1);
    if (ext.order&&ext.order.type==='runover') chased=true;
    maxAway=Math.max(maxAway, Math.hypot(ext.x-(p.x+110), ext.y-p.y));
    if (crushedAt===null && sol.hp<=0) crushedAt=t/20;
    if (crushedAt!==null && back===null && ext.order && ext.order.type==='harvest' && ext.order.phase==='mining') back=t/20;
  }
  out[name]={chased, soldierDead: sol.hp<=0, killedAt: crushedAt, backMiningAt: back, extractorHp: Math.round(ext.hp), drovePx: Math.round(maxAway), order: ext.order&&(ext.order.type+':'+ext.order.phase)};
 };
 run('computer extractor, open ground', 1, false);
 run('computer extractor, shooter in forest', 1, true);
 run('your extractor, open ground', 0, false);
 return out; })()
'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in (sys.argv[3] if len(sys.argv) > 3 else 'large').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, json.dumps(pg.evaluate(JS), indent=1), errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
