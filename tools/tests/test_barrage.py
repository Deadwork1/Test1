# v5.74: the Legion's Orbital Barrage (from the Satellite Radar, every 5 minutes, sharing the Napalm timer): a lock-on, then
# 10 heavy shells fall inside a circle (strong vs buildings and vehicles, weaker vs infantry, never your own side).
# The Ashen still get Napalm. The computer (as the Legion) fires it at a cluster of your buildings and vehicles.
# Usage: python3 tests/test_barrage.py <game folder> <port> [picture folder]
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
SETUP = """(()=>{ window.realAI=runAI; runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
  window.hq=hqOf(0); hq.hp=hq.maxHp=1e9; hqOf(1).hp=hqOf(1).maxHp=1e9;
  window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
  window.open=(r)=>{ for(let k=0;k<6000;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-r;d<=r&&good;d+=15) for(let e=-r;e<=r&&good;e+=15) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ents.some(o=>isBuilding(o)&&Math.hypot(o.x-x,o.y-y)<r+80)) return {x,y}; } };
  window.sight=()=>{ for(const t of [0,1]) { fog[t].vis.fill(1); fog[t].exp.fill(1); } };
})()"""
def page(b, faction, diff='normal'):
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate(f"localStorage.setItem('mini-rts-faction','{faction}'); localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','{diff}'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    return pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg, errs = page(b, 'legion')
    r = json.loads(pg.evaluate("""(()=>{ mk('satellite',0,hq.x-300,hq.y-60); sight(); U(2); updateHUD();
      const label=ui.napalm.textContent, kind=strikeKind(0), ashenKind=strikeKind(1);
      const s=open(130); const ref=mk('refinery',1,s.x,s.y); const tank=spawn('light',1,s.x+55,s.y+45); tank.passive=true; tank.cooldown=1e9; const sol=[]; for(let i=0;i<4;i++){ const q=spawn('soldier',1,s.x-60+i*14,s.y+60); q.passive=true; q.cooldown=1e9; sol.push(q); }
      const mine=spawn('soldier',0,s.x+20,s.y-55); mine.passive=true;
      window.S=s; const called=callNapalm(0,s.x,s.y); const again=callNapalm(0,s.x,s.y);
      let k=0, firstHit=null; const hp0=ref.hp; while(k<20*4){ for(const u of [tank,mine,...sol]) { u.order=null; if(u.team===1) u.cooldown=1e9; } sight(); U(1); k++; if(firstHit===null&&ref.hp<hp0) firstHit=k/20; }
      return JSON.stringify({label, kind, ashenKind, called, again, firstHit, ref:Math.round(100-ref.hp/ref.maxHp*100), tank:Math.round(100-Math.max(0,tank.hp)/tank.maxHp*100), soldiersDead:sol.filter(q=>q.hp<=0).length, mineHurt:mine.hp<mine.maxHp, hits0:JSON.stringify(game.track.hits[0]), hits1:JSON.stringify(game.track.hits[1]), mineHp:Math.round(mine.hp), wait:Math.round(napalmWait(0))}); })()"""))
    print(r)
    check(r['kind'] == 'barrage' and r['ashenKind'] == 'napalm' and r['label'] == 'Orbital Barrage', 'the Legion gets the Orbital Barrage button, the Ashen keep Napalm')
    check(r['called'] and not r['again'] and 280 <= r['wait'] <= 300, 'it fires, and the next one waits 5 minutes (%d s)' % r['wait'])
    check(r['firstHit'] is not None and 1.5 <= r['firstHit'] <= 3.5, 'the shells start landing about 1.6 s after the lock-on (%s s)' % r['firstHit'])
    check(25 <= r['ref'], 'it badly damages a Refinery in the circle (%d%% of its health)' % r['ref'])
    check(r['tank'] >= 10, 'and hurts a tank in it (%d%%)' % r['tank'])
    
    own = json.loads(pg.evaluate("""(()=>{ game.napalmAt[0]=null; const s=open(130); const us=[]; for(let i=0;i<6;i++){ const u=spawn(i%2?'light':'soldier',0,s.x-50+i*20,s.y+(i%3)*20); u.passive=true; us.push(u); }
      callNapalm(0,s.x,s.y); for(let k=0;k<20*5;k++){ for(const u of us) u.order=null; U(1); } return JSON.stringify({hurt: us.filter(u=>u.hp<u.maxHp).length}); })()"""))
    check(own['hurt'] == 0, 'it never hurts your own units, even standing right in it (%d of 6 hurt)' % own['hurt'])
    if pics:
        pg.evaluate("""(()=>{ game.napalmAt[0]=null; const s=open(130); const ref=mk('barracks',1,s.x,s.y); for(let i=0;i<3;i++){ const t=spawn('light',1,s.x-50+i*45,s.y+60); t.passive=true; }
          callNapalm(0,s.x,s.y); for(let i=0;i<46;i++){ sight(); U(1); } cam.x=s.x; cam.y=s.y+10; setZoom(1.6); clampCam(); game.paused=true; game.selected=new Set(); })()""")
        pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/barrage.png')
    check(not errs, 'no page errors %s' % errs[:3])
    pg.close()
    # the computer as the Legion, Hard: fires it at your base
    pg, errs = page(b, 'ashen', 'hard')
    m = json.loads(pg.evaluate("""(()=>{ runAI=realAI; const ai=game.ai; game.time=900; ai.wavesSent=3; game.credits[1]=1e5;
      const h1=hqOf(1); mk('satellite',1,h1.x-200,h1.y+100); mk('factory',1,h1.x+150,h1.y+150);
      const h0=hqOf(0); const tgt=[mk('refinery',0,h0.x+150,h0.y-120), mk('barracks',0,h0.x+60,h0.y-170), mk('power',0,h0.x+190,h0.y-200)];
      for(const t of tgt) ai.known.set(t.id,{x:t.x,y:t.y,type:t.type}); for(let i=0;i<3;i++){ const v=spawn('light',0,h0.x+120+i*30,h0.y-150); v.passive=true; }
      sight(); let k=0; while(k<20*20 && napalmWait(1)===0){ sight(); U(1); k++; }
      return JSON.stringify({fired: napalmWait(1)>0, kind: strikeKind(1), secs: Math.round(k/20), hit: tgt.some(t=>t.hp<t.maxHp)}); })()"""))
    print(m)
    check(m['kind'] == 'barrage' and m['fired'], 'the computer (Legion) fires its Orbital Barrage at your base (%s s)' % m['secs'])
    check(not errs, 'no page errors (computer) %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
