# v5.65 tweaks: the Laser Turret only charges (and spins) once it has spotted an enemy; the Missile Turret's lights turn red while
# an enemy is in sight; Rocket Soldiers do normal damage to helicopters (8 hits, was 5); the computer's helicopters no longer
# hover idle where a target slipped into the fog, or where their Helipad was destroyed; no helicopter hovers with nothing to do:
# it goes home and lands, or with no Helipad lands where it is (and takes off again only to fight).
# Usage: python3 tests/test_heli_turret_tweaks.py <game folder> <port>
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
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
      window.hq=hqOf(0); window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
      window.spot=(r)=>{ for(let k=0;k<600;k++){ const x=hq.x+(Math.random()-0.5)*900, y=hq.y-200-Math.random()*600; if(siteIsFree(x,y,60)&&siteIsFree(x+r,y,30)&&!elevAt(x,y)&&!elevAt(x+r,y)) return {x,y}; } };
    })()""")
    # --- Laser: idle = no charge, no spin; spotted = charges; first shot about one charge after it sees the enemy
    r = json.loads(pg.evaluate("""(()=>{ const s=spot(210); window.L=mk('laser',0,s.x,s.y); L.cooldown=0; L.hp=L.maxHp=1e9; U(20*8);
      const idle={cool:+L.cooldown.toFixed(2), spinV:+(L.spinV||0).toFixed(2), spotted:L.spotted};
      const f=spawn('light',1,s.x+205,s.y); f.passive=true; f.hp=f.maxHp=1e9; let k=0; while(!L.spotted&&k<100){ f.x=s.x+205; f.y=s.y; f.order=null; U(1); k++; }
      const seenAt=k; let first=null; const hp0=f.hp; while(k<20*12 && first===null){ f.x=s.x+150; f.y=s.y; f.order=null; U(1); k++; if(f.hp<hp0) first=(k-seenAt)/20; }
      const spinning=+(L.spinV||0).toFixed(2); f.hp=0; U(20*6); const afterCool=+L.cooldown.toFixed(2), afterSpin=+(L.spinV||0).toFixed(2); L.hp=0; U(2);
      return JSON.stringify({idle, seen:seenAt<100, first, spinning, afterCool, afterSpin, sight:STATS.laser.sight}); })()"""))
    print(r)
    check(r['idle']['cool'] == 4.5 and r['idle']['spinV'] == 0 and not r['idle']['spotted'], 'Laser with nothing in sight: no charge, legs still')
    check(r['seen'] and r['first'] is not None and 4.0 <= r['first'] <= 5.0, 'it spots an enemy (in sight, out of range), charges, and fires about 4.5 s later')
    check(r['spinning'] > 1, 'its legs spin up while it charges')
    check(r['afterCool'] >= 4.4 and r['afterSpin'] < 0.3, 'with the enemy gone its charge drains away and its legs slow to a stop')
    # --- Missile Turret: red while an enemy is in sight, off again after
    r = json.loads(pg.evaluate("""(()=>{ const s=spot(220); const M=mk('missile',0,s.x,s.y); M.hp=M.maxHp=1e9; U(10); const before=!!M.spotted;
      const f=spawn('soldier',1,s.x+150,s.y); f.passive=true; f.hp=f.maxHp=1e9; U(40); const during=!!M.spotted; f.hp=0; U(10); const after=!!M.spotted; M.hp=0; U(2);
      return JSON.stringify({before, during, after}); })()"""))
    print(r)
    check(not r['before'] and r['during'] and not r['after'], 'Missile Turret lights up red while an enemy is in sight, and turns off after')
    # --- Rocket Soldiers against a helicopter: 40 a hit, 8 hits
    r = json.loads(pg.evaluate("""(()=>{ const s=spot(110); const R=spawn('rocket',0,s.x,s.y); R.hp=R.maxHp=1e9; const H=spawn('heli',1,s.x+100,s.y); H.landed=false; H.alt=1; H.passive=true;
      let hits=0, k=0; const oh=window.hurt; window.hurt=(t,a,st,tm)=>{ if(t===H&&st==='rocket') hits++; return oh(t,a,st,tm); };
      R.order={type:'attack',target:H.id}; while(H.hp>0 && k<20*40){ H.x=s.x+100; H.y=s.y; H.order=null; H.ammo=0; U(1); k++; } window.hurt=oh;
      return JSON.stringify({hits, dead:H.hp<=0, secs:k/20, vsAir:STATS.rocket.vsAir}); })()"""))
    print(r)
    check(r['vsAir'] == 1 and r['dead'] and r['hits'] == 8, 'a Rocket Soldier needs 8 hits to bring down a helicopter (was 5): ' + str(r['secs']) + ' s')
    # --- the computer's helicopter left hovering after its target slipped into the fog goes home
    r = json.loads(pg.evaluate("""(()=>{ const h1=hqOf(1); fog[1].exp.fill(1); const pad=mk('helipad',1,h1.x-170,h1.y+150); const H=releaseUnit(pad,'heli'); const D=DIFFICULTY.hard;
      H.landed=false; H.alt=1; H.x=h1.x-900; H.y=h1.y+700; H.order={type:'move',x:H.x,y:H.y,arrived:true};
      let k=0; while(k<20*8 && !(H.order && H.order.type==='return')){ U(1); if(k%20===0) aiHelis(D); k++; }
      const sentHome=!!(H.order && H.order.type==='return'), secs=k/20;
      // its Helipad is destroyed (no other free): it attacks the closest target it knows of, or waits by its HQ
      U(20*30); pad.hp=0; U(5); H.order=null; H.landed=false; H.ammo=0; H.x=h1.x-700; H.y=h1.y+600; aiHelis(D); U(20*15); aiHelis(D); U(20*10);
      const parked=Math.round(Math.hypot(H.x-h1.x,H.y-h1.y)), parkedLanded=!!H.landed;
      return JSON.stringify({sentHome, secs, parked, parkedLanded}); })()"""))
    print(r)
    check(r['sentHome'] and r['secs'] <= 5, "the computer's helicopter hovering where its target vanished heads home within a few seconds")
    check(r['parked'] < 200 and r['parkedLanded'], "with no Helipad and no missiles it flies to its HQ and lands there instead of hovering out in the field")
    # --- helicopters never hover with nothing to do: they go home and land, or land where they are with no Helipad
    r = json.loads(pg.evaluate("""(()=>{ fog[0].exp.fill(1); const pad=mk('helipad',0,hq.x-200,hq.y+120); const H=releaseUnit(pad,'heli'); U(5);
      H.order={type:'move',x:hq.x+300,y:hq.y-500}; let k=0, arr=null, left=null; while(k<20*30 && !(H.landed&&!H.order)){ U(1); k++; if(arr===null&&H.order&&H.order.arrived) arr=k; if(left===null&&H.order&&H.order.type==='return') left=k; }
      const home={landed:H.landed, onPad:Math.hypot(H.x-pad.x,H.y-pad.y)<4, waited:arr!==null&&left!==null?(left-arr)/20:null};
      // its pad destroyed while it's out: it lands where it is once nothing's about
      H.order={type:'move',x:hq.x+300,y:hq.y-500}; U(20*8); pad.hp=0; U(20*6);
      const field={landed:H.landed, order:H.order, away:Math.round(Math.hypot(H.x-(hq.x+300),H.y-(hq.y-500)))};
      // an enemy comes in range: it takes off and fights, then lands again
      const f=spawn('light',1,H.x+100,H.y); f.passive=true; U(10); const tookOff=!H.landed; const hp0=f.hp; U(20*4); const hit=f.hp<hp0; f.hp=0; U(20*6); const relanded=H.landed;
      // a new Helipad: it goes and lands on it
      const p2=mk('helipad',0,hq.x-200,hq.y+260); let j=0; while(j<20*30 && !(H.landed && Math.hypot(H.x-p2.x,H.y-p2.y)<4)){ U(1); j++; }
      return JSON.stringify({home, field, tookOff, hit, relanded, newPad:j<20*30}); })()"""))
    print(r)
    check(r['home']['landed'] and r['home']['onPad'] and r['home']['waited'] is not None and 2.5 <= r['home']['waited'] <= 3.5, 'sent somewhere quiet, a helicopter waits about 3 s, then flies home and lands on its pad')
    check(r['field']['landed'] and r['field']['order'] is None and r['field']['away'] < 30, 'with its Helipad gone it lands where it is instead of hovering')
    check(r['tookOff'] and r['hit'] and r['relanded'], 'an enemy in range: it takes off and fights, then lands again')
    check(r['newPad'], 'a Helipad free again: it flies over and lands on it')
    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
