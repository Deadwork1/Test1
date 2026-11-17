import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8866), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8866/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    # try several refinery positions around the HQ, 3 extractors each, look for anyone not moving for 6s
    r = pg.evaluate("""(()=>{
      runAI=()=>{}; const results=[];
      const spots=[[150,-120],[150,60],[-120,-150],[20,-170],[160,-200],[-150,-40],[100,140]];
      for(const [dx,dy] of spots){
        newGame(); runAI=()=>{}; game.credits[0]=9000; game.paused=false;
        deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
        if(!placeBuilding(0,'refinery',hq.x+dx,hq.y+dy)){results.push({dx,dy,placed:false});continue;}
        for(let i=0;i<20*13;i++) update(0.05);
        const ref=game.ents.find(e=>e.type==='refinery'); produce(ref); produce(ref);
        for(let i=0;i<20*14;i++) update(0.05);
        const exs=game.ents.filter(e=>e.type==='extractor'&&e.team===0);
        // send them to the ore field NORTH of the base (other side of the building) as well as the home one
        exs.forEach((x,i)=>{ const n=findOre(ref.x,ref.y-400,Infinity,0,false); startHarvest(x,n);});
        for(const f of fog[0].exp.keys()) fog[0].exp[f]=1;
        let stuck=0, worst=0; const last=exs.map(x=>({x:x.x,y:x.y,t:0}));
        let c0=game.credits[0];
        for(let i=0;i<20*150;i++){ update(0.05);
          exs.forEach((x,k)=>{ const L=last[k]; const busy=x.order&&x.order.type==='harvest'&&!x.order.waiting&&x.order.phase!=='mining'&&x.order.phase!=='unloading';
            if(!busy||Math.hypot(x.x-L.x,x.y-L.y)>4){L.x=x.x;L.y=x.y;L.t=0;} else {L.t+=0.05; worst=Math.max(worst,L.t);} });
        }
        results.push({dx,dy,earned:Math.round(game.credits[0]-c0),worstNoProgressSecs:+worst.toFixed(1),
          phases:exs.map(x=>x.order&&x.order.phase)});
      }
      return results;})()""")
    for x in r: print(json.dumps(x))
    print(errs); b.close()
srv.shutdown()
