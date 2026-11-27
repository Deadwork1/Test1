# v5.70: one building goes up at a time. While a base building is under construction you can't start another
# (each HQ gives one more slot); Walls, Gates and Engineer turrets don't count. The computer follows the same rule.
# Usage: python3 tests/test_one_build.py <game folder> <port>
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
SETUP = """(()=>{ window.realAI=runAI; runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
  window.hq=hqOf(0); fog[0].exp.fill(1); game.credits[0]=20000;
  window.spot=(t,src)=>{ src=src||hq; for(let k=0;k<4000;k++){ const a=Math.random()*6.3, d=src.size/2+60+Math.random()*260, x=src.x+Math.cos(a)*d, y=src.y+Math.sin(a)*d; if(canPlace(0,t,x,y)) return {x,y}; } return null; };
  window.place=(t,src)=>{ const s=spot(t,src); return !!s && placeBuilding(0,t,s.x,s.y); };
  window.btn=id=>{ game.selected=new Set([hq.id]); updateHUD(); const b=document.getElementById(id); return {text:b.textContent, disabled:b.disabled}; };
})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate(SETUP)
    r = json.loads(pg.evaluate("""(()=>{ const o={};
      o.first=place('barracks'); o.second=place('power'); o.btnBusy=btn('btnPower'); o.refBusy=btn('btnRefinery');
      o.wall=false; for(let k=0;k<400&&!o.wall;k++){ const a=Math.random()*6.3, d=hq.size/2+40+Math.random()*200; o.wall=placeBuilding(0,'wall',hq.x+Math.cos(a)*d,hq.y+Math.sin(a)*d); }
      let k=0; while(goingUp(0).length && k<20*60){ U(1); k++; } o.doneAfter=+(k/20).toFixed(1);
      o.btnFree=btn('btnPower'); o.afterDone=place('power');
      U(20*30);   // let the Power Plant finish
      const h2=spawn('hq',0,hq.x+500,hq.y); o.slots=buildSlots(0); o.twoA=place('refinery'); o.twoB=place('barracks', h2); o.twoC=place('power');
      return JSON.stringify(o); })()"""))
    print(r)
    check(r['first'] and not r['second'], 'with a Barracks going up you cannot place a Power Plant')
    check(r['btnBusy']['disabled'] and 'wait' in r['btnBusy']['text'] and r['refBusy']['disabled'], 'the HQ build buttons grey out and say wait: %s' % r['btnBusy']['text'])
    check(r['wall'] is not False, 'walls can still be placed meanwhile (%s)' % r['wall'])
    check(not r['btnFree']['disabled'] and r['btnFree']['text'] == 'Power Plant $200' and r['afterDone'], 'once the Barracks is up (%s s) you can build again: %s' % (r['doneAfter'], r['btnFree']['text']))
    check(r['slots'] == 2 and r['twoA'] and r['twoB'] and not r['twoC'], 'a second HQ gives a second slot (two at once, not three)')
    # the computer: Normal, 6 minutes, never more going up than its slots, and it still builds its base
    r = json.loads(pg.evaluate("""(()=>{ runAI=realAI; let worst=0, maxUp=0; for(let k=0;k<20*360;k++){ update(0.05); const n=goingUp(1).length; maxUp=Math.max(maxUp,n); worst=Math.max(worst, n-buildSlots(1)); }
      const mine=game.ents.filter(e=>e.team===1 && isBuilding(e) && countsAsConstruction(e.type)); return JSON.stringify({worst, maxUp, built:mine.filter(e=>e.built).map(e=>e.type)}); })()"""))
    print(r)
    check(r['worst'] <= 0 and r['maxUp'] >= 1, 'the computer never has more going up than its slots (most at once: %d)' % r['maxUp'])
    check('barracks' in r['built'] and 'refinery' in r['built'] and 'factory' in r['built'] and len(r['built']) >= 4, 'and still builds its base in 6 minutes: %s' % r['built'])
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
