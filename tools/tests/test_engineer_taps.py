import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.tap('#ovBtn')
    # 6) real taps: select engineer, tap own damaged building (repair), tap enemy building (capture)
    pg.evaluate("""(()=>{ newGame(); runAI=()=>{}; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1; game.paused=false;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.hp=300;
      window._en=spawn('engineer',0,hq.x+90,hq.y+40); window._eb=spawn('barracks',1,hq.x+330,hq.y-40); _eb.built=true;
      for(let i=0;i<5;i++) update(0.05); cam.x=hq.x+150; cam.y=hq.y; setZoom(1); clampCam(); })()""")
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    en = pg.evaluate("[_en.x,_en.y]"); hq = pg.evaluate("[hqOf(0).x,hqOf(0).y]"); eb = pg.evaluate("[_eb.x,_eb.y]")
    pg.touchscreen.tap(*toS(*en)); pg.wait_for_timeout(80)
    info1 = pg.inner_text('#info')
    pg.touchscreen.tap(*toS(*hq)); pg.wait_for_timeout(80)
    o1 = pg.evaluate("_en.order&&_en.order.type")
    pg.evaluate("for(let i=0;i<20*12;i++) update(0.05)")
    hp = pg.evaluate("hqOf(0).hp")
    pg.touchscreen.tap(*toS(*pg.evaluate("[_en.x,_en.y]"))); pg.wait_for_timeout(80)
    pg.touchscreen.tap(*toS(*eb)); pg.wait_for_timeout(80)
    o2 = pg.evaluate("_en.order&&_en.order.type")
    pg.evaluate("for(let i=0;i<20*12;i++) update(0.05)")
    print('taps → info:', info1, '| order after tapping own HQ:', o1, '| HQ hp after 12s:', round(hp), '/900 | order after tapping enemy barracks:', o2, '| captured:', pg.evaluate("_eb.team===0"))
    print(errs[:3]); b.close()
srv.shutdown()
