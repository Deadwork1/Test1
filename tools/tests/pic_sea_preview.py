# Preview only (changes nothing in the game): a sea along the south edge of each map, painted over the map picture.
# Usage: python3 tests/pic_sea_preview.py <game folder> <port> <map> <out prefix> [sea depth as share of map height, default 0.06]
import sys, http.server, threading, functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
m, out = sys.argv[3], sys.argv[4]; share = float(sys.argv[5]) if len(sys.argv) > 5 else 0.06
SEA = """(share)=>{ const c = bg.getContext('2d'), D = H * share;
  const coast = x => H - D + D * 0.18 * Math.sin(x / 260) + D * 0.10 * Math.sin(x / 97 + 1.3) + D * 0.05 * Math.sin(x / 41);
  const band = (off, fill) => { c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, coast(x) + off); c.lineTo(W, H); c.closePath(); c.fillStyle = fill; c.fill(); };
  band(-26, '#cdb77c'); band(-12, '#b9a36b'); band(-4, '#8f8a62');            // dry sand, wet sand, damp edge
  // the river opens out into the sea: a widening mouth cut through the beach
  const half = MAP.river.half, mouth = (w, col) => { c.beginPath(); const y0 = coast(riverX(H - D)) - 70, y1 = coast(riverX(H - D)) + 40;
    for (let y = y0; y <= y1; y += 4) { const k = (y - y0) / (y1 - y0); c.lineTo(riverX(y) - half * w * (1 + 1.6 * k * k), y); }
    for (let y = y1; y >= y0; y -= 4) { const k = (y - y0) / (y1 - y0); c.lineTo(riverX(y) + half * w * (1 + 1.6 * k * k), y); }
    c.closePath(); c.fillStyle = col; c.fill(); };
  mouth(1.35, '#8f8a62'); mouth(1.0, '#2f6390'); mouth(0.55, '#2a6a98');
  band(0, '#3e8bab'); band(D * 0.28, '#2f6f9c'); band(D * 0.6, '#255d8a'); band(D * 0.85, '#1d4c76');   // shallows to deep water
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  c.lineCap = 'round';
  for (let k = 0; k < 2; k++) {                                                // surf: two broken white lines along the shore
    c.strokeStyle = k ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)'; c.lineWidth = k ? 2 : 3;
    for (let x = 0; x < W; x += 30 + rnd() * 30) { const l = 25 + rnd() * 50; c.beginPath(); for (let t = 0; t <= l; t += 6) c.lineTo(x + t, coast(x + t) + 3 + k * 12 + Math.sin((x + t) / 9) * 1.5); c.stroke(); }
  }
  c.strokeStyle = 'rgba(200,230,245,0.3)'; c.lineWidth = 2;                   // swell further out
  for (let i = 0; i < W / 18; i++) { const x = rnd() * W, y = coast(x) + 20 + rnd() * (D * 1.1), l = 10 + rnd() * 22; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 4, x + l, y); c.stroke(); }
  for (let i = 0; i < W / 300; i++) { const x = rnd() * W, y = coast(x) - 14 - rnd() * 8; c.fillStyle = 'rgba(120,100,70,0.6)'; c.beginPath(); c.ellipse(x, y, 4 + rnd() * 5, 2 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); c.fill(); }   // pebbles / driftwood on the beach
  return Math.round(D); }"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1600, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
    pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(2500); pg.click('#ovBtn')
    pg.add_style_tag(content="body > *:not(canvas){display:none !important} canvas{position:fixed;left:0;top:0}")
    d = pg.evaluate(f"({SEA})({share})")
    pg.evaluate("""(()=>{ game.paused=true; for (const s of game.ents.filter(e=>e.type==='settler')) deploy(s); game.ents=game.ents.filter(e=>e.hp>0); window.drawMinimap=()=>{}; MM.hidden=true;
      fog[0].vis.fill(1); fog[0].exp.fill(1); fogCanvas.getContext('2d').clearRect(0,0,fogCanvas.width,fogCanvas.height); window.updateFog=()=>{}; })()""")
    pg.evaluate("(()=>{ const fitS=Math.min(scr.w/W, scr.h/H); cam.zoom=fitS*640/scr.h; cam.x=W/2; cam.y=H/2; })()"); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}_whole.png')
    # close up: your base by the shore, and the river mouth
    pg.evaluate("(()=>{ const hq=hqOf(0); cam.zoom=1.1; cam.x=hq.x+250; cam.y=H-330; })()"); pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_base.png')
    pg.evaluate("(()=>{ cam.zoom=1.6; cam.x=riverX(H-120); cam.y=H-200; })()"); pg.wait_for_timeout(400); pg.screenshot(path=f'{out}_mouth.png')
    print(m, 'sea depth', d, 'errors', errs[:3])
    b.close()
srv.shutdown()
