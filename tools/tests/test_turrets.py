# Turrets (v5.64): Engineers build Machine Gun, Cannon, Missile and Laser turrets anywhere they can see, but not within 300 of an enemy building;
# each turret's damage against infantry, vehicles and aircraft; the SAM Site that waits underground; buttons hidden until unlocked;
# and the computer building turrets with its Engineers.
# Usage: python3 tests/test_turrets.py <game folder> <port>
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
    pg = b.new_page(viewport={'width': 1000, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-faction','all'); localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; game.credits[0]=20000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); window.hq=hqOf(0);
      window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1)||hq:hq; const b=spawn(t,team,h.x+dx,h.y+dy); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      window.U=(n,dt=0.05)=>{ for(let i=0;i<n;i++) update(dt); }; })()""")
    # --- buttons: hidden until unlocked, only with an Engineer selected
    r = json.loads(pg.evaluate("""(()=>{ const en=spawn('engineer',0,hq.x,hq.y+120); game.selected=new Set([en.id]); window.en=en;
      const vis=()=>({mg:ui.mg.style.display!=='none', cannon:ui.cannon.style.display!=='none', missile:ui.missile.style.display!=='none', laser:ui.laser.style.display!=='none'});
      updateHUD(); const a=vis(); put('barracks',-200,40); updateHUD(); const b2=vis();
      put('refinery',200,-150); put('factory',200,60); put('power',-200,-150); put('helipad',-60,-220); put('tech',60,220); put('radar',-330,60); const rx=put('reactor',-330,-200); updateHUD(); const c=vis(); rx.hp=0; U(2);   /* (gone again: the Reactor's power would speed up the build-time check) */
      game.selected=new Set(); updateHUD(); const d=vis();
      return JSON.stringify({none:a, barracks:b2, all:c, noEngineer:d}); })()""".replace('updateHUD()', "updateHUD()")))
    print(r)
    check(not any(r['none'].values()), 'no turret buttons before anything is unlocked')
    check(r['barracks']['mg'] and not r['barracks']['cannon'], 'the Barracks unlocks the Machine Gun only')
    check(all(r['all'].values()), 'War Factory unlocks the Cannon, War Factory + Radar the Missile, Nuclear Reactor the Laser (v5.67)')
    check(not any(r['noEngineer'].values()), 'buttons only show with an Engineer selected')
    # --- building one: the Engineer walks there, pays and steps off the spot (not used up since v5.68); the turret goes up over its build time
    r = json.loads(pg.evaluate("""(()=>{ const x=hq.x+260, y=hq.y+260; for (const v of game.ents) if (v.team===0) {} ;
      const c0=game.stats[0].spent; en.order={type:'buildTurret',kind:'mg',x,y}; let k=0; while(k<600 && !game.ents.some(t=>t.type==='mg'&&t.team===0)) { U(1); k++; }
      const t=game.ents.find(t=>t.type==='mg'&&t.team===0); const paid=game.stats[0].spent-c0, enAlive=game.ents.includes(en)&&en.hp>0, enClear=t?Math.hypot(en.x-t.x,en.y-t.y)>t.size/2+en.r:false, startBuilt=t&&t.built;
      let j=0; while(t && !t.built && j<400){ U(1); j++; }
      let again=null; if(t){ const x2=x+120, y2=y; const c1=game.stats[0].spent; en.order={type:'buildTurret',kind:'mg',x:x2,y:y2}; let m=0; while(m<600 && game.ents.filter(q=>q.type==='mg'&&q.team===0).length<2){ U(1); m++; } again={second:game.ents.filter(q=>q.type==='mg'&&q.team===0).length===2, paid:game.stats[0].spent-c1, alive:en.hp>0}; }
      return JSON.stringify({made:!!t, paid, enAlive, enClear, again, engCost:COST.engineer, startBuilt, secsToBuild:+(j*0.05).toFixed(1), at:t?[Math.round(t.x-x),Math.round(t.y-y)]:null}); })()"""))
    print(r)
    check(r['made'] and r['paid'] == 300 and r['enAlive'] and r['enClear'], 'the Engineer walks over, pays $300, and steps off the spot alive (v5.68: no longer used up)')
    check(r['again'] and r['again']['second'] and r['again']['paid'] == 300 and r['again']['alive'], 'the same Engineer builds a second turret')
    check(r['engCost'] == 200, 'Engineers cost $200 (were $150)')
    check(not r['startBuilt'] and 6 <= r['secsToBuild'] <= 14, 'the Machine Gun takes its build time to go up (about 8 s)')
    # --- the rules: not within 300 of an enemy building, not where you can't see
    r = json.loads(pg.evaluate("""(()=>{ const eb=spawn('barracks',1,hq.x+900,hq.y-700); eb.built=true; eb.progress=1;
      const hiddenBlocks=!turretSiteOk(0,'mg',eb.x-eb.size/2-200,eb.y) && turretSiteProblem(0,'mg',eb.x-eb.size/2-200,eb.y)==='Too close to an enemy building';   // (only if that spot is in view at all)
      for (let a=0;a<3;a++) { const s=spawn('soldier',0,eb.x-eb.size/2-120,eb.y+a*20); s.passive=true; } { const s=spawn('soldier',0,eb.x-eb.size/2-380,eb.y+40); s.passive=true; } U(10);
      const near=turretSiteOk(0,'mg',eb.x-200,eb.y), far=turretSiteOk(0,'mg',eb.x-eb.size/2-330,eb.y);
      const unseen=turretSiteOk(0,'mg',W-200,200), why=turretSiteProblem(0,'mg',eb.x-200,eb.y), why2=turretSiteProblem(0,'mg',W-200,200);
      eb.hp=0; U(2); return JSON.stringify({near, far, unseen, why, why2, hiddenBlocks}); })()"""))
    print(r)
    check(not r['near'] and r['why'] == 'Too close to an enemy building', 'no turret within 300 of an enemy building')
    check(r['far'], 'a turret just outside the 300 ring is fine')
    check(not r['hiddenBlocks'], "an enemy building you haven't found doesn't block you (no peeking through the fog)")
    check(not r['unseen'] and r['why2'] == "You can't see there", 'no turret on ground you can\'t see')
    # --- damage: each turret against a soldier, a light tank and a helicopter
    r = json.loads(pg.evaluate("""(()=>{ const out={};
      // an open patch of grass with room for a target 120 to the east
      for (let k=0;k<400 && !window.openSpot;k++){ const x=hq.x+(Math.random()-0.5)*900, y=hq.y-150-Math.random()*700;
        if (siteIsFree(x,y,60) && siteIsFree(x+120,y,30) && !elevAt(x,y) && !elevAt(x+120,y)) window.openSpot={x,y}; }
      for (const kind of ['mg','cannon','missile','laser']) {
        out[kind]={};
        for (const foe of ['soldier','light','heli']) {
          const {x:tx,y:ty}=window.openSpot; const t=spawn(kind,0,tx,ty); t.built=true; t.progress=1; t.cooldown=0; t.hp=t.maxHp=1e9;
          const f=spawn(foe,1,tx+120,ty); f.passive=true; const hp0=f.hp; let k=0;
          while(k<20*12 && f.hp>0){ f.x=tx+120; f.y=ty; f.order=null; if(f.air) f.ammo=0; update(0.05); k++; }
          out[kind][foe]= f.hp>0 ? 'lived, took '+Math.round(hp0-f.hp) : 'dead in '+(k/20).toFixed(1)+'s';
          t.hp=0; f.hp=0; update(0.05);
        }
      }
      return JSON.stringify(out); })()"""))
    print(json.dumps(r, indent=1))
    check(r['mg']['soldier'].startswith('dead') and float(r['mg']['soldier'].split()[2][:-1]) < 4, 'Machine Gun kills a Soldier fast')
    check(r['mg']['heli'].startswith('lived, took 0') and r['cannon']['heli'].startswith('lived, took 0'), "Machine Gun and Cannon can't hit aircraft")
    check(r['cannon']['light'].startswith('dead'), 'Cannon kills a Light Tank')
    check(r['missile']['heli'].startswith('dead') and r['laser']['heli'].startswith('dead'), 'Missile and Laser bring down a helicopter')
    check(r['laser']['soldier'].startswith('dead'), 'Laser one-shots a Soldier')
    # --- SAM Site: underground until an aircraft is in range, then comes up and fires; range 240
    r = json.loads(pg.evaluate("""(()=>{ const sx=hq.x-700, sy=hq.y+500; const sm=spawn('sam',0,sx,sy); sm.built=true; sm.progress=1;
      U(40); const idleUp=sm.up||0; const h=spawn('heli',1,sx+235,sy); h.ammo=0; let firstShot=null, k=0;
      while(k<20*15 && h.hp>0){ h.x=sx+235; h.y=sy; h.order=null; update(0.05); k++; if(firstShot===null && sm.fired!==undefined) firstShot=k/20; }
      const killed=h.hp<=0; U(60); return JSON.stringify({range:STATS.sam.range, idleUp, firstShot, killed, downAgain:sm.up}); })()"""))
    print(r)
    check(r['range'] == 240, 'SAM Site range is 240')
    check(r['idleUp'] == 0 and r['downAgain'] == 0, 'the SAM Site stays underground with no aircraft about, and sinks back after')
    check(r['firstShot'] is not None and r['firstShot'] >= 0.9 and r['killed'], 'it takes about 1 s to come up before its first shot, and brings the helicopter down')
    # --- the computer builds turrets with its Engineers
    for d in ['normal', 'hard']:
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-difficulty','{d}')"); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
        r = json.loads(pg.evaluate("""(()=>{ deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.maxHp=hq.hp=1e9;
          for (let i=0;i<4;i++) { const v=spawn('light',0,hq.x+40*i,hq.y-150); v.passive=true; v.hp=v.maxHp=1e9; }   // it should see vehicles and answer with Cannons
          const log=[]; for (let t=0;t<9*60;t+=0.1){ update(0.1); hq.hp=1e9; }
          const tur=game.ents.filter(e=>e.team===1&&isTurretType(e.type));
          return JSON.stringify({kinds:tur.map(t=>t.type+(t.built?'':'(building)')+(t.entrance?'@entrance':'')), engineersOut:game.ents.filter(e=>e.team===1&&e.type==='engineer'&&e.turretAt).length}); })()"""))
        print(d, r)
        check(len(r['kinds']) >= 2, f'{d}: the computer has built at least 2 turrets by 9 minutes')
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
