# v5.74: two factions. You pick The Legion or The Ashen (or Random) on the start screen; the computer is the other one.
# Each sees only its own units and buildings (plus the shared ones), wears its colours, and the computer never builds or
# trains the other faction's things. Saves a picture of each side's War Factory buttons if given a folder.
# Usage: python3 tests/test_factions.py <game folder> <port> [picture folder]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
pics = sys.argv[3] if len(sys.argv) > 3 else None
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
LEGION = ['heavy', 'heli', 'helipad', 'grenadier', 'mrl', 'missile', 'mg']
ASHEN = ['flamer', 'flametank', 'sniper', 'bike', 'cannon', 'laser', 'sam']   # (Rocket Soldiers shared since the second step)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 860}, device_scale_factor=2, has_touch=True); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    for mine, theirs in [('legion', 'ashen'), ('ashen', 'legion')]:
        print('==', mine)
        pg.goto(url); pg.evaluate("localStorage.setItem('mini-rts-map','large'); localStorage.setItem('mini-rts-difficulty','hard'); localStorage.removeItem('mini-rts-sandbox')")
        pg.goto(url); pg.wait_for_timeout(1500)
        pg.click(f'#factionRow button[data-f="{mine}"]'); pg.click('#ovBtn')
        r = json.loads(pg.evaluate("""(()=>{ window.realAI=runAI; runAI=()=>{}; for(const t of [0,1]) deploy(game.ents.find(e=>e.team===t&&e.type==='settler')); window.U=n=>{for(let i=0;i<n;i++) update(0.05)}; U(5);
          const hq=hqOf(0); game.credits[0]=1e5;
          const mk=(t,dx,dy)=>{ const e=spawn(t,0,hq.x+dx,hq.y+dy); e.built=true; e.progress=1; e.hp=e.maxHp; return e; };
          const bar=mk('barracks',-200,40), f=mk('factory',220,60); mk('refinery',-200,-150); mk('power',0,-200); mk('radar',200,-170); mk('tech',350,-40); mk('reactor',-350,-30); mk('satellite',-380,160);
          const btns=b=>{ game.selected=new Set([b.id]); updateHUD(); return [...document.querySelectorAll('#produceBtns button')].filter(x=>x.style.display!=='none').map(x=>x.dataset.unit); };
          game.selected=new Set([hq.id]); updateHUD();
          const hqBtns=['Helipad','Sam','Reactor','Satellite','Radar','Tech'].filter(n=>{ const el=document.getElementById('btn'+n); return el && el.style.display!=='none'; });
          const en=spawn('engineer',0,hq.x,hq.y+150); game.selected=new Set([en.id]); updateHUD();
          const turrets=TURRET_TYPES.filter(k=>ui[k].style.display!=='none');
          return JSON.stringify({factions:game.factions, colour:TEAMS[0].color, enemyColour:TEAMS[1].color, barracks:btns(bar), factory:btns(f), hqBtns, turrets, napalm:strikeKind(0)==='napalm', napalmBtn:(()=>{ game.selected=new Set(); updateHUD(); return ui.napalm.style.display!=='none'; })(),
            canTrainOther: ['rocket','sniper','flamer','grenadier','heavy','mrl','flametank','heli'].filter(u=>!allowed(0,u)) }); })()"""))
        print(r)
        if pics:
            pg.evaluate("(()=>{ const f=game.ents.find(e=>e.team===0&&e.type==='factory'); game.selected=new Set([f.id]); cam.x=f.x; cam.y=f.y; setZoom(1.2); clampCam(); updateHUD(); })()")
            pg.wait_for_timeout(400); pg.screenshot(path=f'{pics}/faction_{mine}.png')
        own, other = (LEGION, ASHEN) if mine == 'legion' else (ASHEN, LEGION)
        check(r['factions'] == [mine, theirs], 'you are %s, the computer %s' % (mine, theirs))
        check(r['colour'] == ('#2f6fe0' if mine == 'legion' else '#d62828') and r['enemyColour'] == ('#d62828' if mine == 'legion' else '#2f6fe0'), 'colours: you %s, enemy %s' % (r['colour'], r['enemyColour']))
        shown = set(r['barracks'] + r['factory'] + r['turrets'])
        check(not (shown & set(other)), 'none of the other side\'s units or turrets on your buttons (barracks %s, factory %s, turrets %s)' % (r['barracks'], r['factory'], r['turrets']))
        check(all(u in shown for u in own if u not in ('heli', 'helipad', 'sam')), 'all of your own units and turrets are there')
        check(('Helipad' in r['hqBtns']) == (mine == 'legion') and ('Sam' in r['hqBtns']) == (mine == 'ashen') and 'Reactor' in r['hqBtns'] and 'Satellite' in r['hqBtns'], 'HQ: Helipad only for the Legion, SAM Site only for the Ashen, Reactor and Satellite for both: %s' % r['hqBtns'])
        check(r['napalm'] == (mine == 'ashen') and r['napalmBtn'], 'the Satellite power: Napalm for the Ashen, the Orbital Barrage for the Legion (napalm: %s)' % r['napalm'])
        # the computer, 8 minutes of Hard as the other faction
        m = json.loads(pg.evaluate("""(()=>{ runAI=realAI; const h=hqOf(0); h.hp=h.maxHp=1e9; let k=0; while(k<20*480){ U(1); k++; if(game.over) break; }
          const made=game.track.made[1], blds=[...new Set(game.ents.filter(e=>e.team===1&&isBuilding(e)).map(e=>e.type))];
          return JSON.stringify({made, blds}); })()"""))
        print(m)
        bad = [u for u in list(m['made']) + m['blds'] if u in own]   # (the computer is the other faction: none of yours)
        check(not bad, 'the computer (%s) made none of your faction\'s things in 8 minutes (bad: %s)' % (theirs, bad))
        check(sum(m['made'].values()) >= 20 and 'factory' in m['blds'], 'and still built up: %d units, %s' % (sum(m['made'].values()), m['blds']))
    # Random gives one or the other, enemy the other
    pg.goto(url); pg.wait_for_timeout(1500); pg.click('#factionRow button[data-f="random"]'); pg.click('#ovBtn')
    f = pg.evaluate("game.factions")
    check(f in (['legion', 'ashen'], ['ashen', 'legion']), 'Random: %s' % f)
    check(pg.evaluate("buildReport().factions.you") == f[0], 'the game report records the factions')
    check(not errs, 'no page errors %s' % errs[:3])
    b.close()
print('PASS' if ok else 'FAIL')
