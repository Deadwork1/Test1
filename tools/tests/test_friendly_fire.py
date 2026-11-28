# v5.75: blasts hurt your own units a little (a quarter): grenades and shells (Grenadier, Artillery, Rocket Launcher, Orbital
# Barrage), every rocket's small blast (enemies near the target take it in full), tank shell splash. Fire units can go up when
# destroyed (Flamethrower 35%, Flame Tank 60%), hurting everyone around (less further out) and setting trees alight.
# Forest fires and Napalm hurt the side that started them at a quarter too (their buildings not at all).
# Usage: python3 tests/test_friendly_fire.py <game folder> <port>
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
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-faction','all'); localStorage.setItem('mini-rts-map','large')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); const U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      const sight=()=>{ for(const f of fog){ f.vis.fill(1); f.exp.fill(1); } };
      const open=r=>{ for(let k=0;k<6000;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-r;d<=r&&good;d+=15) for(let e=-40;e<=40&&good;e+=20) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ents.some(o=>Math.hypot(o.x-x,o.y-y)<r+80)) return {x,y}; } };
      const hold=list=>{ for(const u of list){ u.order=null; u.cooldown=Math.max(u.cooldown,1e9*(u.freeze?1:0)); } };
      // one shot from 'shooter' at an enemy 'target' with a friend and another enemy standing right beside the target
      const shot=(shooter, tgtType, dist, after)=>{ const s=open(dist+60); const sh=spawn(shooter,0,s.x-dist,s.y); sh.hp=sh.maxHp=1e9;
        const tg=spawn(tgtType,1,s.x,s.y); tg.hp=tg.maxHp=1e6; const fr=spawn('soldier',0,s.x+6,s.y+12); fr.hp=fr.maxHp=1e6; const en=spawn('soldier',1,s.x+6,s.y-12); en.hp=en.maxHp=1e6;
        for(const u of [tg,fr,en]){ u.passive=true; u.freeze=true; u.cooldown=1e9; }
        sh.order={type:'attack',target:tg.id}; let k=0; const fired=()=>tg.hp<1e6||fr.hp<1e6||en.hp<1e6; while(k<20*12 && !fired()){ hold([tg,fr,en]); for(const u of [tg,fr,en]){ u.x=u===tg?s.x:s.x+6; u.y=u===tg?s.y:(u===fr?s.y+12:s.y-12); } sight(); U(1); k++; }
        U(after||10); sh.order=null; sh.passive=true; const res={tgt:+(1e6-tg.hp).toFixed(1), friend:+(1e6-fr.hp).toFixed(1), enemy:+(1e6-en.hp).toFixed(1)}; for(const u of [sh,tg,fr,en]) u.hp=0; U(2); return res; };
      const out={};
      out.grenade=shot('grenadier','soldier',80,20);
      out.mrl=shot('mrl','light',220,30);
      out.rocket=shot('rocket','light',110,12);
      out.tank=shot('light','soldier',110,6);
      // fuel blasts: a Flame Tank that's destroyed, with a friend and an enemy nearby (force the roll)
      const s=open(140); const ft=spawn('flametank',0,s.x,s.y); const near=spawn('soldier',0,s.x+30,s.y); const far=spawn('soldier',1,s.x+75,s.y); const out1=spawn('soldier',1,s.x+120,s.y);
      for(const u of [near,far,out1]){ u.hp=u.maxHp=1e6; u.passive=true; u.cooldown=1e9; }
      const rnd=Math.random; Math.random=()=>0; ft.hp=0; U(1); Math.random=rnd;
      out.blast={near:Math.round(1e6-near.hp), far:Math.round(1e6-far.hp), outside:Math.round(1e6-out1.hp)}; for(const u of [near,far,out1]) u.hp=0; U(2);
      // and how often each goes up: 400 deaths each
      const rate=t=>{ let n=0; for(let i=0;i<400;i++){ const blasts=[]; if(Math.random()<FUEL_BLAST[t].chance) n++; } return n/400; };
      out.rates={flamer:rate('flamer'), flametank:rate('flametank')};
      // a forest catches fire from a blast at its edge
      let fp=null; for(let i=0;i<terrain.length&&!fp;i++){ if(terrain[i]!==T.FOREST) continue; const c=i%TCOLS, rr=Math.floor(i/TCOLS); if(terrain[rr*TCOLS+c-1]===T.GRASS && terrain[rr*TCOLS+c+1]===T.FOREST) fp={x:c*TC+TC/2,y:rr*TC+TC/2}; }
      const f2=spawn('flamer',1,fp.x-10,fp.y); Math.random=()=>0; f2.hp=0; U(1); Math.random=rnd; out.fire=Object.keys(game.fires).length>0;
      // a burning forest tile: an enemy and one of the side that lit it standing in it for 2 s
      const fq=fp; const fo=spawn('soldier',0,fq.x+TC,fq.y), fe=spawn('soldier',1,fq.x+TC,fq.y), vo=spawn('flametank',1,fq.x+TC,fq.y), ve=spawn('light',0,fq.x+TC,fq.y); for(const u of [fo,fe,vo,ve]){ u.hp=u.maxHp=1e6; u.passive=true; u.cooldown=1e9; } igniteAt(fq.x+TC,fq.y,1,99);
      for(let i=0;i<40;i++){ for(const u of [fo,fe,vo,ve]){ u.order=null; u.x=fq.x+TC; u.y=fq.y; } U(1); } out.forestBurn={own:Math.round(1e6-fe.hp), enemy:Math.round(1e6-fo.hp)}; out.vehBurn={own:+(1e6-vo.hp).toFixed(1), enemy:+(1e6-ve.hp).toFixed(1)};
      return JSON.stringify(out); })()"""))
    print(r)
    for k, name in [('grenade', "a Grenadier's grenade"), ('mrl', 'a Rocket Launcher salvo'), ('rocket', "a Rocket Soldier's rocket")]:
        x = r[k]
        check(x['friend'] > 0 and x['enemy'] > 0 and x['friend'] <= x['enemy'] * 0.35 + 1, "%s's blast hurts the enemy beside the target (%.1f) and your own soldier a quarter as much (%.1f)" % (name, x['enemy'], x['friend']))
    t = r['tank']
    check(t['friend'] > 0 and t['friend'] <= t['enemy'] * 0.3 + 1, 'tank shell splash nicks your own infantry beside the target a little (%.1f vs %.1f)' % (t['friend'], t['enemy']))
    bl = r['blast']
    check(bl['near'] > bl['far'] > 0 and bl['outside'] == 0, 'a Flame Tank going up hurts your own unit close by (%d) more than an enemy further out (%d), nobody beyond 90 (%d)' % (bl['near'], bl['far'], bl['outside']))
    check(0.27 <= r['rates']['flamer'] <= 0.43 and 0.52 <= r['rates']['flametank'] <= 0.68, 'Flamethrowers go up about 35%% of the time (%.2f), Flame Tanks about 60%% (%.2f)' % (r['rates']['flamer'], r['rates']['flametank']))
    check(r['fire'], 'a fuel blast at the edge of a forest sets it alight')
    fb = r['forestBurn']
    vb = r['vehBurn']
    check(vb['own'] > 0 and vb['own'] <= vb['enemy'] * 0.12 + 0.2, "and the lighting side's vehicles only a tenth (%.1f vs the enemy's %.1f)" % (vb['own'], vb['enemy']))
    check(fb['own'] > 0 and fb['enemy'] > 0 and fb['own'] <= fb['enemy'] * 0.3 + 1, 'a forest fire burns the side that lit it at a quarter (%d) of what the enemy takes (%d)' % (fb['own'], fb['enemy']))
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
