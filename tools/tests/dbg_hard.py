import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8861), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8861/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')"); pg.reload(); pg.wait_for_timeout(2500)
    for run in range(3):
        print(json.dumps(pg.evaluate("""(()=>{ difficulty='hard'; newGame(); game.paused=false; document.getElementById('overlay').style.display='none';
          deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const out=[];
          for(let i=1;i<=20*150;i++){ update(0.05); if(i%(20*30)===0){ const m=game.ents.filter(e=>e.team===1); const bk=m.find(e=>e.type==='barracks');
            out.push([Math.round(game.time), Math.floor(game.credits[1]), m.map(e=>e.type[0]+e.type[1]).join(''), bk?{built:bk.built,prog:+bk.progress.toFixed(2),q:bk.qTypes.join('/'),t:+bk.trainT.toFixed(1)}:null]); } }
          return out;})()""")))
    print(errs[:3]); b.close()
srv.shutdown()
