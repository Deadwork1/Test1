# Visible damage pictures: buildings and vehicles side by side at full health, damaged (half) and critical (a fifth).
# Usage: python3 tests/pic_damage.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="#top, #panel, #money, #sellBox, #mm { display:none !important }")
    print(pg.evaluate("""(()=>{ runAI=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); window.updateFog=()=>{ fogCtx.clearRect(0,0,COLS,ROWS); }; updateFog();
      MM.hidden=true;
      // a big patch of open flat grass, clear of everything
      let c=null; for (let y=300;y<H-300&&!c;y+=25) for (let x=300;x<W-300&&!c;x+=25){ let ok=true; for(let k=-13;k<=13&&ok;k++) for(let j=-9;j<=9;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS||elevAt(x+k*25,y+j*25)){ok=false;break;} if(ok && !game.ore.some(o=>Math.hypot(o.x-x,o.y-y)<350) && !game.ents.some(e=>Math.hypot(e.x-x,e.y-y)<350)) c={x,y}; }
      window.__c=c;
      const put=(t,team,x,y,k)=>{ const b=spawn(t,team,x,y); if(b.built!==undefined){b.built=true; b.progress=1;} b.hp=b.maxHp*k; b.passive=true; b.order=null; return b; };
      const ks=[1,0.5,0.2];
      window.__b=[]; ['barracks','factory','refinery','power'].forEach((t,i)=>ks.forEach((k,j)=>__b.push(put(t,0,c.x-330+i*220,c.y-180+j*170,k))));
      window.__v=[]; ['light','heavy','buggy','artillery','extractor','heli'].forEach((t,i)=>ks.forEach((k,j)=>{ const u=put(t,i%2,c.x-250+i*100,c.y-60+j*80,k); u.facing=-0.35; if(t==='heli'){u.alt=1; u.landed=false;} __v.push(u); }));
      game.selected=new Set(); game.paused=true; return JSON.stringify(c); })()"""))
    def shot(name, ents, zoom):
        pg.evaluate(f"""(()=>{{ const es={ents}; const xs=es.map(e=>e.x), ys=es.map(e=>e.y); cam.zoom={zoom}; cam.x=(Math.min(...xs)+Math.max(...xs))/2; cam.y=(Math.min(...ys)+Math.max(...ys))/2; game.ents=game.ents.filter(e=>es.includes(e)||!(__b.includes(e)||__v.includes(e))); }})()""")
        pg.wait_for_timeout(700); pg.screenshot(path=f'{out}_{name}.png')
    # buildings only
    keep = pg.evaluate("(()=>{ window.__all=game.ents.slice(); return 1; })()")
    pg.evaluate("(()=>{ game.ents=__all.filter(e=>!__v.includes(e)); })()")
    pg.evaluate("(()=>{ const xs=__b.map(e=>e.x), ys=__b.map(e=>e.y); cam.zoom=1.35; cam.x=(Math.min(...xs)+Math.max(...xs))/2; cam.y=(Math.min(...ys)+Math.max(...ys))/2; })()")
    pg.wait_for_timeout(700); pg.screenshot(path=f'{out}_buildings.png')
    pg.evaluate("(()=>{ game.ents=__all.filter(e=>!__b.includes(e)); const xs=__v.map(e=>e.x), ys=__v.map(e=>e.y); cam.zoom=1.85; cam.x=(Math.min(...xs)+Math.max(...xs))/2; cam.y=(Math.min(...ys)+Math.max(...ys))/2-8; })()")
    pg.wait_for_timeout(700); pg.screenshot(path=f'{out}_vehicles.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
