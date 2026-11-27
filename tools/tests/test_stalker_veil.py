# v5.75: the Sniper moves to the Legion; the Ashen get the Stalker (forest infantry: in a forest hidden even when firing,
# full speed, +50% damage) and the Veil (ambush truck: hidden once still for 2 s or in a forest; seen when moving in the
# open, for 2 s after firing, or with an enemy within 80; a pair of big anti-tank rockets, then a long reload).
# Usage: python3 tests/test_stalker_veil.py <game folder> <port> [picture folder]
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
  window.open=(r)=>{ for(let k=0;k<6000;k++){ const x=400+Math.random()*(W-800), y=400+Math.random()*(H-800); let good=true; for(let d=-r;d<=r&&good;d+=15) for(let e=-30;e<=30&&good;e+=15) if(terrainAt(x+d,y+e)!==T.GRASS||elevAt(x+d,y+e)) good=false; if(good && !game.ents.some(o=>Math.hypot(o.x-x,o.y-y)<r+80)) return {x,y}; } };
  // a forest tile deep enough to stand in, with open grass 4-7 tiles to its west
  window.forest=()=>{ for(let i=0;i<terrain.length;i++){ if(terrain[i]!==T.FOREST) continue; const c=i%TCOLS, rr=Math.floor(i/TCOLS); let n=0; for(let dc=-1;dc<=1;dc++) for(let dr=-1;dr<=1;dr++) if(terrain[(rr+dr)*TCOLS+c+dc]===T.FOREST) n++; if(n===9 && [4,5,6,7].every(k=>terrain[rr*TCOLS+c-k]===T.GRASS) && !game.ents.some(o=>Math.hypot(o.x-c*TC,o.y-rr*TC)<250)) return {x:c*TC+TC/2,y:rr*TC+TC/2}; } };
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
    btn = {}
    for f in ['legion', 'ashen']:
        pg, errs = page(b, f)
        btn[f] = json.loads(pg.evaluate("""(()=>{ const bar=put('barracks',-190,30), f=put('factory',220,60); put('power',-300,120); put('refinery',-170,-140); put('tech',350,-40);
          const btns=x=>{ game.selected=new Set([x.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(b=>b.style.display!=='none').map(b=>b.textContent); };
          return JSON.stringify({barracks:btns(bar), factory:btns(f)}); })()"""))
        pg.close()
    print(btn)
    check(any(t.startswith('Sniper') for t in btn['legion']['barracks']) and not any(t.startswith('Sniper') for t in btn['ashen']['barracks']), 'the Sniper is at the Legion Barracks now, not the Ashen')
    check('Stalker $300' in btn['ashen']['barracks'] and not any('Stalker' in t for t in btn['legion']['barracks']), 'the Stalker ($300) is at the Ashen Barracks only')
    check('Veil $750' in btn['ashen']['factory'] and not any('Veil' in t for t in btn['legion']['factory']), 'the Veil ($750) is at the Ashen War Factory only')
    pg, errs = page(b, 'ashen')
    r = json.loads(pg.evaluate("""(()=>{ sight(); const out={}; const fp=forest();
      // a Stalker in the forest shoots an enemy soldier out on the grass 115 away: still hidden, and kills faster than one on open ground
      const duel=(x,y,tx,ty)=>{ const st=spawn('stalker',0,x,y); st.hp=st.maxHp=1e9; const foe=spawn('soldier',1,tx,ty); foe.passive=true; foe.cooldown=1e9; st.order={type:'attack',target:foe.id};
        let k=0, hiddenAfter=null; while(k<20*20&&foe.hp>0){ foe.order=null; foe.x=tx; foe.y=ty; foe.cooldown=1e9; sight(); U(1); k++; if(hiddenAfter===null && st.cooldown>0.5) hiddenAfter=hiddenFrom(st,1); } const res={secs:+(k/20).toFixed(1), hiddenAfter}; st.hp=0; foe.hp=0; U(2); return res; };
      out.forest=duel(fp.x, fp.y, fp.x-115, fp.y);
      const s=open(140); out.open=duel(s.x, s.y, s.x+115, s.y);
      // full speed in a forest: the Stalker vs a Soldier walking 70 into the trees
      const speedIn=t=>{ const u=spawn(t,0,fp.x-12,fp.y); u.order={type:'move',x:fp.x+60,y:fp.y}; const x0=u.x; U(20); const d=Math.round(u.x-x0); u.hp=0; U(1); return d; };
      out.stalkerForest=speedIn('stalker'); out.soldierForest=speedIn('soldier');
      // the Veil: moving in the open is seen; still for 2 s it's hidden; firing reveals it for 2 s; an enemy right next to it sees it
      const s2=open(160); const v=spawn('veil',0,s2.x-80,s2.y); v.passive=true; v.order={type:'move',x:s2.x,y:s2.y}; U(6); out.veilMoving=hiddenFrom(v,1);
      const watcher=spawn('soldier',1,s2.x+230,s2.y); watcher.passive=true; watcher.cooldown=1e9;
      let k=0; while(k<20*8 && v.order){ watcher.order=null; U(1); k++; } U(20); out.veilStill1s=hiddenFrom(v,1); U(30); out.veilStill=hiddenFrom(v,1);
      const tank=spawn('light',1,s2.x+150,s2.y+30); tank.passive=true; tank.cooldown=1e9; v.passive=false; v.order={type:'attack',target:tank.id}; const hp0=tank.hp; let j=0; while(j<20*4 && tank.hp===hp0){ tank.order=null; sight(); U(1); j++; }
      U(4); out.veilAfterFiring=hiddenFrom(v,1); out.volley=Math.round(hp0-tank.hp); v.order=null; v.passive=true; tank.hp=0; U(20*3); out.veilLater=hiddenFrom(v,1);
      watcher.x=v.x+50; watcher.y=v.y; U(1); out.veilClose=hiddenFrom(v,1);
      return JSON.stringify(out); })()"""))
    print(r)
    check(r['forest']['hiddenAfter'] is True and r['open']['hiddenAfter'] is False, 'a Stalker in a forest stays hidden after firing (out in the open it is seen)')
    check(r['forest']['secs'] < r['open']['secs'], 'and kills faster from the trees: %s s vs %s s in the open' % (r['forest']['secs'], r['open']['secs']))
    check(r['stalkerForest'] > r['soldierForest'] * 1.4, 'it moves at full speed in a forest (%d vs a Soldier %d in 1 s)' % (r['stalkerForest'], r['soldierForest']))
    check(r['veilMoving'] is False and r['veilStill1s'] is False and r['veilStill'] is True, 'the Veil is seen while moving, still seen 1 s after stopping, hidden after 2 s')
    check(r['volley'] >= 200, 'its rocket pair hits a Light Tank for %d' % r['volley'])
    check(r['veilAfterFiring'] is False and r['veilLater'] is True, 'firing gives it away for a moment, then it hides again')
    check(r['veilClose'] is False, 'an enemy right next to it sees it')
    if pics:
        pg.evaluate("""(()=>{ const fp=forest(); const a=spawn('stalker',0,fp.x,fp.y); a.facing=Math.PI; const b2=spawn('stalker',0,fp.x-60,fp.y+30); b2.facing=0;
          const s=open(120); const v=spawn('veil',0,s.x,s.y); v.facing=0.3; v.stillT=0; const v2=spawn('veil',0,s.x+70,s.y+20); v2.facing=0.3; v2.stillT=5;
          for(let i=0;i<2;i++){ sight(); U(1); } v2.stillT=5; window.FP=fp; window.S2=s; })()""")
        pg.evaluate("(()=>{ cam.x=FP.x-30; cam.y=FP.y+15; setZoom(2.2); clampCam(); game.paused=true; game.selected=new Set(); })()")
        pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/stalkers.png')
        pg.evaluate("(()=>{ cam.x=S2.x+35; cam.y=S2.y+10; setZoom(2.2); clampCam(); })()")
        pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/veils.png')
    check(not errs, 'no page errors %s' % errs[:3])
    pg.close()
    pg, errs = page(b, 'legion', 'hard')
    made = json.loads(pg.evaluate("""(()=>{ runAI=realAI; let k=0; while(k<20*480){ U(1); k++; if(game.over) break; } return JSON.stringify(game.track.made[1]); })()"""))
    print(made)
    check((made.get('stalker') or 0) >= 1 and (made.get('veil') or 0) >= 1 and not made.get('sniper'), 'the computer (Ashen) trains Stalkers and builds a Veil, and no Snipers: %s / %s' % (made.get('stalker'), made.get('veil')))
    check(not errs, 'no page errors (computer) %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
