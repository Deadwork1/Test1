# Helicopters (v5.47): a Helipad builds one helicopter, which starts docked on it; it attacks, fires its 6 missiles, flies home,
# lands and reloads; one per pad; flies straight over rocks and river; only Rocket Soldiers and SAM sites can hit it;
# grenades, tanks, soldiers and Guard Towers can't; if its pad is destroyed it hovers until a new Helipad is built.
# Usage: python3 test_heli.py <game folder> <port> [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 newGame(); game.paused=false; runAI=()=>{}; game.ents=game.ents.filter(e=>e.type!=='settler'); for (const t of [0,1]) { const h=spawn('hq',t,START[t].x,START[t].y); h.built=true; } fog[0].vis.fill(1); fog[1].vis.fill(1); fog[0].exp.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{};
 const run=(sec,until)=>{ let k=0; while(k<sec*20){ U(0.05); k++; if(until&&until()) break; } return +(k/20).toFixed(1); };
 const hq=hqOf(0); const mk=(type,dx,dy)=>{ const b=spawn(type,0,hq.x+dx,hq.y+dy); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
 mk('barracks',-260,0); mk('refinery',0,-400); mk('factory',260,-200); mk('power',-260,-250);
 const pad=mk('helipad',260,60); game.credits[0]=5000;
 out.locked={helipadNeeds: missingFor(0,'helipad'), samNeeds: missingFor(0,'sam')};
 out.produced=produce(pad,'heli'); out.secondQueued=produce(pad,'heli');
 const tMade=run(30,()=>game.ents.some(e=>e.type==='heli'));
 const h=game.ents.find(e=>e.type==='heli');
 out.made={sec:tMade, onPad: Math.hypot(h.x-pad.x,h.y-pad.y)<1, landed:h.landed, ammo:h.ammo, cantMakeAnother: !produce(pad,'heli')};
 // attack a tank 600 away
 const tank=spawn('light',1,pad.x+600,pad.y); tank.passive=true; tank.order={type:'move',x:tank.x,y:tank.y};
 h.order={type:'attack',target:tank.id}; const hp0=tank.hp;
 const tFired=run(40,()=>h.ammo===0);
 out.attack={secToEmpty:tFired, tankDamage: Math.round(hp0-Math.max(0,tank.hp)), tankDead: tank.hp<=0};
 const tHome=run(40,()=>h.landed); out.home={sec:tHome, landed:h.landed, onPad:Math.hypot(h.x-pad.x,h.y-pad.y)<1};
 const tRe=run(20,()=>h.ammo===STATS.heli.ammo); out.reload={sec:tRe, ammo:h.ammo};
 // who can hit it: park it in the air over an enemy group
 h.order={type:'move',x:pad.x+300,y:pad.y+150}; run(10,()=>h.order&&h.order.arrived); h.ammo=0; h.order={type:'move',x:h.x,y:h.y,arrived:true}; // (no ammo: it would fly home, so keep it hovering by refilling a move order each step)
 const hold=()=>{ h.order={type:'move',x:h.x,y:h.y,arrived:true}; h.ammo=0; };
 const sol=spawn('soldier',1,h.x+60,h.y); const gre=spawn('grenadier',1,h.x-60,h.y); const hv=spawn('heavy',1,h.x,h.y+90);
 for (const u of [sol,gre,hv]) u.order={type:'attack',target:h.id};
 const hhp=h.hp; let k=0; while(k<20*8){ hold(); U(0.05); k++; }
 out.groundCantHit={hpLost: Math.round(hhp-h.hp), ordersDropped: [sol,gre,hv].every(u=>!u.order||u.order.target!==h.id)};
 for (const u of [sol,gre,hv]) u.hp=0; U(0.05);
 const rk=spawn('rocket',1,h.x+100,h.y); k=0; let shots=0; const hp1=h.hp; while(k<20*30 && h.hp>0){ hold(); U(0.05); k++; }
 out.rocketKills={sec:+(k/20).toFixed(1), dead:h.hp<=0, rocketsNeeded: Math.ceil(hp1/(40*1.5))};
 rk.hp=0; U(0.05);
 // a new helicopter, then a SAM site
 game.credits[0]=5000; produce(pad,'heli'); run(30,()=>game.ents.some(e=>e.type==='heli'&&e.hp>0));
 const h2=game.ents.find(e=>e.type==='heli'&&e.hp>0);
 const sam=spawn('sam',1,pad.x+500,pad.y-60); sam.built=true; sam.progress=1; sam.hp=sam.maxHp;
 const sol2=spawn('soldier',0,sam.x-150,sam.y); sol2.passive=true; sol2.order={type:'move',x:sol2.x,y:sol2.y};
 const tw=spawn('tower',1,sam.x+40,sam.y+300); tw.built=true; tw.progress=1; tw.hp=tw.maxHp;
 h2.order={type:'move',x:sam.x,y:sam.y+180};   // inside the SAM's reach and over the tower
 run(10,()=>h2.order&&h2.order.arrived); const s0=sol2.hp; let ks=0; while(ks<20*30 && h2.hp>0){ h2.ammo=0; h2.order={type:'move',x:h2.x,y:h2.y,arrived:true}; U(0.05); ks++; } const tSam=+(ks/20).toFixed(1);
 out.sam={killedHeliSec:tSam, heliDead:h2.hp<=0, ignoredSoldier: sol2.hp===s0, towerTargetedHeli: tw.target===h2.id};
 // over rocks and river: flies straight
 game.credits[0]=5000; produce(pad,'heli'); run(30,()=>game.ents.some(e=>e.type==='heli'&&e.hp>0)); sam.hp=0; tw.hp=0; U(0.05);
 const h3=game.ents.find(e=>e.type==='heli'&&e.hp>0); const goal={x:W/2,y:H/2}; const dist=Math.hypot(goal.x-h3.x,goal.y-h3.y);
 h3.order={type:'move',x:goal.x,y:goal.y}; const tFly=run(120,()=>h3.order&&h3.order.arrived);
 out.straightFlight={dist:Math.round(dist), sec:tFly, straightLineSec:+(dist/STATS.heli.speed).toFixed(1)};
 // pad destroyed while it's out: it hovers; a new Helipad takes it in
 pad.hp=0; U(0.05); h3.order={type:'return'}; run(3);
 out.noPad={order: h3.order, landed: h3.landed};
 const pad2=mk('helipad',-100,260); const tDock=run(80,()=>h3.landed);
 out.newPad={sec:tDock, landed:h3.landed, onNewPad: Math.hypot(h3.x-pad2.x,h3.y-pad2.y)<1, padId: h3.pad===pad2.id};
 // v5.49.4: no flying into land never seen (black fog) unless attacking. Forget everything but a circle of 300 round the helicopter.
 h3.order=null; run(1); for (const f of [fog[0]]) for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) f.exp[r*COLS+c] = Math.hypot((c+0.5)*CELL-h3.x,(r+0.5)*CELL-h3.y) < 300 ? 1 : 0;
 const start={x:h3.x,y:h3.y}, far={x:Math.min(W-100,h3.x+900),y:h3.y};
 h3.landed=false; h3.order={type:'move',x:far.x,y:far.y}; run(15);
 out.moveIntoBlackFog={stoppedAfter:Math.round(Math.hypot(h3.x-start.x,h3.y-start.y)), stillOnSeenLand: exploredAt(h3.x,h3.y,0), arrived: !!(h3.order&&h3.order.arrived)};
 const foe=spawn('light',1,far.x,far.y); foe.passive=true; foe.order={type:'move',x:foe.x,y:foe.y}; h3.ammo=STATS.heli.ammo;
 h3.order={type:'attack',target:foe.id}; const tA=run(30,()=>foe.hp<=0);
 out.attackIntoBlackFog={sec:tA, foeDead:foe.hp<=0, flewOut:Math.round(Math.hypot(h3.x-start.x,h3.y-start.y))};
 out.report=buildReport().byUnit;
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
