import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
      for (const vertical of [false, true]) for (const type of ['soldier','buggy','light','heavy']) {
        newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; spawn('hq',1,W-200,H-200).built=true;
        // find open grass for a 12-tile wall
        let ox=0, oy=0; outer: for (let y=300; y<H-300; y+=50) for (let x=300; x<W-300; x+=50) { let ok=true; for(let k=-8;k<=8&&ok;k++) for(let j=-4;j<=4;j++) if(terrainAt(x+(vertical?j:k)*25,y+(vertical?k:j)*25)!==T.GRASS){ok=false;break;} if(ok){ox=Math.floor(x/25)*25; oy=Math.floor(y/25)*25; break outer;} }
        const g = vertical ? spawn('gate',0,ox+12.5,oy) : spawn('gate',0,ox,oy+12.5); g.vertical=vertical; g.built=true; g.progress=1;
        for (let k=-6;k<=5;k++) { if (k===-1||k===0) continue; const w = vertical ? spawn('wall',0,ox+12.5,oy+k*25+12.5) : spawn('wall',0,ox+k*25+12.5,oy+12.5); w.built=true; w.progress=1; }
        bldDirty=true;
        const u = vertical ? spawn(type,0,ox-110,oy) : spawn(type,0,ox,oy+110); u.passive=true;
        const goal = vertical ? {x:ox+130,y:oy} : {x:ox,y:oy-130}; u.order={type:'move',...goal};
        let t=0; while(t<20*20 && u.order){ U(0.05); t++; }
        out[(vertical?'vertical':'horizontal')+' gate, '+type]= (Math.hypot(u.x-goal.x,u.y-goal.y)<40 ? 'through in '+(t/20).toFixed(1)+'s' : 'STUCK at '+Math.round(u.x-ox)+','+Math.round(u.y-oy));
      } return out; })()"""), indent=1), errs[:2])
    b.close()
srv.shutdown()
