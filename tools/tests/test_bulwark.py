# v5.74: the Legion's Bulwark (War Factory + Power Plant, $650): an armoured carrier for 5 infantry with a light machine gun,
# crushes infantry. Select infantry and tap it to load (a 6th is turned away); Unload lets them out; if it's destroyed they
# jump out hurt. The computer (as the Legion) builds one. Saves a picture if given a folder.
# Usage: python3 tests/test_bulwark.py <game folder> <port> [picture folder]
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
  window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1):hq; return mk(t,team,h.x+dx,h.y+dy); };
  window.open=(r)=>{ for(let k=0;k<6000;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-r;d<=r&&good;d+=15) for(let e=-r;e<=r&&good;e+=15) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ents.some(o=>Math.hypot(o.x-x,o.y-y)<r+80)) return {x,y}; } };
  window.sight=()=>{ for(const t of [0,1]) { fog[t].vis.fill(1); fog[t].exp.fill(1); } };
  window.tapOn=e=>handleTap(e.x, e.y);   // (handleTap takes map coordinates)
})()"""
def page(b, faction, diff='normal'):
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate(f"localStorage.setItem('mini-rts-faction','{faction}'); localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','{diff}'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    return pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    btn = {}
    for f in ['legion', 'ashen']:
        pg, errs = page(b, f)
        btn[f] = pg.evaluate("""(()=>{ const f=put('factory',220,60); put('power',-300,120); put('refinery',-170,-140); game.selected=new Set([f.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(b=>b.style.display!=='none').map(b=>b.textContent); })()""")
        pg.close()
    print(btn)
    check('Bulwark $650' in btn['legion'] and not any('Bulwark' in t for t in btn['ashen']), 'the Bulwark ($650) is at the Legion War Factory only')
    pg, errs = page(b, 'legion')
    r = json.loads(pg.evaluate("""(()=>{ sight(); const s=open(140); const bw=spawn('bulwark',0,s.x,s.y); const sol=[]; for(let i=0;i<6;i++) sol.push(spawn('soldier',0,s.x-110+(i%3)*18,s.y+60+Math.floor(i/3)*18));
      cam.x=s.x; cam.y=s.y; setZoom(1); clampCam(); U(2);
      game.selected=new Set(sol.map(u=>u.id)); tapOn(bw); let k=0; while(k<20*15 && (bw.cargo||[]).length<5){ U(1); k++; }
      U(20); const aboard=(bw.cargo||[]).length, left=sol.filter(u=>game.ents.includes(u)).length;
      game.selected=new Set([bw.id]); updateHUD(); const unloadShown=ui.unload.style.display!=='none', label=ui.unload.textContent, info=ui.info.textContent;
      // enemies can't hit the ones inside: they aren't on the map
      const targetable=sol.filter(u=>!game.ents.includes(u)).length;
      // drive with them aboard, then unload
      bw.order={type:'move',x:s.x+120,y:s.y}; U(20*4); ui.unload.click(); U(2);
      const out=sol.filter(u=>game.ents.includes(u)), near=out.filter(u=>Math.hypot(u.x-bw.x,u.y-bw.y)<60).length;
      return JSON.stringify({aboard, left, secs:Math.round(k/20), unloadShown, label, info, targetable, out:out.length, near, empty:(bw.cargo||[]).length}); })()"""))
    print(r)
    check(r['aboard'] == 5 and r['left'] == 1, 'tapping it with 6 soldiers selected loads 5 (a 6th stays out), in %d s' % r['secs'])
    check(r['unloadShown'] and r['label'] == 'Unload (5)', 'an Unload button shows: %s' % r['label'])
    check('5/5 aboard' in r['info'], 'the info line says %r' % r['info'])
    check(r['out'] == 6 and r['near'] == 5 and r['empty'] == 0, 'Unload lets all 5 out beside it (where it drove to)')
    m = json.loads(pg.evaluate("""(()=>{ sight(); const out={};
      // the machine gun kills a soldier
      const s=open(150); const bw=spawn('bulwark',0,s.x,s.y); bw.hp=bw.maxHp=1e9; const foe=spawn('soldier',1,s.x+100,s.y); foe.passive=true; bw.order={type:'attack',target:foe.id}; let k=0; while(k<20*20&&foe.hp>0){ foe.order=null; foe.x=s.x+100; foe.y=s.y; sight(); U(1); k++; } out.gun=foe.hp<=0?+(k/20).toFixed(1):'lived';
      // crushing: drive over an enemy soldier
      const v=spawn('soldier',1,s.x+60,s.y+40); v.passive=true; bw.order={type:'move',x:s.x+120,y:s.y+40}; bw.x=s.x; bw.y=s.y+40; let j=0; while(j<20*6&&v.hp>0){ v.order=null; v.cooldown=99; U(1); j++; } out.crushed=v.hp<=0;
      // destroyed with 3 aboard: they jump out hurt
      const b2=spawn('bulwark',0,s.x,s.y-80); b2.cargo=[]; for(let i=0;i<3;i++){ const q=spawn('soldier',0,s.x,s.y-80); q.gone=true; b2.cargo.push(q); } game.ents=game.ents.filter(e=>!e.gone);
      b2.hp=0; U(2); const bailed=game.ents.filter(e=>e.team===0&&e.type==='soldier'&&Math.hypot(e.x-s.x,e.y-(s.y-80))<70);
      out.bailed=bailed.length; out.bailHp=bailed.map(q=>Math.round(q.hp/q.maxHp*100));
      bw.hp=0; U(2); return JSON.stringify(out); })()"""))
    print(m)
    check(isinstance(m['gun'], float) and m['gun'] < 10, 'its machine gun kills an enemy soldier (%s s)' % m['gun'])
    check(m['crushed'], 'it crushes an enemy soldier it drives over')
    check(m['bailed'] == 3 and all(h <= 50 for h in m['bailHp']), 'destroyed with 3 aboard: they jump out, hurt (%s%%)' % m['bailHp'])
    if pics:
        pg.evaluate("""(()=>{ const s=open(150); const bw=spawn('bulwark',0,s.x,s.y); bw.facing=0.2; bw.turret=0.2; bw.cargo=[]; for(let i=0;i<3;i++){ const q=spawn('soldier',0,s.x,s.y); q.gone=true; bw.cargo.push(q); } game.ents=game.ents.filter(e=>!e.gone);
          const b2=spawn('bulwark',0,s.x-10,s.y+60); b2.facing=0.2; b2.turret=0.2; const out=[]; for(let i=0;i<4;i++) out.push(spawn('soldier',0,s.x-80+i*14,s.y+110));
          for(let i=0;i<2;i++){ sight(); U(1); } cam.x=s.x-10; cam.y=s.y+50; setZoom(2.3); clampCam(); game.selected=new Set([bw.id]); game.paused=true; updateHUD(); })()""")
        pg.wait_for_timeout(500); pg.screenshot(path=f'{pics}/bulwark.png')
    check(not errs, 'no page errors %s' % errs[:3])
    pg.close()
    pg, errs = page(b, 'ashen', 'hard')
    made = json.loads(pg.evaluate("""(()=>{ runAI=realAI; let k=0; while(k<20*480){ U(1); k++; if(game.over) break; } return JSON.stringify(game.track.made[1]); })()"""))
    print(made)
    check((made.get('bulwark') or 0) >= 1, 'the computer (Legion) builds a Bulwark: %s' % made.get('bulwark'))
    check(not errs, 'no page errors (computer) %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
