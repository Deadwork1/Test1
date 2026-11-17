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
    print(json.dumps(pg.evaluate("""(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out=[];
      for (let run=0; run<4; run++) {
        newGame(); game.paused=false; difficulty='normal'; deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));
        const h=hqOf(0); game.credits[0]=5000;
        let ref=null; for(let a=0;a<6.3&&!ref;a+=0.3) if(placeBuilding(0,'refinery',h.x+Math.cos(a)*170,h.y+Math.sin(a)*170)) ref=game.ents.find(e=>e.type==='refinery'&&e.team===0);
        for(let i=0;i<20*20;i++) U(0.05);
        game.ai.known.set(ref.id,{x:ref.x,y:ref.y}); h.hp=h.maxHp=1e6; ref.hp=ref.maxHp=1e6;
        let raider=null, track=[], result='no raid by 12 min'; const RP=aiRaidPlan; window.rlog=[]; window.aiRaidPlan=(en)=>{const r=RP(en); rlog.push({t:Math.round(game.time), r:!!r, known:[...game.ai.known.keys()].map(id=>{const b=byId(id);return b?b.type+b.team+(b.built?'':'*'):'gone'})}); return r;};
        for(let i=0;i<20*720;i++){ U(0.05); if(game.over) break;
          if(!raider){ raider=game.ents.find(e=>e.team===1&&e.type==='engineer'&&e.raid); if(raider) track.push({t:Math.round(game.time),x:Math.round(raider.x),y:Math.round(raider.y)}); }
          else { if(i%200===0) track.push({t:Math.round(game.time),x:Math.round(raider.x),y:Math.round(raider.y),step:raider.raid&&raider.raid.step});
            if(raider.hp<=0){ const cap=game.ents.filter(e=>isBuilding(e)&&e.team===1&&e.id===ref.id).length; result=cap?'captured refinery at '+Math.round(game.time)+'s':'raider died at '+Math.round(game.time)+'s'; break; } }
        }
        out.push({rlog:window.rlog, dbg:{lastRaid:game.ai.lastRaid,pending:game.ai.raidPending,known:game.ai.known.size,eng:game.ents.filter(e=>e.team===1&&e.type==='engineer').map(e=>[!!e.raid,e.order&&e.order.type])},result, engineersBuilt: game.ents.filter(e=>e.team===1&&e.type==='engineer').length, playerHQ:[Math.round(h.x),Math.round(h.y)], aiHQ: (()=>{const a=hqOf(1);return a?[Math.round(a.x),Math.round(a.y)]:null})(), track: track.filter((_,k)=>k%3===0).slice(0,12)});
      } return out; })()"""), indent=None)); print(errs[:3])
    b.close()
srv.shutdown()
