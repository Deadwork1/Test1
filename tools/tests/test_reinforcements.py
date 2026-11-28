# v5.71: once your first HQ is up, two boats bring 5 Soldiers and then a Scout Buggy; they come up the beach and gather
# south of your HQ. The computer gets the same units at its HQ. A later Settler's HQ brings none. Saves pictures if given a folder.
# Usage: python3 tests/test_reinforcements.py <game folder> <port> [map] [picture folder]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
mp = sys.argv[3] if len(sys.argv) > 3 else 'large'; pics = sys.argv[4] if len(sys.argv) > 4 else None
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 860}, device_scale_factor=2, has_touch=True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{mp}'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ window.realAI=runAI; runAI=()=>{}; window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; window.mine=t=>game.ents.filter(e=>e.team===t&&isUnit(e)&&e.hp>0&&e.type!=='settler');
      const s=game.ents.find(e=>e.team===0&&e.type==='settler'); let k=0; while(k<20*60 && (s.boarded||s.landing||s.order)){ U(1); k++; }
      // the computer deploys when it's due (its Settler waits as long as yours took)
      window.t0=game.time; deploy(s); const s1=game.ents.find(e=>e.team===1&&e.type==='settler'); if(s1&&s1.hp>0) deploy(s1); })()""")
    shots = []
    def snap(name):
        if pics:
            pg.evaluate("""(()=>{ const B=(game.boats||[])[0]; const h=hqOf(0); const tx=B?B.x:h.x, ty=B?Math.min(B.y, HT-140):h.y+140; cam.x=tx; cam.y=ty; setZoom(1.3); clampCam(); game.selected=new Set(); game.paused=true; })()""")
            pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/reinf_{name}.png'); pg.evaluate("game.paused=false")
    r = []
    for secs, name in [(3.2, 'sailing'), (2.2, 'ashore'), (2.8, 'buggy'), (12, 'gathered')]:
        pg.evaluate(f"U({int(secs*20)})"); snap(name)
        r.append(json.loads(pg.evaluate("""JSON.stringify({t:+(game.time-t0).toFixed(1), you:mine(0).map(e=>e.type+(e.boarded?'(boat)':e.landing?'(beach)':'')), boats:(game.boats||[]).map(B=>B.phase), them:mine(1).map(e=>e.type)})""")))
    for x in r: print(x)
    last = r[-1]; hq = json.loads(pg.evaluate("JSON.stringify({x:hqOf(0).x,y:hqOf(0).y, d:mine(0).map(e=>Math.round(Math.hypot(e.x-hqOf(0).x,e.y-hqOf(0).y)))})"))
    check(any('(boat)' in u for u in r[0]['you']) and r[0]['boats'], 'the first boat sails in with Soldiers on board: %s' % r[0]['you'])
    check(sorted(t.split('(')[0] for t in last['you']) == ['buggy'] + ['soldier'] * 5 and not last['boats'], 'you end up with 5 Soldiers and a Buggy, boats gone: %s' % last['you'])
    shown = pg.evaluate('game.reinfShown || 0')
    check(shown == 2, '"Reinforcements have arrived" shows as each boat lowers its ramp (%d times)' % shown)
    check(all(d < 260 for d in hq['d']), 'they gather by your HQ (distances %s)' % hq['d'])
    check(sorted(last['them']) == ['buggy'] + ['soldier'] * 5, 'the computer gets the same: %s' % last['them'])
    # a later HQ (from a bought Settler) brings no more
    n = json.loads(pg.evaluate("""(()=>{ const before=mine(0).length; const h=hqOf(0); const s=spawn('settler',0,h.x+600,h.y-300); deploy(s); U(20*15); return JSON.stringify({before, after:mine(0).length}); })()"""))
    check(n['before'] == n['after'], 'a second HQ brings no extra troops (%s)' % n)
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
