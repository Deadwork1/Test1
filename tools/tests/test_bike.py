# v5.74: the Ashen's Rocket Bike (War Factory + Power Plant, $400): fast, fires two homing rockets at once (vehicles first),
# rides through forests, can't hit aircraft. Rocket Soldiers are shared by both factions. The computer (as the Ashen) builds bikes.
# Usage: python3 tests/test_bike.py <game folder> <port> [picture folder]
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
  window.hq=hqOf(0); hq.hp=hq.maxHp=1e9; hqOf(1).hp=hqOf(1).maxHp=1e9; fog[0].exp.fill(1); fog[1].exp.fill(1);
  window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
  window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1):hq; return mk(t,team,h.x+dx,h.y+dy); };
  window.open=(r)=>{ for(let k=0;k<4000;k++){ const x=300+Math.random()*(W-600), y=300+Math.random()*(H-600); let good=true; for(let d=-r;d<=r&&good;d+=12) for(let e=-30;e<=30&&good;e+=15) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good) return {x,y}; } };
  window.sight=()=>{ for(const t of [0,1]) fog[t].vis.fill(1); };
})()"""
def page(b, faction, diff='normal'):
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate(f"localStorage.setItem('mini-rts-faction','{faction}'); localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','{diff}'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    return pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # buttons
    btn = {}
    for f in ['ashen', 'legion']:
        pg, errs = page(b, f)
        btn[f] = json.loads(pg.evaluate("""(()=>{ const f=put('factory',220,60), bar=put('barracks',-190,30); put('power',-300,120); put('refinery',-170,-140);
          const btns=x=>{ game.selected=new Set([x.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(b=>b.style.display!=='none').map(b=>b.textContent); };
          return JSON.stringify({factory:btns(f), barracks:btns(bar)}); })()"""))
        pg.close()
    print(btn)
    check('Rocket Bike $400' in btn['ashen']['factory'] and not any('Rocket Bike' in t for t in btn['legion']['factory']), 'the Rocket Bike ($400) is at the Ashen War Factory only')
    check(any(t.startswith('Rocket') for t in btn['legion']['barracks']) and any(t.startswith('Rocket') for t in btn['ashen']['barracks']), "Rocket Soldiers at both factions' Barracks")
    # fights, speed, forest
    pg, errs = page(b, 'ashen')
    r = json.loads(pg.evaluate("""(()=>{ sight(); const out={};
      const duel=(foe,dist)=>{ const s=open(dist+30); const u=spawn('bike',0,s.x,s.y); u.hp=u.maxHp=1e9; const f=spawn(foe,1,s.x+dist,s.y); f.passive=true; let k=0, maxR=0; u.order={type:'attack',target:f.id};
        while(k<20*60 && f.hp>0){ f.x=s.x+dist; f.y=s.y; f.order=null; sight(); U(1); k++; maxR=Math.max(maxR, game.rockets.filter(q=>q.srcType==='bike').length); } const res=f.hp<=0?+(k/20).toFixed(1):'lived '+Math.round(f.maxHp-f.hp); u.hp=0; f.hp=0; U(2); return {res, maxR}; };
      out.light=duel('light',110); out.soldier=duel('soldier',110);
      // speed: how far it goes in 2 s on open ground
      const s=open(230); const bk=spawn('bike',0,s.x-200,s.y); bk.order={type:'move',x:s.x+200,y:s.y}; const x0=bk.x; U(40); out.in2s=Math.round(bk.x-x0); bk.hp=0; U(1);
      // a forest: can it ride into one?
      let fp=null; for(let i=0;i<terrain.length&&!fp;i++){ if(terrain[i]!==T.FOREST) continue; const c=i%TCOLS, rr=Math.floor(i/TCOLS); let n=0; for(let dc=-1;dc<=1;dc++) for(let dr=-1;dr<=1;dr++) if(terrain[(rr+dr)*TCOLS+c+dc]===T.FOREST) n++; if(n===9 && terrain[rr*TCOLS+c-4]===T.GRASS) fp={x:c*TC+TC/2,y:rr*TC+TC/2}; }
      const fb=spawn('bike',0,fp.x-110,fp.y); fb.order={type:'move',x:fp.x,y:fp.y}; let j=0; while(j<20*20 && Math.hypot(fb.x-fp.x,fb.y-fp.y)>16){ U(1); j++; } out.forest=terrainAt(fb.x,fb.y)===T.FOREST;
      // aircraft: can't hit one
      out.air=canHit({type:'bike'},{air:true});
      return JSON.stringify(out); })()"""))
    print(r)
    check(r['light']['maxR'] >= 2 and isinstance(r['light']['res'], float) and r['light']['res'] < 30, 'fires two rockets at once and kills a Light Tank in %s s' % r['light']['res'])
    check(not isinstance(r['soldier']['res'], float) or r['soldier']['res'] > 4, 'and takes a while longer against a Soldier, for its size (%s)' % r['soldier']['res'])
    check(r['in2s'] > 220, 'fast: %d in 2 s (a Buggy does about 238)' % r['in2s'])
    check(r['forest'], 'rides into a forest')
    check(not r['air'], "can't hit aircraft")
    if pics:
        pg.evaluate("""(()=>{ const s=open(200); const a=spawn('bike',0,s.x-60,s.y); a.facing=0; const b2=spawn('bike',0,s.x-60,s.y+50); b2.facing=0; b2.passive=true; b2.cooldown=0; const f=spawn('light',1,s.x+120,s.y+20); f.passive=true; a.order={type:'attack',target:f.id};
          for(let i=0;i<8;i++){ f.order=null; b2.order=null; b2.cooldown=0; sight(); U(1); } cam.x=s.x+20; cam.y=s.y+20; setZoom(2.2); clampCam(); game.paused=true; game.selected=new Set(); })()""")
        pg.wait_for_timeout(500); pg.screenshot(path=f'{pics}/bike.png')
    check(not errs, 'no page errors %s' % errs[:3])
    pg.close()
    # the computer as the Ashen builds bikes
    pg, errs = page(b, 'legion', 'hard')
    m = json.loads(pg.evaluate("""(()=>{ runAI=realAI; const h=hqOf(0); let k=0; while(k<20*480){ U(1); k++; if(game.over) break; } return JSON.stringify(game.track.made[1]); })()"""))
    print(m)
    check((m.get('bike') or 0) >= 1, 'the computer (Ashen) builds Rocket Bikes: %s' % m.get('bike'))
    check(not errs, 'no page errors (computer) %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
