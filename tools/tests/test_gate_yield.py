# Two Extractors reach your gate at the same time, one leaving the base and one coming in, from several angles.
# The leaving one should get through first; the one coming in waits outside (enteringWaited, about 3 s) and then follows.
# Usage: python3 test_gate_yield.py <game folder> <port> [maps, default large]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
JS = r'''(()=>{ const U=update; window.update=()=>{}; window.draw=()=>{}; const out={};
 for (const vertical of [false,true]) for (const off of [0,40,-40]) {
  newGame(); game.paused=false; runAI=()=>{}; game.ents=[]; bldDirty=true;
  let ox=0, oy=0; outer: for (let y=300; y<H-300; y+=25) for (let x=300; x<W-300; x+=25) { let ok=true; for(let k=-10;k<=8&&ok;k++) for(let j=-8;j<=8;j++) if(terrainAt(x+k*25,y+j*25)!==T.GRASS){ok=false;break;} if(ok){ox=Math.floor(x/25)*25; oy=Math.floor(y/25)*25; break outer;} }
  if (!ox) { out.err="no open ground"; return out; } const gx=ox+12.5, gy=oy+12.5;
  // HQ "inside" = negative side (above / left)
  spawn('hq',0, vertical? gx-400: gx, vertical? gy: gy-400).built=true; spawn('hq',1,W-150,H-150).built=true;
  const g = spawn('gate',0,gx,gy); g.vertical=vertical; g.built=true; g.progress=1;
  for (let k=-8;k<=8;k++) { if (Math.abs(k)<=1) continue; const w = vertical ? spawn('wall',0,gx,gy+k*25) : spawn('wall',0,gx+k*25,gy); w.built=true; w.progress=1; }
  bldDirty=true;
  const P=(a,c)=>vertical?{x:gx+a,y:gy+c}:{x:gx+c,y:gy+a};   // a = across (neg = inside), c = along
  const s1=P(-120,off), s2=P(120,-off);
  const outU=spawn('extractor',0,s1.x,s1.y), inU=spawn('extractor',0,s2.x,s2.y);
  const t1=P(160,off), t2=P(-160,-off);
  outU.order={type:'move',...t1}; inU.order={type:'move',...t2};
  let tOut=null,tIn=null,waited=0;
  for (let t=0;t<20*40;t++){ U(0.05); if(inU.yieldT>0) waited+=0.05; if(tOut===null&&!outU.order) tOut=t/20; if(tIn===null&&!inU.order) tIn=t/20; if(tOut!==null&&tIn!==null) break; }
  const acr=u=>Math.round(vertical?u.x-gx:u.y-gy);
  out[(vertical?'V':'H')+' off '+off]={leavingDone:tOut, enteringDone:tIn, enteringWaited:+waited.toFixed(1), endAcross:[acr(outU),acr(inU)]};
 }
 return out; })()
'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for m in (sys.argv[3] if len(sys.argv) > 3 else 'large').split(','):
        pg = b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')"); pg.reload()
        pg.wait_for_timeout(3000); pg.click('#ovBtn')
        print(m, json.dumps(pg.evaluate(JS), indent=1), errs[:2], flush=True)
        pg.close()
    b.close()
srv.shutdown()
