import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8830), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8830/index.html'); pg.wait_for_timeout(300); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    toS = lambda x,y: pg.evaluate(f"(()=>{{const s=scale();return [({x}-cam.x)*s+scr.w/2, ({y}-cam.y)*s+scr.h/2]}})()")
    pg.evaluate("runAI=()=>{}; game.credits[0]=6000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); game.selected=new Set([hqOf(0).id]);")
    hq = pg.evaluate("[hqOf(0).x,hqOf(0).y]")
    # --- tower via real taps ---
    pg.tap('#btnTower'); pg.wait_for_timeout(80)
    tx,ty = hq[0]+150, hq[1]-90
    pg.touchscreen.tap(*toS(tx,ty)); pg.wait_for_timeout(80); pg.touchscreen.tap(*toS(tx,ty)); pg.wait_for_timeout(80)
    print('tower placed:', pg.evaluate("game.ents.some(e=>e.type==='tower')"))
    # --- wall via real taps: a run of walls ---
    pg.evaluate("game.selected=new Set([hqOf(0).id])"); pg.tap('#btnWall'); pg.wait_for_timeout(80)
    ax, ay = hq[0]-110, hq[1]-150
    pg.touchscreen.tap(*toS(ax,ay)); pg.wait_for_timeout(60)
    pg.touchscreen.tap(*toS(ax+200,ay)); pg.wait_for_timeout(60)
    pg.screenshot(path='out/w0.png')
    pg.touchscreen.tap(*toS(ax+200,ay)); pg.wait_for_timeout(60)
    print('walls built by taps:', pg.evaluate("game.ents.filter(e=>e.type==='wall').length"), 'info:', pg.inner_text('#info'))
    pg.tap('#btnCancel')
    # --- enclosure test (scripted): a closed square of walls with a gate, target inside ---
    r = pg.evaluate("""(()=>{ const out={};
      newGame(); runAI=()=>{}; game.paused=false; game.credits[0]=9000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
      for(let i=0;i<5;i++) update(0.05);
      const cx=10, cy=37, cx2=19, cy2=44;
      const fails=[]; let placedW=0;
      for(let c=cx;c<=cx2;c++) for(let r=cy;r<=cy2;r++){
        if(!(c===cx||c===cx2||r===cy||r===cy2)) continue;
        if(r===cy2 && (c===14||c===15)) continue;              // gap for the gate
        const x=c*TC+TC/2,y=r*TC+TC/2; if(canPlaceWallPiece(0,'wall',x,y)){spawn('wall',0,x,y);placedW++;} else fails.push([c,r,terrainAt(x,y)]);
      }
      out.wallsPlaced=placedW; out.wallFails=fails;
      rebuildBuildingGrid();
      const gp=fitGate(15*TC, 44*TC+TC/2, 0); out.gateFit=gp; out.gateOk=placeBuilding(0,'gate',gp.x,gp.y,gp.vertical);
      const gate=game.ents.find(e=>e.type==='gate'); rebuildBuildingGrid(); out.gateTiles=wallTiles(gate);
      const ix=15*TC, iy=40*TC;
      const inside=(u)=>u.x>(cx+1)*TC && u.x<cx2*TC && u.y>(cy+1)*TC && u.y<cy2*TC;
      const mine=spawn('soldier',0,15*TC,49*TC); mine.order={type:'move',x:ix,y:iy};
      for(let i=0;i<20*20 && mine.order;i++) update(0.05);
      out.ownSoldierGotInside=inside(mine);
      mine.order=null; mine.passive=true; mine.hp=1e6; mine.maxHp=1e6;
      const foes=[]; for(let i=0;i<4;i++){const f=spawn('soldier',1,15*TC+i*20-30,31*TC); f.order={type:'attackmove',x:ix,y:iy}; foes.push(f);}
      let brokeThrough=false, attackedWall=false, t=0;
      for(t=0;t<20*90;t++){ update(0.05);
        if(foes.some(f=>f.order&&f.order.type==='attack'&&byId(f.order.target)&&isWallType(byId(f.order.target).type))) attackedWall=true;
        if(foes.some(f=>f.hp>0&&inside(f))) {brokeThrough=true;break;} }
      out.enemyAttackedWall=attackedWall; out.enemyGotInsideAfter_s=brokeThrough?Math.round(t/20):null;
      out.wallsLeft=game.ents.filter(e=>e.type==='wall').length+'/'+placedW; out.gateAlive=!!byId(gate.id);
      return out;})()""")
    print(json.dumps(r))
    pg.evaluate("(()=>{const g=game.ents.find(e=>e.type==='gate')||game.ents.find(e=>e.type==='wall'); cam.x=g.x;cam.y=g.y-110;setZoom(1.1);clampCam(); game.paused=true;})()")
    pg.wait_for_timeout(200); pg.screenshot(path='out/w1.png')
    print(errs); b.close()
srv.shutdown()
