# Turrets: an Engineer digs in ($125, 3 s, the Engineer is used up), forests and lack of money are refused, it can't be sold or captured,
# it beats a Soldier and does half damage to tanks; also checks a captured ruin's build area stops at its clearing.
# Usage: python3 test_turret.py <game folder> <port> [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 const setup=()=>{ newGame(); game.paused=false; runAI=()=>{}; game.ents=game.ents.filter(e=>e.type!=='settler'); for (const t of [0,1]) { const h=spawn('hq',t,START[t].x,START[t].y); h.built=true; } fog[0].vis.fill(1); fog[1].vis.fill(1); window.updateFog=()=>{}; };
 const open=()=>{ for (let y=300;y<H-300;y+=25) for (let x=300;x<W/2;x+=25){ let ok=true; for(let k=-6;k<=6&&ok;k++) for(let j=-6;j<=6;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok && !game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<200)) return {x,y}; } };
 setup(); const p=open(); out.engineerCost=COST.engineer; out.turretCost=COST.turret;
 game.credits[0]=1000; const en=spawn('engineer',0,p.x,p.y); const t=digIn(en);
 out.dig={ ok: typeof t==='object', moneyLeft: game.credits[0], engineerGone: en.hp<=0, builtAtStart: t.built };
 for (let k=0;k<20*4;k++) U(0.05); out.dig.builtAfter4s=t.built; out.dig.hp=Math.round(t.hp);
 out.sellable=sellable(t); out.capturable=canCapture(t);
 // forest refused, money refused
 const fx=(()=>{ for (let y=200;y<H-200;y+=25) for (let x=200;x<W-200;x+=25) if (terrainAt(x,y)===T.FOREST) return {x,y}; })();
 const e2=spawn('engineer',0,fx.x,fx.y); out.forest=digIn(e2);
 game.credits[0]=50; const e3=spawn('engineer',0,p.x+200,p.y); out.noMoney=digIn(e3); game.credits[0]=1000;
 // shoots a soldier walking up
 const s=spawn('soldier',1,t.x+150,t.y); s.order={type:'attack',target:t.id}; let k=0; while(k<20*10 && s.hp>0){U(0.05);k++;} out.killsSoldierInSec=s.hp<=0?+(k/20).toFixed(1):'alive '+s.hp;
 // tank: damage per second vs a light tank (passive, in range)
 const tk=spawn('light',1,t.x+120,t.y); tk.passive=true; const h0=tk.hp; for(k=0;k<20*5;k++){ tk.hp=Math.max(tk.hp,1); U(0.05);} out.tankDps=+((h0-tk.hp)/5).toFixed(1);
 // build area: a working ruin reaches only across its clearing
 const ru=game.ents.filter(e=>e.ruin && e.x<W/2); for (const r of ru){ r.team=0; r.hp=r.maxHp; }
 const b=ru[0]; out.ruinBuildAreaAtEdgePlus50 = inBuildArea(0,b.x,b.y-b.size/2-50); out.ruinBuildAreaAtEdgePlus150 = inBuildArea(0,b.x,b.y-b.size/2-150);
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
