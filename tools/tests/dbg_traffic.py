# Traffic map: plays a few seeded games and counts where combat units walk (every second, 50px squares), then draws
# a heat map over the map picture. Usage: python3 tests/dbg_traffic.py <game folder> <port> <map> <out.png> [games]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m, out = sys.argv[3], sys.argv[4]; n = int(sys.argv[5]) if len(sys.argv) > 5 else 4
plans = [('hard', 'mixed'), ('normal', 'tanks'), ('hard', 'infantry'), ('normal', 'mixed'), ('hard', 'turtle'), ('normal', 'buggy')][:n]
heat = None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for k, (d, s) in enumerate(plans):
        pg = b.new_page(viewport={'width': 400, 'height': 300})
        pg.add_init_script(f"(()=>{{ let s={k+5}*7919+13; Math.random=()=>((s=(s*16807)%2147483647)/2147483647); }})()")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-difficulty','{d}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
        pg.evaluate("""(()=>{ window.__heat = new Float32Array(COLS * ROWS); const U = update; let t = 0;
          update = function (dt) { U(dt); t += dt; if (t < 1) return; t = 0;
            for (const e of game.ents) if (isCombat(e) && (game.time - (e.movedAt || -9)) < 1) window.__heat[cellIndex(e.x, e.y)]++; }; })()""")
        pg.evaluate(open('sim/bot.js').read())
        r = pg.evaluate(f"runSim('{s}', 30)")
        h = pg.evaluate("Array.from(window.__heat)")
        heat = h if heat is None else [a + c for a, c in zip(heat, h)]
        print(d, s, r['winner'], r['minutes'])
        pg.close()
    # draw it over the map
    pg = b.new_page(viewport={'width': 1600, 'height': 1000})
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    pg.evaluate("""(heat)=>{ game.paused=true; for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s); window.drawMinimap=()=>{};
      fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
      const fitS=Math.min(scr.w/W, scr.h/H); cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=H/2; draw(); window.draw=()=>{};
      const s=scale(), ox=scr.w/2-cam.x*s, oy=scr.h/2-cam.y*s; ctx.setTransform(scr.dpr,0,0,scr.dpr,0,0);
      const sorted=[...heat].filter(v=>v>0).sort((a,b)=>a-b), cap=sorted[Math.floor(sorted.length*0.97)]||1;
      for (let i=0;i<heat.length;i++){ if(!heat[i]) continue; const k=Math.min(1,heat[i]/cap); const col=i%COLS,row=Math.floor(i/COLS);
        ctx.fillStyle=`rgba(255,${Math.round(220-200*k)},0,${0.15+0.55*k})`; ctx.fillRect(ox+col*CELL*s, oy+row*CELL*s, CELL*s+0.5, CELL*s+0.5); }
      // label the plateaus (not the river ones)
      ctx.font='bold 14px sans-serif'; ctx.fillStyle='#fff'; ctx.textAlign='center';
      for (const base of MAP.plateaus) if (!base.overhang) for (const pl of [base, {x:W-base.x,y:H-base.y}]) { ctx.strokeStyle='#00e5ff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(ox+pl.x*s, oy+pl.y*s, 26, 0, 7); ctx.stroke(); }
    }""", heat)
    pg.locator('#c').screenshot(path=out, type='png')
    json.dump(heat, open(out + '.json', 'w'))
    b.close()
srv.shutdown()
