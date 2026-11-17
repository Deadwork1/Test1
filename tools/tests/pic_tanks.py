import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=3, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    # --- barracks buttons via real taps ---
    pg.evaluate("runAI=()=>{}; game.credits[0]=9000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); for(let d=120;d<300;d+=10){let ok=false; for(let a=0;a<6.3;a+=0.3){ if(placeBuilding(0,'barracks',hq.x+Math.cos(a)*d,hq.y+Math.sin(a)*d)){ok=true;break;} } if(ok)break;} for(let i=0;i<20*11;i++) update(0.05); game.selected=new Set([game.ents.find(e=>e.type==='barracks').id]);")
    pg.wait_for_timeout(150)
    labels = pg.evaluate("[...document.querySelectorAll('#produceBtns button')].map(b=>b.textContent)")
    pg.evaluate("0"); pg.wait_for_timeout(100)
    r = pg.evaluate("(()=>{ for(let i=0;i<20*7;i++) update(0.05); return game.ents.filter(e=>e.team===0&&e.type==='sniper').length; })()")
    print('buttons', labels, 'sniper trained via tap:', r)
    # close-up of the three infantry types
    pg.evaluate("""(()=>{ for(const e of game.ents) if(isUnit(e)) e.hp=0; update(0.05);
      const x=420,y=1300; const all=[];
      const f=spawn('factory',0,x-70,y-10); f.built=true; f.progress=1; f.hp=f.maxHp;
      const tc=spawn('tech',0,x+60,y-20); tc.built=true; tc.progress=1; tc.hp=tc.maxHp; bldDirty=true;
      const a=spawn('light',0,x+150,y-40); a.facing=0.2; a.turret=0.2;
      const b2=spawn('heavy',0,x+150,y+20); b2.facing=0.1; b2.turret=-0.25; b2.cooldown=STATS.heavy.cooldown;
      const c1=spawn('light',1,x+260,y-45); c1.facing=Math.PI-0.2; c1.turret=Math.PI-0.2;
      const c2=spawn('heavy',1,x+260,y+25); c2.facing=Math.PI; c2.turret=Math.PI+0.3;
      for(const u of [a,b2,c1,c2]){u.passive=true; u.order=null; all.push(u);} game.effects=[]; game.grenades=[]; game.rockets=[];
      for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;} fog[0].vis.fill(1); const d=fogImg.data; for(let i=3;i<d.length;i+=4)d[i]=0; fogCtx.putImageData(fogImg,0,0); updateFog=()=>{}; hiddenFrom=()=>false; cam.x=x+95; cam.y=y-5; setZoom(2.2); clampCam(); game.paused=true; MM.hidden=true; game.selected=new Set();
      document.getElementById('panel').style.display='none'; document.getElementById('top').style.display='none'; })()""")
    pg.wait_for_timeout(300); pg.screenshot(path='out/tanks.png')
    print(errs[:3]); b.close()
srv.shutdown()
