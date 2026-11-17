import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8869), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8869/index.html'); pg.wait_for_timeout(300); pg.click('#ovBtn')
    print(json.dumps(pg.evaluate("""(()=>{ runAI=()=>{}; const out={};
      // a fast enemy buggy flees east across open ground; our soldier is ordered to attack it
      const me=spawn('soldier',0,500,1000), foe=spawn('buggy',1,640,1000); foe.hp=1e9; foe.passive=true;
      for(let i=0;i<3;i++) update(0.05);
      me.order={type:'attack',target:foe.id};
      foe.order={type:'move',x:1100,y:1000};
      let lostAt=null;
      for(let i=0;i<20*30;i++){ update(0.05);
        if(lostAt===null && !(me.order&&me.order.type==='attack')) lostAt={t:(i/20).toFixed(1), meX:Math.round(me.x), foeX:Math.round(foe.x)}; }
      out.gaveUpChase=lostAt; out.soldierEndedAt=Math.round(me.x); out.buggyEndedAt=Math.round(foe.x); out.soldierOrderNow=me.order&&me.order.type;
      // buildings: attacking a discovered (fogged) building still works
      const bld=spawn('barracks',1,900,700); bld.built=true; for(let i=0;i<fog[0].exp.length;i++) fog[0].exp[i]=1;
      me.order={type:'attack',target:bld.id}; for(let i=0;i<20*20;i++) update(0.05);
      out.buildingAttackStillGoing = me.order&&me.order.type==='attack'; out.buildingHp=Math.round(bld.hp)+'/'+bld.maxHp;
      return out;})()""")), errs)
    b.close()
srv.shutdown()
