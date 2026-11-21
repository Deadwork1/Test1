# The opening landing (v5.58): pictures as the boat sails in, drops its ramp, the Settler drives ashore and the boat leaves,
# plus checks that the Settler reaches its start spot, the computer waits about as long to deploy, and deploying early skips it.
# Usage: python3 tests/pic_landing.py <game folder> <port> <out prefix> [map, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]; m = sys.argv[4] if len(sys.argv) > 4 else 'large'; ok = True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 800, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    pg.evaluate("(()=>{ game.paused=true; window.__log=[]; })()")
    shots = [('1_sail', "L && L.phase==='sail' && L.y < L.stopY + 30"), ('2_ramp', "L && L.phase==='unload'"), ('3_ashore', "L && L.phase==='leave' && L.t < 0.3"),
             ('4_leave', "L && L.phase==='leave' && L.y > L.stopY + 40")]
    for name, cond in shots:
        r = pg.evaluate(f"""(()=>{{ game.paused=false; let t=0; while (t < 60) {{ update(0.02); t+=0.02; const L=game.landing; if ({cond}) break; }} game.paused=true;
          const L=game.landing, s=game.ents.find(e=>e.team===0&&e.type==='settler');
          cam.x=START[0].x; cam.y=H-60; cam.zoom=1.6; return [Math.round(game.time*10)/10, L&&L.phase, s&&Math.round(s.y), s&&!!s.boarded]; }})()""")
        print(name, r); pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_{name}.png')
    r = json.loads(pg.evaluate("""(()=>{ game.paused=false; let t=0, at=null, aiAt=null; while (t < 60) { update(0.05); t+=0.05;
        const s=game.ents.find(e=>e.team===0&&e.type==='settler'); if (at===null && s && Math.hypot(s.x-START[0].x, s.y-START[0].y) < 8) at=Math.round(game.time);
        if (aiAt===null && hqOf(1)) aiAt=Math.round(game.time); if (at!==null && aiAt!==null) break; }
        return JSON.stringify({ settlerAtStart: at, aiDeployed: aiAt, boatGone: !game.landing, aiDeployAt: Math.round(game.aiDeployAt) }); })()"""))
    print(r)
    if not (r['settlerAtStart'] and r['aiDeployed'] and abs(r['settlerAtStart'] - r['aiDeployed']) <= 3): ok = False; print('FAIL: timing')
    # deploying straight away (what the test tools do) skips the landing and the computer's wait
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r2 = json.loads(pg.evaluate("""(()=>{ const s=game.ents.find(e=>e.team===0&&e.type==='settler'); const okd=deploy(s); const hq=hqOf(0); for (let i=0;i<40;i++) update(0.05);
        return JSON.stringify({ deployed: okd, atStart: !!hq && Math.hypot(hq.x-START[0].x, hq.y-START[0].y) < 2, aiWait: game.aiDeployAt, aiHq: !!hqOf(1) }); })()"""))
    print(r2)
    if not (r2['deployed'] and r2['atStart'] and r2['aiWait'] == 0 and r2['aiHq']): ok = False; print('FAIL: early deploy')
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
