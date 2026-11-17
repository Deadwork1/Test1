import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
root, port, mapc = sys.argv[1], int(sys.argv[2]), sys.argv[3]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=root))
threading.Thread(target=srv.serve_forever, daemon=True).start()
bot = open('sim/bot_rec.js').read()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 700}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{mapc}'); localStorage.setItem('mini-rts-difficulty','normal')")
    pg.goto(f'http://127.0.0.1:{port}/index.html'); pg.wait_for_timeout(3000); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    pg.evaluate(bot); pg.evaluate("window.TESTUNIT='light'"); pg.evaluate("runSim('infantry', 20)")
    print(pg.evaluate("""(()=>{ for(let i=0;i<20*600 && !game.over;i++) simTick(); const ch=findChoke(0), pl=ch&&planGapWall(ch); const miss=pl?pl.tiles.filter(t=>!game.ents.some(w=>w.type==='wall'&&w.team===0&&Math.abs(w.x-t.x)<1&&Math.abs(w.y-t.y)<1)).map(t=>({x:t.x,y:t.y,area:inBuildArea(0,t.x,t.y,WALL_REACH),can:canPlaceWallPiece(0,'wall',t.x,t.y)})):null;
      let gateTest=null; if (ch) { const h=hqOf(0); const wallsBefore=game.ents.filter(w=>w.team===0&&isWallType(w.type)).length;
        const sd=spawn(window.TESTUNIT||'soldier',0,h.x+30,h.y-50); sd.passive=true; const out={x:ch.x+ch.ux*160, y:ch.y+ch.uy*160}; sd.order={type:'move',...out}; let t=0, viaGate=false;
        const gate=game.ents.find(g=>g.team===0&&g.type==='gate');
        while(t<20*40 && sd.order && sd.hp>0){ simTick(); t++; if(gate && Math.hypot(sd.x-gate.x,sd.y-gate.y)<30) viaGate=true; }
        gateTest={pos:[Math.round(sd.x),Math.round(sd.y)], out:[Math.round(out.x),Math.round(out.y)], gate:gate?[gate.x,gate.y,gate.vertical]:null, outTerr:terrainAt(out.x,out.y), reachedOutside: !sd.order && Math.hypot(sd.x-out.x,sd.y-out.y)<40, secs:(t/20).toFixed(1), wentThroughGate: viaGate, wallsLost: wallsBefore-game.ents.filter(w=>w.team===0&&isWallType(w.type)).length}; }
      return JSON.stringify({gateTest, miss, credits:Math.round(game.credits[0]), t:Math.round(game.time), blue: game.ents.filter(e=>e.team===0&&isBuilding(e)).map(e=>e.type).join(','), red: game.ents.filter(e=>e.team===1&&isBuilding(e)).map(e=>e.type).join(',')}); })()"""), errs[:2])
    pg.evaluate("""(()=>{ window.drawMinimap=()=>{}; fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height);
      const fitS=Math.min(scr.w/W, scr.h/H); cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=H/2; _realDraw();
      const s=scale(), ox=scr.w/2-cam.x*s, oy=scr.h/2-cam.y*s; ctx.setTransform(scr.dpr,0,0,scr.dpr,0,0);
      for (const t of [0,1]) for (const ch of findEntrances(t)) { if(!ch.ax) continue; ctx.strokeStyle='rgba(255,255,0,0.8)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
        ctx.beginPath(); ctx.moveTo(ox+ch.ax*s, oy+ch.ay*s); ctx.lineTo(ox+ch.bx*s, oy+ch.by*s); ctx.stroke(); ctx.setLineDash([]);
        const pl=planGapWall(ch); if(pl){ ctx.strokeStyle='rgba(0,255,255,0.9)'; ctx.lineWidth=1; for(const t of pl.tiles) ctx.strokeRect(ox+(t.x-12.5)*s, oy+(t.y-12.5)*s, 25*s, 25*s);
          const gh=gateHalf(pl.gate.vertical); ctx.strokeStyle='#f0f'; ctx.lineWidth=2; ctx.strokeRect(ox+(pl.gate.x-gh.hx)*s, oy+(pl.gate.y-gh.hy)*s, 2*gh.hx*s, 2*gh.hy*s); } }
      return 0; })()""")
    pg.locator('#c').screenshot(path=f'base_{mapc}.jpg', type='jpeg', quality=90)
    b.close()
srv.shutdown()
