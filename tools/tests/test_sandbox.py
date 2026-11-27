# v5.72: the Sandbox switch on the start screen: unlimited money, the whole map in view (no fog, minimap from the start);
# the computer plays as usual. Off again: a normal game. Saves pictures if given a folder.
# Usage: python3 tests/test_sandbox.py <game folder> <port> [picture folder]
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
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 860}, device_scale_factor=2, has_touch=True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','normal'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(url); pg.wait_for_timeout(1500)
    off = pg.evaluate("document.getElementById('sandboxBtn').textContent")
    pg.click('#sandboxBtn'); pg.wait_for_timeout(200)
    on = pg.evaluate("[document.getElementById('sandboxBtn').textContent, document.getElementById('sandboxInfo').textContent, localStorage.getItem('mini-rts-sandbox')]")
    if pics: pg.screenshot(path=f'{pics}/sandbox_menu.png')
    check(off == 'Sandbox: off' and on[0] == 'Sandbox: on' and on[1] and on[2] == 'on', 'the start screen has a Sandbox switch, remembered: %s' % on[:1])
    pg.reload(); pg.wait_for_timeout(1500)
    check(pg.evaluate("document.getElementById('sandboxBtn').textContent") == 'Sandbox: on', 'still on after a reload')
    pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ window.realAI=runAI; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(20);
      const hq=hqOf(0); const before=game.credits[0]; let placed=0; for(const t of ['barracks','refinery','power']){ for(let k=0;k<3000;k++){ const a=Math.random()*6.3, d=hq.size/2+60+Math.random()*240; if(placeBuilding(0,t,hq.x+Math.cos(a)*d,hq.y+Math.sin(a)*d)){ placed++; break; } } let j=0; while(goingUp(0).length&&j<400){U(1);j++;} }
      U(2); updateHUD(); const vis=fog[0].vis.reduce((s,v)=>s+v,0)/fog[0].vis.length, enemyHQ=canSee(hqOf(1));
      cam.x=W*0.55; cam.y=H*0.45; setZoom(0.6); clampCam();
      return JSON.stringify({sandbox:game.sandbox, before:Math.round(before), after:Math.round(game.credits[0]), placed, cash:document.getElementById('credits')?document.getElementById('credits').textContent:ui.credits.textContent, vis:+vis.toFixed(3), enemyHQ, mm:minimapOn()}); })()"""))
    print(r)
    pg.wait_for_timeout(500)
    if pics: pg.screenshot(path=f'{pics}/sandbox_game.png')
    check(r['sandbox'] and r['placed'] == 3 and r['after'] >= 1e6 - 1, 'money never runs out (3 buildings bought, still $%d)' % r['after'])
    check('∞' in r['cash'], 'the money box shows %s' % r['cash'])
    check(r['vis'] > 0.99 and r['enemyHQ'], 'the whole map is in view (%.1f%%), the enemy HQ too' % (r['vis'] * 100))
    check(r['mm'], 'the minimap is there without a Radar')
    rep = pg.evaluate("buildReport().sandbox")
    check(rep is True, 'the game report says it was a sandbox game')
    # off again: a normal game
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#sandboxBtn'); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<20;i++) update(0.05); updateHUD();
      return JSON.stringify({sandbox:game.sandbox, money:Math.round(game.credits[0]), vis:+(fog[0].vis.reduce((s,v)=>s+v,0)/fog[0].vis.length).toFixed(3), mm:minimapOn()}); })()"""))
    print(r)
    check(not r['sandbox'] and r['money'] < 2000 and r['vis'] < 0.3 and not r['mm'], 'switched off: normal money, fog and no minimap')
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
