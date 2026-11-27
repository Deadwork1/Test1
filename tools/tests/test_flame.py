# v5.69: the Flamethrower (Barracks + Power Plant, $250), the Flame Tank and the Rocket Launcher (War Factory + Tech Centre,
# $800 / $900), and forest fires: flame units set trees alight, the fire spreads to touching trees for a few steps and burns
# out to scorched ground for good (vehicles can drive there, infantry can't hide there); a restart brings the forest back.
# Usage: python3 tests/test_flame.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
SETUP = """(()=>{ window.realAI=runAI; runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
  window.hq=hqOf(0); hq.hp=hq.maxHp=1e9; hqOf(1).hp=hqOf(1).maxHp=1e9; fog[0].exp.fill(1); fog[1].exp.fill(1);
  window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
  window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1):hq; return mk(t,team,h.x+dx,h.y+dy); };
  window.open=(r)=>{ for(let k=0;k<3000;k++){ const x=200+Math.random()*(W-400), y=200+Math.random()*(H-400); let good=true; for(let d=-r;d<=r&&good;d+=12) for(let e=-30;e<=30&&good;e+=15) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good) return {x,y}; } };
  window.sight=()=>{ for(const t of [0,1]) fog[t].vis.fill(1); };
})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-faction','all'); localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    # unlocks and prices
    r = json.loads(pg.evaluate("""(()=>{ const bar=put('barracks',-190,30), ref=put('refinery',-170,-140), f=put('factory',200,40);
      const btns=b=>{ game.selected=new Set([b.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(x=>x.style.display!=='none').map(x=>x.textContent); };
      const a={bar:btns(bar), fac:btns(f)}; put('power',-300,120); const c={bar:btns(bar)}; put('tech',190,-130); const d={fac:btns(f)};
      return JSON.stringify({a,c,d}); })()"""))
    print(r)
    check(not any('Flame' in t for t in r['a']['bar']) and any(t == 'Flamethrower $250' for t in r['c']['bar']), 'Flamethrower ($250) appears at the Barracks with a Power Plant')
    check(not any('Flame Tank' in t or 'Rocket Launcher' in t for t in r['a']['fac']) and 'Flame Tank $800' in r['d']['fac'] and 'Rocket Launcher $900' in r['d']['fac'], 'Flame Tank ($800) and Rocket Launcher ($900) appear at the War Factory with a Tech Centre')
    # damage
    r = json.loads(pg.evaluate("""(()=>{ sight(); const out={};
      const duel=(a,foe,dist)=>{ const s=open(dist+20); const u=spawn(a,0,s.x,s.y); u.hp=u.maxHp=1e9; const f=spawn(foe,1,s.x+dist,s.y); f.passive=true; let k=0; u.order={type:'attack',target:f.id};
        while(k<20*30 && f.hp>0){ f.x=s.x+dist; f.y=s.y; f.order=null; sight(); U(1); k++; } const res=f.hp<=0?+(k/20).toFixed(1):'lived '+Math.round(f.maxHp-f.hp); u.hp=0; f.hp=0; U(2); return res; };
      out.flamerVsSoldier=duel('flamer','soldier',50); out.flamerVsLight=duel('flamer','light',50); out.ftVsSoldier=duel('flametank','soldier',65); out.ftVsLight=duel('flametank','light',65);
      // rocket launcher: a salvo of 6 at a bunch of soldiers 250 away
      const s=open(280); const m=spawn('mrl',0,s.x,s.y); m.hp=m.maxHp=1e9; const grp=[]; for(let i=0;i<6;i++){ const g=spawn('soldier',1,s.x+250+(i%3)*14,s.y+Math.floor(i/3)*14); g.passive=true; g.hp=g.maxHp=1e9; grp.push(g); }
      let salvos=0, last=m.cooldown, rockets=0, k=0, firstAt=null, hitAt=null; const step=()=>{ for(const g of grp) g.order=null; sight(); U(1); k++; if(m.cooldown>last+1){ salvos++; if(firstAt===null) firstAt=k/20; } rockets=Math.max(rockets, game.grenades.filter(q=>q.srcType==='mrl').length); if(hitAt===null && grp.some(g=>g.hp<g.maxHp)) hitAt=k/20; last=m.cooldown; };
      m.order={type:'attack',target:grp[0].id}; while(k<20*12 && firstAt===null) step(); const s0=salvos; for(let j=0;j<20*10;j++) step();
      const hit=grp.filter(g=>g.hp<g.maxHp).length;
      out.mrl={rockets, hit, flight:+(hitAt-firstAt).toFixed(2), in10:salvos-s0}; m.hp=0; for(const g of grp) g.hp=0; U(2);
      return JSON.stringify(out); })()"""))
    print(r)
    check(isinstance(r['flamerVsSoldier'], float) and r['flamerVsSoldier'] < 3, 'a Flamethrower burns down a Soldier in %s s' % r['flamerVsSoldier'])
    check(isinstance(r['flamerVsLight'], float) and r['flamerVsLight'] > 20 or not isinstance(r['flamerVsLight'], float), 'but struggles against a Light Tank (%s)' % r['flamerVsLight'])
    check(isinstance(r['ftVsSoldier'], float) and r['ftVsSoldier'] < 2, 'a Flame Tank burns down a Soldier in %s s' % r['ftVsSoldier'])
    check(not isinstance(r['ftVsLight'], float) or r['ftVsLight'] > 15, 'and is weak against a Light Tank (%s)' % r['ftVsLight'])
    check(r['mrl']['rockets'] == 2 and r['mrl']['flight'] <= 0.8 and r['mrl']['in10'] in (5, 6) and r['mrl']['hit'] >= 2, 'the Rocket Launcher fires 2 fast missiles (first hit %s s after firing) every 2 s (%s pairs in 10 s) that splash a group: %s' % (r['mrl']['flight'], r['mrl']['in10'], r['mrl']))
    # forest fire
    r = json.loads(pg.evaluate("""(()=>{ sight();
      let edge=null; for(let i=0;i<terrain.length&&!edge;i++){ if(terrain[i]!==T.FOREST) continue; const c=i%TCOLS, rr=Math.floor(i/TCOLS); let n=0; for(let dc=-2;dc<=2;dc++) for(let dr=-2;dr<=2;dr++) if(terrain[(rr+dr)*TCOLS+c+dc]===T.FOREST) n++;
        if(n>=20 && terrain[rr*TCOLS+c-4]===T.GRASS && terrain[rr*TCOLS+c-5]===T.GRASS && terrain[rr*TCOLS+c-6]===T.GRASS) edge={x:c*TC+TC/2, y:rr*TC+TC/2}; }
      const before=terrain.filter(t=>t===T.FOREST).length;
      const fl=spawn('flamer',0,edge.x-130,edge.y); fl.order={type:'burn',x:edge.x,y:edge.y};
      const hider=spawn('soldier',1,edge.x+TC,edge.y); hider.passive=true; hider.hp=hider.maxHp=1e9; const hidBefore=hiddenFrom(hider,0);
      let lit=null,k=0; while(k<20*15 && lit===null){ sight(); U(1); k++; if(Object.keys(game.fires).length) lit=+(k/20).toFixed(1); }
      let maxFires=0; for(let j=0;j<20*25;j++){ U(1); maxFires=Math.max(maxFires,Object.keys(game.fires).length); }
      const after=terrain.filter(t=>t===T.FOREST).length, burntTiles=before-after, edgeNow=terrainAt(edge.x,edge.y), hurt=hider.maxHp-hider.hp, hidAfter=hiddenFrom(hider,0);
      // a vehicle can now drive onto the burnt ground
      const canDrive=walkable(terrainAt(edge.x,edge.y),true);
      newGame(); const restored=terrain.filter(t=>t===T.FOREST).length===before;
      return JSON.stringify({lit, maxFires, burntTiles, edgeGrass:edgeNow===T.GRASS, hurt:Math.round(hurt), hidBefore, hidAfter, canDrive, restored}); })()"""))
    print(r)
    check(r['lit'] is not None, 'a Flamethrower told to burn trees walks up and sets them alight (%s s)' % r['lit'])
    check(r['maxFires'] >= 4 and 5 <= r['burntTiles'] <= 120, 'the fire spreads to the trees around it and burns out (%d tiles burnt, up to %d alight at once)' % (r['burntTiles'], r['maxFires']))
    check(r['edgeGrass'] and r['canDrive'], 'the burnt ground is open: vehicles can drive on it')
    check(r['hidBefore'] and not r['hidAfter'] and r['hurt'] > 20, 'an enemy hiding in the trees is burned (%d) and can no longer hide there' % r['hurt'])
    check(r['restored'], 'a restart brings the burnt forest back')
    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    # the computer builds and uses them (Normal)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    r = json.loads(pg.evaluate("""(()=>{ runAI=realAI; const ai=game.ai; game.time=600; ai.wavesSent=2; ai.seen={infantry:12,vehicles:2,snipers:0}; game.credits[1]=1e5;
      put('barracks',-200,-60,1); put('refinery',-200,120,1); put('factory',270,130,1); put('power',0,-180,1); for(let i=0;i<10;i++) spawn('soldier',1,hqOf(1).x-260+i*10,hqOf(1).y+220);
      spawn('light',1,hqOf(1).x-300,hqOf(1).y+260);
      let k=0; while(k<20*240){ if(game.credits[1]<20000) game.credits[1]=20000; U(1); k++; }
      const made=game.track.made[1]; return JSON.stringify({tech:game.ents.some(e=>e.team===1&&e.type==='tech'), flamer:made.flamer||0, flametank:made.flametank||0, mrl:made.mrl||0}); })()"""))
    print('normal', r)
    check(r['tech'] and r['flamer'] >= 1 and r['flametank'] >= 1 and r['mrl'] >= 1, 'Normal builds a Tech Centre and uses Flamethrowers, a Flame Tank and a Rocket Launcher')
    check(not errs, 'no page errors (computer)' + (': ' + errs[0] if errs else ''))
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
