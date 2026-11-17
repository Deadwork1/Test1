import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 400, 'height': 300}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ const R={}; endGame=()=>{}; window.update.__x=1;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
      for(let i=0;i<20*480;i++) update(0.05);   // let the AI build up for 8 minutes
      R.gates=game.ents.filter(e=>e.team===1&&e.type==='gate').length; R.entrances=findEntrances(1).length; R.towers=game.ents.filter(e=>e.team===1&&e.type==='tower').length;
      R.walls=game.ents.filter(e=>e.team===1&&e.type==='wall').length;
      const b=game.ents.find(e=>e.team===1&&e.type==='refinery'&&e.built) || game.ents.find(e=>e.team===1&&e.type==='barracks');
      captureBuilding(b,0); R.stole=b.type;
      let t=0; R.log=[]; R.tr=[]; const prev=new Map(); while(b.team===0 && byId(b.id) && t<20*120){update(0.05);t++; for(const e of game.ents.filter(e=>e.team===1&&e.type==='engineer')){ if(prev.get(e.id)===true && e.retake!==true && R.tr.length<5) R.tr.push({t:t/20, lost:game.lost[1].slice(), bteam:b.team, built:b.built, hp:b.hp, cc:canCapture(b), exists:!!byId(b.id), order:e.order&&e.order.type}); prev.set(e.id, e.retake);} if(t%100===0) R.log.push([t/20, game.lost[1].length, !!game.ai.retakePending, game.ents.filter(e=>e.team===1&&e.type==='engineer').map(e=>(e.retake?'R':'')+(e.order?e.order.type:'idle')+'@'+Math.round(Math.hypot(e.x-b.x,e.y-b.y))).join(','), game.ents.filter(e=>e.team===1&&e.type==='engineer').map(e=>e.id+':'+Math.round(e.hp)).join(','), canCapture(b), Math.round(game.credits[1]), game.ents.filter(e=>e.team===1&&e.type==='barracks').map(x=>x.built+':'+x.queue+':'+x.qTypes.join('+')).join('/'), game.ents.filter(e=>e.team===1&&isCombat(e)).length]);}
      R.retaken=b.team===1 && !!byId(b.id); R.destroyed=!byId(b.id); R.secs=t/20; game.ai.timer=0; runAI(0.05); R.after=game.ents.filter(e=>e.team===1&&e.type==='engineer').map(e=>({retake:e.retake, order:e.order&&e.order.type})); R.rt=game.lost[1].map(byId).filter(x => x && x.team === 0 && canCapture(x)).length; R.D=diff().engineers; R.dbg={lost:game.lost[1], bid:b.id, team:b.team, engs:game.ents.filter(e=>e.team===1&&e.type==='engineer').map(e=>({raid:!!e.raid, retake:e.retake, order:e.order}))};
      // alarm: a far-away idle blue unit should respond to an intruder in blue's base
      return R;})()"""), indent=1), errs[:3])
    b.close()
srv.shutdown()
