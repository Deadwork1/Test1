import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8767), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8767/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    r = pg.evaluate("""(()=>{
      runAI = ()=>{};                       // freeze the computer
      const st=game.ents.find(e=>e.team===0&&e.type==='settler'); deploy(st);
      const hq=hqOf(0); game.credits[0]=5000;
      placeBuilding(0,'refinery',hq.x+150,hq.y-60);
      for(let i=0;i<300;i++) update(0.05);
      const ref=game.ents.find(e=>e.type==='refinery'&&e.team===0); produce(ref);
      for(let i=0;i<200;i++) update(0.05);
      const ex=game.ents.find(e=>e.type==='extractor'&&e.team===0);
      const log=[]; log.push('spawned idle: '+(ex.order===null));
      const node=findOre(ex.x,ex.y,Infinity,0,true); startHarvest(ex,node);
      // make the home field small so it runs out quickly
      for(const n of game.ore) if(Math.hypot(n.x-node.x,n.y-node.y)<300) n.amount=Math.min(n.amount,40);
      let steps=0; while(ex.order && steps<20*300){update(0.05);steps++;}
      log.push('went idle after '+Math.round(steps/20)+'s, outOfOre='+ex.outOfOre+', cargo='+ex.cargo);
      // auto-harvest with nothing explored -> should fail
      log.push('auto with nothing known: '+autoHarvest(ex));
      // reveal map near middle field, try again
      for(let i=0;i<fog.exp.length;i++) fog.exp[i]=1;
      log.push('auto after exploring: '+autoHarvest(ex)+' phase '+(ex.order&&ex.order.phase));
      return log;})()""")
    print(r, errs); b.close()
srv.shutdown()
