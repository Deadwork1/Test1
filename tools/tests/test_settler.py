# New Settlers (v5.65): bought at the War Factory ($3,000 since v5.67) once you have a Nuclear Reactor and a Satellite Radar ($2,000, 40 s, the dearest and slowest thing in the game), deployed anywhere as
# a second HQ with its own build area, and every extra HQ makes building and training 25% faster (up to 3x with Power Plants); you lose only when every HQ and Settler is gone; the computer buys one only to reach far ore.
# Usage: python3 tests/test_settler.py <game folder> <port>
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','huge'); localStorage.setItem('mini-rts-difficulty','hard')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
    pg.evaluate("""(()=>{ window.realAI=runAI; runAI=()=>{}; game.credits[0]=8000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05); window.hq=hqOf(0);
      window.put=(t,dx,dy,team=0)=>{ const h=team?hqOf(1)||hq:hq; const b=spawn(t,team,h.x+dx,h.y+dy); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      window.U=(n,dt=0.05)=>{ for(let i=0;i<n;i++) update(dt); }; })()""")
    r = json.loads(pg.evaluate("""(()=>{ const dearest=Object.entries(COST).sort((a,b)=>b[1]-a[1]).slice(0,2), slowest=Object.entries(TRAIN_TIME).sort((a,b)=>b[1]-a[1])[0];
      const f=put('factory',220,60); game.selected=new Set([f.id]); updateHUD();
      const visNow=()=>[...document.querySelectorAll('#produceBtns button')].filter(b=>b.style.display!=='none').map(b=>b.textContent);
      const lockedBefore=!unlocked(0,'settler') && !visNow().some(t=>/Settler/.test(t));
      const rx=put('reactor',-330,60); const lockedReactorOnly=!unlocked(0,'settler'); const sx=put('satellite',330,-40); updateHUD();   // (Settlers need a Nuclear Reactor and a Satellite Radar, v5.67)
      game.selected=new Set([hq.id]); updateHUD(); const atHq=[...document.querySelectorAll('#panel button')].some(b=>b.style.display!=='none'&&b.offsetParent&&/Settler/.test(b.textContent));
      game.selected=new Set([f.id]); updateHUD(); const vis=visNow(), boost=powerBoost(0);
      const btn=vis.find(t=>/Settler/.test(t)) || null;
      const c0=game.credits[0], made=produce(f,'settler'), paid=c0-game.credits[0]; let k=0;
      while(k<20*60 && !game.ents.some(e=>e.team===0&&e.type==='settler')){ U(1); k++; }
      const s=game.ents.find(e=>e.team===0&&e.type==='settler'&&e.hp>0); window.s=s; rx.hp=0; sx.hp=0; U(2);   // (gone again, so the speed checks below start from 1x)
      return JSON.stringify({dearest, slowest, btn, atHq, vis, lockedBefore, lockedReactorOnly, expect:+(40/boost).toFixed(1), made, paid, secs:+(k/20).toFixed(1), out:!!s}); })()"""))
    print(r)
    check(r['dearest'][0] == ['settler', 3000] and r['dearest'][1][1] < 3000, 'the Settler is the most expensive thing ($3,000)')
    check(r['slowest'] == ['settler', 40], 'and the slowest to make (40 s)')
    check(r['lockedBefore'] and r['lockedReactorOnly'], 'no Settler until you have both a Nuclear Reactor and a Satellite Radar')
    check(bool(r['btn']) and not r['atHq'], 'the War Factory shows a Settler button (not the HQ): ' + str(r['btn']))
    check(r['made'] and r['paid'] == 3000 and r['out'] and abs(r['secs'] - r['expect']) <= 1.5, 'it costs $3,000 and rolls out of the War Factory after 40 s, sped up by the Reactor\'s power (%s s)' % r['secs'])
    r = json.loads(pg.evaluate("""(()=>{ let spot=null; for(let k=0;k<400&&!spot;k++){ const x=hq.x+900+Math.random()*400, y=hq.y-500-Math.random()*400; if(siteIsFree(x,y,STATS.hq.size)) spot={x,y}; }
      s.x=spot.x; s.y=spot.y; s.order=null; const before=inBuildArea(0,spot.x+150,spot.y); game.selected=new Set([s.id]); updateHUD(); const btn=ui.deploy.style.display!=='none';
      const okd=deploy(s); U(60); const hqs=game.ents.filter(e=>e.team===0&&e.type==='hq').length, after=inBuildArea(0,spot.x+150,spot.y);
      hq.hp=0; U(5); const over=game.over||null, stillHq=game.ents.filter(e=>e.team===0&&e.type==='hq').length;
      return JSON.stringify({btn, okd, hqs, before, after, over, stillHq}); })()"""))
    print(r)
    check(r['btn'] and r['okd'] and r['hqs'] == 2, 'a bought Settler deploys into a second HQ')
    check(not r['before'] and r['after'], 'the new HQ brings its own build area')
    check(r['stillHq'] == 1 and not r['over'], 'losing the first HQ does not lose the game while the second stands')
    r = json.loads(pg.evaluate("""(()=>{ const one=()=>powerBoost(0); const h2=spawn('hq',0,hq.x-500,hq.y+1100); h2.built=true; const two=one(); const h3=spawn('hq',0,hq.x-60,hq.y+900); h3.built=true; const three=one();
      const ps=[]; for(let i=0;i<4;i++){ const p=spawn('power',0,hq.x-400+i*70,hq.y+500); p.built=true; p.progress=1; ps.push(p); } const maxed=one();
      const p5=spawn('power',0,hq.x-400,hq.y+600); p5.built=true; p5.progress=1; const still=one();
      const h4=spawn('hq',0,hq.x+400,hq.y+900); h4.built=true; const h5=spawn('hq',0,hq.x+400,hq.y+1300); h5.built=true; const capped=one();
      for(const e of [h3,h4,h5,...ps,p5]) e.hp=0; U(2); const back=one();
      return JSON.stringify({two, three, maxed, still, capped, back}); })()"""))
    print(r)
    check(r['two'] == 1.25 and r['three'] == 1.5, 'each extra HQ makes building and training 25% faster (2 HQs +25%, 3 HQs +50%)')
    check(r['maxed'] == 2.5 and r['still'] == 2.5, 'it stacks on Power Plants (which still stop at double on their own)')
    check(r['capped'] == 3, 'all together it stops at triple speed')
    check(r['back'] == 1.25, 'losing the extra HQs loses their speed-up')
    r = json.loads(pg.evaluate("""(()=>{ const time=t=>{ let sp=null; for(let k=0;k<500&&!sp;k++){ const c=hqOf(0), x=c.x-600+Math.random()*1200, y=c.y-600+Math.random()*1200; if(x>80&&y>80&&x<W-80&&y<H-80&&siteIsFree(x,y,STATS[t].size)) sp={x,y}; }
        const b=spawn(t,0,sp.x,sp.y); let k=0; while(!b.built && k<20*60){ U(1); k++; } const s=k/20; b.hp=0; U(1); return s; };
      const withTwo=time('barracks'); for(const h of game.ents.filter(e=>e.team===0&&e.type==='hq').slice(1)) h.hp=0; U(1); const withOne=time('barracks');
      return JSON.stringify({withTwo, withOne, hqs:game.ents.filter(e=>e.team===0&&e.type==='hq').length}); })()"""))
    print(r)
    check(abs(r['withOne'] / r['withTwo'] - 1.25) < 0.05, 'buildings go up 25%% faster with a second HQ too (Barracks %.1f s vs %.1f s)' % (r['withTwo'], r['withOne']))
    # the computer (Huge, Hard): its home ore spent, a rich field far off on its side
    r = json.loads(pg.evaluate("""(()=>{ const ai=game.ai; runAI=realAI; for(const h of game.ents.filter(e=>e.team===0&&e.type==='hq')) h.hp=h.maxHp=1e9;   /* (your base can't fall: the game must not end mid-check) */ game.time=700; ai.wavesSent=3; game.credits[1]=6000;
      deploy(game.ents.find(e=>e.team===1&&e.type==='settler')); const h=hqOf(1);
      put('refinery',-200,120,1); put('barracks',-200,-60,1); put('factory',270,130,1); put('power',0,-180,1); put('power',120,-160,1); put('tech',160,-40,1); put('reactor',20,-230,1); put('satellite',250,-160,1);   /* (it needs both for Settlers) */
      for(let i=0;i<16;i++) spawn('soldier',1,h.x-260+i*8,h.y+220);
      for(const o of game.ore) if(Math.hypot(o.x-h.x,o.y-h.y)<1600) o.amount=0   /* its home ore is spent; fresh ore only far off */;
      fog[1].exp.fill(1);
      let bought=null, deployed=null, k=0;
      while(k<20*300 && deployed===null){ if(bought===null && game.credits[1]<4000) game.credits[1]=4000; U(1); k++; if(bought===null && (ai.settlerGoal||game.ents.some(e=>e.team===1&&e.type==='settler'))) bought=+(k/20).toFixed(1); if(game.ents.filter(e=>e.team===1&&e.type==='hq').length>1) deployed=+(k/20).toFixed(1); }
      const hqs=game.ents.filter(e=>e.team===1&&e.type==='hq'), far=hqs.length>1?Math.round(Math.hypot(hqs[1].x-h.x,hqs[1].y-h.y)):null;
      const k2=k; while(k<k2+20*150){ if(game.credits[1]<500) game.credits[1]=500; U(1); k++; }   /* (its home ore is gone in this test: a little money so the Refinery doesn't wait on luck) */
      const ref2=hqs[1]?game.ents.filter(e=>e.team===1&&e.type==='refinery'&&Math.hypot(e.x-hqs[1].x,e.y-hqs[1].y)<450).length:0;
      return JSON.stringify({bought, deployed, far, ref2, settlerAt:ai.settlerAt}); })()"""))
    print(r)
    check(r['bought'] is not None and r['deployed'] is not None, 'the computer buys a Settler for far ore and deploys it')
    check((r['far'] or 0) > 700, 'its new HQ goes up well away from home')
    check(r['ref2'] >= 1, 'and it builds a Refinery by the new HQ')
    r = json.loads(pg.evaluate("""(()=>{ const ai=game.ai; game.credits[1]=20000; const t0=game.time; let k=0, n=0;
      while(k<20*200){ U(1); k++; if(game.ents.some(e=>e.team===1&&e.type==='factory'&&e.qTypes.includes('settler'))) { n++; break; } }
      return JSON.stringify({again:n>0, after:+(game.time-t0).toFixed(0)}); })()"""))
    print(r)
    check(not r['again'] or r['after'] >= 200, 'not another one straight away, even with $20,000 (5-minute gap)')
    # Easy never buys one; computer bought Settler tracked in reports
    check(not pg.evaluate("!!DIFFICULTY.easy.settlers"), 'Easy never buys Settlers')
    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
