import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in ['classic','large']:
        pg = b.new_page(viewport={'width': 1280, 'height': 800}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
        pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
        print(m, pg.evaluate("""(()=>{ game.paused=true; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const U=update; update=()=>{}; game.paused=false; for(let i=0;i<20*30;i++) U(0.05); game.paused=true;
          const c=[...findEntrances(0).map((e,i)=>({...e,main:i===0})), ...findEntrances(1).map((e,i)=>({...e,main:i===0}))]; window.drawMinimap=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
          const fitS=Math.min(scr.w/W, scr.h/H); if(window.CLOSE){ cam.zoom=1.1; cam.x=W*0.36; cam.y=H*0.42; } else { cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=H/2; } draw();
          const s=scale(), ox=scr.w/2-cam.x*s, oy=scr.h/2-cam.y*s; ctx.setTransform(scr.dpr,0,0,scr.dpr,0,0);
          for(const ch of []){ if(!ch) continue; const X=ox+ch.x*s, Y=oy+ch.y*s; ctx.strokeStyle=ch.main?'#ff0':'#fa0'; ctx.lineWidth=ch.main?5:3;
            ctx.beginPath(); ctx.moveTo(X-(-ch.uy)*ch.gap/2*s, Y-ch.ux*ch.gap/2*s); ctx.lineTo(X+(-ch.uy)*ch.gap/2*s, Y+ch.ux*ch.gap/2*s); ctx.stroke();
            ctx.fillStyle=ch.main?'#ff0':'#fa0'; ctx.beginPath(); ctx.arc(X,Y,ch.main?9:6,0,7); ctx.fill(); } window.draw=()=>{};
          return JSON.stringify(c.map(ch=>ch&&{x:Math.round(ch.x),y:Math.round(ch.y),gap:ch.gap})); })()"""), errs[:2])
        pg.locator('#c').screenshot(path=f'terrain_{m}.jpg', type='jpeg', quality=90); pg.close()
    b.close()
srv.shutdown()
