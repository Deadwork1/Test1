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
      const setup=()=>{ newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true; const d=spawn('hq',1,W-200,H-200); };
      const run=(movers, limit)=>{ let t=0, slow=0, bumps=0, frames=0;
        while(t<limit*20 && movers.some(u=>u.order)){ const prev=movers.map(u=>[u.x,u.y]); U(0.05); t++;
          movers.forEach((u,i)=>{ if(!u.order) return; frames++; const sp=Math.hypot(u.x-prev[i][0],u.y-prev[i][1])/0.05; if(sp < STATS[u.type].speed*0.5) slow++;
            for(const o of game.ents) if(o!==u && isUnit(o) && Math.hypot(o.x-u.x,o.y-u.y) < u.r+o.r-3) { bumps++; break; } }); }
        const done=movers.filter(u=>!u.order).length;
        const dist=movers.map(u=>Math.hypot(u.x-u.goal.x,u.y-u.goal.y)); return {secs:(t/20).toFixed(1), arrived:done+'/'+movers.length, slowedPct:Math.round(100*slow/frames), overlapPct:Math.round(100*bumps/frames)}; };
      // 1) two squads of 10 soldiers swap places head-on
      setup(); let A=[],B=[];
      for(let i=0;i<10;i++){ const a=spawn('soldier',0,250,250+i*14), b=spawn('soldier',0,600,250+i*14); A.push(a); B.push(b); }
      A.forEach((u,i)=>{u.goal={x:600,y:250+i*14}; u.order={type:'move',...u.goal};}); B.forEach((u,i)=>{u.goal={x:250,y:250+i*14}; u.order={type:'move',...u.goal};});
      out['two squads swap places head-on']=run(A.concat(B),40);
      // 2) a column of 8 marches straight through 12 parked soldiers
      setup(); const P=[]; for(let i=0;i<12;i++) P.push(spawn('soldier',0,420+(i%4)*20,280+Math.floor(i/4)*20));
      const C=[]; for(let i=0;i<8;i++){ const u=spawn('soldier',0,200,300+(i%2)*12-6); u.goal={x:650,y:300}; u.order={type:'move',x:650,y:300}; C.push(u); }
      out['column through a crowd of parked soldiers']=run(C,40);
      // 3) two light tanks drive through parked infantry
      setup(); for(let i=0;i<10;i++) spawn('soldier',0,420+(i%5)*22,290+Math.floor(i/5)*22);
      const T=[spawn('light',0,200,300), spawn('light',0,200,340)]; T.forEach((u,i)=>{u.goal={x:650,y:300+i*40}; u.order={type:'move',...u.goal};});
      out['two tanks through parked infantry']=run(T,40);
      // 4) 16 units all sent to one spot
      setup(); const M=[]; for(let i=0;i<16;i++){ const u=spawn(i%4?'soldier':'buggy',0,200+(i%4)*25,220+Math.floor(i/4)*25); u.goal={x:600,y:300}; u.order={type:'move',x:600,y:300}; M.push(u);} 
      out['16 units all sent to the same spot']=run(M,40);
      // 5) two groups of 8 cross a bridge in opposite directions
      setup(); let br=null; for(let y=100;y<H-100&&!br;y+=25) for(let x=100;x<W-100;x+=25) if(terrainAt(x,y)===T.BRIDGE){ br={x,y}; break; }
      if(br){ let cx=br.x, cy=br.y, n=0; while(terrainAt(cx,cy)===T.BRIDGE && n<40){ cx+=25; n++; } const bw=cx; cx=br.x; while(terrainAt(cx,cy)===T.BRIDGE){ cx-=25; } const mx=(cx+bw)/2, half=(bw-cx)/2+120;
        const G=[]; for(let i=0;i<8;i++){ const a=spawn('soldier',0,mx-half-(i%3)*20,cy+((i%4)-1.5)*14), b2=spawn('soldier',0,mx+half+(i%3)*20,cy+((i%4)-1.5)*14);
          a.goal={x:mx+half,y:cy}; a.order={type:'move',...a.goal}; b2.goal={x:mx-half,y:cy}; b2.order={type:'move',...b2.goal}; G.push(a,b2); }
        out['two groups cross a bridge in opposite directions']=run(G,60); }
      return out; })()"""), indent=1), errs[:2])
    b.close()
srv.shutdown()
