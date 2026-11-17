import sys, http.server, threading, functools, json, base64
from playwright.sync_api import sync_playwright
root, port, mapc, diffc, strat = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
bot = open('sim/bot_rec.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 800}, device_scale_factor=1)
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{mapc}'); localStorage.setItem('mini-rts-difficulty','{diffc}')")
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    pg.evaluate(bot); pg.evaluate(f"window.simStrat='{strat}'"); print(pg.evaluate(f"runSim('{strat}', 20)"))
    pg.evaluate("""window.recFrame = (secs) => { for (let i = 0; i < secs * 20 && !game.over && game.time < simEnd; i++) simTick();
        fog[0].vis.fill(1); fog[0].exp.fill(1);
        const fitS = Math.min(scr.w / W, scr.h / (H + 70)); cam.zoom = fitS * 640 / scr.h; cam.x = W / 2; cam.y = H / 2 - 35 / fitS;
        window.drawMinimap = () => {}; _realDraw();
        const d = scr.dpr; ctx.setTransform(d, 0, 0, d, 0, 0);
        ctx.fillStyle = 'rgba(10,12,8,0.92)'; ctx.fillRect(0, 0, scr.w, 64);
        const m = Math.floor(game.time / 60), s = Math.floor(game.time % 60);
        const cnt = (t, f) => game.ents.filter(e => e.team === t && f(e)).length;
        const side = (t, x, align) => { ctx.textAlign = align; ctx.fillStyle = TEAMS[t].color; ctx.font = 'bold 22px sans-serif';
          ctx.fillText(t === 0 ? 'BLUE — scripted player (' + simStrat + ')' : 'RED — computer (' + difficulty[0].toUpperCase() + difficulty.slice(1) + ')', x, 26);
          ctx.font = '17px sans-serif'; ctx.fillStyle = '#e8e8e0';
          ctx.fillText('$' + Math.round(game.credits[t]) + '   army ' + cnt(t, isCombat) + '   buildings ' + cnt(t, e => isBuilding(e) && !isWallType(e.type)) + '   extractors ' + cnt(t, e => e.type === 'extractor'), x, 52); };
        side(0, 16, 'left'); side(1, scr.w - 16, 'right');
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(m + ':' + String(s).padStart(2, '0'), scr.w / 2, 42);
        const lost = [0, 1].find(t => !game.ents.some(e => e.team === t && isBuilding(e) && !isWallType(e.type)));
        if (game.over || lost !== undefined) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, scr.h / 2 - 50, scr.w, 100); ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif';
          ctx.fillText((game.over === 'win' || lost === 1) ? 'BLUE WINS' : (game.over === 'lose' || lost === 0) ? 'RED WINS' : 'GAME OVER', scr.w / 2, scr.h / 2 + 15); }
        const noBld = t => !game.ents.some(e => e.team === t && isBuilding(e) && !isWallType(e.type)); return { t: game.time, over: !!game.over || game.time >= simEnd || noBld(0) || noBld(1) }; }; 0""")
    n = 0
    while True:
        r = pg.evaluate("recFrame(1)")
        pg.locator('#c').screenshot(path=f'frames_1/f{n:05d}.jpg', type='jpeg', quality=92); n += 1
        if r['over']: break
    for k in range(60): pg.locator('#c').screenshot(path=f'frames_1/f{n:05d}.jpg', type='jpeg', quality=92); n += 1   # hold the end
    print(json.dumps({k: v for k, v in pg.evaluate("simFinish()").items() if k in ('winner','minutes','produced','died')}), n, errs[:3])
    b.close()
srv.shutdown()
