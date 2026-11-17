import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
root = sys.argv[1]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8772), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
errors = []
J = lambda pg, js: pg.evaluate(js)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.goto('http://127.0.0.1:8772/index.html'); pg.wait_for_timeout(400)
    pg.screenshot(path='out/v2_0.png')
    pg.click('#ovBtn'); pg.wait_for_timeout(200)
    def toScreen(x, y): return J(pg, f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    def ent(team, t): return J(pg, f"(()=>{{const e=game.ents.find(e=>e.team==={team}&&e.type==='{t}');return e?[e.x,e.y]:null}})()")
    pg.mouse.click(*toScreen(*ent(0,'settler'))); pg.click('#btnDeploy'); pg.wait_for_timeout(100)
    print('after deploy sel:', J(pg, "[...game.selected].map(id=>byId(id).type)"))
    pg.click('#btnRefinery'); pg.wait_for_timeout(100)
    hq = ent(0,'hq'); tx, ty = hq[0]+150, hq[1]-60
    pg.mouse.click(*toScreen(tx,ty)); pg.wait_for_timeout(100)
    pg.screenshot(path='out/v2_1_place.png')
    pg.mouse.click(*toScreen(tx,ty)); pg.wait_for_timeout(100)
    print('mine:', J(pg,"game.ents.filter(e=>e.team===0).map(e=>e.type+(e.built?'':'*'))"), '$', J(pg,"Math.floor(game.credits[0])"))
    J(pg, "for(let i=0;i<260;i++) update(0.05)")
    pg.mouse.click(*toScreen(*ent(0,'refinery'))); pg.wait_for_timeout(50)
    print('produce label:', pg.inner_text('#btnProduce'))
    pg.click('#btnProduce'); pg.click('#btnProduce')
    J(pg, "for(let i=0;i<260;i++) update(0.05)")
    print('mine:', J(pg,"game.ents.filter(e=>e.team===0).map(e=>e.type+(e.order?'':'(idle)'))"))
    # select extractor, tap nearest explored ore
    pg.mouse.click(*toScreen(*ent(0,'extractor'))); pg.wait_for_timeout(50)
    print('info:', pg.inner_text('#info'))
    ore = J(pg, "(()=>{const o=findOre(cam.x,cam.y,Infinity,0,true);return o?[o.x,o.y]:null})()")
    print('nearest known ore', ore)
    # pan camera toward ore so it's on screen
    J(pg, f"cam.x={ore[0]};cam.y={ore[1]};clampCam()")
    pg.mouse.click(*toScreen(*ore)); pg.wait_for_timeout(50)
    print('extractor order:', J(pg, "(()=>{const e=byId([...game.selected][0]);return e.order&&e.order.type+'/'+e.order.phase})()"))
    c0 = J(pg,"game.credits[0]")
    J(pg, "for(let i=0;i<20*40;i++) update(0.05)")
    print('credits gained over 40s:', round(J(pg,"game.credits[0]")-c0), '(incl trickle 40)')
    pg.wait_for_timeout(100); pg.screenshot(path='out/v2_2_harvest.png')
    # depletion test: drain field near that extractor
    J(pg, "(()=>{const e=game.ents.find(e=>e.team===0&&e.type==='extractor'&&e.order);const o=e.order;for(const n of game.ore) if(Math.hypot(n.x-o.lastX,n.y-o.lastY)<300) n.amount=Math.min(n.amount,1);})()")
    J(pg, "for(let i=0;i<20*40;i++) update(0.05)")
    print('extractors after depletion:', J(pg, "game.ents.filter(e=>e.team===0&&e.type==='extractor').map(e=>({order:e.order&&e.order.phase, out:!!e.outOfOre}))"))
    # explored fraction, AI state
    print('explored %:', J(pg, "Math.round(100*fog.exp.reduce((a,b)=>a+b,0)/fog.exp.length)"))
    print('AI:', J(pg,"game.ents.filter(e=>e.team===1).map(e=>e.type)"), 'AI $', J(pg,"Math.floor(game.credits[1])"))
    # pan via drag test
    before = J(pg,"[cam.x,cam.y]")
    pg.mouse.move(400,200); pg.mouse.down(); pg.mouse.move(250,250, steps=5); pg.mouse.up()
    print('pan moved cam:', before, '->', J(pg,"[Math.round(cam.x),Math.round(cam.y)]"))
    J(pg, "for(let i=0;i<20*180 && !game.over;i++) update(0.05)")
    print('3 min later over=', J(pg,"game.over"), 'AI:', J(pg,"game.ents.filter(e=>e.team===1).length"))
    J(pg,"cam.x=W/2;cam.y=H/2;setZoom(0.5);clampCam()"); pg.wait_for_timeout(100)
    pg.screenshot(path='out/v2_3_zoomed.png')
    print('ERRORS:', errors)
    b.close()
srv.shutdown()
