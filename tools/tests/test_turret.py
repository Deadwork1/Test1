# Turrets: an Engineer builds an empty one ($125, the Engineer is used up; Engineers cost $100 since v5.46); empty it holds fire; infantry climb in to man it and it fires;
# Unload lets the gunner out; an enemy can take over an empty Turret; a destroyed manned Turret counts its gunner as lost; no selling or capture.
# Usage: python3 test_turret.py <game folder> <port> [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 newGame(); game.paused=false; runAI=()=>{}; game.ents=game.ents.filter(e=>e.type!=='settler'); for (const t of [0,1]) { const h=spawn('hq',t,START[t].x,START[t].y); h.built=true; } fog[0].vis.fill(1); fog[1].vis.fill(1); window.updateFog=()=>{};
 const open=()=>{ for (let y=300;y<H-300;y+=25) for (let x=300;x<W/2;x+=25){ let ok=true; for(let k=-7;k<=7&&ok;k++) for(let j=-7;j<=7;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok && !game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<220)) return {x,y}; } };
 const p=open(); game.credits[0]=1000;
 const en=spawn('engineer',0,p.x,p.y); const t=digIn(en); for (let k=0;k<20*4;k++) U(0.05);
 out.built={ok:t.built, engineerUsedUp: en.hp<=0, crew: t.crew, money: game.credits[0]};
 out.sellable=sellable(t); out.capturableByEngineer=canCapture(t);
 // empty: holds fire
 const foe=spawn('soldier',1,t.x+110,t.y); foe.passive=true; const h0=foe.hp; for (let k=0;k<20*3;k++) U(0.05); out.emptyHoldsFire = foe.hp===h0;
 // a soldier mans it
 const sol=spawn('soldier',0,t.x-120,t.y+60); sol.order={type:'man',target:t.id}; let k=0; while(k<20*15 && !t.crew){U(0.05);k++;}
 out.manned={inSec:+(k/20).toFixed(1), crew:t.crew&&t.crew.type, soldierGoneFromArmy: !game.ents.includes(sol)};
 k=0; while(k<20*15 && foe.hp>0){U(0.05);k++;} out.killsSoldierSec = foe.hp<=0 ? +(k/20).toFixed(1) : 'alive';
 // unload
 const back=unloadTurret(t); out.unload={soldierBack: back && back.type, team: back&&back.team, turretEmpty: !t.crew};
 // enemy takes the empty turret
 const raider=spawn('grenadier',1,t.x+140,t.y-40); raider.order={type:'man',target:t.id}; back.passive=true; back.x=t.x-400; k=0; while(k<20*15 && t.team!==1){U(0.05);k++;}
 out.enemyTakesEmpty={team:t.team, crew:t.crew&&t.crew.type, sec:+(k/20).toFixed(1)};
 // destroyed with its gunner inside: counted as a unit lost for its owner
 const lost0=game.stats[1].unitsLost; t.hp=-1; U(0.05); out.destroyedGunnerCounted = game.stats[1].unitsLost-lost0;
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
