import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.tap('#ovBtn'); pg.wait_for_timeout(100)
    J = lambda js: pg.evaluate(js)
    J("runAI=()=>{}; game.credits[0]=20000; deploy(game.ents.find(e=>e.team===0&&e.type==='settler'));")
    J("""window.put=(t)=>{const hq=hqOf(0); for(let d=110;d<420;d+=10){ for(let a=0;a<6.3;a+=0.25){ if(placeBuilding(0,t,hq.x+Math.cos(a)*d,hq.y+Math.sin(a)*d)) { for(let i=0;i<20*20;i++) update(0.05); return true; } } } return false; };
       window.sel=(t)=>{game.selected=new Set([game.ents.find(e=>e.team===0&&e.type===t).id]);}; 0""")
    out={}
    def btns(): pg.wait_for_timeout(150); return J("[...document.querySelectorAll('#panel button')].filter(b=>b.offsetParent).map(b=>(b.disabled?'[x] ':'')+b.textContent)")
    J("sel('hq')"); out['HQ at start']=btns()
    out['factory place blocked']=J("put('factory')")
    J("put('barracks')"); J("sel('barracks')"); out['Barracks, nothing else']=btns()
    J("put('power')"); J("put('refinery')"); J("sel('barracks')"); out['Barracks + power']=btns()
    J("sel('hq')"); out['HQ after barracks+refinery']=btns()
    pg.tap('#btnFactory'); pg.wait_for_timeout(100); J("game.placing=null"); 
    out['factory placed']=J("put('factory')")
    J("sel('factory')"); out['Factory']=btns()
    pg.tap('#produceBtns button[data-unit="light"]'); pg.wait_for_timeout(50)
    out['light made by tap']=J("(()=>{for(let i=0;i<20*12;i++) update(0.05); return game.ents.filter(e=>e.team===0&&e.type==='light').length})()")
    out['heavy blocked']=J("!produce(game.ents.find(e=>e.type==='factory'),'heavy')")
    J("put('tech')"); J("sel('factory')"); out['Factory with Tech Centre']=btns()
    J("game.ents.find(e=>e.team===0&&e.type==='tech').hp=0; update(0.05); sel('factory')"); out['Factory after Tech Centre destroyed']=btns()
    print(json.dumps(out, indent=1)); print(errs[:3]); b.close()
srv.shutdown()
