# The Extractor backing into its Refinery (v5.55.1): pictures as it arrives at the door, turns round, reverses in, unloads and drives off.
# Usage: python3 tests/pic_dock_reverse.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 420, 'height': 420}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel, #money, #sellBox, #mm, #hint, #bottom { display:none !important }")
    pg.evaluate("""(()=>{ runAI=()=>{}; MM.hidden=true; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const ref=spawn('refinery',0,hq.x+190,hq.y-170); ref.built=true; ref.progress=1; ref.hp=ref.maxHp;
      const ex=spawn('extractor',0,ref.x-40,ref.y+150); startHarvest(ex, findOre(ex.x, ex.y, 99999, 0, false)); window.__ex=ex; window.__ref=ref;
      cam.zoom=3; cam.x=ref.x; cam.y=ref.y+45; game.selected=new Set(); })()""")
    shots = [('1_arrive', "o && o.phase==='docking' && !o.aligned && Math.hypot(e.x-dockOf(r).out.x, e.y-dockOf(r).out.y) < 45"),
             ('2_turn', "o && o.phase==='docking' && o.aligned && !o.turned && Math.abs(Math.cos(e.facing)) < 0.75"),
             ('3_reverse', "o && o.phase==='docking' && o.turned && e.y < dockOf(r).out.y - 12"),
             ('4_unload', "o && o.phase==='unloading' && o.t > 4"),
             ('5_leave', "o && (o.phase==='toNode' || o.phase==='undocking') && Math.hypot(e.x-dockOf(r).out.x, e.y-dockOf(r).out.y) < 30 && e.y > dockOf(r).out.y - 4")]
    for name, cond in shots:
        r = pg.evaluate(f"""(()=>{{ const e=__ex, r=__ref; game.paused=false; let t=0; while (t < 300) {{ update(0.02); t+=0.02; const o=e.order; if ({cond}) break; }} game.paused=true;
          cam.x=r.x; cam.y=r.y+45; return [Math.round(t*10)/10, e.order && e.order.phase, Math.round(e.facing*100)/100]; }})()""")
        print(name, r); pg.wait_for_timeout(350); pg.screenshot(path=f'{out}_{name}.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
