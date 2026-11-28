# v5.76: the campaign. A Campaign button lists the missions (Legion 1 playable, the rest locked); picking one reloads with
# its briefing. Legion 1 "Beachhead": from the far bottom left two boats with a Buggy each, then 4 s later two boats with 5
# Soldiers each; destroy the Ashen outpost; a Settler comes by boat; deploy it and build a Barracks; a Skylift brings
# troops; destroy the Ashen HQ. Objectives tick off, radio messages show. Saves pictures if given a folder.
# Usage: python3 tests/test_campaign.py <game folder> <port> [picture folder]
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
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 900, 'height': 600}, device_scale_factor=2); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    url = f'http://127.0.0.1:{sys.argv[2]}/index.html'
    pg.goto(url); pg.evaluate("localStorage.removeItem('mini-rts-campaign'); localStorage.removeItem('mini-rts-campaign-done'); localStorage.setItem('mini-rts-map','classic'); localStorage.setItem('mini-rts-sandbox','on')")
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.click('#ovCampaign'); pg.wait_for_timeout(200)
    lst = pg.evaluate("[...document.querySelectorAll('#campBody button')].map(b=>({t:b.textContent, off:b.disabled}))")
    print(lst)
    check(lst[0]['t'].startswith('Legion 1') and not lst[0]['off'] and all(x['off'] for x in lst[1:]), 'the Campaign list: Legion 1 to play, the rest locked')
    if pics: pg.screenshot(path=f'{pics}/campaign_list.png')
    with pg.expect_navigation(): pg.click('#campBody button[data-id="legion1"]')
    pg.wait_for_timeout(1200)
    m = pg.evaluate("JSON.stringify({title:ui.ovTitle.textContent, btn:ui.ovBtn.textContent, map:mapChoice, hidden:['mapRow','diffRow','factionRow','sandboxRow'].every(id=>document.getElementById(id).style.display==='none'), leave:document.getElementById('ovLeave').style.display!=='none', diff:difficulty, sandbox})")
    m = json.loads(m); print(m)
    check('Beachhead' in m['title'] and m['btn'] == 'Start mission' and m['hidden'] and m['leave'], 'the start screen shows the briefing, Start mission and Leave campaign, not the skirmish settings')
    check(m['map'] == 'large' and m['diff'] == 'mission' and not m['sandbox'], 'it plays on its own map (Large), on Easy, Sandbox off')
    if pics: pg.screenshot(path=f'{pics}/campaign_briefing.png')
    pg.click('#ovBtn')
    r = json.loads(pg.evaluate("""(()=>{ const U=n=>{for(let i=0;i<n;i++) update(0.05)}; const out={};
      out.start={settler:game.ents.some(e=>e.team===0&&e.type==='settler'), enemyHq:!!hqOf(1), objectives:game.mission.obj.map(o=>o.text)};
      const boatLog=[]; let k=0; while(k<20*9){ U(1); k++; for(const B of game.boats||[]){ if(!B.logged){ B.logged=true; boatLog.push({t:+game.time.toFixed(1), x:Math.round(B.x), units:B.cargo.map(byId).map(u=>u.type)}); } } }
      out.boats=boatLog; out.radio=game.mission.lastRadio;
      k=0; while(k<20*30 && game.boats.length){ U(1); k++; }
      out.landed=game.ents.filter(e=>e.team===0&&isUnit(e)).map(e=>e.type).sort();
      out.aiOnEarly=game.mission.aiOn;
      // send everyone at the outpost
      const o=game.mission.outpost; for(const u of game.ents.filter(e=>e.team===0&&isUnit(e))) u.order={type:'attackmove',x:o.x,y:o.y};
      k=0; while(k<20*240 && game.mission.phase==='land' && !game.over){ U(1); k++; if(k%200===0) for(const u of game.ents.filter(e=>e.team===0&&isUnit(e)&&!e.order)) u.order={type:'attackmove',x:o.x,y:o.y}; }
      out.outpost={phase:game.mission.phase, secs:Math.round(k/20), over:game.over, left:game.ents.filter(e=>e.team===0&&isUnit(e)).length, aiOn:game.mission.aiOn};
      // the Settler lands; deploy it, build a Barracks
      k=0; let s=null; while(k<20*30 && !(s=game.ents.find(e=>e.team===0&&e.type==='settler'&&!e.boarded&&!e.landing&&!e.order))){ U(1); k++; }
      out.settler=!!s; if(s) deploy(s); U(5); out.deployTicked=game.mission.obj.find(o=>o.id==='deploy').done;
      const h=hqOf(0); const bar=spawn('barracks',0,h.x+170,h.y-40); bar.built=true; bar.progress=1; bar.hp=bar.maxHp; const before=game.ents.filter(e=>e.team===0&&isInfantry(e)).length; const shown0=game.reinfShown||0;
      k=0; while(k<20*40 && !(game.reinfShown>shown0)){ U(1); k++; } U(40);
      out.skylift={arrived:game.reinfShown>shown0, added:game.ents.filter(e=>e.team===0&&isInfantry(e)).length-before, phase:game.mission.phase, objectives:game.mission.obj.map(o=>(o.done?'x ':'- ')+o.text)};
      return JSON.stringify(out); })()"""))
    print(json.dumps(r, indent=1))
    st = r['start']
    check(not st['settler'] and st['enemyHq'] and st['objectives'] == ['Destroy the Ashen outpost to the east'], 'no Settler at the start, the Ashen are dug in, first objective: the outpost')
    bt = r['boats']
    bug = [x for x in bt if x['units'] == ['buggy']]; inf = [x for x in bt if x['units'] == ['soldier'] * 5]
    check(len(bug) == 2 and len(inf) == 2 and len({x['t'] for x in bug}) == 1 and len({x['t'] for x in inf}) == 1 and abs(inf[0]['t'] - bug[0]['t'] - 4) < 0.2, 'two boats with a Buggy each, then 4 s later two boats with 5 Soldiers each: %s' % [(x['t'], x['x'], x['units'][0]) for x in bt])
    check(all(x['x'] < 400 for x in bt), 'all four come in at the far bottom left (x %s)' % [x['x'] for x in bt])
    check(r['landed'] == ['buggy'] * 2 + ['soldier'] * 10 and not r['aiOnEarly'], 'they land: 2 Buggies and 10 Soldiers; the Ashen base sleeps meanwhile')
    check(r['radio'] and 'outpost' in r['radio'], 'a radio message gives the order (%s)' % r['radio'])
    op = r['outpost']
    check(op['phase'] == 'base' and not op['over'] and op['aiOn'], 'the outpost falls (%d s, %d of yours left) and the Ashen wake up' % (op['secs'], op['left']))
    check(r['settler'] and r['deployTicked'], 'a Settler comes ashore; deploying it ticks the objective')
    sk = r['skylift']
    check(sk['arrived'] and sk['added'] == 5 and sk['phase'] == 'attack', 'a Barracks brings a Skylift with 5 troops ("Reinforcements have arrived")')
    if pics:
        pg.evaluate("(()=>{ const h=hqOf(0); cam.x=h.x+120; cam.y=h.y-60; setZoom(1.3); clampCam(); game.paused=true; })()")
        pg.wait_for_timeout(300); showr = pg.evaluate("showRadio('Command: Skylift inbound with more troops. Build up, then take out the Ashen Headquarters in the north-east.')"); pg.wait_for_timeout(400)
        pg.screenshot(path=f'{pics}/campaign_play.png')
    # winning: the Ashen HQ goes
    w = json.loads(pg.evaluate("""(()=>{ game.paused=false; for(const e of game.ents) if(e.team===1&&(e.type==='hq'||e.type==='settler')) e.hp=0; update(0.05); update(0.05);
      let done=[]; try{ done=JSON.parse(localStorage.getItem('mini-rts-campaign-done')||'[]'); }catch(e){}
      return JSON.stringify({over:game.over, title:ui.ovTitle.textContent, done}); })()"""))
    print(w)
    check(w['over'] == 'win' and w['title'] == 'Mission complete' and 'legion1' in w['done'], 'destroying the Ashen HQ completes the mission (marked done)')
    # losing the landing force fails it
    pg.click('#ovBtn')
    l = json.loads(pg.evaluate("""(()=>{ const U=n=>{for(let i=0;i<n;i++) update(0.05)}; let k=0; while(k<20*30 && (game.boats||[]).length+ (game.reinf||[]).length){ U(1); k++; } U(20*4);
      for(const e of game.ents) if(e.team===0&&isUnit(e)) e.hp=0; U(20*13); return JSON.stringify({over:game.over, title:ui.ovTitle.textContent}); })()"""))
    check(l['over'] == 'lose' and l['title'] == 'Mission failed', 'losing the whole landing force fails the mission (%s)' % l)
    with pg.expect_navigation(): pg.click('#ovLeave')
    pg.wait_for_timeout(1000)
    back = pg.evaluate("JSON.stringify({c:localStorage.getItem('mini-rts-campaign'), map:mapChoice, btn:ui.ovBtn.textContent})")
    check(json.loads(back)['c'] is None and json.loads(back)['btn'] == 'Start', 'Leave campaign goes back to the normal start screen (%s)' % back)
    check(not errs, 'no page errors %s' % errs[:3])
    pg.evaluate("localStorage.removeItem('mini-rts-sandbox')")
    b.close()
print('PASS' if ok else 'FAIL')
