# Radar: needs a Power Plant; once built it reveals everything within its range (750), over rocks and up onto plateaus, but
# infantry hidden in a forest stay hidden; it can be sold. Usage: python3 tests/test_radar.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 500}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{ runAI=()=>{}; game.paused=false; const out = {};
      for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s); const hq = hqOf(0);
      game.selected = new Set([hq.id]); updateHUD(); out.lockedLabel = document.getElementById('btnRadar').textContent; out.lockedDisabled = document.getElementById('btnRadar').disabled;
      const pw = spawn('power', 0, hq.x + 120, hq.y - 10); pw.built = true; pw.progress = 1;
      game.credits[0] = 2000; updateHUD(); out.unlockedLabel = document.getElementById('btnRadar').textContent;
      // place and build one
      out.placed = placeBuilding(0, 'radar', hq.x + 130, hq.y + 110);
      const rd = game.ents.find(e => e.type === 'radar' && e.team === 0);
      const behindRock = { x: 450, y: 1500 };   // north of the rock wall above your base on Large, about 460 from the radar
      updateFog(); out.behindRockSeenWhileBuilding = visibleAt(behindRock.x, behindRock.y);
      for (let i = 0; i < 20 * 20 && !rd.built; i++) update(0.05);
      out.built = rd.built; updateFog();
      out.dist = Math.round(Math.hypot(behindRock.x - rd.x, behindRock.y - rd.y)); out.behindRockSeen = visibleAt(behindRock.x, behindRock.y);
      out.edgeSeen = visibleAt(rd.x + STATS.radar.sight - 30, rd.y - 50); out.beyondSeen = visibleAt(rd.x + STATS.radar.sight + 70, rd.y - 50);
      // an enemy soldier hidden in the forest at (200, 600)? too far; plant a forest unit within range instead: find a forest tile within 600
      let ft = null; for (let a = 0; a < 6.28 && !ft; a += 0.05) for (let d = 100; d < 600 && !ft; d += 20) { const x = rd.x + Math.cos(a) * d, y = rd.y + Math.sin(a) * d; if (terrainAt(x, y) === T.FOREST) ft = { x, y }; }
      if (ft) { const hidden = spawn('soldier', 1, ft.x, ft.y); updateFog(); out.forestInfantryVisible = canSee(hidden); hidden.hp = 0; } else out.forestInfantryVisible = 'no forest in range';
      // sell it
      game.selected = new Set([rd.id]); updateHUD(); const btn = document.getElementById('btnSell'); const c0 = game.credits[0]; btn.click(); btn.click(); update(0.05);
      out.soldFor = Math.round(game.credits[0] - c0 - 0.05);
      return out; })()""")
    print(json.dumps(r, indent=1)); print('errors', errs[:3])
    ok = (r['lockedDisabled'] and 'needs Power Plant' in r['lockedLabel'] and r['unlockedLabel'] == 'Radar $300' and r['placed'] and r['built'] and not r['behindRockSeenWhileBuilding']
          and r['behindRockSeen'] and r['edgeSeen'] and not r['beyondSeen'] and r['forestInfantryVisible'] in (False, 'no forest in range') and r['soldFor'] == 150 and not errs)
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
