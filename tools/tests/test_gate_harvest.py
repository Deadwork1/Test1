# Walls off your base entrances (with a gate each, as the computer would), puts the Refinery inside and sends 3 Extractors to ore outside.
# Over 4 game minutes it reports money earned and each Extractor's longest time stuck (should be about 0-2 s).
# Usage: python3 test_gate_harvest.py <game folder> <port> [maps, default classic,large,huge]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const res=[];
 for (const nExt of [3]) {
  newGame(); game.paused=false; runAI=()=>{};
  game.ents=[]; bldDirty=true;
  const hq=spawn('hq',0,START[0].x,START[0].y); hq.built=true; const ehq=spawn('hq',1,START[1].x,START[1].y); ehq.built=true;
  // refinery: first free spot near the HQ
  let ref=null;
  for (let d=130; d<300 && !ref; d+=10) for (let a=0;a<6.28&&!ref;a+=0.2){ const x=hq.x+Math.cos(a)*d,y=hq.y+Math.sin(a)*d; if (siteIsFree(x,y,STATS.refinery.size+10) && inBuildArea(0,x,y)) { ref=spawn('refinery',0,x,y); ref.built=true; ref.progress=1; } }
  bldDirty=true;
  const plans=findEntrances(0).map(planGapWall).filter(Boolean);
  const gates=[];
  for (const pl of plans){ const g=spawn('gate',0,pl.gate.x,pl.gate.y); g.vertical=pl.gate.vertical; g.built=true; g.progress=1; gates.push(g); for (const t of pl.tiles){ const w=spawn('wall',0,t.x,t.y); w.built=true; w.progress=1; } }
  bldDirty=true;
  // ore outside the walls: path to it from the refinery must go through a gate
  const outside = game.ore.filter(o=>o.amount>0).map(o=>{ const p=findPath(ref.x,ref.y+70,o.x,o.y,true,0,false,15); if(!p) return null; const all=[{x:ref.x,y:ref.y+70},...p]; let thru=false; for(let i=1;i<all.length;i++){ const n=Math.ceil(Math.hypot(all[i].x-all[i-1].x,all[i].y-all[i-1].y)/8); for(let k=0;k<=n;k++){ const x=all[i-1].x+(all[i].x-all[i-1].x)*k/n,y=all[i-1].y+(all[i].y-all[i-1].y)*k/n; const c=Math.floor(x/TC),r=Math.floor(y/TC); if(wallKind[r*TCOLS+c]===2) thru=true; } } return thru?{o,d:Math.hypot(o.x-ref.x,o.y-ref.y)}:null; }).filter(Boolean).sort((a,b)=>a.d-b.d);
  if (!outside.length) { res.push({err:'no ore outside', gates:gates.length}); continue; }
  const exts=[];
  for (let i=0;i<nExt;i++){ const e=spawn('extractor',0,ref.x+(i-1)*35,ref.y+ref.size/2+60); exts.push(e); startHarvest(e, outside[Math.min(i,outside.length-1)].o); }
  const startCred=game.credits[0];
  const track=exts.map(()=>({stuckT:0,last:null,maxStuck:0,where:null}));
  for (let t=0;t<20*240;t++){ U(0.05);
    if (t%20===0) exts.forEach((e,i)=>{ const tr=track[i]; if(tr.last && Math.hypot(e.x-tr.last.x,e.y-tr.last.y)<3 && !(e.order&&['mining','unloading','docking'].includes(e.order.phase)) && !(e.order&&e.order.waiting)){ tr.stuckT++; if(tr.stuckT>tr.maxStuck){tr.maxStuck=tr.stuckT; const g=gates.reduce((a,b)=>Math.hypot(b.x-e.x,b.y-e.y)<Math.hypot(a.x-e.x,a.y-e.y)?b:a); tr.where={x:Math.round(e.x),y:Math.round(e.y),phase:e.order&&e.order.phase,toGate:Math.round(Math.hypot(g.x-e.x,g.y-e.y)), gateV:g.vertical, rel:[Math.round(e.x-g.x),Math.round(e.y-g.y)]};} } else tr.stuckT=0; tr.last={x:e.x,y:e.y}; });
  }
  res.push({gates:gates.map(g=>({x:g.x,y:g.y,v:g.vertical})), ref:{x:Math.round(ref.x),y:Math.round(ref.y)}, ore:outside.slice(0,3).map(a=>[Math.round(a.o.x),Math.round(a.o.y)]), earnedIn4min: game.credits[0]-startCred, ext: track.map(t=>({maxStuckSec:t.maxStuck, where:t.where}))});
 }
 return res; })()
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
