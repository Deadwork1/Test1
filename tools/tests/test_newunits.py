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
    pg.tap('#produceBtns button[data-unit="grenadier"]'); pg.tap('#produceBtns button[data-unit="engineer"]')
    made = pg.evaluate("(()=>{ for(let i=0;i<20*12;i++) update(0.05); return game.ents.filter(e=>e.team===0&&isUnit(e)&&e.type!=='settler').map(e=>e.type); })()")
    print('barracks buttons:', labels, '| made:', made)
    r = pg.evaluate("""(()=>{ const out={};
      // grenadier vs a tight group of 5 soldiers (that never fight back)
      const gx=1300, gy=1800; const g=spawn('grenadier',0,gx,gy);
      const group=[]; for(let i=0;i<5;i++){const f=spawn('soldier',1,gx+90+(i%3)*12,gy-10+Math.floor(i/3)*14); f.passive=true; f.cooldown=1e9; group.push(f);}
      g.order={type:'attack',target:group[0].id};
      for(let i=0;i<20*3.5;i++) update(0.05);
      out.grenadierVsGroup_after3_5s = group.map(f=>Math.max(0,Math.round(f.hp)));
      for(const f of group) f.hp=0; update(0.05);
      // a fast buggy driving past mostly dodges grenades
      const bg=spawn('buggy',1,gx+100,gy-150); bg.passive=true; bg.cooldown=1e9; bg.order={type:'move',x:gx+100,y:gy+300};
      g.order={type:'attack',target:bg.id}; for(let i=0;i<20*3;i++) update(0.05);
      out.buggyHpAfterDrivingPast = Math.round(bg.hp)+'/'+bg.maxHp; bg.hp=0; update(0.05);
      // engineer repairs a damaged barracks
      const bk=game.ents.find(e=>e.type==='barracks'&&e.team===0); bk.hp=200;
      const en=game.ents.find(e=>e.type==='engineer'&&e.team===0); en.order={type:'repair',target:bk.id};
      let t=0; while(bk.hp<bk.maxHp && t<20*30){update(0.05);t++;} out.repaired200to500_secs=(t/20).toFixed(1);
      // engineer captures an enemy refinery at full health
      const er=spawn('refinery',1,en.x+250,en.y); er.built=true; er.hp=er.maxHp; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1;
      en.order={type:'capture',target:er.id}; t=0; while(er.team===1 && t<20*20){update(0.05);t++;}
      out.capturedFullHealthRefinery = er.team===0; out.engineerGone = !game.ents.includes(en);
      // fragile: an engineer under rifle fire
      const en2=spawn('engineer',0,gx-300,gy); const sh=spawn('soldier',1,gx-230,gy); sh.order={type:'attack',target:en2.id};
      t=0; while(en2.hp>0 && t<200){update(0.05);t++;} out.engineerDiesToRifleIn_s=(t/20).toFixed(1);
      return out;})()""")
    print(json.dumps(r))
    # close-up of the three infantry types
    pg.evaluate("""(()=>{ for(const e of game.ents) if(isUnit(e)) e.hp=0; update(0.05);
      const x=900,y=1700; const s1=spawn('soldier',0,x,y); s1.facing=-0.3; const g1=spawn('grenadier',0,x+40,y); g1.facing=-0.3; const e1=spawn('engineer',0,x+80,y); e1.facing=-0.3;
      const s2=spawn('soldier',1,x,y+45); s2.facing=2.6; const g2=spawn('grenadier',1,x+40,y+45); g2.facing=2.6; g2.throwT=1; const e2=spawn('engineer',1,x+80,y+45); e2.facing=2.6;
      for(const u of [s1,g1,e1,s2,g2,e2]) u.passive=true;
      for(let i=0;i<fog[0].exp.length;i++){fog[0].exp[i]=1;} fog[0].vis.fill(1); const d=fogImg.data; for(let i=3;i<d.length;i+=4)d[i]=0; fogCtx.putImageData(fogImg,0,0); updateFog=()=>{}; hiddenFrom=()=>false; cam.x=x+40; cam.y=y+22; setZoom(3); clampCam(); game.paused=true; MM.hidden=true; game.selected=new Set();
      document.getElementById('panel').style.display='none'; document.getElementById('top').style.display='none'; })()""")
    pg.wait_for_timeout(300); pg.screenshot(path='out/infantry.png')
    print(errs[:3]); b.close()
srv.shutdown()
