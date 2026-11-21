# Extractors are bought at the War Factory (v5.55): the Refinery has no buy button but still comes with one free Extractor,
# the War Factory's Extractor button works, and the computer gets its Extractors (Easy from two Refineries, Normal/Hard from an early War Factory).
# Usage: python3 tests/test_extractor_factory.py <game folder> <port> [minutes of computer play, default 7]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
mins = float(sys.argv[3]) if len(sys.argv) > 3 else 7
ok = True
def check(cond, msg):
    global ok
    print(('  ok   ' if cond else '  FAIL ') + msg); ok = ok and cond
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1000, 'height': 560}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate("localStorage.setItem('mini-rts-map','large')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2000); pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ const ai=runAI; runAI=()=>{}; window.__ai=ai; game.credits[0]=5000;
      deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0);
      const put=(t,dx,dy)=>{ const b=spawn(t,0,hq.x+dx,hq.y+dy); b.built=true; b.progress=1; b.hp=b.maxHp; return b; };
      const n0 = game.ents.filter(e=>e.team===0&&e.type==='extractor').length;
      // a Refinery finished the normal way still hands out its free Extractor
      const ref = spawn('refinery',0,hq.x+190,hq.y-170); ref.progress=0.99; ref.built=false;
      for (let i=0;i<40;i++) update(0.05);
      const n1 = game.ents.filter(e=>e.team===0&&e.type==='extractor').length;
      put('barracks',-170,40);
      const refBuy = produce(ref, 'extractor');
      const fac = put('factory',200,60);
      const c0 = game.credits[0], facBuy = produce(fac, 'extractor'), paid = c0 - game.credits[0];
      for (let i=0;i<200;i++) update(0.05);
      const nx = game.ents.filter(e=>e.team===0&&e.type==='extractor');
      const newest = nx[nx.length-1];
      return JSON.stringify({ n0, n1, refBuy, facBuy, paid, n2: nx.length, nearFactory: Math.round(Math.hypot(newest.x-fac.x, newest.y-fac.y)), refBuilt: ref.built }); })()"""))
    print(r)
    check(r['refBuilt'] and r['n1'] == r['n0'] + 1, 'a finished Refinery still comes with one free Extractor')
    check(r['refBuy'] is False, 'the Refinery can no longer buy Extractors')
    check(r['facBuy'] is True and r['paid'] == 300, 'the War Factory buys an Extractor for $300')
    check(r['n2'] == r['n1'] + 1 and r['nearFactory'] < 120, 'the bought Extractor rolls out of the War Factory')
    # buttons: Refinery shows none, War Factory shows "Extractor $300"
    pg.evaluate("(()=>{ const r=game.ents.find(e=>e.team===0&&e.type==='refinery'); game.selected=new Set([r.id]); })()"); pg.wait_for_timeout(300)
    rb = pg.evaluate("[...document.querySelectorAll('#produceBtns button')].filter(x=>x.offsetParent!==null).map(x=>x.textContent)")
    pg.evaluate("(()=>{ const f=game.ents.find(e=>e.team===0&&e.type==='factory'); game.selected=new Set([f.id]); })()"); pg.wait_for_timeout(300)
    fb = pg.evaluate("[...document.querySelectorAll('#produceBtns button')].filter(x=>x.offsetParent!==null).map(x=>x.textContent)")
    print('refinery buttons', rb, '| factory buttons', fb)
    check(not any('Extractor' in x for x in rb), 'no Extractor button on the Refinery')
    check(any(x.startswith('Extractor') for x in fb), 'Extractor button on the War Factory')
    # the computer: play a few minutes on each difficulty against a base that can't be hurt
    for d in ['easy', 'normal', 'hard']:
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-difficulty','{d}')"); pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(1500); pg.click('#ovBtn')
        a = json.loads(pg.evaluate(f"""(()=>{{ deploy(game.ents.find(e=>e.team===0&&e.type==='settler')); const hq=hqOf(0); hq.maxHp=hq.hp=1e9;
          const log=[]; let facAt=null;
          for (let t=0; t<{mins}*60; t+=0.1) {{ update(0.1); hq.hp=1e9;
            if (facAt===null && game.ents.some(e=>e.team===1&&e.type==='factory'&&e.built)) facAt=Math.round(game.time);
            if (Math.abs(game.time % 60) < 0.1) log.push(game.ents.filter(e=>e.team===1&&e.type==='extractor').length); }}
          const of=t=>game.ents.filter(e=>e.team===1&&e.type===t);
          return JSON.stringify({{ diff: diff().label, extractors: of('extractor').length, refineries: of('refinery').length, factories: of('factory').length, facAt, perMin: log, made: game.track && game.track.made ? game.track.made[1] : null }}); }})()"""))
        print(d, a)
        if d == 'easy': check(a['refineries'] >= 2 and a['extractors'] >= 2, 'Easy builds 2 Refineries and has 2 Extractors')
        else: check(a['facAt'] is not None and a['facAt'] < 300 and a['extractors'] >= 4, f'{d}: War Factory before 5 min and at least 4 Extractors')
    print('errors', errs[:3]); ok = ok and not errs
    b.close()
srv.shutdown()
print('PASS' if ok else 'FAILED')
