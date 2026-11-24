# v5.67: the Nuclear Reactor ($1,000, needs a Tech Centre: power worth 3 Power Plants, still capped at double; unlocks the Heavy
# Tank and the Laser Turret) and the Satellite Radar ($1,500, needs a Reactor: everything in your explored fog is in view, black
# fog stays black; unlocks the Missile Turret and the Napalm Strike, once every 5 minutes: a 300-long strip of fire for 6 s,
# deadly to infantry, a little to vehicles, never your own side). The computer builds and uses them on Hard only.
# Usage: python3 tests/test_reactor_satellite.py <game folder> <port>
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
def page(b, d):
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','{d}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ window.realAI=runAI; runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      window.hq=hqOf(0); window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
      window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1):hq; return mk(t,team,h.x+dx,h.y+dy); }; })()""")
    return pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg, errs = page(b, 'normal')
    r = json.loads(pg.evaluate("""(()=>{ const out={cost:[COST.reactor,COST.satellite], req:[REQUIRES.reactor,REQUIRES.satellite,REQUIRES.heavy,REQUIRES.laser,REQUIRES.missile]};
      put('barracks',-190,30); put('refinery',-170,-140); put('factory',200,40); out.before=[unlocked(0,'reactor'),unlocked(0,'heavy')]; game.selected=new Set([hq.id]); updateHUD(); out.btnBefore=ui.reactor.style.display!=='none';
      put('tech',190,-130); updateHUD(); out.btnAfterTech=ui.reactor.style.display!=='none'; out.heavyAfterTech=unlocked(0,'heavy');
      const b0=powerBoost(0); window.R=put('reactor',0,-230); out.boost=[b0, powerBoost(0)]; out.after=[unlocked(0,'heavy'),unlocked(0,'laser'),unlocked(0,'satellite'),unlocked(0,'missile')];
      const pp=[0,1].map(i=>put('power',-300+i*70,200)); out.capped=powerBoost(0); pp.forEach(x=>x.hp=0); U(2);
      return JSON.stringify(out); })()"""))
    print(r)
    check(r['cost'] == [1000, 1500], 'Nuclear Reactor $1,000, Satellite Radar $1,500')
    check(r['req'] == [['tech'], ['reactor'], ['reactor'], ['reactor'], ['satellite']], 'Reactor needs a Tech Centre, Satellite a Reactor; Heavy Tank and Laser need the Reactor, Missile Turret the Satellite')
    check(not r['btnBefore'] and r['btnAfterTech'] and not r['heavyAfterTech'], 'the Reactor button appears with the Tech Centre (which no longer unlocks the Heavy Tank)')
    check(r['boost'] == [1, 1.75] and r['capped'] == 2, 'a Reactor counts as 3 Power Plants (+75%); with 2 more plants power still stops at double')
    check(r['after'] == [True, True, True, False], 'the Reactor unlocks the Heavy Tank, Laser Turret and Satellite Radar')
    # satellite vision
    r = json.loads(pg.evaluate("""(()=>{ let far=null; for(let k=0;k<2000&&!far;k++){ const x=200+Math.random()*(W-400), y=200+Math.random()*(H-400); if(walkable(terrainAt(x,y),true)&&terrainAt(x,y)!==T.FOREST&&Math.hypot(x-hq.x,y-hq.y)>900) far={x,y}; }
      const c=cellIndex(far.x,far.y); fog[0].exp[c]=1; const foe=spawn('light',1,far.x,far.y); foe.passive=true; U(2); const greyBefore=visibleAt(far.x,far.y,0);
      let unk=null; for(let k=0;k<2000&&!unk;k++){ const x=200+Math.random()*(W-400), y=200+Math.random()*(H-400); if(!fog[0].exp[cellIndex(x,y)]&&walkable(terrainAt(x,y),true)) unk={x,y}; }
      const S=put('satellite',-20,200); U(2); const grey=visibleAt(far.x,far.y,0), black=visibleAt(unk.x,unk.y,0); foe.hp=0;
      out={}; S.hp=0; U(2); const gone=visibleAt(far.x,far.y,0); window.S2=put('satellite',-20,200); U(2);
      return JSON.stringify({greyBefore, grey, black, gone, sat:hasSatellite(0), missile:unlocked(0,'missile')}); })()"""))
    print(r)
    check(not r['greyBefore'] and r['grey'] and not r['black'], 'Satellite Radar: ground you explored is in view (an enemy tank there shows); black ground stays hidden')
    check(not r['gone'], 'lose the Satellite Radar and the grey fog comes back')
    check(r['missile'], 'it unlocks the Missile Turret')
    # napalm
    r = json.loads(pg.evaluate("""(()=>{ const cx=hq.x+330, cy=hq.y-30; U(1); let unk=null; for(let k=0;k<3000&&!unk;k++){ const x=100+Math.random()*(W-200), y=100+Math.random()*(H-200); if(!fog[0].exp[cellIndex(x,y)]) unk={x,y}; }
      const foes=[]; for(let i=0;i<8;i++){ const s=spawn('soldier',1,cx-80+i*22,cy); s.passive=true; foes.push(s); } const tank=spawn('light',1,cx,cy+10); tank.passive=true;
      const mine=[]; for(let i=0;i<3;i++){ const s=spawn('soldier',0,cx-30+i*25,cy+5); s.passive=true; mine.push(s); }
      const ready=napalmReady(0); const unseen=callNapalm(0, unk.x, unk.y); const okCall=callNapalm(0,cx,cy); const again=callNapalm(0,cx,cy);
      let k=0; while(k<20*9){ for(const s of foes) if(s.hp>0){ s.order=null; } tank.order=null; U(1); k++; }
      const wait=Math.round(napalmWait(0));
      return JSON.stringify({ready, unseen, okCall, again, foesLeft:foes.filter(s=>s.hp>0).length, tankHp:Math.round(tank.hp), tankMax:tank.maxHp, mineHp:mine.map(s=>Math.round(s.hp)), wait}); })()"""))
    print(r)
    check(r['ready'] and not r['unseen'] and r['okCall'] and not r['again'], 'the Napalm Strike is ready with the Satellite Radar up, only on ground you can see, and once at a time')
    check(r['foesLeft'] == 0, 'the strip of fire kills all 8 enemy soldiers standing in it')
    check(r['tankMax'] - r['tankHp'] > 30 and r['tankHp'] > r['tankMax'] * 0.5, 'a tank in it is hurt a little (%d of %d left)' % (r['tankHp'], r['tankMax']))
    check(all(h == 60 for h in r['mineHp']), 'your own soldiers in it are unhurt')
    check(285 <= r['wait'] <= 292, 'the next strike is about 5 minutes away (%d s)' % r['wait'])
    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    pg.close()
    # the computer: Hard builds them and calls napalm; Normal doesn't
    for d in ['hard', 'normal']:
        pg, errs = page(b, d)
        r = json.loads(pg.evaluate("""(()=>{ runAI=realAI; const ai=game.ai; game.time=900; ai.wavesSent=3; game.credits[1]=1e5; fog[1].exp.fill(1);
          put('barracks',-200,-60,1); put('refinery',-200,120,1); put('factory',150,150,1); put('tech',160,-40,1); put('power',0,-180,1);
          for(let i=0;i<14;i++) spawn('soldier',1,hqOf(1).x-80+i*8,hqOf(1).y+140);
          let k=0; while(k<20*120 && !game.ents.some(e=>e.team===1&&e.type==='satellite'&&e.built)){ if(game.credits[1]<5000) game.credits[1]=5000; U(1); k++; }
          const reactor=game.ents.some(e=>e.team===1&&e.type==='reactor'), sat=game.ents.some(e=>e.team===1&&e.type==='satellite'&&e.built);
          // a bunch of your infantry where it can see them
          const h1=hqOf(1); let napalm=false;
          if(sat){ const cx=h1.x-350, cy=h1.y+350; for(let i=0;i<7;i++){ const s=spawn('soldier',0,cx+i*18,cy); s.passive=true; } for(let j=0;j<20*4 && !napalm;j++){ U(1); napalm=game.strikes.some(st=>st.team===1); } }
          return JSON.stringify({reactor, sat, secs:Math.round(k/20), napalm}); })()"""))
        print(d, r)
        if d == 'hard':
            check(r['reactor'] and r['sat'], 'Hard builds a Nuclear Reactor and a Satellite Radar (%d s)' % r['secs'])
            check(r['napalm'], 'and calls its Napalm Strike on a bunch of your infantry')
        else:
            check(not r['reactor'] and not r['sat'], "Normal doesn't build them")
        check(not errs, d + ': no page errors' + (': ' + errs[0] if errs else ''))
        pg.close()
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
