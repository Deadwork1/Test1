import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn')
    r = pg.evaluate("""(()=>{ const out={};
      const setup=()=>{ newGame(); runAI=()=>{}; game.ents=[]; bldDirty=true; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1; };
      // 1) lone engineer walks at an enemy Barracks guarded by a Guard Tower
      let wins=0; for(let r=0;r<5;r++){ setup();
        const bk=spawn('barracks',1,1500,1200); bk.built=true; bk.hp=bk.maxHp; const tw=spawn('tower',1,1500,1080); tw.built=true; tw.hp=tw.maxHp;
        const en=spawn('engineer',0,1250,1350); en.order={type:'capture',target:bk.id};
        for(let i=0;i<20*20;i++) update(0.05); if(bk.team===0) wins++; }
      out.loneEngineerVsTowerGuardedBarracks = wins+'/5 captured';
      // 2) the same, but with 6 soldiers escorting (they attack the tower first)
      wins=0; for(let r=0;r<5;r++){ setup();
        const bk=spawn('barracks',1,1500,1200); bk.built=true; bk.hp=bk.maxHp; const tw=spawn('tower',1,1500,1080); tw.built=true; tw.hp=tw.maxHp;
        const sq=[]; for(let i=0;i<6;i++){ const s=spawn('soldier',0,1250+i*12,1330); s.order={type:'attack',target:tw.id}; sq.push(s);}
        const en=spawn('engineer',0,1200,1380); en.order={type:'move',x:1220,y:1380};
        for(let i=0;i<20*90 && tw.hp>0;i++) update(0.05);
        en.order={type:'capture',target:bk.id}; for(let i=0;i<20*20;i++) update(0.05); if(bk.team===0) wins++; }
      out.escortedEngineer_afterTowerDown = wins+'/5 captured';
      // 3) capturing a refinery gives you its extractor dock + you can build extractors there
      setup(); const myhq=spawn('hq',0,900,1300); const ref=spawn('refinery',1,1300,1300); ref.built=true;
      const en=spawn('engineer',0,1100,1400); en.order={type:'capture',target:ref.id}; for(let i=0;i<20*15;i++) update(0.05);
      out.capturedRefinery={team:ref.team, canMakeExtractor: produce(ref,'extractor')};
      // 4) capturing the enemy HQ: they can no longer build
      setup(); spawn('hq',0,900,1300); const ehq=spawn('hq',1,1400,1300); spawn('barracks',1,1600,1300).built=true;
      const en2=spawn('engineer',0,1150,1400); en2.order={type:'capture',target:ehq.id}; for(let i=0;i<20*15;i++) update(0.05);
      out.capturedEnemyHQ={hqTeam:ehq.team, enemyStillHasHQ: !!hqOf(1), youHaveHQs: game.ents.filter(e=>e.team===0&&e.type==='hq').length, gameOver: game.over};
      // 5) walls and gates can't be captured
      setup(); const w=spawn('wall',1,1300,1300); const en3=spawn('engineer',0,1200,1300);
      out.canCaptureWall=canCapture(w);
      return out;})()""")
    print(json.dumps(r, indent=1))
    # 6) real taps: select engineer, tap own damaged building (repair), tap enemy building (capture)
    pg.evaluate("""(()=>{ newGame(); runAI=()=>{}; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1; game.paused=false;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.hp=300;
      window._en=spawn('engineer',0,hq.x+90,hq.y+40); window._eb=spawn('barracks',1,hq.x+330,hq.y-40); _eb.built=true;
      for(let i=0;i<5;i++) update(0.05); cam.x=hq.x+150; cam.y=hq.y; setZoom(1); clampCam(); })()""")
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    en = pg.evaluate("[_en.x,_en.y]"); hq = pg.evaluate("[hqOf(0).x,hqOf(0).y]"); eb = pg.evaluate("[_eb.x,_eb.y]")
    pg.touchscreen.tap(*toS(*en)); pg.wait_for_timeout(80)
    info1 = pg.inner_text('#info')
    pg.touchscreen.tap(*toS(*hq)); pg.wait_for_timeout(80)
    o1 = pg.evaluate("_en.order&&_en.order.type")
    pg.evaluate("for(let i=0;i<20*12;i++) update(0.05)")
    hp = pg.evaluate("hqOf(0).hp")
    pg.touchscreen.tap(*toS(*pg.evaluate("[_en.x,_en.y]"))); pg.wait_for_timeout(80)
    pg.touchscreen.tap(*toS(*eb)); pg.wait_for_timeout(80)
    o2 = pg.evaluate("_en.order&&_en.order.type")
    pg.evaluate("for(let i=0;i<20*12;i++) update(0.05)")
    print('taps → info:', info1, '| order after tapping own HQ:', o1, '| HQ hp after 12s:', round(hp), '/900 | order after tapping enemy barracks:', o2, '| captured:', pg.evaluate("_eb.team===0"))
    print(errs[:3]); b.close()
srv.shutdown()
