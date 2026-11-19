# Helicopter pictures: the Helipad with a helicopter docked on it, a helicopter in the air firing at a tank, and a SAM site.
# Usage: python3 tests/pic_heli.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel, #money, #sellBox { display:none !important }")
    pg.evaluate("""(()=>{ runAI=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); fog[1].vis.fill(1); fog[1].exp.fill(1); window.updateFog=()=>{ fogCtx.clearRect(0,0,COLS,ROWS); }; updateFog();
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const put=(t,team,x,y)=>{ const b=spawn(t,team,x,y); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      put('factory', hq.x+180, hq.y-40);
      const pad=put('helipad',0,hq.x+170,hq.y+110); const h=releaseUnit(pad,'heli');
      const pad2=put('helipad',0,hq.x+260,hq.y+110); const h2=releaseUnit(pad2,'heli'); h2.landed=false; h2.alt=1; h2.order=null; h2.x=pad2.x+80; h2.y=pad2.y-30; h2.facing=0.3; h2.ammo=4;
      window.__p={pad, h, h2, hq}; game.selected=new Set(); })()""")
    # close-up: docked and flying
    pg.evaluate("(()=>{ game.paused=true; cam.zoom=3.0; cam.x=__p.pad.x+60; cam.y=__p.pad.y; })()")
    pg.wait_for_timeout(500); pg.screenshot(path=out + '_pad.png', clip={'x': 150, 'y': 100, 'width': 600, 'height': 360})
    # in action: a helicopter firing at a tank on open grass, an enemy SAM site firing back at it
    print(pg.evaluate("""(()=>{ const {hq,h2}=__p; game.paused=false;
      const put=(t,team,x,y)=>{ const b=spawn(t,team,x,y); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      let c=null; for (let y=400;y<H-400&&!c;y+=25) for (let x=400;x<W-400&&!c;x+=25){ let ok=true; for(let k=-8;k<=8&&ok;k++) for(let j=-5;j<=5;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS||elevAt(x+k*25,y+j*25)){ok=false;break;} if(ok && !game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<200) && !game.ents.some(e=>isBuilding(e)&&Math.hypot(e.x-x,e.y-y)<300)) c={x,y}; }
      const cx=c.x, cy=c.y;
      const tank=spawn('light',1,cx+40,cy); tank.passive=true; tank.order={type:'move',x:tank.x,y:tank.y};
      const sam=put('sam',1,cx+110,cy-50); sam.hp=sam.maxHp;
      h2.x=cx-150; h2.y=cy+30; h2.alt=1; h2.order={type:'attack',target:tank.id}; h2.ammo=6; h2.hp=h2.maxHp;
      let k=0; while(k<300){ h2.hp=h2.maxHp; update(0.05); k++; if(game.rockets.some(r=>r.srcType==='heli') && game.rockets.some(r=>r.srcType==='sam') && h2.ammo<=4) break; }   // (kept alive for the picture)
      game.paused=true; cam.zoom=2.4; cam.x=cx; cam.y=cy-10; window.__sam=sam; return JSON.stringify({k, h:[h2.x|0,h2.y|0,h2.ammo,h2.hp,h2.order], c, samT:sam.target, alive:game.ents.includes(h2), rk:game.rockets.map(r=>r.srcType)}); })()"""))
    pg.wait_for_timeout(500); pg.screenshot(path=out + '_action.png', clip={'x': 100, 'y': 70, 'width': 700, 'height': 420})
    pg.evaluate("(()=>{ cam.zoom=4; cam.x=__sam.x; cam.y=__sam.y; game.selected=new Set([__sam.id]); })()")
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_sam.png', clip={'x': 250, 'y': 130, 'width': 400, 'height': 300})
    print('errors', errs[:3])
    b.close()
srv.shutdown()
