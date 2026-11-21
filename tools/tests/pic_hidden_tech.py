# Locked buildings and units are hidden (v5.53): pictures of the HQ's and Barracks' buttons as the tech tree opens up,
# and a check that each button appears only once its requirements are built.
# Usage: python3 tests/pic_hidden_tech.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]; ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1100, 'height': 500}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; game.credits[0]=9000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); window.__hq=hqOf(0);
      window.__put=(t,dx,dy)=>{ const b=spawn(t,0,__hq.x+dx,__hq.y+dy); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      window.__sel=t=>{ const b=game.ents.find(e=>e.team===0&&e.type===t); game.selected=new Set([b.id]); cam.x=b.x; cam.y=b.y; };
      window.__btns=()=>[...document.querySelectorAll('#panel button')].filter(x=>x.offsetParent!==null).map(x=>x.textContent); })()""")
    def snap(name, sel):
        pg.evaluate(f"__sel('{sel}')"); pg.wait_for_timeout(400)
        btns = pg.evaluate("__btns()"); print(name, btns); pg.screenshot(path=f'{out}_{name}.png', clip={'x': 0, 'y': 400, 'width': 1100, 'height': 100}); return ' | '.join(btns)
    def expect(txt, yes, no):
        global ok
        for w in yes:
            if w not in txt: ok = False; print('  FAIL: missing', w)
        for w in no:
            if w in txt: ok = False; print('  FAIL: should be hidden', w)
    t = snap('1_start', 'hq'); expect(t, ['Barracks', 'Refinery', 'Power Plant'], ['War Factory', 'Tech', 'Radar', 'Medbay', 'Helipad', 'SAM', 'needs'])
    pg.evaluate("__put('power',-170,-160)"); t = snap('2_power', 'hq'); expect(t, ['Radar', 'SAM'], ['War Factory', 'Medbay', 'Helipad', 'Tech'])
    pg.evaluate("__put('barracks',-170,40)"); t = snap('3_barracks_hq', 'hq'); expect(t, ['Medbay'], ['War Factory'])
    pg.evaluate("__put('refinery',190,-170)"); t = snap('4_refinery', 'hq'); expect(t, ['War Factory'], ['Tech', 'Helipad'])
    pg.evaluate("__put('factory',200,60)"); t = snap('5_factory', 'hq'); expect(t, ['Tech', 'Helipad'], [])
    t = snap('6_barracks', 'barracks'); expect(t, ['Soldier', 'Engineer', 'Grenadier', 'Rocket'], ['Sniper'])
    # losing the Power Plant hides what it unlocked again
    pg.evaluate("(()=>{ const pw=game.ents.find(e=>e.team===0&&e.type==='power'); pw.hp=0; for(let i=0;i<5;i++) update(0.05); })()")
    t = snap('7_no_power', 'barracks'); expect(t, ['Soldier', 'Engineer'], ['Grenadier', 'Rocket', 'Sniper'])
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
