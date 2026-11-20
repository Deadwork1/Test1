# Attacking a gate from outside (v5.49.6): tanks ordered to attack an enemy gate should shoot it from their own side,
# not drive round through the base's other (open) entrance to reach the far side of it.
# Usage: python3 test_gate_attack.py <game folder> <port> [maps, default huge,large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 newGame(); game.paused=false; runAI=()=>{}; game.ents=game.ents.filter(e=>e.type!=='settler'); for (const t of [0,1]) { const h=spawn('hq',t,START[t].x,START[t].y); h.built=true; } fog[0].vis.fill(1); fog[1].vis.fill(1); fog[0].exp.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{};
 const hq1=hqOf(1), ents=findEntrances(1); out.entrances=ents.length; if (ents.length<2) return out;
 const results=[];
 for (const ei of [0,1]) {
   const pl=planGapWall(ents[ei]); if(!pl) { results.push('no plan'); continue; }
   const g=spawn('gate',1,pl.gate.x,pl.gate.y); g.vertical=pl.gate.vertical; for (const t of pl.tiles) spawn('wall',1,t.x,t.y); bldDirty=true;
   // outside = away from its HQ, across the gate line
   const nx = g.vertical ? 1 : 0, ny = g.vertical ? 0 : 1, sgn = Math.sign((g.x-hq1.x)*nx + (g.y-hq1.y)*ny) || 1;
   const ox=g.x+nx*sgn*260, oy=g.y+ny*sgn*260;
   const tanks=[0,1,2].map(k=>{ const u=spawn('heavy',0,ox+(k-1)*45,oy); u.order={type:'attack',target:g.id}; return u; });
   const other=ents[1-ei]; let maxAway=0, nearOther=Infinity, k=0;
   while (k<20*90 && g.hp>0) { U(0.05); k++; for (const u of tanks) { maxAway=Math.max(maxAway, Math.hypot(u.x-ox,u.y-oy)); nearOther=Math.min(nearOther, Math.hypot(u.x-other.x,u.y-other.y)); } }
   results.push({gate:ei, gateDown:g.hp<=0, sec:+(k/20).toFixed(1), furthestFromStart:Math.round(maxAway), closestToOtherEntrance:Math.round(nearOther)});
   for (const u of tanks) u.hp=0; for (const e of game.ents) if (e.team===1 && isWallType(e.type)) e.hp=0; U(0.05);
 }
 out.results=results; return out; })()'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in (sys.argv[3] if len(sys.argv) > 3 else 'huge,large').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, json.dumps(pg.evaluate(JS)), 'errors', errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
