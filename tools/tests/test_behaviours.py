# Computer behaviours (v5.66, Normal and Hard only): tanks run over infantry that come close; infantry sidestep a tank driving
# at them; a losing wave of 7+ down to its last 2 runs home (a vehicle runs when it's the last of 4+); a Buggy drives a loop
# round the map every 3 minutes; a Sniper harasses the edge of your base every 7 minutes, running off when approached; two
# infantry go after one of your Extractors every 4 minutes.
# Usage: python3 tests/test_behaviours.py <game folder> <port>
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
SETUP = """(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
  fog[0].exp.fill(1); fog[1].exp.fill(1); window.h0=hqOf(0); window.h1=hqOf(1); h0.hp=h0.maxHp=1e9; h1.hp=h1.maxHp=1e9;
  window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
  window.open=(cx,cy,r)=>{ for(let k=0;k<800;k++){ const x=cx+(Math.random()-0.5)*r*2, y=cy+(Math.random()-0.5)*r*2; let good=true; for(let a=0;a<8&&good;a++) for(const d of [0,40,80]) if(!walkable(terrainAt(x+Math.cos(a)*d,y+Math.sin(a)*d),true)||elevAt(x+Math.cos(a)*d,y+Math.sin(a)*d)||!siteIsFree(x+Math.cos(a)*d,y+Math.sin(a)*d,30)) good=false; if(good) return {x,y}; } };
  window.army=()=>game.ents.filter(e=>e.team===1&&isCombat(e)&&!e.air);
  window.beh=()=>aiBehaviours(DIFFICULTY[difficulty], army(), h1, aiRally(h1));
  window.clear=()=>{ for(const e of game.ents) if(isUnit(e)&&e.type!=='settler') e.hp=0; U(2); };
})()"""
def page(b, diffname):
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','{diffname}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    return pg, errs
CRUSH = """(()=>{ clear(); const p=open(W/2-700,H/2,500); const t=spawn('light',1,p.x,p.y); const s=spawn('soldier',0,p.x+60,p.y); s.passive=true; s.hp=s.maxHp=1e9;
  let k=0; while(k<20*4 && s.hp>0){ s.x=p.x+60; s.y=p.y; s.order=null; U(1); k++; } return JSON.stringify({crushed:s.hp<=0, secs:k/20}); })()"""
