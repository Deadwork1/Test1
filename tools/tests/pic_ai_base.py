# Let the computer build for N minutes (your side does nothing and can't lose), then picture its base with everything in view
# and list where its walls and gates ended up relative to its buildings.
# Usage: python3 tests/pic_ai_base.py <game folder> <port> <map> <random size> <map number> <minutes> <out.png> [difficulty]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m, rs, seed, mins, out = sys.argv[3], sys.argv[4], sys.argv[5], float(sys.argv[6]), sys.argv[7]; df = sys.argv[8] if len(sys.argv) > 8 else 'hard'; rule_off = len(sys.argv) > 9 and sys.argv[9] == 'off'   # 'off': build anywhere, as before v5.73 (to compare)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 700})
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html')
    pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}'); localStorage.setItem('mini-rts-rsize','{rs}'); localStorage.setItem('mini-rts-seed','{seed}'); localStorage.setItem('mini-rts-difficulty','{df}'); localStorage.removeItem('mini-rts-sandbox')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    r = json.loads(pg.evaluate(f"""(()=>{{ const realIW=insideWalls; {'insideWalls=()=>true;' if rule_off else ''} for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); const h0=hqOf(0); h0.hp=h0.maxHp=1e9;
      for(let i=0;i<20*60*{mins};i++){{ update(0.05); if(game.over) break; }}
      insideWalls=realIW; const hq=hqOf(1), mine=game.ents.filter(e=>e.team===1&&isBuilding(e)&&e.hp>0);
      const walls=mine.filter(e=>isWallType(e.type)), blds=mine.filter(e=>!isWallType(e.type));
      // a wall piece is "inside" if it has the computer's own buildings on both sides of it, further from the HQ than it is
      const gates=walls.filter(e=>e.type==='gate').map(g=>{{ const d=Math.hypot(g.x-hq.x,g.y-hq.y); const beyond=blds.filter(b=>Math.hypot(b.x-hq.x,b.y-hq.y)>d+60 && Math.hypot(b.x-g.x,b.y-g.y)<500).map(b=>b.type); return {{x:Math.round(g.x),y:Math.round(g.y),d:Math.round(d),beyond}}; }});
      window.HQ1={{x:hq.x,y:hq.y}}; const core=blds.filter(b=>!isTurretType(b.type)&&b.type!=='derrick'&&b.type!=='house'&&!b.ruin); let gaps=[]; for(let i=0;i<core.length;i++) for(let j=i+1;j<core.length;j++){{ const a=core[i],c=core[j]; const g=Math.max(Math.abs(a.x-c.x)-(a.size+c.size)/2, Math.abs(a.y-c.y)-(a.size+c.size)/2); if(g<150) gaps.push(Math.round(g)); }} gaps.sort((p,q)=>p-q);
      return JSON.stringify({{t:Math.round(game.time), tightGaps:gaps.filter(g=>g<60).length, smallestGaps:gaps.slice(0,6), over:game.over||null, walls:walls.length, gates, buildings:blds.map(b=>b.type+'@'+Math.round(Math.hypot(b.x-hq.x,b.y-hq.y))), insideTiles:aiInside()?aiInside().size:0, outside:(typeof insideWalls==='function'&&game.ai.wallPlans)?blds.filter(b=>!b.ruin&&b.type!=='derrick'&&!isTurretType(b.type)&&!insideWalls(b.x,b.y,STATS[b.type].size)).map(b=>b.type+'@'+Math.round(Math.hypot(b.x-hq.x,b.y-hq.y))):'n/a'}}); }})()"""))
    print(json.dumps(r))
    pg.evaluate("""(()=>{ for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=HQ1.x-300; cam.y=HQ1.y+250; setZoom(0.75); clampCam(); for(let i=0;i<2;i++){ for(const f of fog){f.exp.fill(1);f.vis.fill(1);} update(0.05); } game.paused=true; })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=out)
    b.close()
