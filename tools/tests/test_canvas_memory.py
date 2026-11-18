# Simulates a phone's cap on total canvas memory (iPhones refuse new canvases past about 384 MB, and freed canvases
# only count as freed once their size is set to 0). Loads each map and checks it starts, then that the map buttons
# still switch maps. Usage: python3 tests/test_canvas_memory.py <game folder> <port> [limit MB]
import sys, http.server, threading, functools, json
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(Q, directory=sys.argv[1]))
threading.Thread(target=srv.serve_forever, daemon=True).start()
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 384
CAP = """(() => {
  const LIMIT = %d * 1024 * 1024, live = new Set(); window.__peakMB = 0; window.__refused = 0;
  const used = () => { let s = 0; for (const c of live) s += c.width * c.height * 4; return s; };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) {
    if (!live.has(this)) {
      if (used() + this.width * this.height * 4 > LIMIT) { window.__refused++; return null; }   // like Safari: no context
      live.add(this);
    }
    window.__peakMB = Math.max(window.__peakMB, Math.round(used() / 1048576));
    return orig.apply(this, a);
  };
})();""" % limit
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ok = True
    for m in ['classic', 'large', 'huge']:
        ctx = b.new_context(viewport={'width': 844, 'height': 390}, service_workers='block')
        ctx.add_init_script(CAP)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.evaluate(f"localStorage.setItem('mini-rts-map','{m}')")
        pg.goto(f'http://127.0.0.1:{sys.argv[2]}/index.html'); pg.wait_for_timeout(3000)
        r = pg.evaluate("({ loaded: !!window.gameLoaded, peakMB: window.__peakMB, refused: window.__refused, overlay: getComputedStyle(document.getElementById('overlay')).display })")
        # then try switching map with the buttons
        target = 'classic' if m != 'classic' else 'large'
        try:
            pg.click(f'#mapRow button[data-m="{target}"]', timeout=5000, no_wait_after=True); pg.wait_for_timeout(4000)   # the click reloads the page; don't wait on the load
            got = pg.evaluate("localStorage.getItem('mini-rts-map')"); switched = got == target
            if not switched: print('   after click the map setting is', got)
        except Exception as ex:
            switched = False; print('   click failed:', str(ex).split(chr(10))[0][:200])
        print(m, json.dumps(r), 'switch to', target, 'works' if switched else 'BROKEN', 'errors', errs[:2])
        ok = ok and r['loaded'] and switched
        ctx.close()
    print('PASS' if ok else 'FAIL')
    b.close()
srv.shutdown()
