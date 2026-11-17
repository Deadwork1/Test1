import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8867), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8867/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{runAI=()=>{}; game.credits[0]=5000; const out={};
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      out.placedRef = placeBuilding(0,'refinery',hq.x+150,hq.y-120);
      out.placedBk = placeBuilding(0,'barracks',hq.x+20,hq.y-170);
      for(let i=0;i<20*13;i++) update(0.05);
      const ref=game.ents.find(e=>e.type==='refinery'&&e.team===0);
      produce(ref); produce(ref);
      for(let i=0;i<20*14;i++) update(0.05);
      const exs=game.ents.filter(e=>e.type==='extractor'&&e.team===0);
      out.extractors=exs.length; out.spawnedBelow = exs.every(x=>x.y>ref.y);
      const node=findOre(ref.x,ref.y,Infinity,0,true);
      exs.forEach(x=>startHarvest(x,node));
      let maxOnPad=0, phases=new Set(), unloadYs=[], c0=game.credits[0];
      for(let i=0;i<20*120;i++){ update(0.05);
        const onPad=exs.filter(x=>x.hp>0&&x.docked).length; maxOnPad=Math.max(maxOnPad,onPad);
        exs.forEach(x=>{ if(x.order&&x.order.type==='harvest'){phases.add(x.order.phase); if(x.order.phase==='unloading') unloadYs.push(Math.round(x.y-ref.y));} });
      }
      out.maxDockedAtOnce=maxOnPad; out.phasesSeen=[...phases]; out.unloadOffsetFromCentre=[...new Set(unloadYs)];
      out.earned=Math.round(game.credits[0]-c0);
      out.state=exs.map(x=>({hp:x.hp, ph:x.order&&x.order.phase, wait:x.order&&x.order.waiting, cargo:Math.round(x.cargo), dOut:Math.round(Math.hypot(x.x-dockOf(ref).out.x,x.y-dockOf(ref).out.y)), nodeD:Math.round(Math.hypot(node.x-ref.x,node.y-ref.y))}));
      out.dockedBy=ref.dockedBy;
      out.badSite_doorIntoRock = canPlace(0,'barracks',140,860);
      return out;})()""")
    print(json.dumps(r))
    pg.evaluate("""(()=>{const ref=game.ents.find(e=>e.type==='refinery'); game.selected=new Set([ref.id]); cam.x=ref.x-40; cam.y=ref.y+10; setZoom(2); clampCam();})()""")
    # catch a moment with someone docking
    for i in range(40):
        st = pg.evaluate("(()=>{for(let i=0;i<4;i++)update(0.05); return game.ents.some(e=>e.docked&&e.order&&e.order.phase==='docking')})()")
        if st: break
    pg.wait_for_timeout(150); pg.screenshot(path='out/dock.png')
    print(errs); b.close()
srv.shutdown()
