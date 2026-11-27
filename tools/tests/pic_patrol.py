# Picture of the computer's Buggy scouting loop (v5.66; skips the bases since v5.72) on a whole map, with the bases ringed.
# Usage: python3 tests/pic_patrol.py <game folder> <port> <map> <out.png>
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 680}, device_scale_factor=1)
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{sys.argv[3]}'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
      const h1=hqOf(1), bg=spawn('buggy',1,h1.x-200,h1.y+200); game.time=400; game.ai.patrolAt=-999;
      aiBehaviours(diff(), game.ents.filter(e=>e.team===1&&isCombat(e)), h1, {x:h1.x-200,y:h1.y+200});
      window.PTS=bg.errand.pts; window.BG={x:bg.x,y:bg.y};
      for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } cam.x=W/2; cam.y=H/2; setZoom(0); clampCam(); for(let i=0;i<3;i++){ for(const f of fog){ f.exp.fill(1); f.vis.fill(1); } update(0.05); } game.paused=true;
      const cv=document.querySelector('canvas'), c2=cv.getContext('2d');
      window.drawOver=()=>{ const s=scale(), dpr=cv.width/scr.w, P=(x,y)=>[((x-cam.x)*s+scr.w/2)*dpr, ((y-cam.y)*s+scr.h/2)*dpr];
        c2.save(); c2.setTransform(1,0,0,1,0,0);
        for(const q of [hqOf(0),hqOf(1)]){ const [x,y]=P(q.x,q.y); c2.strokeStyle='rgba(255,80,80,0.9)'; c2.setLineDash([8,6]); c2.lineWidth=3; c2.beginPath(); c2.arc(x,y,PATROL_CLEAR*s*dpr,0,7); c2.stroke(); }
        c2.setLineDash([]); c2.strokeStyle='#ffe14d'; c2.lineWidth=4; c2.beginPath(); const pts=[BG,...PTS,BG]; pts.forEach((q,i)=>{ const [x,y]=P(q.x,q.y); i?c2.lineTo(x,y):c2.moveTo(x,y); }); c2.stroke();
        PTS.forEach((q,i)=>{ const [x,y]=P(q.x,q.y); c2.fillStyle='#ffe14d'; c2.beginPath(); c2.arc(x,y,11*dpr,0,7); c2.fill(); c2.fillStyle='#000'; c2.font=(13*dpr)+'px sans-serif'; c2.textAlign='center'; c2.textBaseline='middle'; c2.fillText(i+1,x,y); });
        c2.restore(); }; const d0=draw; draw=()=>{ d0(); drawOver(); }; })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=sys.argv[4])
    b.close()
