# v5.76: the Skylift, a twin-rotor transport for 5 infantry. Nobody's faction and on no build list (missions only).
# It lands to take infantry on (select them, tap it), flies straight to where it's sent, lands on clear ground nearby,
# and Unload lets them out (pressed in the air it lands first). Unarmed; shot down, everyone aboard dies. Missions call
# airlift(team, units, from, to) to fly troops in, drop them and leave. Saves a picture if given a folder.
# Usage: python3 tests/test_airlift.py <game folder> <port> [picture folder]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
pics = sys.argv[3] if len(sys.argv) > 3 else None
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-faction','legion'); localStorage.setItem('mini-rts-map','large'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ window.realAI=runAI; runAI=()=>{}; updateReinforcements=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); const U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      const sight=()=>{ for(const f of fog){ f.vis.fill(1); f.exp.fill(1); } }; sight(); const hq=hqOf(0); hq.hp=hq.maxHp=1e9; hqOf(1).hp=hqOf(1).maxHp=1e9; game.credits[0]=1e5;
      const out={};
      // not on any build list, for either faction
      const mk=(t,dx,dy)=>{ const e=spawn(t,0,hq.x+dx,hq.y+dy); e.built=true; e.progress=1; e.hp=e.maxHp; return e; };
      const f=mk('factory',220,60), bar=mk('barracks',-200,40), pad=mk('helipad',-220,-160); mk('tech',350,-40); mk('reactor',-350,-30); mk('power',0,-200); mk('refinery',200,-170);
      const btns=x=>{ game.selected=new Set([x.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(b=>b.style.display!=='none').map(b=>b.dataset.unit); };
      out.buttons=[...btns(f),...btns(bar),...btns(pad)]; out.inCost='airlift' in COST;
      // load 5 soldiers (a 6th is turned away), fly across, land, unload
      const a=spawn('airlift',0,hq.x+60,hq.y+200); a.landed=true; a.alt=0; U(2);
      const sol=[]; for(let i=0;i<6;i++) sol.push(spawn('soldier',0,hq.x-40+i*12,hq.y+260));
      game.selected=new Set(sol.map(s=>s.id)); handleTap(a.x,a.y); let k=0; while(k<20*15 && (a.cargo||[]).length<5){ U(1); k++; }
      out.aboard=(a.cargo||[]).length; out.leftOver=sol.filter(s=>game.ents.includes(s)).length; out.loadSecs=+(k/20).toFixed(1);
      const dest={x:hq.x+700,y:hq.y-250}; game.selected=new Set([a.id]); handleTap(dest.x,dest.y); const x0=a.x, y0=a.y; k=0; let maxAlt=0;
      while(k<20*30 && !(a.landed && !a.order && a.alt<0.05)){ U(1); k++; maxAlt=Math.max(maxAlt,a.alt); }
      out.flew=Math.round(Math.hypot(a.x-x0,a.y-y0)); out.landedNear=Math.round(Math.hypot(a.x-dest.x,a.y-dest.y)); out.maxAlt=+maxAlt.toFixed(2); out.flySecs=+(k/20).toFixed(1); out.stillAboard=a.cargo.length;
      out.ground=landingOk(a.x,a.y);
      game.selected=new Set([a.id]); updateHUD(); out.unloadBtn=ui.unload.style.display!=='none' && ui.unload.textContent;
      ui.unload.click(); U(2); out.out=sol.slice(0,5).filter(s=>game.ents.includes(s)&&s.hp>0).length; out.outNear=sol.slice(0,5).every(s=>Math.hypot(s.x-a.x,s.y-a.y)<60);
      // Unload pressed in the air: it lands first, then lets them out
      for(const s of sol.slice(0,5)) s.order={type:'move',x:a.x,y:a.y,board:a.id}; k=0; while(k<20*10 && a.cargo.length<5){ U(1); k++; }
      game.selected=new Set([a.id]); handleTap(a.x-500,a.y+150); U(40); const airborne=a.alt>0.8 && !a.landed; ui.unload.click(); k=0; while(k<20*15 && a.cargo.length){ U(1); k++; }
      out.airUnload={airborne, emptied:a.cargo.length===0, secs:+(k/20).toFixed(1), landed:a.landed};
      // shot down with 5 aboard: they all die and count as lost
      for(const s of sol.slice(0,5)) s.order={type:'move',x:a.x,y:a.y,board:a.id}; k=0; while(k<20*10 && a.cargo.length<5){ U(1); k++; }
      const lost0=game.stats[0].unitsLost; a.hp=0; U(2); out.downLost=game.stats[0].unitsLost-lost0; out.survivors=sol.slice(0,5).filter(s=>game.ents.includes(s)&&s.hp>0).length;
      // only anti-air can hurt it: a Rocket Soldier can, a Soldier can't
      const a2=spawn('airlift',0,hq.x,hq.y+100); a2.landed=false; a2.alt=1; out.canHit={soldier:canHit(spawn('soldier',1,0,0),a2), rocket:canHit(spawn('rocket',1,0,0),a2)};
      a2.hp=0; U(1); const lost1=game.stats[0].unitsLost;
      // a mission's airlift: 5 troops flown in from the edge, dropped, then it leaves the map
      const from={x:20,y:hq.y-100}, to={x:hq.x+300,y:hq.y+150}; const shown0=game.reinfShown||0; const m=airlift(0,['soldier','soldier','rocket','grenadier','engineer'],from,to);
      const before=game.ents.filter(e=>e.team===0&&isInfantry(e)).length; k=0; let dropped=null;
      while(k<20*60 && game.ents.includes(m)){ U(1); k++; if(dropped===null && m.cargo.length===0) dropped=+(k/20).toFixed(1); }
      out.reinf={mission:(game.reinfShown||0)-shown0, ownUnloads:shown0};
      out.mission={dropped, gone:!game.ents.includes(m), added:game.ents.filter(e=>e.team===0&&isInfantry(e)).length-before, notLost:game.stats[0].unitsLost-lost1, secs:+(k/20).toFixed(1)};
      // the computer's helicopter logic leaves it alone
      const a3=spawn('airlift',1,hqOf(1).x,hqOf(1).y+150); a3.landed=true; a3.alt=0; runAI=window.realAI||runAI; U(40); out.aiLeftAlone=!a3.order;
      return JSON.stringify(out); })()"""))
    print(r)
    check('airlift' not in r['buttons'] and not r['inCost'], 'the Skylift is on no build list (missions only)')
    check(r['aboard'] == 5 and r['leftOver'] == 1, '5 soldiers climb in, the 6th is turned away (%s s)' % r['loadSecs'])
    check(r['maxAlt'] > 0.9 and r['flew'] > 600 and r['landedNear'] < 60 and r['ground'], 'it lifts off, flies %d over everything and lands on clear ground %d from the spot (%s s)' % (r['flew'], r['landedNear'], r['flySecs']))
    check(r['stillAboard'] == 5 and r['unloadBtn'] == 'Unload (5)', 'they stay aboard until you press Unload (%s)' % r['unloadBtn'])
    check(r['out'] == 5 and r['outNear'], 'Unload lets all 5 out beside it')
    au = r['airUnload']
    check(au['airborne'] and au['emptied'] and au['landed'], 'Unload pressed in the air: it lands first, then lets them out (%s s)' % au['secs'])
    check(r['downLost'] == 6 and r['survivors'] == 0, 'shot down with 5 aboard: all of them die (%d lost with the Skylift)' % r['downLost'])
    check(not r['canHit']['soldier'] and r['canHit']['rocket'], 'only anti-air can hit it (Soldier %s, Rocket Soldier %s)' % (r['canHit']['soldier'], r['canHit']['rocket']))
    m = r['mission']
    check(m['dropped'] is not None and m['added'] == 5 and m['gone'] and m['notLost'] == 0, 'a mission airlift flies 5 troops in, drops them (%s s) and leaves the map (%s s) without counting as lost' % (m['dropped'], m['secs']))
    check(r['reinf']['mission'] == 1 and r['reinf']['ownUnloads'] == 0, '"Reinforcements have arrived" shows when a mission Skylift drops its troops, not when you unload one yourself (%s)' % r['reinf'])
    check(r['aiLeftAlone'], "the computer's helicopter orders leave a Skylift alone")
    if pics:
        pg.evaluate("""(()=>{ const hq=hqOf(0); for(const f of fog){f.vis.fill(1);f.exp.fill(1);}
          const a=spawn('airlift',0,hq.x+90,hq.y+230); a.landed=true; a.alt=0; a.facing=0; a.cargo=[spawn('soldier',0,0,0),spawn('soldier',0,0,0)]; game.ents=game.ents.filter(e=>!a.cargo.includes(e));
          for(let i=0;i<3;i++){ const s=spawn('soldier',0,a.x-50-i*12,a.y+8-i*6); s.facing=0; }
          const b2=spawn('airlift',1,hq.x+200,hq.y+190); b2.landed=false; b2.alt=1; b2.facing=-0.5; b2.order={type:'move',x:b2.x+400,y:b2.y-300,started:true};
          for(let i=0;i<3;i++) update(0.05); cam.x=hq.x+150; cam.y=hq.y+215; setZoom(2.4); clampCam(); game.paused=true; game.selected=new Set([a.id]); updateHUD(); })()""")
        pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/skylift.png')
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
