import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in ['classic','large']:
        pg = b.new_page(); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.wait_for_timeout(800)
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html', wait_until='domcontentloaded'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, pg.evaluate("""(()=>{ const out=[];
          // for every plateau: flood-fill its raised walkable tiles; count the exits (raised walkable tile next to low walkable tile)
          const seen=new Uint8Array(elev.length);
          for(let i=0;i<elev.length;i++){ if(!elev[i]||seen[i]||!walkable(terrain[i],false)) continue;
            const q=[i]; seen[i]=1; let n=0; const exits=new Set();
            while(q.length){ const j=q.pop(); n++; const c=j%TCOLS, r=(j/TCOLS)|0;
              for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){ const cc=c+dc, rr=r+dr; if(cc<0||rr<0||cc>=TCOLS||rr>=TROWS) continue; const k=rr*TCOLS+cc;
                if(!walkable(terrain[k],false)) continue; if(elev[k]){ if(!seen[k]){seen[k]=1;q.push(k);} } else exits.add(Math.round(Math.atan2(rr-r,cc-c)*10)+':'+Math.round(cc/4)+','+Math.round(rr/4)); } }
            // group exits roughly by location
            const locs=[...exits].map(s=>s.split(':')[1]); const groups=[]; for(const l of locs){ const [x,y]=l.split(',').map(Number); if(!groups.some(g=>Math.abs(g[0]-x)<=2&&Math.abs(g[1]-y)<=2)) groups.push([x,y]); }
            if(n>20) out.push({tiles:n, exitAreas:groups.length}); }
          // high/low sight & range check
          newGame(); runAI=()=>{}; const U=update; window.update=()=>{}; game.paused=false; game.ents=[]; spawn('hq',1,W-200,H-200).built=true; spawn('hq',0,200,200).built=true;
          let hi=null; for(let i=0;i<elev.length&&!hi;i++) if(elev[i]&&terrain[i]===T.GRASS){ const c=i%TCOLS,r=(i/TCOLS)|0; let ok=true; for(let d=-1;d<=1;d++) for(let e=-1;e<=1;e++){ const k=(r+d)*TCOLS+c+e; if(!elev[k]||terrain[k]!==T.GRASS) ok=false; } if(ok) hi={x:c*TC+12.5,y:r*TC+12.5}; }
          // find low ground ~110px south of the plateau edge
          let lo=null; for(let d=150; d<300 && !lo; d+=10) for(let a=0;a<6.28&&!lo;a+=0.2){ const x=hi.x+Math.cos(a)*d, y=hi.y+Math.sin(a)*d; if(!elevAt(x,y) && terrainAt(x,y)===T.GRASS) lo={x,y}; }
          const top=spawn('rocket',0,hi.x,hi.y); top.passive=true; const bot=spawn('rocket',1,lo.x,lo.y); bot.passive=true;
          for(let i=0;i<3;i++) U(0.05);
          out.push({dist:Math.round(Math.hypot(top.x-bot.x,top.y-bot.y)), highSeesLow:visibleAt(bot.x,bot.y,0), lowSeesHigh:visibleAt(top.x,top.y,1), highRange:rangeOf(top), lowRange:rangeOf(bot)});
          return JSON.stringify(out); })()"""))
        pg.close()
    b.close()
srv.shutdown()
