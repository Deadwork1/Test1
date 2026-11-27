# The computer gives up on helicopters (v5.65): after 3 that died having done less damage than their price, it tries one bigger
# wave (twice its Helipads: 2 on Normal, 4 on Hard, all sent together); if that wave doesn't pay for itself it stops buying
# helicopters for raids (it keeps its usual Helipads filled for defence), and if it does, it goes back to raiding as before.
# Defence: its helicopters go after your units on its half of the map first; losses there don't count.
# Usage: python3 tests/test_ai_heli_giveup.py <game folder> <port>
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
SETUP = """(()=>{ for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); for(let i=0;i<5;i++) update(0.05);
  window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; const h1=hqOf(1), h0=hqOf(0); h0.maxHp=h0.hp=1e9;
  window.mk=(t,team,x,y)=>{const e=spawn(t,team,x,y); e.built=true; e.progress=1; e.hp=e.maxHp; return e;};
  window.target=mk('barracks',0,h0.x+200,h0.y); target.maxHp=target.hp=1e9; game.ai.known.set(target.id,{x:target.x,y:target.y,type:'barracks'});
  window.pads=[mk('helipad',1,h1.x-170,h1.y+150), mk('helipad',1,h1.x-170,h1.y+260)];
  window.D=DIFFICULTY[difficulty]; game.credits[1]=0;   // (no money: nothing gets bought behind the test's back)
  window.addDmg=v=>{ const h=game.track.hits[1]; h.heli=h.heli||{kills:0,killValue:0,damageValue:0}; h.heli.damageValue+=v; };
  window.one=()=>{ const p=pads.find(p=>!padHeli(p))||pads[0]; return releaseUnit(p,'heli'); };
  window.lose=(dmg)=>{ const h=one(); aiHelis(D); addDmg(dmg); h.hp=0; U(2); aiHelis(D); };   // one helicopter goes out, does dmg worth of damage, dies
  window.killAll=(dmgEach)=>{ for(const h of game.ents.filter(h=>h.team===1&&h.air&&h.hp>0)) { addDmg(dmgEach); h.hp=0; } U(2); aiHelis(D); };
})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for diffname, pads in [('hard', 4), ('normal', 2)]:
        pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-faction','all'); localStorage.setItem('mini-rts-map','huge'); localStorage.setItem('mini-rts-difficulty','{diffname}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
        pg.evaluate("runAI=()=>{}"); pg.evaluate(SETUP)
        r = json.loads(pg.evaluate("""(()=>{ const out={};
          lose(0); out.after1=game.ai.heliCheap; lose(2000); out.afterGood=game.ai.heliCheap;
          for(let i=0;i<3;i++) lose(100); out.mode=game.ai.heliMode; out.wantPads=aiHeliPads(D);
          // the wave: Helipads up to twice the usual, helicopters held on their pads until all are ready
          while(pads.length<aiHeliPads(D)) pads.push(mk('helipad',1,hqOf(1).x-300-pads.length*110,hqOf(1).y+300));
          for(const p of pads.slice(0,-1)) releaseUnit(p,'heli'); aiHelis(D);
          out.heldWhileShort=game.ents.filter(h=>h.team===1&&h.air&&h.order).length;
          releaseUnit(pads[pads.length-1],'heli'); aiHelis(D);
          out.sent=game.ents.filter(h=>h.team===1&&h.air&&h.order&&h.order.type==='attack').length; out.waveSize=(game.ai.heliWave||{ids:[]}).ids.length;
          // the wave does little and is shot down: it gives up
          killAll(50); out.modeAfter=game.ai.heliMode; game.credits[1]=1e6; aiHelis(D); U(20*20); aiHelis(D);
          const hs=game.ents.filter(h=>h.team===1&&h.air&&h.hp>0); out.boughtAfter=hs.length; out.raiding=hs.filter(h=>h.order).length; out.padsWanted=aiHeliPads(D);
          // one of your tanks on its half: they go after it (defence still works after giving up)
          const h1=hqOf(1), side=Math.sign(h1.x-riverX(h1.y)); let sp=null; for(let k=0;k<400&&!sp;k++){ const a=Math.random()*6.28, d=150+Math.random()*60, x=h1.x+Math.cos(a)*d, y=h1.y+Math.sin(a)*d; if(Math.sign(x-riverX(y))===side && siteIsFree(x,y,20)) sp={x,y}; }   // (right by its HQ, where it can see)
          const foe=spawn('light',0,sp.x,sp.y); foe.passive=true; U(4); out.seen=visibleAt(foe.x,foe.y,1); aiHelis(D);
          out.defending=hs.filter(h=>h.order&&h.order.target===foe.id).length; foe.hp=0; U(2);
          return JSON.stringify(out); })()"""))
        print(diffname, r)
        check(r['after1'] == 1 and r['afterGood'] == 0, f'{diffname}: a helicopter that dies cheaply counts; one that paid for itself resets the count')
        check(r['mode'] == 'wave' and r['wantPads'] == pads, f'{diffname}: after 3 cheap losses it tries a bigger wave with {pads} Helipads')
        check(r['heldWhileShort'] == 0 and r['sent'] == pads and r['waveSize'] == pads, f'{diffname}: it holds them until all {pads} are ready, then sends them together')
        usual = pads // 2
        check(r['modeAfter'] == 'done' and r['raiding'] == 0, f'{diffname}: the wave did less than it cost: no more raids')
        check(r['padsWanted'] == usual and r['boughtAfter'] == usual, f'{diffname}: but it keeps its usual {usual} helicopter(s), for defence')
        check(r['seen'] and r['defending'] == usual, f'{diffname}: your tank on its half of the map: its helicopters go after it')
        r = json.loads(pg.evaluate("""(()=>{ const ai=game.ai; ai.heliMode='raid'; ai.heliCheap=0; game.credits[1]=0;
          for(const h of game.ents.filter(h=>h.team===1&&h.air)) h.hp=0; U(2); aiHelis(D);
          const h1=hqOf(1), side=Math.sign(h1.x-riverX(h1.y)); let sp=null; for(let k=0;k<400&&!sp;k++){ const a=Math.random()*6.28, d=150+Math.random()*60, x=h1.x+Math.cos(a)*d, y=h1.y+Math.sin(a)*d; if(Math.sign(x-riverX(y))===side && siteIsFree(x,y,20)) sp={x,y}; }   // (right by its HQ, where it can see)
          const foe=spawn('light',0,sp.x,sp.y); foe.passive=true; const hh=one(); U(4); aiHelis(D); const went=!!(hh.order&&hh.order.target===foe.id);
          hh.hp=0; U(2); aiHelis(D); foe.hp=0; U(2);
          return JSON.stringify({went, cheap:ai.heliCheap}); })()"""))
        print(r)
        check(r['went'] and r['cheap'] == 0, f'{diffname}: a helicopter lost on defence is not a cheap loss')
        if diffname == 'hard':
            # a wave that pays for itself: back to raiding
            pg.evaluate("location.reload()"); pg.wait_for_timeout(1500); pg.click('#ovBtn'); pg.evaluate("runAI=()=>{}"); pg.evaluate(SETUP)
            r = json.loads(pg.evaluate("""(()=>{ for(let i=0;i<3;i++) lose(0);
              while(pads.length<aiHeliPads(D)) pads.push(mk('helipad',1,hqOf(1).x-300-pads.length*110,hqOf(1).y+300));
              for(const p of pads) releaseUnit(p,'heli'); aiHelis(D); const n=(game.ai.heliWave||{ids:[]}).ids.length; killAll(900);
              return JSON.stringify({n, mode:game.ai.heliMode, cheap:game.ai.heliCheap, pads:aiHeliPads(D)}); })()"""))
            print(r)
            check(r['n'] == 4 and r['mode'] == 'raid' and r['cheap'] == 0 and r['pads'] == 2, 'hard: a wave that pays for itself sends it back to raiding with 2 Helipads, count reset')
        check(not errs, f'{diffname}: no page errors' + (': ' + errs[0] if errs else ''))
        pg.close()
    b.close()
print('ALL OK' if ok else 'SOME FAILED')