DODGE = """(()=>{ clear(); const p=open(W/2-700,H/2+200,500); const s=spawn('soldier',1,p.x,p.y); s.passive=true; const t=spawn('light',0,p.x-140,p.y); t.facing=0; t.passive=true;
  t.order={type:'move',x:p.x+140,y:p.y}; let k=0; while(k<20*6 && s.hp>0 && t.order){ U(1); k++; } return JSON.stringify({alive:s.hp>0, dodged:!!s.dodgedAt}); })()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg, errs = page(b, 'normal')
    r = json.loads(pg.evaluate(CRUSH)); print(r)
    check(r['crushed'] and r['secs'] < 3, 'Normal: a tank drives at an enemy soldier 60 away and runs it over')
    alive = 0
    for i in range(3):
        r = json.loads(pg.evaluate(DODGE)); alive += r['alive']
    print('dodged and lived', alive, 'of 3')
    check(alive >= 2, 'Normal: its soldier steps out of the way of your tank driving at it (lived ' + str(alive) + ' of 3)')
    # retreat
    r = json.loads(pg.evaluate("""(()=>{ clear(); const p=open(W/2-600,H/2-200,400); game.ai.waveInfo={size:8,vehicles:0,fled:false};
      const w=[0,1].map(i=>{ const u=spawn('soldier',1,p.x+i*15,p.y); u.role='wave'; return u; });
      const foes=[0,1,2].map(i=>{ const u=spawn('soldier',0,p.x+120,p.y+i*20); u.passive=true; return u; }); U(2); beh();
      const ran=w.map(u=>u.role==='retreat'&&u.order&&u.order.type==='move'&&u.passive);
      // a group of 4+ vehicles down to its last: the vehicle runs, the infantry with it don't (3 left)
      clear(); game.ai.waveInfo={size:9,vehicles:4,fled:false}; const tk=spawn('light',1,p.x,p.y); tk.role='wave'; const inf=[0,1].map(i=>{ const u=spawn('soldier',1,p.x+30,p.y+i*20); u.role='wave'; return u; });
      for(let i=0;i<4;i++){ const u=spawn('soldier',0,p.x+150,p.y+i*20); u.passive=true; } U(2); beh();
      // not losing: nobody runs
      clear(); game.ai.waveInfo={size:8,vehicles:0,fled:false}; const w2=[0,1].map(i=>{ const u=spawn('soldier',1,p.x+i*15,p.y); u.role='wave'; return u; }); spawn('soldier',0,p.x+120,p.y).passive=true; U(2); beh();
      return JSON.stringify({ran, tank:tk.role, inf:inf.map(u=>u.role), notLosing:w2.map(u=>u.role)}); })()"""))
    print(r)
    check(all(r['ran']), 'a losing wave of 8 down to 2 runs home, not stopping to fight')
    check(r['tank'] == 'retreat' and r['inf'] == ['wave', 'wave'], 'the last vehicle of a group of 4+ runs; the infantry with it (3 left) fight on')
    check(r['notLosing'] == ['wave', 'wave'], 'a wave that is down to 2 but not losing keeps going')
    # scout patrol
    r = json.loads(pg.evaluate("""(()=>{ clear(); const ral=aiRally(h1); const bg=spawn('buggy',1,ral.x,ral.y); game.time=400; game.ai.patrolAt=-999; beh();
      const started=bg.role==='patrol', pts=bg.errand?bg.errand.pts.length:0, gap=bg.errand?Math.round(Math.min(...bg.errand.pts.flatMap(p=>[START[0],START[1],h0,h1].map(q=>Math.hypot(q.x-p.x,q.y-p.y))))):0, spread=bg.errand?Math.round(Math.max(...bg.errand.pts.map(p=>p.x))-Math.min(...bg.errand.pts.map(p=>p.x))):0; let k=0, maxI=0;
      while(k<240 && bg.role==='patrol' && bg.hp>0){ U(20); beh(); k++; maxI=Math.max(maxI,bg.errand?bg.errand.i:0); }
      const again=(()=>{ beh(); return bg.role==='patrol'; })();
      return JSON.stringify({started, pts, gap, spread, secs:k, maxI, home:bg.role===null, again, wait:Math.round(game.ai.patrolAt) }); })()"""))
    print(r)
    check(r['started'] and r['pts'] >= 4 and r['spread'] > 2000, 'a Buggy sets off on a loop of %d points round the map' % r['pts'])
    check(r['maxI'] >= r['pts'] - 1 and r['home'], 'it drives the whole loop (%d s) and comes home' % r['secs'])
    check(not r['again'], 'and the next loop waits 3 minutes')
    check(r['gap'] >= 700, 'the loop keeps 700+ away from both bases (closest point %d)' % r['gap'])
    # harassing sniper
    r = json.loads(pg.evaluate("""(()=>{ clear(); const ral=aiRally(h1); const bar=mk('barracks',0,h0.x+160,h0.y-120); game.ai.known.set(bar.id,{x:bar.x,y:bar.y,type:'barracks'});
      const sn=spawn('sniper',1,ral.x,ral.y); game.time=500; game.ai.harassAt=-999; beh(); const started=sn.role==='harass'; const spot=sn.errand&&sn.errand.spot;
      let k=0; while(k<180 && !(sn.errand&&sn.errand.phase==='snipe')){ U(20); beh(); k++; }
      const atSpot=spot?Math.round(Math.hypot(sn.x-spot.x,sn.y-spot.y)):null, fromBar=Math.round(Math.hypot(sn.x-bar.x,sn.y-bar.y)), phase1=sn.errand&&sn.errand.phase;
      const vic=spawn('soldier',0,sn.x+150,sn.y); vic.passive=true; let j=0; while(j<60 && vic.hp>0){ vic.x=sn.x+150; vic.y=sn.y; U(2); j++; }   // in its range: it shoots
      const shot=vic.hp<=0;
      const chaser=spawn('soldier',0,sn.x+110,sn.y); chaser.passive=true; U(2); beh(); const fled=sn.errand&&sn.errand.phase==='flee';
      chaser.hp=0; let m=0; while(m<60 && !(sn.errand&&sn.errand.phase==='go')){ U(20); beh(); m++; } const back=sn.errand&&sn.errand.phase;
      game.time+=200; beh(); const home=sn.role===null;
      return JSON.stringify({started, phase1, atSpot, fromBar, shot, fled, back, home}); })()"""))
    print(r)
    check(r['started'] and r['phase1'] == 'snipe' and r['fromBar'] < 400, "a Sniper goes to the edge of your base (%s from your Barracks) and takes up position" % r['fromBar'])
    check(r['shot'], 'it picks off a soldier in range')
    check(r['fled'] and r['back'] == 'go', 'your unit comes close: it runs off, then comes back once shaken off')
    check(r['home'], 'after its 2.5 minutes it goes home')
    # extractor raid
    r = json.loads(pg.evaluate("""(()=>{ clear(); const ral=aiRally(h1); const p=open(W/2-500,H/2+100,400); const x=spawn('extractor',0,p.x,p.y); x.passive=true;
      const seer=spawn('buggy',1,p.x+100,p.y); seer.passive=true; U(4); beh(); seer.hp=0; U(2);
      const rs=[0,1,2].map(i=>spawn(i<2?'rocket':'soldier',1,ral.x+i*14,ral.y)); game.time=600; game.ai.xraidAt=-999; beh();
      const sent=rs.filter(u=>u.role==='xraid').map(u=>u.type); let k=0; while(k<120 && x.hp>0){ x.order=null; U(20); beh(); k++; }
      const killed=x.hp<=0, secs=k; let j=0; while(j<40 && rs.some(u=>u.role==='xraid')){ U(20); beh(); j++; }
      return JSON.stringify({sent, killed, secs, home:!rs.some(u=>u.role==='xraid')}); })()"""))
    print(r)
    check(r['sent'] == ['rocket', 'rocket'], 'two infantry (Rocket Soldiers first) go after the Extractor it saw')
    check(r['killed'], 'they destroy it (%d s)' % r['secs'])
    check(r['home'], 'and head home after')
    check(not errs, 'Normal: no page errors' + (': ' + errs[0] if errs else ''))
    pg.close()
    # Easy: none of it
    pg, errs = page(b, 'easy')
    r = json.loads(pg.evaluate(CRUSH)); print('easy', r)
    check(not r['crushed'], "Easy: its tanks don't go out of their way to run over infantry")
    check(not pg.evaluate("!!DIFFICULTY.easy.behaviours") and pg.evaluate("!!DIFFICULTY.hard.behaviours"), 'Easy has none of the behaviours, Hard has them all')
    check(not errs, 'Easy: no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
