# Towers and Turrets stop shooting a target that changes hands (v5.49.5): your manned Turret fires at an enemy Oil Derrick, you capture
# the Derrick, and the Turret stops; a Guard Tower firing at an enemy building stops when it becomes yours; an empty Turret the enemy
# takes over doesn't keep shooting at its old target.
# Usage: python3 test_tower_switch.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 newGame(); game.paused=false; runAI=()=>{}; game.ents=game.ents.filter(e=>e.type!=='settler'); for (const t of [0,1]) { const h=spawn('hq',t,START[t].x,START[t].y); h.built=true; } fog[0].vis.fill(1); fog[1].vis.fill(1); fog[0].exp.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{};
 const run=s=>{ for(let k=0;k<s*20;k++) U(0.05); };
 const der=game.ents.find(e=>e.type==='derrick'); der.team=1; der.hp=der.maxHp;
 const tur=spawn('mg',0,der.x+der.size/2+60,der.y); tur.built=true; tur.progress=1; tur.hp=tur.maxHp;   // (a Machine Gun Turret since v5.64)
 const hp0=der.hp; run(3); out.turretFiresAtEnemyDerrick = der.hp<hp0;
 captureBuilding(der,0); der.hp=der.maxHp; run(3); out.derrickCapturedHpAfter3s = Math.round(der.hp); out.turretStopped = der.hp===der.maxHp && tur.target!==der.id;
 // your exact case: the enemy holds the Derrick, your Turret knocks it out (it falls back to neutral), then you take it back
 der.team=1; der.hp=120; tur.target=der.id; let k=0; while(k<20*20 && der.team===1){ U(0.05); k++; }
 out.knockedToNeutral = der.team===NEUTRAL;
 run(2); out.turretLetGoOfNeutral = tur.target!==der.id;
 captureBuilding(der,0); der.hp=der.maxHp; run(3); out.backToYoursHp = Math.round(der.hp); out.turretLeavesItAlone = der.hp===der.maxHp && tur.target!==der.id;
 // Guard Tower on an enemy Power Plant that then becomes yours
 const pp=spawn('power',1,der.x,der.y+260); pp.built=true; pp.progress=1; pp.hp=pp.maxHp;
 const tw=spawn('cannon',0,pp.x+120,pp.y);   // (a Cannon Turret since v5.64)
  tw.built=true; tw.progress=1; tw.hp=tw.maxHp;
 run(2); out.towerFiresAtEnemyPlant = pp.hp<pp.maxHp; pp.team=0; pp.hp=pp.maxHp; run(3); out.towerStopped = pp.hp===pp.maxHp;
 return out; })()'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')"); pg.reload()
    pg.wait_for_timeout(3000); pg.click('#ovBtn')
    r = pg.evaluate(JS); print(json.dumps(r), 'errors', errs[:2])
    print('PASS' if r['turretFiresAtEnemyDerrick'] and r['turretStopped'] and r['knockedToNeutral'] and r['turretLetGoOfNeutral'] and r['turretLeavesItAlone'] and r['towerFiresAtEnemyPlant'] and r['towerStopped'] else 'FAIL')
    b.close()
srv.shutdown()
