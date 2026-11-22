# Pictures of the turrets (v5.64) in the real game: all four in action, the SAM Site hidden and up, and placing one with an Engineer
# (the red rings are where you can't build: within 300 of an enemy building).
# Usage: python3 tests/pic_turrets.py <game folder> <port> <out prefix>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
out = sys.argv[3]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1100, 'height': 640}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    # 1) the four turrets in a row, fighting a mixed attack (infantry, tanks, a helicopter)
    pg.evaluate("""(()=>{ runAI=()=>{}; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); window.hq=hq;
      // an open patch near the base (searched in the same order every time): room for four turrets in a row and a line of enemies above them
      let sp; const dxs=[]; for (let d=0; d<=700; d+=40) dxs.push(d, -d);
      for (let dy=250; dy<1300 && !sp; dy+=40) for (const dx of dxs) { if (sp) break; const x=hq.x+dx, y=hq.y-dy; if (x < 200 || x > W - 600) continue;
        let ok=true; for (let i=0;i<4;i++) if (!siteIsFree(x+i*90,y,60) || elevAt(x+i*90,y)) ok=false;
        for (let i=0;i<5;i++) for (const dy of [60, 115, 170]) if (!siteIsFree(x+i*80,y-dy,30) || elevAt(x+i*80,y-dy)) ok=false;   // open ground all the way up to the enemies
        for (let i=0;i<4;i++) if (!siteIsFree(x+440+i*60,y-60+i*50,50)) ok=false;   // room east for the enemy buildings in the last picture
        if (ok) sp={x,y}; }
      window.sp=sp; const kinds=['mg','cannon','missile','laser'];
      kinds.forEach((k,i)=>{ const t=spawn(k,0,sp.x+i*90,sp.y); t.built=true; t.progress=1; t.hp=t.maxHp=1e9; t.cooldown=i*0.6; });
      const foes=[['soldier',0],['soldier',40],['light',120],['heavy',200],['soldier',260],['rocket',300]];
      for (const [f,dx] of foes) { const u=spawn(f,1,sp.x-30+dx,sp.y-165); u.passive=true; u.hp=u.maxHp=1e9; }
      const h=spawn('heli',1,sp.x+330,sp.y-120); h.ammo=0; h.hp=h.maxHp=1e9;
      for (let i=0;i<4;i++) { const s=spawn('soldier',0,sp.x-60+i*25,sp.y+80); s.passive=true; }
      for (let k=0;k<100;k++){ for (const u of game.ents) if (u.team===1 && !isBuilding(u)) { u.order=null; } update(0.05); }
      // a moment where most are firing: run on until the laser has just fired
      const T=k=>game.ents.find(e=>e.type===k&&e.team===0), L=T('laser'); L.cooldown=1.2; T('cannon').cooldown=1.2; T('missile').cooldown=0.9; T('mg').cooldown=1.16;   // all fire together, the missiles a moment earlier
      let k=0; while(k<200 && !(game.effects.some(f=>f.kind==='beam'&&f.t<0.05))) { for (const u of game.ents) if (u.team===1 && !isBuilding(u)) u.order=null; update(0.02); k++; }
      game.paused=true; cam.zoom=2.1; cam.x=sp.x+140; cam.y=sp.y-60; game.selected=new Set(); })()""")
    pg.wait_for_timeout(500); pg.screenshot(path=out + '_action.png')
    # 2) SAM Site hidden, then up and firing at a helicopter
    pg.evaluate("""(()=>{ game.paused=false; for (const e of game.ents) if ((e.team===1 && e.type!=='settler') || isTurretType(e.type)) e.hp=0; update(0.05);
      const s=spawn('sam',0,sp.x+60,sp.y); s.built=true; s.progress=1; s.hp=s.maxHp; window.sam=s; bldDirty=true; for(let k=0;k<20;k++) update(0.05);
      game.paused=true; cam.zoom=2.6; cam.x=s.x+60; cam.y=s.y-40; })()""")
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_sam_hidden.png')
    print('sam', pg.evaluate("""(()=>{ game.paused=false; const h=spawn('heli',1,sam.x+190,sam.y); h.ammo=0; h.hp=h.maxHp=1e9; window.hh=h;
      let k=0; while(k<200 && !(sam.fired!==undefined && game.time-sam.fired<0.1)) { h.x=sam.x+190; h.y=sam.y; h.order=null; update(0.05); k++; }
      game.paused=true; return JSON.stringify({up:sam.up, fired:sam.fired, k, vis:visibleAt(hh.x,hh.y,0), over:game.over}); })()"""))
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_sam_up.png')
    # 3) placing a turret with an Engineer near an enemy base: the red no-build rings
    pg.evaluate("""(()=>{ game.paused=false; sam.hp=0; hh.hp=0; update(0.05);
      game.credits[0]=5000; for (const [t,dx,dy] of [['barracks',-200,40],['refinery',200,-150],['factory',200,60]]) { const b=spawn(t,0,hq.x+dx,hq.y+dy); b.built=true; b.progress=1; }
      const e1=spawn('barracks',1,sp.x+560,sp.y-60); e1.built=true; e1.progress=1; const e2=spawn('power',1,sp.x+600,sp.y+110); e2.built=true; e2.progress=1; bldDirty=true;
      const en=spawn('engineer',0,sp.x-60,sp.y+40); for (let i=0;i<3;i++) { const so=spawn('soldier',0,sp.x+400+i*25,sp.y-20+i*50); so.passive=true; }   // scouts, so the enemy buildings have been seen
      for(let k=0;k<20;k++) update(0.05);
      game.selected=new Set([en.id]); startTurretPlacing('cannon'); window.e1=e1; game.placing.ghost={x:e1.x-e1.size/2-400,y:e1.y};
      game.paused=true; cam.zoom=0.95; cam.x=sp.x+300; cam.y=sp.y; })()""")
    pg.wait_for_timeout(500); pg.screenshot(path=out + '_placing_ok.png')
    pg.evaluate("(()=>{ game.placing.ghost={x:e1.x-e1.size/2-200,y:e1.y}; game.paused=false; })()"); pg.wait_for_timeout(150); pg.evaluate("game.paused=true")
    pg.wait_for_timeout(400); pg.screenshot(path=out + '_placing_too_close.png')
    print('errors', errs[:3])
    b.close()
srv.shutdown()
