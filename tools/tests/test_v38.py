import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8800), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8800/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    pg.evaluate("runAI=()=>{}; game.credits[0]=6000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.selected=new Set([hqOf(0).id]);")
    print('factory button visible:', pg.is_visible('#btnFactory'))
    pg.evaluate("const hq=hqOf(0); placeBuilding(0,'barracks',hq.x+150,hq.y-110); for(let i=0;i<20*11;i++) update(0.05); game.selected=new Set([game.ents.find(e=>e.type==='barracks').id]);")
    pg.wait_for_timeout(100)
    print('buttons:', pg.inner_text('#btnProduce'), '|', pg.inner_text('#btnProduce2'))
    pg.tap('#btnProduce2'); pg.tap('#btnProduce'); pg.tap('#btnProduce2')
    r = pg.evaluate("""(()=>{ const b=game.ents.find(e=>e.type==='barracks'); const q=[...b.qTypes];
      for(let i=0;i<20*20;i++) update(0.05);
      const out={queued:q, made:game.ents.filter(e=>e.team===0&&isCombat(e)).map(e=>e.type)};
      const bg=game.ents.find(e=>e.type==='buggy'&&e.team===0);
      const p=findPath(430,800,430,440,isVehicle(bg),0); out.buggyRouteThroughForest = !!p && (()=>{for(let i=0;i<=20;i++){const t=i/20; let pts=[{x:430,y:800},...p]; for(let k=0;k<pts.length-1;k++){const x=pts[k].x+(pts[k+1].x-pts[k].x)*t, y=pts[k].y+(pts[k+1].y-pts[k].y)*t; if(terrainAt(x,y)===T.FOREST) return true;}} return false;})();
      bg.x=430; bg.y=560; bg.order={type:'move',x:430,y:700}; let t=0; while(bg.order&&t<20*20){update(0.05);t++;}
      out.buggyDroveIntoForest_s=(t/20).toFixed(1); out.inForestNow=terrainAt(bg.x,bg.y)===T.FOREST; out.hiddenInForest=hiddenFrom(bg,1);
      return out;})()""")
    print(json.dumps(r))
    r2 = pg.evaluate("""(()=>{ newGame(); runAI=window.runAI_orig||runAI; return 0;})()""")
    b.close()
    # AI sim in fresh page (runAI intact)
    pg = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']).new_page(viewport={'width': 844, 'height': 390})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8800/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); hqOf(0).hp=hqOf(0).maxHp=1e9; let fb=null;
      for(let i=0;i<20*360;i++){update(0.05); if(fb===null&&game.ents.some(e=>e.team===1&&e.type==='buggy')) fb=Math.round(game.time);}
      const c={}; game.ents.filter(e=>e.team===1).forEach(e=>c[e.type]=(c[e.type]||0)+1); return {difficulty, firstBuggy:fb, ai:c};})()""")))
    print(errs)
srv.shutdown()
