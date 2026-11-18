# The computer and the ruined bases: plays up to 16 game minutes against an HQ that can't be destroyed and logs when it captures each ruin
# and when each is repaired to working (it should start at about 9 / 7 / 6 minutes on Easy / Normal / Hard).
# Usage: python3 test_ai_ruins.py <game folder> <port> <maps, e.g. large,classic> <difficulties, e.g. easy,normal,hard>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = """(diffName)=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; window.drawMinimap=()=>{};
  difficulty=diffName; newGame(); game.paused=false;
  const s0=game.ents.find(e=>e.type==='settler'&&e.team===0); const hq=spawn('hq',0,s0.x,s0.y); hq.built=true; s0.hp=0; s0.deployed=true;
  const log=[]; const ru=()=>game.ents.filter(e=>e.ruin && e.x>W/2);   // the computer's own (south-east/east) ruin
  const seen={}; let errs=0;
  for (let t=0;t<20*60*16;t++){ hq.hp=hq.maxHp; try{ U(0.05); }catch(err){ errs++; if(errs<3) log.push('ERR '+err.message); }
    for (const r of game.ents.filter(e=>e.ruin)) { const k=r.id; const st=(r.team===1?'AI':r.team===0?'you':'neutral')+(r.team!==2&&ruinWorks(r)?'+working':''); if (seen[k]!==st){ seen[k]=st; log.push((game.time/60).toFixed(1)+'m '+r.type+'@'+(r.x<W/2?'W':'E')+' '+st); } }
    if (game.over) { log.push('game over '+game.over); break; } }
  return {log, aiEngineers: game.ents.filter(e=>e.team===1&&e.type==='engineer').length, aiBarracks: game.ents.filter(e=>e.team===1&&e.type==='barracks'&&!e.ruin).length};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in sys.argv[3].split(','):
        for d in sys.argv[4].split(','):
            pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.reload(); pg.wait_for_timeout(2500); pg.click('#ovBtn')
            r = pg.evaluate(JS, d); print(m, d, json.dumps(r), errs[:2], flush=True); pg.close()
    b.close()
srv.shutdown()
