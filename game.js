// Mini RTS
// You (blue) vs the computer (red) with fog of war. Pick the Classic or Large map on the start screen.
// Settler -> deploys into a Headquarters.
// HQ builds Barracks (trains Soldiers) and Refinery (builds Extractors).
// Extractors collect Ore and bring it back to a Refinery for credits.
// Destroy everything the enemy owns to win.

'use strict';

// ---------- Maps ----------
// Each layout describes YOUR side (bottom-left). The enemy's side is the same, mirrored, so both are fair.
const MAPS = {
  classic: {
    label: 'Classic', W: 2400, H: 1500, start: { x: 230, y: 1270 },
    fields: [   // your home field, then your flank field
      { x: 470, y: 1215, nodes: 7, amount: 500, spread: 85 },
      { x: 640, y: 380, nodes: 8, amount: 400, spread: 110 },
    ],
    island: { r: 280, nodes: 14, amount: 500, spread: 160 },
    ridges: [
      [[[-30, 1100], [135, 1092], [300, 1060], [480, 1087]], 28],   // wall north of your base, right to the map edge (as on Large, scaled down)
      [[[655, 1053], [700, 1200], [673, 1347]], 28],   // wall east of your base (gap at the bottom): two ways in, like the bigger maps
    ],
    forests: [[380, 625, 180, 140, -0.15], [385, 455, 195, 180, 0], [535, 525, 85, 70, 0], [560, 575, 130, 65, 0.05], [800, 230, 90]],   // [x, y, r] or a jungle [x, y, rx, ry, tilt]; the jungle hides a small ruined base
    plateaus: [
      { x: 930, y: 470, rx: 175, ry: 130, tilt: 0.2, ramps: [3.0, 1.5] },   // high ground: cliff all round except the ramps
      { x: 985, y: 935, rx: 168, ry: 118, tilt: 0.94, ramps: [2.51], overhang: true, rim: 27 },
      { x: 658, y: 822, rx: 108, ry: 74, tilt: -0.6, ramps: [2.3], rim: 32 },   // beside the road to the island's west bridge: with the lookout it pinches the road   // a small river lookout by the island's west bridge (as on Large, scaled down)
      { x: 1110, y: 1405, rx: 90, ry: 62, tilt: -0.1, ramps: [2.88], rim: 32 },   // a small plateau watching your river bridge and the village beside it
    ],
    river: { amp: 70, period: 230, half: 36 },
    bridges: [{ y: 230, hw: 62 }],                     // river bridges on your half (mirrored for theirs)
    ruins: [{ x: 410, y: 475, clearing: [110, 78], buildings: [['barracks', -48, -6], ['radar', 50, 6]] }],   // the small map's ruined base: a Barracks and a Radar
    villages: [{ x: 1060, y: 1175, derrick: [0, 0], houses: [[-72, 44], [68, 40]], out: [-240, -60] }],   // a small village by your river bridge: an Oil Derrick and two houses
  },
  large: {   // laid out like the Huge map, scaled down: base cliff to the map edge, one bridge per river arm, three plateaus a side
    label: 'Large', W: 3600, H: 2250, start: { x: 300, y: 1950 },
    fields: [
      { x: 720, y: 1800, nodes: 8, amount: 500, spread: 100 },    // home field
      { x: 330, y: 1150, nodes: 8, amount: 500, spread: 105 },    // expansion: north of your base
      { x: 1290, y: 2080, nodes: 8, amount: 500, spread: 100 },   // expansion: along the south edge
      { x: 950, y: 480, nodes: 10, amount: 600, spread: 130 },    // contested flank field
    ],
    island: { r: 380, nodes: 18, amount: 600, spread: 230 },
    ridges: [
      [[[-40, 1650], [200, 1640], [450, 1590], [720, 1630]], 32],   // wall north of your base, right to the map edge (gap only at the east end)
      [[[980, 1580], [1050, 1800], [1010, 2020]], 32],   // wall east of your base (gap at the bottom)
      [[[1350, 600], [1420, 900]], 30],                  // ridge near the river
      [[[1650, 1722], [1798, 1700]], 30],                // ridge across the road from the bridge plateau (the pinch onto your bridge)
      [[[1339, 385], [1504, 235]], 28],                  // rocks by the top bridge
    ],
    forests: [[930, 875, 330, 270, 0.25], [600, 820, 390, 175, -0.08], [490, 560, 290, 230, 0], [400, 720, 170, 130, 0], [700, 1110, 190, 150, 0.3], [1150, 330, 120]],   // the big jungle sits on the routes between the bases, an old ruined base in its middle
    plateaus: [
      { x: 1480, y: 1357, rx: 200, ry: 135, tilt: 0.94, ramps: [2.51], overhang: true },   // lookout over the island, by its west bridge: juts out over the river
      { x: 1082, y: 1268, rx: 160, ry: 110, tilt: -0.6, ramps: [2.3] },   // beside the road to the island's west bridge: with the lookout it pinches the road
      { x: 1597, y: 2022, rx: 140, ry: 95, tilt: -0.1, ramps: [2.88] },   // overlooks your river bridge; with the ridge above it, pinches the road onto the bridge
    ],
    river: { amp: 90, period: 320, half: 40 },
    bridges: [{ y: 370, hw: 70 }],   // one crossing above the island (and its mirror below), plus the two island bridges
    // a neutral village by your river bridge (its mirror sits by the computer's), guarded by the bridge plateau
    villages: [{ x: 1480, y: 1795, derrick: [0, 0], houses: [[-100, 62], [96, 58], [-84, -82]], out: [40, -230] }],
    // an old ruined base in a clearing in the middle of the big jungle on your side (its mirror is on the computer's)
    ruins: [{ x: 520, y: 650, clearing: [140, 115], buildings: [['barracks', -64, -30], ['power', 66, -34], ['radar', 0, 56]] }],
  },
  huge: {   // the base corner is laid out like Large's; the extra room is all in the ground between the bases
    label: 'Huge', W: 4800, H: 3000, start: { x: 400, y: 2600 },
    fields: [
      { x: 820, y: 2450, nodes: 8, amount: 500, spread: 100 },    // home field
      { x: 430, y: 1560, nodes: 8, amount: 500, spread: 105 },    // expansion: north of your base
      { x: 1700, y: 2780, nodes: 8, amount: 500, spread: 100 },   // expansion: along the south edge
      { x: 1560, y: 1930, nodes: 8, amount: 500, spread: 100 },   // forward field, out in front of your base
      { x: 1250, y: 640, nodes: 10, amount: 600, spread: 130 },   // contested flank field
      { x: 330, y: 330, nodes: 7, amount: 600, spread: 95 },      // far corner field
    ],
    island: { r: 500, nodes: 22, amount: 600, spread: 300, ring: [290, 440], inner: 18 },   // gold round the island's edge (near the river and the lookouts) plus plenty across the middle   // gold scattered round the island's edge, near the river (and the lookouts)
    ridges: [
      [[[-40, 2300], [300, 2290], [550, 2240], [820, 2280]], 32],   // wall north of your base, right to the map edge (gap only at the east end)
      [[[1080, 2230], [1150, 2450], [1110, 2720]], 32],   // wall east of your base (gap at the bottom)
      [[[2612, 610], [2415, 640]], 30],                   // ridge across the road from the bridge plateau (the pinch onto the bridge), across the river from your side
      [[[3002, 2500], [2782, 2700]], 30],                 // rocks by the south bridge, on the far side of the river (mirrored: by the north bridge on your side)
    ],
    forests: [[1220, 1180, 500, 345, 0.25], [700, 1160, 490, 210, -0.08], [650, 860, 390, 270, 0], [840, 1460, 240, 180, 0.3], [1530, 420, 160], [980, 1950, 130]],   // the big jungle sits on the routes between the bases, an old ruined base in its middle
    plateaus: [
      { x: 1979, y: 1806, rx: 250, ry: 165, tilt: 0.94, ramps: [2.51], overhang: true },   // lookout over the island, close to its west bridge: juts out over the river   // lookout over the island: juts out over the river
      { x: 1450, y: 1690, rx: 190, ry: 130, tilt: -0.6, ramps: [2.3] },   // beside the main road to the island's west bridge: with the river lookout it squeezes the road into a pinch about 150 wide
      { x: 2683, y: 290, rx: 160, ry: 110, tilt: -0.1, ramps: [-0.26] },  // overlooks the river bridge above the island, on the far bank; with the ridge below it, pinches the road onto the bridge
    ],
    river: { amp: 110, period: 420, half: 44 },
    bridges: [{ y: 480, hw: 74 }],   // one crossing above the island (and its mirror below), plus the two island bridges
    // neutral villages: an Oil Derrick and a few houses, each on the far side of a river bridge from one base.
    villages: [{ x: 2747, y: 560, derrick: [0, 0], houses: [[100, -62], [-96, -58], [84, 82]], out: [-40, 230] }],   // on the far side of the top bridge (its mirror is on your side of the bottom bridge)
    ruins: [{ x: 580, y: 920, clearing: [140, 115], buildings: [['barracks', -64, -30], ['power', 66, -34], ['radar', 0, 56]] }],   // old ruined base in the middle of the big jungle
  },
};
// ---------- Random maps (v5.60) ----------
// A Random map has the size of Classic, Large or Huge and keeps their shape: your base corner (with its walls and home ore field),
// a river down the middle with the gold island, and the mirror-image enemy half. Everything else is rolled from the map number:
// the river's bends, the island's size, where the bridge crosses, ore fields, forests, the jungle with its ruined base, ridges,
// plateaus and the village. Each one is checked before you play it (below, after the terrain is built) and rolled again if it fails.
const newMapNumber = () => 1 + Math.floor(Math.random() * 999999);
function generateMap(size, seed, attempt = 0) {
  const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0; return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
  const base = MAPS[size], k = base.W / 3600, W0 = base.W, H0 = base.H;
  let st = (seed * 2654435761 + attempt * 40503 + 12345) >>> 0;
  const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (the same number always rolls the same map)
  const R = (a, b) => a + rnd() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1));
  // the river (v5.60: a style is rolled): a narrow stream, the usual river, a wide river, or a lake round the gold island
  const style = ['stream', 'river', 'river', 'wide', 'lake'][RI(0, 4)];
  const river = { amp: Math.round(base.river.amp * R(0.6, 1.4)), period: Math.round(base.river.period * R(0.8, 1.3)),
    half: Math.round(base.river.half * (style === 'stream' ? R(0.65, 0.8) : style === 'wide' ? R(1.3, 1.55) : R(0.9, 1.1))) };
  const rx = y => W0 / 2 + river.amp * Math.sin((y - H0 / 2) / river.period);
  const island = { ...base.island, r: Math.round(base.island.r * R(0.88, 1.12) * (style === 'lake' ? 1.15 : 1)), nodes: Math.max(10, Math.round(base.island.nodes * R(0.75, 1.25))), amount: Math.round(base.island.amount * R(0.85, 1.2) / 50) * 50 };
  const ringW = Math.round(style === 'lake' ? R(90, 130) * k + 30 : style === 'stream' ? 28 : style === 'wide' ? 44 : 34);   // half the width of the water round the island
  { const land = island.r - ringW;   // keep the island's ore on its dry middle
    island.spread = Math.min(island.spread, Math.round(land * 0.72));
    if (island.ring) island.ring = [Math.round(land * 0.5), Math.round(land * 0.88)];
    if (island.inner) island.inner = Math.max(8, Math.round(island.inner * R(0.75, 1.25))); }
  // your start (v5.60: random): somewhere along the south of your half, near enough the sea for the boat to land you
  const S = { x: Math.round(W0 * R(0.07, 0.27)), y: Math.round(H0 - H0 * R(0.12, 0.19)) };
  // your base's wall (v5.60): rock round your base down to the sea - an L from the west edge if the base is in the corner,
  // otherwise a U with a west side too - with 2 or 3 entrances cut in random places
  const seaD = Math.round(H0 / 15 / 50) * 50;
  const bs = R(0.75, 1.4);   // the base's size (v5.60): from cramped to roomy
  const yN = Math.round(S.y - R(290, 360) * k * Math.max(0.9, bs)), xC = Math.round(S.x + R(480, 640) * k * bs), xW = Math.round(S.x - R(420, 560) * k * bs);
  const jit = v => Math.round(v * k * R(-1, 1));
  const top = [[Math.round((Math.max(xW, -40) + xC) / 2), yN + jit(40)], [xC, yN + jit(30)], [xC + jit(40), Math.round(yN + (H0 - yN) * R(0.35, 0.65))], [xC + jit(30), H0 + seaD + 30]];
  const wall = xW < 140 * k ? [[-40, yN], ...top]
    : [[xW + jit(30), H0 + seaD + 30], [xW + jit(40), Math.round(yN + (H0 - yN) * R(0.35, 0.65))], [xW, yN + jit(30)], ...top];
  const seg = wall.slice(1).map((q, i) => Math.hypot(q[0] - wall[i][0], q[1] - wall[i][1])), total = seg.reduce((a, b) => a + b, 0);
  const at = d => { for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const t = Math.min(1, d / seg[i]); return [wall[i][0] + (wall[i + 1][0] - wall[i][0]) * t, wall[i][1] + (wall[i + 1][1] - wall[i][1]) * t]; } d -= seg[i]; } };
  const gapW = R(190, 260) * k, gaps = [];
  const nGaps = RI(2, 3);
  for (let t = 0; gaps.length < nGaps && t < 300; t++) {   // the entrances, apart from each other, clear of the far ends and above the beach
    const d = R(gapW, total - gapW), [, y] = at(d);
    if (y > H0 - 120 * k || gaps.some(g => Math.abs(g - d) < gapW * 2.2)) continue;
    gaps.push(d);
  }
  const baseRidges = [];
  { let piece = [], cuts = gaps.flatMap(g => [g - gapW / 2, g + gapW / 2]).sort((a, b) => a - b);
    const stops = [...new Set([...seg.reduce((acc, l) => (acc.push(acc[acc.length - 1] + l), acc), [0]), ...cuts])].sort((a, b) => a - b);
    const inGap = d => gaps.some(g => Math.abs(g - d) < gapW / 2 - 0.5);
    for (let i = 0; i < stops.length - 1; i++) {
      const mid = (stops[i] + stops[i + 1]) / 2;
      if (inGap(mid)) { if (piece.length > 1) baseRidges.push([piece, 32]); piece = []; continue; }
      if (!piece.length) piece.push(at(stops[i]).map(Math.round));
      piece.push(at(stops[i + 1]).map(Math.round));
    }
    if (piece.length > 1) baseRidges.push([piece, 32]);
  }
  const bx0 = xW < 140 * k ? -9999 : xW - 120 * k, bx1 = xC + 120 * k, by0 = yN - 120 * k;
  const inBase = (x, y, r) => x + r > bx0 && x - r < bx1 && y + r > by0;
  const nearWall = (x, y, r) => baseRidges.some(([pts]) => pts.some((q, i) => i && segDist(x, y, pts[i - 1][0], pts[i - 1][1], q[0], q[1]) < r));
  const placed = [], free = (x, y, r) => placed.every(q => Math.hypot(x - q.x, y - q.y) > r + q.r);
  const onSide = (x, y, r) => x > r + 40 && y > r + 40 && y < H0 - r - 40 && x < rx(y) - river.half - r - 50 && Math.hypot(x - W0 / 2, y - H0 / 2) > island.r + ringW + r + 40;
  let loose = 1;   // when the ground is crowded, pick() relaxes its spacing a little at a time
  const pick = (r, ok) => { for (loose = 1; loose > 0.55; loose -= 0.15) for (let i = 0; i < 250; i++) { const y = R(r + 40, H0 - r - 40), x = R(r + 40, W0 / 2); if (onSide(x, y, r * loose) && !inBase(x, y, r * loose) && free(x, y, r * loose) && (!ok || ok(x, y))) return { x, y }; } return null; };
  const farFromStart = d => (x, y) => Math.hypot(x - S.x, y - S.y) > d * loose;
  // the bridge above the island (its mirror crosses below it)
  const bhw = Math.max(base.bridges[0].hw, river.half + 30), topY = H0 / 2 - island.r - ringW - 230 * k;
  const by = Math.round(R(0.07 * H0, topY));
  const bridges = [{ y: by, hw: bhw }];
  if (rnd() < 0.4) for (let t = 0; t < 20 && bridges.length < 2; t++) { const y2 = Math.round(R(0.05 * H0, topY)); if (Math.abs(y2 - by) > 230 * k) bridges.push({ y: y2, hw: bhw }); }   // sometimes a second crossing
  for (const b of bridges) placed.push({ x: rx(b.y), y: b.y, r: 140 * k }, { x: rx(H0 - b.y), y: H0 - b.y, r: 140 * k });
  // villages with an Oil Derrick (v5.60: random): one or two anywhere on your half, each with 2 to 4 houses round the Derrick
  const villages = [];
  for (let i = RI(1, 2), t = 0; villages.length < i && t < 6; t++) {
    const vr = 190 * k, at = pick(vr, farFromStart(600 * k)); if (!at) continue;
    const houses = [], hn = RI(2, 4), a0 = R(0, Math.PI * 2);
    for (let h = 0; h < hn; h++) { const a = a0 + h * Math.PI * 2 / hn + R(-0.35, 0.35), d = R(95, 120); houses.push([Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d)]); }
    const oa = Math.atan2(S.y - at.y, S.x - at.x) + R(-0.8, 0.8);   // its track heads out roughly toward your side
    villages.push({ x: Math.round(at.x), y: Math.round(at.y), derrick: [0, 0], houses, out: [Math.round(Math.cos(oa) * 230), Math.round(Math.sin(oa) * 230)] });
    placed.push({ x: at.x, y: at.y, r: vr + 20 * k });
  }
  // the jungle with an old ruined base in its clearing, well away from your base
  const forests = [], ruins = [];
  const J = pick(330 * k, farFromStart(900 * k));
  if (J) {
    const jr = R(300, 400) * k;
    forests.push([Math.round(J.x), Math.round(J.y), Math.round(jr), Math.round(jr * R(0.7, 0.85)), R(-0.4, 0.4)]);
    for (let i = RI(1, 2); i > 0; i--) { const a = R(0, Math.PI * 2), d = jr * R(0.6, 0.9); forests.push([Math.round(J.x + Math.cos(a) * d), Math.round(J.y + Math.sin(a) * d), Math.round(jr * R(0.45, 0.65)), Math.round(jr * R(0.35, 0.5)), R(-0.6, 0.6)]); }
    ruins.push({ ...base.ruins[0], x: Math.round(J.x), y: Math.round(J.y) });
    placed.push({ x: J.x, y: J.y, r: jr * 1.35 });
  }
  // plateaus (high ground with cliffs and one or two ramps)
  const plateaus = [];
  for (let i = 0; i < Math.max(2, base.plateaus.length); i++) {
    const pr = R(130, 200) * k, at = pick(pr + 40 * k, farFromStart(500 * k)); if (!at) continue;
    const ramps = [R(0, Math.PI * 2)]; if (rnd() < 0.5) ramps.push(ramps[0] + Math.PI + R(-0.6, 0.6));
    const pl = { x: Math.round(at.x), y: Math.round(at.y), rx: Math.round(pr), ry: Math.round(pr * R(0.62, 0.75)), tilt: R(-1, 1), ramps };
    if (pr < 110) pl.rim = 30;
    plateaus.push(pl); placed.push({ x: at.x, y: at.y, r: pr + 50 * k });
  }
  // ore fields (v5.60: more random): a home field somewhere inside your base, then a random number of fields over your half,
  // each with its own number of crystals, richness and spread, and now and then a small extra patch
  const fieldOf = (big) => ({ nodes: big ? RI(6, 10) : RI(3, 5), amount: Math.round(R(big ? 400 : 350, big ? 700 : 550) / 50) * 50, spread: Math.round(R(big ? 80 : 50, big ? 130 : 75) * k) });
  const home = fieldOf(true); home.nodes = Math.max(home.nodes, 7);
  let hx = null;
  for (let t = 0; t < 200 && !hx; t++) {
    const x = R(Math.max(xW, 0) + home.spread + 90 * k, xC - home.spread - 110 * k), y = R(yN + home.spread + 110 * k, H0 - home.spread - 50 * k);
    if (Math.hypot(x - S.x, y - S.y) > 210 * k + home.spread && !nearWall(x, y, home.spread + 90 * k)) hx = { x, y };
  }
  const fields = [hx ? { ...home, x: Math.round(hx.x), y: Math.round(hx.y) } : base.fields[0]];   // (no room for it: the map is rolled again, below)
  const want = base.fields.length - 1 + RI(-1, 1), wantMin = Math.max(1, base.fields.length - 3);
  for (let i = 0; i < want + RI(0, 2); i++) {
    const big = i < want, f = fieldOf(big), at = pick(f.spread + 90 * k, farFromStart((big ? 520 : 420) * k)); if (!at) continue;
    fields.push({ ...f, x: Math.round(at.x), y: Math.round(at.y) }); placed.push({ x: at.x, y: at.y, r: f.spread + 90 * k });
  }
  // rock ridges: short bent lines of two or three pieces
  const ridges = [...baseRidges];
  for (let i = RI(3, 5), tries = 0; i > 0 && tries < 20; tries++) {
    const a0 = pick(50 * k, farFromStart(450 * k)); if (!a0) continue;
    const pts = [[Math.round(a0.x), Math.round(a0.y)]]; let a = R(0, Math.PI * 2);
    for (let j = RI(2, 3); j > 0; j--) {   // each piece tries a few directions before the ridge stops growing
      let next = null;
      for (let t = 0; t < 8 && !next; t++) {
        const b = a + R(-0.7, 0.7) + (t > 3 ? Math.PI : 0), L = R(140, 250) * k, [px, py] = pts[pts.length - 1], nx = px + Math.cos(b) * L, ny = py + Math.sin(b) * L;
        if (onSide(nx, ny, 40) && !inBase(nx, ny, 40) && free(nx, ny, 15) && Math.hypot(nx - S.x, ny - S.y) > 400 * k) { next = [Math.round(nx), Math.round(ny)]; a = b; }
      }
      if (!next) break;
      pts.push(next);
    }
    if (pts.length < 2) continue;
    i--;
    ridges.push([pts, RI(28, 32)]); for (const [x, y] of pts) placed.push({ x, y, r: 60 * k });
  }
  // a few small woods
  for (let i = RI(2, 4); i > 0; i--) { const r = R(90, 200) * k, at = pick(r + 30 * k, farFromStart(420 * k)); if (!at) continue; forests.push([Math.round(at.x), Math.round(at.y), Math.round(r)]); placed.push({ x: at.x, y: at.y, r: r + 30 * k }); }
  // ponds: a few small bodies of water
  const ponds = [];
  for (let i = RI(1, 4); i > 0; i--) { const pr = R(55, 130) * k, at = pick(pr + 40 * k, farFromStart(420 * k)); if (!at) continue; ponds.push([Math.round(at.x), Math.round(at.y), Math.round(pr), Math.round(pr * R(0.55, 0.9)), R(0, Math.PI)]); placed.push({ x: at.x, y: at.y, r: pr + 40 * k }); }
  const short = !hx || gaps.length < 2 || fields.length < wantMin + 1 || plateaus.length < 2 || ridges.length < baseRidges.length + 2 || !ruins.length || !villages.length;   // too sparse: roll again
  return { label: 'Random', random: true, short, size, seed, attempt, style, baseSize: Math.round(bs * 100) / 100, walls: baseRidges.length, entrances: gaps.length, wantFields: wantMin + 1, W: W0, H: H0, start: S, fields, island, ringW, ridges, forests, plateaus, ponds, river, bridges, ruins, villages };
}
let mapChoice = 'large', randomSize = 'large', mapNumber = 0;
try {
  const m = localStorage.getItem('mini-rts-map'); if (MAPS[m] || m === 'random') mapChoice = m;
  if (MAPS[localStorage.getItem('mini-rts-rsize')]) randomSize = localStorage.getItem('mini-rts-rsize');
  mapNumber = parseInt(localStorage.getItem('mini-rts-seed'), 10) || 0;
} catch (err) {}
if (!mapNumber) { mapNumber = newMapNumber(); try { localStorage.setItem('mini-rts-seed', mapNumber); } catch (err) {} }
let MAP = mapChoice === 'random' ? generateMap(randomSize, mapNumber) : MAPS[mapChoice];

// ---------- Settings (tweak these to balance the game) ----------
const W = MAP.W, H = MAP.H;           // map size in world units (the land, where the game is played: both halves mirror each other in it)
// v5.57: a sea along the south edge, added below the land (nothing on the land moved): HT is the whole picture, land plus sea
const SEA = Math.round(H / 15 / 50) * 50, HT = H + SEA;   // Classic 100, Large 150, Huge 200
const coastY = x => H + SEA * 0.3 + SEA * 0.08 * Math.sin(x / 260) + SEA * 0.05 * Math.sin(x / 97 + 1.3) + SEA * 0.025 * Math.sin(x / 41);   // where the beach meets the water
const CELL = 50;                      // fog-of-war grid size
const COLS = W / CELL, ROWS = HT / CELL;
const START_CREDITS = 1000;
const INCOME = 1;                     // small trickle per second so nobody gets stuck at $0
const BUILD_RADIUS = 300;             // how far from your HQ you can place buildings
const BUILD_RADIUS_OTHER = 200;       // every other finished building (not walls) extends your build area this far

// v5.52 prices (your picks, with the $500 loads): Sniper 250 (was 200), Buggy 400 (250), Light Tank 700 (400), Heavy Tank 1000 (700), Extractor 300 (150); v5.56: Artillery 500 (450)
const COST = { barracks: 300, refinery: 400, factory: 500, power: 200, mg: 300, cannon: 500, missile: 600, laser: 1000, wall: 20, gate: 150, soldier: 100, extractor: 300, buggy: 400, grenadier: 160, engineer: 150, rocket: 200, sniper: 250, light: 700, heavy: 1000, artillery: 500, tech: 600, radar: 300, medbay: 400, helipad: 500, heli: 800, sam: 600, settler: 3000, reactor: 1000, satellite: 1500 };   // (a new Settler is bought at the War Factory: the dearest thing in the game; $2,000 until v5.67)
const WALL_REACH = 150;              // walls, gates and SAM Sites can go this much further out than other buildings
// Turrets (v5.64): an Engineer builds them anywhere you can see, but never this close to an enemy building
const TURRET_TYPES = ['mg', 'cannon', 'missile', 'laser'], TURRET_KEEP_OUT = 300;
const isTurretType = t => t === 'mg' || t === 'cannon' || t === 'missile' || t === 'laser';
const isDefenceType = t => isTurretType(t) || t === 'sam';

const STATS = {
  settler:   { hp: 200, speed: 48, r: 22, sight: 180 },   // (speed 38 until v5.62, +25%) // (r 16 until v5.59: it's a bigger truck now, with the folded HQ on its back)
  soldier:   { hp: 60,  speed: 65, r: 9,  sight: 170, range: 85, dmg: 7, cooldown: 0.8 },   // (speed 52 until v5.62: every unit +25%)
  extractor: { hp: 300, speed: 42, r: 15, sight: 150, capacity: 500, rate: 50, unloadTime: 10 },   // (speed 34 until v5.62, +25%) // (v5.52: a $500 load mined at $50/s, paid out bit by bit over 10 s in the Refinery; was 150, 30/s, 1.5 s)
  buggy:     { hp: 140, speed: 119, r: 13, sight: 220, range: 110, dmg: 4,  cooldown: 0.25 },   // (speed 95 until v5.62, +25%) // fast, machine gun (damage 5 until v5.41)
  light:     { hp: 350, speed: 75, r: 15, sight: 200, range: 130, dmg: 30, cooldown: 1.5, tank: true },   // (speed 60 until v5.62, +25%) // light tank: all-rounder
  heavy:     { hp: 1000, speed: 50, r: 19, sight: 210, range: 140, dmg: 60, cooldown: 2.0, tank: true },   // (speed 40 until v5.62, +25%) // heavy tank: slow, very tough
  // artillery: very slow and fragile, but its shells fly further than a guard tower can shoot and wreck buildings.
  // It can only fire at what your side can see (its own sight is short), can't hit anything too close, and the
  // shells take a while to land, so moving units can dodge them.
  artillery: { hp: 120, speed: 40, r: 13, sight: 150, range: 250, minRange: 80, dmg: 45, cooldown: 4, siege: true, splash: 40, flight: 1.3, spread: 14, vsBuilding: 3, vsVehicle: 0.6 },   // (speed 32 until v5.62, +25%) // (speed 28 until v5.56)
  sniper:    { hp: 45,  speed: 56, r: 9,  sight: 220, range: 160, dmg: 75, cooldown: 2.7, vsVehicle: 0.15, vsBuilding: 0.1, reveal: 0.5 },   // (speed 46 until v5.62; 56 since, swapped with the Rocket Soldier) // one-shots infantry from far away; useless vs vehicles
  rocket:    { hp: 55,  speed: 58, r: 9,  sight: 170, range: 130, dmg: 40, cooldown: 2.5, rocket: true, vsVehicle: 2, vsHeavy: 2, vsBuilding: 2, vsInfantry: 0.4, vsAir: 1 },   // (vsAir 1.5 until v5.65: 8 rockets bring down a helicopter, was 5)   // (speed 45 until v5.62; 58 since, swapped with the Sniper) // (vsHeavy 1.5 until v5.50: Heavy Tanks were too hard to stop)   // (and the only soldier that can hit aircraft)
  // attack helicopter: flies over everything, fires 8 missiles (6 of 35 until v5.49.2), then goes home to its Helipad to reload (about 10 s) and patch up
  heli:      { hp: 300, speed: 112, r: 14, sight: 220, range: 140, dmg: 45, cooldown: 1.0, air: true, ammo: 8, reload: 10, repair: 3, vsVehicle: 1.5, vsBuilding: 1, vsInfantry: 0.5 },   // (speed 90 until v5.62, +25%) // anti-vehicle: double vs vehicles & buildings, weak vs infantry
  grenadier: { hp: 55,  speed: 60, r: 9,  sight: 170, range: 95,  dmg: 16, cooldown: 2.0, splash: 38, flight: 0.55, vsVehicle: 0.5 },   // (speed 48 until v5.62, +25%) // lobbed grenades: area damage, half vs vehicles
  engineer:  { hp: 20,  speed: 60, r: 9,  sight: 150, repair: 30 },   // (speed 48 until v5.62: every unit +25%)
  civilian:  { hp: 40,  speed: 62, r: 8,  sight: 150, range: 75, dmg: 4, cooldown: 0.9 },   // (speed 50 until v5.62, +25%) // villagers with handguns: weaker than a soldier, can't be bought   // no weapon, very fragile: repairs (hp per second) and captures
  hq:        { hp: 900, size: 140, sight: 280 },   // the biggest building in the game
  barracks:  { hp: 500, size: 74, sight: 200, buildTime: 10, trainTime: 4, maxQueue: 5 },
  refinery:  { hp: 600, size: 84, sight: 200, buildTime: 12, trainTime: 6, maxQueue: 3 },
  factory:   { hp: 800, size: 90, sight: 200, buildTime: 14, trainTime: 7, maxQueue: 3 },
  tech:      { hp: 600, size: 70, sight: 180, buildTime: 16 },
  power:     { hp: 400, size: 60, sight: 160, buildTime: 10 },
  // Turrets (v5.64), built by Engineers: a machine gun for infantry, a cannon for vehicles, a missile tower that hits anything (aircraft best), a laser that hits anything hard but slowly
  mg:        { hp: 400, size: 40, sight: 200, buildTime: 8,  range: 160, dmg: 8,  cooldown: 0.35, vsVehicle: 0.25, vsBuilding: 0.5 },
  cannon:    { hp: 600, size: 44, sight: 210, buildTime: 10, range: 180, dmg: 50, cooldown: 2.0, vsVehicle: 1.5, vsInfantry: 0.25 },
  missile:   { hp: 500, size: 44, sight: 230, buildTime: 10, range: 230, dmg: 35, cooldown: 3.5, salvo: 2, hitsAir: true, vsAir: 1.5, vsVehicle: 1, vsHeavy: 1, vsBuilding: 1, vsInfantry: 0.5 },
  laser:     { hp: 600, size: 44, sight: 220, buildTime: 14, range: 180, dmg: 150, cooldown: 4.5, hitsAir: true },
  radar:     { hp: 400, size: 64, sight: 750, buildTime: 14, radar: true },
  reactor:   { hp: 900, size: 84, sight: 180, buildTime: 20 },    // Nuclear Reactor (v5.67): power worth 3 Power Plants; unlocks the Heavy Tank and Laser Turret
  satellite: { hp: 600, size: 72, sight: 200, buildTime: 18 },    // Satellite Radar (v5.67): everything in your explored (grey) fog is in view; unlocks the Missile Turret and the Napalm Strike
  helipad:   { hp: 600, size: 70, sight: 180, buildTime: 12, trainTime: 15, maxQueue: 1 },   // home of one helicopter: it lands here to reload
  sam:       { hp: 500, size: 44, sight: 260, buildTime: 12, range: 240, dmg: 100, cooldown: 1.5, antiAir: true },   // SAM site: shoots only at aircraft
  medbay:    { hp: 500, size: 84, sight: 180, buildTime: 10, walkOn: true, heal: 8, healVehicle: 15, slots: 5 },   // round pad units stand on to heal: up to 5 infantry or 1 vehicle at a time   // sweeps a huge circle: sees over rocks and up onto plateaus (not into forests)
  wall:      { hp: 400, size: 25, sight: 50 },
  gate:      { hp: 600, size: 75, sight: 60 },   // 3 tiles long: room for two units side by side
  // neutral buildings: they start out belonging to no one (team 2) and can't be hurt while neutral
  derrick:   { hp: 600, size: 64, sight: 160, pay: 100, payEvery: 15 },   // an Engineer captures it; then it pays its owner every 15s
  house:     { hp: 400, size: 42, sight: 0 },                             // village houses: scenery for now
};
const PRODUCES = { barracks: ['soldier', 'grenadier', 'rocket', 'sniper', 'engineer'], factory: ['buggy', 'light', 'artillery', 'heavy', 'extractor', 'settler'], helipad: ['heli'] };   // (the Settler is a unit: War Factory, v5.65)   // (Extractors were bought at the Refinery until v5.55; each Refinery still comes with one free)
const HAS_DOOR = t => !!PRODUCES[t] || t === 'refinery';   // buildings whose front door must stay clear (the Refinery for its unloading bay)
// Tech tree: what else you need (finished, and still standing) before you can build or train something
const REQUIRES = { factory: ['barracks', 'refinery'], tech: ['factory'], grenadier: ['power'], rocket: ['power'], sniper: ['power'], mg: ['barracks'], cannon: ['factory'], missile: ['satellite'], laser: ['reactor'], heavy: ['reactor'], reactor: ['tech'], satellite: ['reactor'], settler: ['reactor', 'satellite'],   /* (Settlers need both since v5.67) */ artillery: ['power'], radar: ['power'], medbay: ['barracks'], helipad: ['factory'], sam: ['power'] };
const hasBuilt = (team, type) => game.ents.some(b => b.team === team && b.type === type && b.built && ruinWorks(b));   // (a captured ruin counts once it's repaired to half)
const missingFor = (team, type) => (REQUIRES[type] || []).filter(t => !hasBuilt(team, t));
const unlocked = (team, type) => missingFor(team, type).length === 0;
const TRAIN_TIME = { soldier: 4, buggy: 6, extractor: 6, grenadier: 4.5, engineer: 5, rocket: 5, sniper: 6, light: 10, heavy: 16, artillery: 12, heli: 15, settler: 40 };   // seconds to make each unit
const isCombat = e => e.type === 'civilian' || e.type === 'soldier' || e.type === 'buggy' || e.type === 'grenadier' || e.type === 'rocket' || e.type === 'sniper' || e.type === 'light' || e.type === 'heavy' || e.type === 'artillery' || e.type === 'heli';
const isTank = e => e.type === 'light' || e.type === 'heavy';
const isInfantry = e => e.type === 'civilian' || e.type === 'soldier' || e.type === 'grenadier' || e.type === 'engineer' || e.type === 'rocket' || e.type === 'sniper';
const SHORT = { buggy: 'Buggy', rocket: 'Rocket', sniper: 'Sniper', light: 'Light Tank', heavy: 'Heavy Tank', artillery: 'Artillery', tech: 'Tech Centre', heli: 'Helicopter' };   // shorter names for buttons

// How the computer plays at each difficulty.
//  think: seconds between decisions   slow: build/train time multiplier   income: share of ore value it earns
//  attackAt: army size before it attacks   attackAfter: earliest attack (seconds)   barracks: max barracks
//  maxArmy: it stops training soldiers at this many   guard: units it keeps at home   maxWave: biggest attack wave
//  extractors / refineries: how big its economy gets   walls: whether it builds a wall line with a gate
const DIFFICULTY = {
  easy:   { label: 'Easy',   think: 2.5, slow: 1.5,  income: 0.7,  attackAt: 5, attackAfter: 300, barracks: 1, maxArmy: 11, towers: 0, buggies: false, plants: 0,
            guard: 1, maxWave: 6, extractors: 2, refineries: 2, walls: false, grenadiers: false, engineers: 0, rockets: false, snipers: 0, factory: false, tanks: 0, heavyTanks: false, artillery: 0, raidEvery: 0, waveEvery: 240, minWave: 3, focus: 'nearest',
            derricks: true, derrickAfter: 480, ruinAfter: 540, turrets: 1, turretsTotal: 2, engineerCap: 2, escort: 2, garrison: 1, hill: 0, hillSize: 0, hillAfter: 0 },
  normal: { label: 'Normal', think: 1.5, slow: 1, income: 1, attackAt: 8, attackAfter: 240, barracks: 1, maxArmy: 36, towers: 2, buggies: true, plants: 1,
            guard: 3, maxWave: 16, extractors: 6, refineries: 2, walls: true, grenadiers: true, engineers: 1, rockets: true, snipers: 1, factory: true, tanks: 0.25, heavyTanks: false, artillery: 1, raidEvery: 600, hqGuard: 2, helis: 1, sams: 1, heliSpare: 300, factoryAt: 150, waveEvery: 180, minWave: 8, waveGrow: 3, waveWait: 60, focus: 'economy',
            derricks: true, derrickAfter: 360, ruinAfter: 420, settlers: true, behaviours: true, turrets: 1, turretsTotal: 2, engineerCap: 2, escort: 3, garrison: 2, hill: 1, hillSize: 3, hillAfter: 420 },
  hard:   { label: 'Hard',   think: 1,   slow: 0.9,  income: 1.0,     attackAt: 10, attackAfter: 180, barracks: 3, factories: 2, maxArmy: Infinity, towers: 3, buggies: true, plants: 2,
            guard: 4, maxWave: 36, extractors: 7, refineries: 3, walls: true, grenadiers: true, engineers: 1, rockets: true, snipers: 2, factory: true, tanks: 0.35, heavyTanks: true, artillery: 2, raidEvery: 480, hqGuard: 3, helis: 2, sams: 2, heliSpare: 0, heliSave: true, earlyRefinery: true, expandAt: 1500, antiArmor: 12, reactor: true, waveEvery: 120, minWave: 10, waveGrow: 2, waveWait: 60, focus: 'defences',
            derricks: true, derrickAfter: 300, ruinAfter: 360, settlers: true, behaviours: true, turrets: 1, turretsTotal: 2, engineerCap: 3, escort: 3, garrison: 3, hill: 2, hillSize: 3, hillAfter: 360 },
};
let difficulty = 'normal';
try { if (DIFFICULTY[localStorage.getItem('mini-rts-difficulty')]) difficulty = localStorage.getItem('mini-rts-difficulty'); } catch (err) {}
const diff = () => DIFFICULTY[difficulty];
// Power Plants: each finished one makes building and training 25% faster, up to double speed
// Extra Headquarters (from bought Settlers, v5.65): each one past the first adds another 25% on top, up to triple speed in all
const POWER_BONUS = 0.25, POWER_MAX = 2, HQ_BONUS = 0.25, BOOST_MAX = 3;
const REACTOR_PLANTS = 3;   // a Nuclear Reactor gives as much power as 3 Power Plants (v5.67)
const plantBoost = team => Math.min(POWER_MAX, 1 + POWER_BONUS * game.ents.reduce((n, b) => n + (b.team === team && b.built && ruinWorks(b) ? (b.type === 'power' ? 1 : b.type === 'reactor' ? REACTOR_PLANTS : 0) : 0), 0));
const extraHqs = team => Math.max(0, game.ents.filter(b => b.team === team && b.type === 'hq' && b.hp > 0).length - 1);
const powerBoost = team => Math.min(BOOST_MAX, plantBoost(team) + HQ_BONUS * extraHqs(team));
// how many times longer than normal this side takes to build things (difficulty slow-down ÷ power boost)
const slowOf = e => (e.team === 1 ? diff().slow : 1) / powerBoost(e.team);
const NAMES = { settler: 'Settler', soldier: 'Soldier', extractor: 'Extractor', hq: 'Headquarters', barracks: 'Barracks', refinery: 'Refinery', factory: 'War Factory', buggy: 'Scout Buggy', grenadier: 'Grenadier', engineer: 'Engineer', rocket: 'Rocket Soldier', sniper: 'Sniper', light: 'Light Tank', heavy: 'Heavy Tank', artillery: 'Artillery', tech: 'Tech Centre', mg: 'Machine Gun Turret', cannon: 'Cannon Turret', missile: 'Missile Turret', laser: 'Laser Turret', power: 'Power Plant', radar: 'Radar', medbay: 'Medbay', wall: 'Wall', gate: 'Gate', derrick: 'Oil Derrick', house: 'House', civilian: 'Civilian', helipad: 'Helipad', heli: 'Attack Helicopter', sam: 'SAM Site', reactor: 'Nuclear Reactor', satellite: 'Satellite Radar' };

const TEAMS = [
  { name: 'You',   color: '#3b82f6', dark: '#1d3f8f', light: '#93c5fd' },
  { name: 'Enemy', color: '#ef4444', dark: '#8f1d1d', light: '#fca5a5' },
  { name: 'Neutral', color: '#b8b2a6', dark: '#5f5a52', light: '#e7e5e4' },
];
const NEUTRAL = 2;
// Old ruined bases (Large and Huge maps): neutral, battered buildings an Engineer can capture. They start at RUIN_HP
// of full health and don't work until repaired to RUIN_WORKS of full health.
const RUIN_HP = 0.2, RUIN_WORKS = 0.5, RUIN_SIGHT = 160, RUIN_REPAIR = 1 / 3, RUIN_BUILD = 60;   // RUIN_REPAIR: Engineers fix ruins at a third of the usual speed   // (a broken Radar only sees as far as an ordinary building)
const ruinWorks = e => !e.ruin || (e.team !== NEUTRAL && e.hp >= e.maxHp * RUIN_WORKS);
const animT = e => ruinWorks(e) ? performance.now() / 1000 : 0;   // a ruin that isn't working stands still: no spinning dish, no glow
const isNeutralType = t => t === 'derrick' || t === 'house';
let START = [{ x: MAP.start.x, y: MAP.start.y }, { x: W - MAP.start.x, y: H - MAP.start.y }];   // (a random map's start is rolled; buildWorld sets it again)

// ore fields: a small one by each base, a big rich one in the middle, two on the flanks
let ORE_FIELDS = [];   // (filled in by buildWorld, below)

// ---------- Canvas, camera ----------
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const scr = { w: 0, h: 0, dpr: 1 };
const cam = { x: START[0].x, y: START[0].y, zoom: 1 };
const MM = { w: 168, h: 105, x: 0, y: 0 };   // minimap rectangle (screen px)

function resize() {
  scr.dpr = Math.min(window.devicePixelRatio || 1, 2);
  scr.w = window.innerWidth; scr.h = window.innerHeight;
  canvas.width = Math.round(scr.w * scr.dpr);
  canvas.height = Math.round(scr.h * scr.dpr);
  const small = scr.h < 500;
  MM.w = small ? 150 : 200; MM.h = MM.w * HT / W;
  MM.x = scr.w - MM.w - 10; MM.y = 56;
  clampCam();
}
const scale = () => (scr.h / 640) * cam.zoom;

function clampCam() {
  const s = scale(), hw = scr.w / 2 / s, hh = scr.h / 2 / s;
  const mx = 30 / s, top = 60 / s, bottom = 64 / s;
  cam.x = hw * 2 > W + mx * 2 ? W / 2 : Math.min(W - hw + mx, Math.max(hw - mx, cam.x));
  cam.y = hh * 2 > HT + top + bottom ? HT / 2 : Math.min(HT - hh + bottom, Math.max(hh - top, cam.y));
}
function setZoom(z) { cam.zoom = Math.min(2.2, Math.max(0.45 * 2400 / W, z)); }   // can zoom out further on bigger maps

const toWorld = (sx, sy) => { const s = scale(); return { x: (sx - scr.w / 2) / s + cam.x, y: (sy - scr.h / 2) / s + cam.y }; };

// ---------- Terrain (rocks, river, bridges, forests) ----------
// The map is a grid of 25×25 tiles. Layout is mirrored so both sides are fair.
const TC = 25, TCOLS = W / TC, TROWS = HT / TC;
const T = { GRASS: 0, ROCK: 1, WATER: 2, BRIDGE: 3, FOREST: 4, CLIFF: 5 };
const terrain = new Uint8Array(TCOLS * TROWS);
const elev = new Uint8Array(TCOLS * TROWS);   // 1 = high ground (plateau tops and their ramps)

const mirror = ([x, y]) => [W - x, H - y];
// cliff ridges ([points], thickness) and forests ([x, y, radius]) for your side; mirrored below
let RIDGES = MAP.ridges, FORESTS = MAP.forests;
const riverX = y => W / 2 + MAP.river.amp * Math.sin((y - H / 2) / MAP.river.period);
// half the width of the river's channel across the beach: it widens as it reaches the sea (the background draws the same shape)
function seaChanW(y) { const cy = coastY(riverX(H)), k = Math.max(0, Math.min(1, (y - (H - 10)) / (cy + 20 - (H - 10)))); return MAP.river.half * 1.1 * (1 + 1.5 * k * k * (3 - 2 * k)); }
const SEA_VIEW_ROW = Math.ceil((H + SEA * 0.47) / 50);   // the first row of fog squares that is all water (the sea is always in view from there down)
let ISLAND = { x: W / 2, y: H / 2, r: MAP.island.r };   // the middle ore field sits on an island
// bridges: centre x, centre y, half-width, half-height
let BRIDGES = [
  ...MAP.bridges.map(b => ({ x: riverX(b.y), y: b.y, hw: b.hw, hh: 24 })),
  { x: ISLAND.x - ISLAND.r, y: H / 2, hw: 58, hh: 24 },
];
for (const b of [...BRIDGES]) { const [x, y] = mirror([b.x, b.y]); BRIDGES.push({ ...b, x, y }); }

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function buildTerrain() {
  const ridges = [];
  for (const [pts, th] of RIDGES) { ridges.push([pts, th]); ridges.push([pts.map(mirror), th]); }
  const plateaus = [];
  for (const pl of MAP.plateaus || []) { plateaus.push(pl); const [x, y] = mirror([pl.x, pl.y]); plateaus.push({ ...pl, x, y, ramps: pl.ramps.map(a => a + Math.PI) }); }
  const overhung = (x, y) => plateaus.some(pl => pl.overhang && Math.hypot(x - pl.x, y - pl.y) < Math.max(pl.rx, pl.ry) + 10);
  const ponds = [];
  for (const pd of MAP.ponds || []) { ponds.push(pd); const [x, y] = mirror([pd[0], pd[1]]); ponds.push([x, y, pd[2], pd[3], pd[4]]); }
  const forests = [];
  for (const f of FORESTS) {   // a circle [x, y, r] or an oval jungle [x, y, rx, ry, tilt]
    const g = f.length === 3 ? [f[0], f[1], f[2], f[2], 0] : f;
    forests.push(g); const [x, y] = mirror(g); forests.push([x, y, g[2], g[3], g[4]]);
  }
  const clearings = [];
  for (const ru of MAP.ruins || []) { clearings.push([ru.x, ru.y, ...ru.clearing]); clearings.push([...mirror([ru.x, ru.y]), ...ru.clearing]); }
  for (let r = 0; r < TROWS; r++) {
    for (let c = 0; c < TCOLS; c++) {
      const x = c * TC + TC / 2, y = r * TC + TC / 2;
      const dI = Math.hypot(x - ISLAND.x, y - ISLAND.y);
      let t = T.GRASS;
      for (const [x0, y0, rx, ry, tilt] of forests) {
        const dx = x - x0, dy = y - y0, co = Math.cos(tilt), si = Math.sin(tilt);
        const u = (dx * co + dy * si) / rx, v = (-dx * si + dy * co) / ry, a = Math.atan2(v, u);
        const edge = 0.86 + 0.09 * Math.sin(a * 5 + x0) + 0.05 * Math.sin(a * 11 + y0);   // ragged edge
        if (Math.hypot(u, v) < edge) t = T.FOREST;
      }
      for (const [cx, cy, crx, cry] of clearings) {   // the clearing round an old ruined base, its edge ragged like the jungle's
        const u = (x - cx) / crx, v = (y - cy) / cry, a = Math.atan2(v, u);
        if (Math.hypot(u, v) < 1 + 0.08 * Math.sin(a * 6 + cx) && t === T.FOREST) t = T.GRASS;
      }
      // high ground: inside the oval is raised; its rim is a sheer cliff except where a ramp leads up
      for (const pl of plateaus) {
        const dx = x - pl.x, dy = y - pl.y, co = Math.cos(pl.tilt), si = Math.sin(pl.tilt);
        const u = (dx * co + dy * si) / pl.rx, v = (-dx * si + dy * co) / pl.ry, a = Math.atan2(v, u);
        const edge = 1 + 0.07 * Math.sin(a * 4 + pl.x) + 0.04 * Math.sin(a * 9 + pl.y), d = Math.hypot(u, v) / edge;
        const rimW = (pl.rim || 42) / Math.min(pl.rx, pl.ry);   // thick enough that the cliff never has holes (small plateaus use a thinner rim, or they'd be all cliff)
        if (d < 1 && dI > ISLAND.r + (pl.overhang ? 0 : 34)) {
          const ang = Math.atan2(dy, dx);
          const onRamp = pl.ramps.some(ra => Math.abs(Math.atan2(Math.sin(ang - ra), Math.cos(ang - ra))) < 0.3);
          elev[r * TCOLS + c] = 1;
          if (d > 1 - rimW && !onRamp) t = T.CLIFF;
          else if (t === T.FOREST && d > 1 - rimW) t = T.GRASS;   // keep ramps clear of trees
        }
      }
      for (const [pts, th] of ridges) {
        for (let i = 0; i < pts.length - 1; i++) {
          if (segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < th) t = T.ROCK;
        }
      }
      if (Math.abs(dI - ISLAND.r) < (MAP.ringW || 34) || (Math.abs(x - riverX(y)) < MAP.river.half && dI > ISLAND.r)) {
        if (!(elev[r * TCOLS + c] && overhung(x, y))) t = T.WATER;   // a lookout plateau's rock juts out over the river here
      }
      for (const [px, py, prx, pry, pt] of ponds) {   // ponds (random maps), with a slightly ragged shore
        const dx = x - px, dy = y - py, co = Math.cos(pt), si = Math.sin(pt), u = (dx * co + dy * si) / prx, v = (-dx * si + dy * co) / pry, a = Math.atan2(v, u);
        if (Math.hypot(u, v) < 0.92 + 0.08 * Math.sin(a * 5 + px)) { t = T.WATER; elev[r * TCOLS + c] = 0; }
      }
      if (y >= H) t = y >= coastY(x) - 4 || Math.abs(x - riverX(y)) < seaChanW(y + TC / 2) + 12 ? T.WATER : t === T.ROCK ? T.ROCK : T.GRASS;   // (a random map's base wall carries on across the sand)   // the beach can be walked on (v5.59), the sea and the river's mouth can't
      if (t === T.WATER) elev[r * TCOLS + c] = 0;   // water is never high ground
      for (const b of BRIDGES) if (Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < b.hh) t = T.BRIDGE;
      terrain[r * TCOLS + c] = t;
    }
  }
  // high ground that runs up to (or out over) the river ends in a cliff at the water's edge, one tile thick
  const toCliff = [];
  for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++) {
    const i = r * TCOLS + c;
    if (!elev[i] || terrain[i] === T.CLIFF || terrain[i] === T.WATER) continue;
    let wet = false;
    for (let dr = -1; dr <= 1 && !wet; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < TROWS && cc < TCOLS && terrain[rr * TCOLS + cc] === T.WATER) { wet = true; break; }
    }
    if (wet) toCliff.push(i);
  }
  for (const i of toCliff) terrain[i] = T.CLIFF;
}
// everything worked out from the map, then its terrain (run again for each roll of a random map)
function buildWorld() {
  ORE_FIELDS = [...MAP.fields.flatMap(f => [f, { ...f, x: W - f.x, y: H - f.y }]),
    { x: W / 2, y: H / 2, nodes: MAP.island.nodes, amount: MAP.island.amount, spread: MAP.island.spread, ring: MAP.island.ring, inner: MAP.island.inner }];
  RIDGES = MAP.ridges; FORESTS = MAP.forests;
  START = [{ x: MAP.start.x, y: MAP.start.y }, { x: W - MAP.start.x, y: H - MAP.start.y }];
  ISLAND = { x: W / 2, y: H / 2, r: MAP.island.r };
  BRIDGES = [...MAP.bridges.map(b => ({ x: riverX(b.y), y: b.y, hw: b.hw, hh: 24 })), { x: ISLAND.x - ISLAND.r, y: H / 2, hw: (MAP.ringW || 34) + 24, hh: 24 }];
  for (const b of [...BRIDGES]) { const [x, y] = mirror([b.x, b.y]); BRIDGES.push({ ...b, x, y }); }
  terrain.fill(0); elev.fill(0);
  buildTerrain();
}
// Is this map playable? Your HQ fits where your Settler lands; a vehicle can drive from your start to the enemy's, to the island
// and to every ore field on your side; infantry can reach the village and the ruined base. (Both halves are mirror images.)
function mapPlayable() {
  if (MAP.short) return false;
  const tile = (x, y) => Math.max(0, Math.min(TROWS - 1, Math.floor(y / TC))) * TCOLS + Math.max(0, Math.min(TCOLS - 1, Math.floor(x / TC)));
  for (let dy = -85; dy <= 85; dy += 12) for (let dx = -85; dx <= 85; dx += 12) if (terrain[tile(START[0].x + dx, START[0].y + dy)] !== T.GRASS) return false;
  const reach = foot => {   // flood fill from your start over the ground a vehicle (or a soldier) can cross
    const seen = new Uint8Array(TCOLS * TROWS), q = [tile(START[0].x, START[0].y)]; seen[q[0]] = 1;
    const ok = i => { const t = terrain[i]; return t === T.GRASS || t === T.BRIDGE || (foot && t === T.FOREST); };
    while (q.length) { const i = q.pop(), c = i % TCOLS, r = (i / TCOLS) | 0;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= TCOLS || rr >= TROWS) continue; const j = rr * TCOLS + cc; if (!seen[j] && ok(j)) { seen[j] = 1; q.push(j); } } }
    return seen;
  };
  const near = (seen, x, y, d) => { for (let dy = -d; dy <= d; dy += TC) for (let dx = -d; dx <= d; dx += TC) if (seen[tile(x + dx, y + dy)]) return true; return false; };
  const car = reach(false), man = reach(true);
  if (!near(car, START[1].x, START[1].y, 60) || !near(car, ISLAND.x, ISLAND.y, Math.max(40, (ISLAND.r - (MAP.ringW || 34)) * 0.5))) return false;
  if (!near(car, START[0].x, H - 26, 30)) return false;   // your Settler can drive up from the beach where the boat lands it
  for (const f of MAP.fields) if (!near(car, f.x, f.y, Math.min(60, f.spread))) return false;
  for (const v of MAP.villages || []) { if (!near(man, v.x, v.y, 70)) return false; for (const [dx, dy] of [v.derrick, ...v.houses]) if (terrain[tile(v.x + dx, v.y + dy)] !== T.GRASS) return false; }
  for (const ru of MAP.ruins || []) if (!near(man, ru.x, ru.y, 70)) return false;
  return true;
}
if (MAP.random) {   // roll until the layout has everything (quick), build its terrain, and roll on if it fails the checks
  let tries = 0;
  const roll = () => { while (MAP.short && tries < 300) MAP = generateMap(randomSize, mapNumber, ++tries); };
  roll(); buildWorld();
  while (!mapPlayable() && tries < 300) { MAP = generateMap(randomSize, mapNumber, ++tries); roll(); buildWorld(); }
} else buildWorld();

const elevAt = (x, y) => { const c = Math.floor(x / TC), r = Math.floor(y / TC); return c < 0 || r < 0 || c >= TCOLS || r >= TROWS ? 0 : elev[r * TCOLS + c]; };
const HIGH_SIGHT = 1.25, HIGH_RANGE = 1.2;   // seeing and shooting from high ground
const UPHILL = 0.5;   // shooting up at high ground from below only does half damage (grenades and artillery shells are lobbed, so they don't lose any)
const uphill = (x, y, t) => !t.air && !elevAt(x, y) && elevAt(t.x, t.y) ? UPHILL : 1;   // (aircraft don't care about high ground)
const FOREST_SIGHT = 0.7;   // units standing in a forest can't see as far through the trees
const rangeOf = e => STATS[e.type].range * (!e.air && elevAt(e.x, e.y) ? HIGH_RANGE : 1);
const terrainAt = (x, y) => {
  const c = Math.floor(x / TC), r = Math.floor(y / TC);
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return T.ROCK;
  return terrain[r * TCOLS + c];
};
const isVehicle = e => e.type === 'settler' || e.type === 'extractor' || e.type === 'light' || e.type === 'heavy' || e.type === 'artillery';   // big vehicles: can't get through forests
// can this kind of unit stand on this terrain? (ignores buildings)
const walkable = (t, vehicle) => t === T.GRASS || t === T.BRIDGE || (t === T.FOREST && !vehicle);

// ---------- Pathfinding (A* on the tile grid) ----------
const bldGrid = new Uint8Array(TCOLS * TROWS);
const bldGridV = new Uint8Array(TCOLS * TROWS);   // the same for vehicles: a wider gap round each building, so tanks don't plan routes through gaps only a soldier fits   // tiles covered by buildings (plus a clearance gap)
const CLEAR = 12, CLEAR_V = 20;                                 // keep routes this far from building walls
let bldDirty = true;
const wallKind = new Uint8Array(TCOLS * TROWS);  // 0 none, 1 wall, 2 gate
const wallTeam = new Int8Array(TCOLS * TROWS);
const wallId = new Int32Array(TCOLS * TROWS);
// tiles a wall/gate covers
function wallTiles(b) {
  const out = [], hx = halfX(b), hy = halfY(b);
  for (let r = Math.round((b.y - hy) / TC); r < Math.round((b.y + hy) / TC); r++)
    for (let c = Math.round((b.x - hx) / TC); c < Math.round((b.x + hx) / TC); c++) out.push([c, r]);
  return out;
}
let bldList = [];   // every building and wall piece, for checking a unit's body clears them (see lineClear)
function rebuildBuildingGrid() {
  bldGrid.fill(0); bldGridV.fill(0); wallKind.fill(0);
  bldList = game.ents.filter(isSolid);
  for (const b of game.ents) {
    if (isWallType(b.type)) {
      for (const [c, r] of wallTiles(b)) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const i = r * TCOLS + c; wallKind[i] = b.type === 'wall' ? 1 : 2; wallTeam[i] = b.team; wallId[i] = b.id;
      }
      continue;
    }
    if (!isSolid(b)) continue;
    const h = b.size / 2;
    for (let r = Math.floor((b.y - h - CLEAR_V) / TC); r <= Math.floor((b.y + h + CLEAR_V) / TC); r++) {
      for (let c = Math.floor((b.x - h - CLEAR_V) / TC); c <= Math.floor((b.x + h + CLEAR_V) / TC); c++) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const cx = c * TC + TC / 2, cy = r * TC + TC / 2;
        if (Math.abs(cx - b.x) < h + CLEAR && Math.abs(cy - b.y) < h + CLEAR) bldGrid[r * TCOLS + c] = 1;
        if (Math.abs(cx - b.x) < h + CLEAR_V && Math.abs(cy - b.y) < h + CLEAR_V) bldGridV[r * TCOLS + c] = 1;
      }
    }
  }
  // a gate's end tiles sit right against the wall (or rock) beside them, too tight for a vehicle's body: vehicles plan
  // their route through the middle of the gate, which leaves room for two to pass each other
  for (const b of game.ents) {
    if (b.type !== 'gate') continue;
    const tiles = wallTiles(b);
    for (const [c, r] of [tiles[0], tiles[tiles.length - 1]]) {
      if (!tiles.length || c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
      const [dc, dr] = b.vertical ? [0, r === tiles[0][1] ? -1 : 1] : [c === tiles[0][0] ? -1 : 1, 0];   // the neighbour beyond this end
      const nc = c + dc, nr = r + dr, out = nc < 0 || nr < 0 || nc >= TCOLS || nr >= TROWS;
      if (out || wallKind[nr * TCOLS + nc] === 1 || !walkable(terrain[nr * TCOLS + nc], true)) bldGridV[r * TCOLS + c] = 1;
    }
  }
  bldDirty = false;
  for (const e of game.ents) e.nav = null;   // routes may have changed
}

// who is the route for? (set by findPath) — own gates are open, enemy walls can be smashed through if `breakable`
const P = { team: -1, breakable: false, block: null };   // block: extra cells to treat as solid (used when looking for every way into a base)
function passable(c, r, vehicle) {
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return false;
  const i = r * TCOLS + c;
  if (P.block && P.block.has(i)) return false;
  if ((vehicle ? bldGridV[i] : bldGrid[i]) || !walkable(terrain[i], vehicle)) return false;
  const k = wallKind[i];
  if (!k) return true;
  if (wallTeam[i] === P.team) return k === 2;   // own gate: open; own wall: closed
  return P.breakable;                           // enemy wall/gate: only if we're prepared to break it
}
// is this spot blocked to this team by a wall or (enemy) gate?
function wallBlocks(x, y, team) {
  const c = Math.floor(x / TC), r = Math.floor(y / TC);
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return false;
  const i = r * TCOLS + c, k = wallKind[i];
  return k === 1 || (k === 2 && wallTeam[i] !== team);
}

function nearestPassable(c, r, vehicle) {
  if (passable(c, r, vehicle)) return [c, r];
  for (let rad = 1; rad < 14; rad++) {
    let best = null, bestD = Infinity;
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad || !passable(c + dc, r + dr, vehicle)) continue;
      const d = dc * dc + dr * dr;
      if (d < bestD) { bestD = d; best = [c + dc, r + dr]; }
    }
    if (best) return best;
  }
  return null;
}

// straight line between two points that never touches a blocked tile?
function lineClear(x0, y0, x1, y1, vehicle, rad = 0) {
  if (rad > 0) {
    const pad = rad + 60, lx = Math.min(x0, x1) - pad, hx = Math.max(x0, x1) + pad, ly = Math.min(y0, y1) - pad, hy = Math.max(y0, y1) + pad;
    const near = bldList.filter(b => b.hp > 0 && b.x > lx && b.x < hx && b.y > ly && b.y < hy && !(b.type === 'gate' && b.team === P.team));
    if (near.length) {
      const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
      for (const b of near) {
        if (segDist(b.x, b.y, x0, y0, x1, y1) > Math.hypot(halfX(b), halfY(b)) + rad) continue;   // the line never comes near this one
        const d0 = edgeDist(x0, y0, b);
        for (let i = 1; i <= n; i++) {
          const de = edgeDist(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, b);
          if (de < rad - 0.5 && de < d0 - 0.5) return false;   // the body would push into it
        }
      }
    }
  }
  const brk = P.breakable; P.breakable = false;
  const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / (TC / 3));
  let pc = Math.floor(x0 / TC), pr = Math.floor(y0 / TC), ok = true;
  for (let i = 1; i <= steps && ok; i++) {
    const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
    const c = Math.floor(x / TC), r = Math.floor(y / TC);
    if (!passable(c, r, vehicle)) ok = false;
    else if (c !== pc && r !== pr && (!passable(pc, r, vehicle) || !passable(c, pr, vehicle))) ok = false;
    pc = c; pr = r;
  }
  P.breakable = brk;
  return ok;
}

const N = TCOLS * TROWS;
const gScore = new Float32Array(N), cameFrom = new Int32Array(N), stamp = new Uint32Array(N), closed = new Uint32Array(N);
let searchId = 0;
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

function findPath(sx, sy, tx, ty, vehicle, team = -1, breakable = false, rad = 0) {
  if (bldDirty) rebuildBuildingGrid();
  P.team = team; P.breakable = breakable;
  let start = nearestPassable(Math.floor(sx / TC), Math.floor(sy / TC), vehicle);
  const goal = nearestPassable(Math.floor(tx / TC), Math.floor(ty / TC), vehicle);
  if (!start || !goal) return null;
  const goalExact = passable(Math.floor(tx / TC), Math.floor(ty / TC), vehicle);
  const end = goalExact ? { x: tx, y: ty } : { x: goal[0] * TC + TC / 2, y: goal[1] * TC + TC / 2 };
  if (lineClear(sx, sy, end.x, end.y, vehicle, rad)) return [end];

  searchId++;
  const s = start[1] * TCOLS + start[0], g = goal[1] * TCOLS + goal[0];
  const heap = [];   // binary heap of [f, index]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const h = i => { const dx = Math.abs(i % TCOLS - goal[0]), dy = Math.abs(((i / TCOLS) | 0) - goal[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  stamp[s] = searchId; gScore[s] = 0; cameFrom[s] = -1;
  push(h(s), s);
  let found = false;
  while (heap.length) {
    const [, cur] = pop();
    if (closed[cur] === searchId) continue;
    closed[cur] = searchId;
    if (cur === g) { found = true; break; }
    const cc = cur % TCOLS, cr = (cur / TCOLS) | 0;
    for (const [dc, dr, cost] of NB) {
      const nc = cc + dc, nr = cr + dr;
      if (!passable(nc, nr, vehicle)) continue;
      if (dc && dr && (!passable(cc + dc, cr, vehicle) || !passable(cc, cr + dr, vehicle))) continue;  // no corner cutting
      const ni = nr * TCOLS + nc;
      if (closed[ni] === searchId) continue;
      const ng = gScore[cur] + cost * (terrain[ni] === T.FOREST ? 1.8 : 1) + (wallKind[ni] && wallTeam[ni] !== team ? 12 : 0);
      if (stamp[ni] !== searchId || ng < gScore[ni]) {
        stamp[ni] = searchId; gScore[ni] = ng; cameFrom[ni] = cur;
        push(ng + h(ni), ni);
      }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let i = g; i !== -1; i = cameFrom[i]) cells.push({ x: (i % TCOLS) * TC + TC / 2, y: ((i / TCOLS) | 0) * TC + TC / 2 });
  cells.reverse(); cells[cells.length - 1] = end;
  // smooth: skip corners we can see past
  const path = [];
  let ax = sx, ay = sy, k = 0;
  while (k < cells.length) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--) if (lineClear(ax, ay, cells[j].x, cells[j].y, vehicle, rad)) { far = j; break; }
    path.push(cells[far]); ax = cells[far].x; ay = cells[far].y; k = far + 1;
  }
  return path;
}

// move a unit toward (tx, ty) along a route. Returns true when it gets there, 'fail' if it can't.
function navigate(e, tx, ty, dt) {
  const n = e.nav;
  if (!n || Math.hypot(n.tx - tx, n.ty - ty) > 30 && game.time - n.t > 0.4 || (n.fail && game.time - n.t > 2)) {
    let path = findPath(e.x, e.y, tx, ty, isVehicle(e), e.team, false, e.r), breaking = false;
    if (!path && isCombat(e)) { path = findPath(e.x, e.y, tx, ty, isVehicle(e), e.team, true, e.r); breaking = !!path; }
    e.nav = { tx, ty, t: game.time, path: path || [], i: 0, fail: !path, breaking };
  }
  const nav = e.nav;
  if (nav.fail) return 'fail';
  if (nav.i >= nav.path.length) return true;
  if (!e.prog || Math.hypot(e.x - e.prog.x, e.y - e.prog.y) > 6) { e.prog = { x: e.x, y: e.y, t: game.time }; e.blockN = 0; }
  else if (game.time - e.prog.t > 1.2) {
    // blocked right next to where it was going (someone parked on the spot): call that arrived
    const slot = e.order && e.order.slot;
    e.blockN = (e.blockN || 0) + 1;
    if (Math.hypot(tx - e.x, ty - e.y) < e.r + 30 && (!slot || e.blockN >= 3)) { e.nav = null; e.prog = null; e.blockN = 0; return true; }
    e.prog = { x: e.x, y: e.y, t: game.time };
    const a = Math.random() * Math.PI * 2, nx = e.x + Math.cos(a) * 6, ny = e.y + Math.sin(a) * 6;
    if (walkable(terrainAt(nx, ny), isVehicle(e))) { e.x = nx; e.y = ny; }
    e.nav = null;
    return false;
  }
  // a route point only has to be passed, not stood on: big vehicles can't always reach the exact spot (it may sit
  // closer to a building than their body allows), so once it's within the unit's radius, head for the next one
  // (...but only when the straight line on to the next point leaves room for its body, or it would cut a corner)
  while (nav.i < nav.path.length - 1 && Math.hypot(nav.path[nav.i].x - e.x, nav.path[nav.i].y - e.y) < e.r + 4 &&
         lineClear(e.x, e.y, nav.path[nav.i + 1].x, nav.path[nav.i + 1].y, isVehicle(e), e.r)) nav.i++;
  const p = nav.path[nav.i];
  // the destination itself is too close to a building for this unit's body: as close as it can get counts as there
  if (nav.i === nav.path.length - 1 && Math.hypot(p.x - e.x, p.y - e.y) < e.r + 4 && bldList.some(b => b.hp > 0 && edgeDist(p.x, p.y, b) < e.r)) { nav.i++; return true; }
  if (nav.breaking) {   // an enemy wall or gate is in the way: shoot it down, then carry on
    const a = Math.atan2(p.y - e.y, p.x - e.x), ax = e.x + Math.cos(a) * (e.r + 10), ay = e.y + Math.sin(a) * (e.r + 10);
    if (wallBlocks(ax, ay, e.team)) {
      const i = Math.floor(ay / TC) * TCOLS + Math.floor(ax / TC), w = byId(wallId[i]);
      if (w && w.team !== e.team) { e.order = { type: 'attack', target: w.id, resume: e.order }; e.nav = null; return false; }
    }
  }
  if (e.type === 'extractor' && gateYield(e, nav)) { e.yieldT = (e.yieldT || 0) + dt; e.yieldAt = game.time; return false; }   // let one leaving the base come out first
  if (game.time - (e.yieldAt || -9) > 1) e.yieldT = 0;   // (the wait only counts as over once it has moved on for a second)
  if (moveToward(e, p.x, p.y, dt)) { nav.i++; if (nav.i >= nav.path.length) return true; }
  return false;
}

// Right of way at your own gates: an Extractor leaving the base goes first, one coming in waits just outside until
// it's through. (It gives up waiting after 8 seconds, so two can never lock each other out.)
function gateYield(e, nav) {
  if ((e.yieldT || 0) > 8) return false;
  const hq = hqOf(e.team);
  if (!hq) return false;
  // which side of the gate a point is on: + = the side the HQ is on (inside), - = outside; 0 = in the gateway
  const sideOf = (g, x, y) => { const s = g.vertical ? x - g.x : y - g.y, inSign = Math.sign(g.vertical ? hq.x - g.x : hq.y - g.y) || 1; return Math.abs(s) <= TC / 2 ? 0 : Math.sign(s) * inSign; };
  const along = (g, x, y) => Math.abs(g.vertical ? y - g.y : x - g.x);
  const ahead = n => n ? n.path.slice(n.i, n.i + 3) : [];
  for (const g of game.ents) {
    if (g.type !== 'gate' || g.team !== e.team || g.hp <= 0 || Math.abs(g.x - e.x) > 110 || Math.abs(g.y - e.y) > 110) continue;
    const dist = Math.abs(g.vertical ? e.x - g.x : e.y - g.y);
    if (sideOf(g, e.x, e.y) !== -1 || dist < 34 || dist > 100 || along(g, e.x, e.y) > 70) continue;   // only while waiting its turn just outside
    if (!ahead(nav).some(p => sideOf(g, p.x, p.y) >= 0)) continue;                                      // not heading in through this gate
    for (const o of game.ents) {
      if (o === e || o.type !== 'extractor' || o.team !== e.team || o.hp <= 0 || o.docked || !o.nav || o.nav.fail) continue;
      if (Math.abs(o.x - g.x) > 120 || Math.abs(o.y - g.y) > 120 || along(g, o.x, o.y) > 80) continue;
      const os = sideOf(g, o.x, o.y);
      if (os >= 0 && ahead(o.nav).some(p => sideOf(g, p.x, p.y) === -1)) return true;                    // it's on its way out: wait
    }
  }
  return false;
}

// ---------- Background (drawn once) ----------
const bg = document.createElement('canvas');
(function drawBackground() {
  bg.width = W; bg.height = HT;
  const b = bg.getContext('2d');
  try { paintAll(); } catch (err) { console.warn('background art failed, using a plain one', err); }   // the game still runs
  function paintAll() {
  b.fillStyle = '#4a6b35'; b.fillRect(0, 0, W, HT);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600 * (W * HT) / (2400 * 1500); i++) {
    b.fillStyle = rnd() < 0.5 ? 'rgba(30,50,20,0.18)' : 'rgba(120,150,80,0.15)';
    b.beginPath(); b.arc(rnd() * W, rnd() * HT, 6 + rnd() * 30, 0, Math.PI * 2); b.fill();
  }
  // a few rocky / dry patches for variety
  for (let i = 0; i < 14 * (W * HT) / (2400 * 1500); i++) {
    b.fillStyle = 'rgba(110,95,60,0.25)';
    b.beginPath(); b.ellipse(rnd() * W, rnd() * HT, 60 + rnd() * 120, 30 + rnd() * 60, rnd() * 3, 0, Math.PI * 2); b.fill();
  }
  const each = (type, fn) => {
    for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++)
      if (terrain[r * TCOLS + c] === type) fn(c * TC + TC / 2, r * TC + TC / 2);
  };
  const dot = (x, y, rad, col) => { b.fillStyle = col; b.beginPath(); b.arc(x, y, rad, 0, Math.PI * 2); b.fill(); };
  // Smooth shapes: the tile grid is blurred and cut at a level, so rocks, water and forest come out as one
  // continuous shape with soft natural edges instead of a pile of circles. Level < 0.5 grows the shape, > 0.5 shrinks it.
  const HS = 2;   // masks are made at half size (edges are smooth anyway)
  const small = document.createElement('canvas'); small.width = TCOLS; small.height = TROWS;
  const allMasks = [], keep = m => { m.keep = true; return m; };
  const free = c => { c.width = c.height = 0; };   // hand the memory back straight away
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = HT;   // one scratch canvas reused for every layer
  function mask(types, blur, level) {
    const sc = small.getContext('2d'), img = sc.createImageData(TCOLS, TROWS);
    const pick = typeof types === 'function' ? types : i => types.includes(terrain[i]);
    for (let i = 0; i < terrain.length; i++) if (pick(i)) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = img.data[i * 4 + 3] = 255; }
    sc.putImageData(img, 0, 0);
    const m = document.createElement('canvas'); m.width = W / HS; m.height = HT / HS; allMasks.push(m);
    const mc = m.getContext('2d');
    mc.fillStyle = '#000'; mc.fillRect(0, 0, m.width, m.height);
    mc.filter = `blur(${blur / HS}px)`; mc.imageSmoothingEnabled = true;
    mc.drawImage(small, 0, 0, m.width, m.height); mc.filter = 'none';
    const d = mc.getImageData(0, 0, m.width, m.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i] / 255, a = Math.max(0, Math.min(1, (v - level) / 0.08 + 0.5));
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a * 255;
    }
    mc.putImageData(d, 0, 0);
    return m;
  }
  // paint a fill (colour, or a function that draws a texture) through a mask, optionally shifted
  function paint(m, fill, dx = 0, dy = 0) {
    const t = tmp, tc = t.getContext('2d');
    tc.save(); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, HT);
    if (typeof fill === 'string') { tc.fillStyle = fill; tc.fillRect(0, 0, W, HT); } else fill(tc);
    tc.globalCompositeOperation = 'destination-in'; tc.imageSmoothingEnabled = true;
    tc.drawImage(m, 0, 0, W, HT);
    tc.restore();
    b.drawImage(t, dx, dy);
    if (!m.keep) free(m);
  }
  const speckle = (base, cols, n, rMin, rMax) => tc => {
    tc.fillStyle = base; tc.fillRect(0, 0, W, HT);
    for (let i = 0; i < n * (W * HT) / (2400 * 1500); i++) {
      tc.fillStyle = cols[Math.floor(rnd() * cols.length)];
      tc.beginPath(); tc.ellipse(rnd() * W, rnd() * HT, rMin + rnd() * (rMax - rMin), (rMin + rnd() * (rMax - rMin)) * 0.6, rnd() * 3, 0, Math.PI * 2); tc.fill();
    }
  };

  // river: sandy banks, water, deeper channel, ripples
  const wet = [T.WATER, T.BRIDGE];
  paint(mask(wet, 22, 0.28), '#a08c5b');                       // bank
  paint(mask(wet, 22, 0.36), '#7e8a63');                       // damp edge
  const water = keep(mask(wet, 18, 0.5));
  paint(water, '#2f6390');
  paint(mask(wet, 30, 0.72), '#24537d');                       // deep middle
  paint(water, tc => {                                         // ripples
    tc.strokeStyle = 'rgba(170,215,240,0.28)'; tc.lineWidth = 2;
    for (let i = 0; i < 900 * (W * HT) / (2400 * 1500); i++) {
      const x = rnd() * W, y = rnd() * HT, l = 6 + rnd() * 14;
      tc.beginPath(); tc.moveTo(x, y); tc.quadraticCurveTo(x + l / 2, y - 3, x + l, y); tc.stroke();
    }
  });
  // bridges: wooden planks over the water
  for (const br of BRIDGES) {
    b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(br.x - br.hw + 4, br.y - br.hh + 5, br.hw * 2, br.hh * 2);
    b.fillStyle = '#8b6a3e'; b.fillRect(br.x - br.hw, br.y - br.hh, br.hw * 2, br.hh * 2);
    b.strokeStyle = '#5e4526'; b.lineWidth = 2;
    for (let x = br.x - br.hw + 8; x < br.x + br.hw; x += 9) { b.beginPath(); b.moveTo(x, br.y - br.hh); b.lineTo(x, br.y + br.hh); b.stroke(); }
    b.fillStyle = '#4a3720'; b.fillRect(br.x - br.hw, br.y - br.hh, br.hw * 2, 4); b.fillRect(br.x - br.hw, br.y + br.hh - 4, br.hw * 2, 4);
  }

  // high ground: a shadow at its foot, a craggy cliff face below its south edge, the raised top (a little lighter),
  // dirt slopes for the ramps, and jagged rock along the cliff rim
  const isHigh = i => elev[i] === 1;
  // where a plateau slopes down to the ground (no cliff between) there is no drop, so no cliff face or shadow:
  // find those open edge tiles and keep the face and shadow well clear of them
  const open = new Uint8Array(TCOLS * TROWS);
  for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++) {
    const i = r * TCOLS + c; if (elev[i] !== 1 || terrain[i] === T.CLIFF) continue;
    const low = (cc, rr) => cc >= 0 && rr >= 0 && cc < TCOLS && rr < TROWS && !elev[rr * TCOLS + cc] && terrain[rr * TCOLS + cc] !== T.CLIFF;
    if (low(c + 1, r) || low(c - 1, r) || low(c, r + 1) || low(c, r - 1))
      for (let rr = r - 3; rr <= r + 3; rr++) for (let cc = c - 3; cc <= c + 3; cc++)
        if (cc >= 0 && rr >= 0 && cc < TCOLS && rr < TROWS && (cc - c) ** 2 + (rr - r) ** 2 <= 10) open[rr * TCOLS + cc] = 1;
  }
  const hasFace = i => elev[i] === 1 && !open[i];
  const top = keep(mask(isHigh, 14, 0.5)), face = keep(mask(hasFace, 14, 0.5));
  paint(mask(hasFace, 18, 0.42), 'rgba(0,0,0,0.38)', 12, 20);                                  // shadow on the low ground
  const crag = tc => {   // craggy rock: blotches plus short vertical cracks, like a sheer face
    speckle('#5b4d3c', ['#6d5d48', '#4a3e30', '#7a6a53', '#3d332a'], 2200, 3, 9)(tc);
    tc.strokeStyle = 'rgba(30,24,18,0.5)'; tc.lineWidth = 1.5;
    for (let i = 0; i < 4000 * (W * HT) / (2400 * 1500); i++) { const x = rnd() * W, y = rnd() * HT; tc.beginPath(); tc.moveTo(x, y); tc.lineTo(x + (rnd() - .5) * 4, y + 6 + rnd() * 8); tc.stroke(); }
  };
  for (let k = 22; k > 0; k -= 6) paint(face, crag, 0, k);                                       // cliff face, seen from the south (several layers = height)
  paint(face, tc => { tc.fillStyle = 'rgba(0,0,0,0.3)'; tc.fillRect(0, 0, W, HT); }, 0, 22);
  paint(top, speckle('#577a3c', ['#5f8442', '#4e6f35', '#668a48'], 1500, 6, 26));              // the raised top
  paint(mask([T.CLIFF], 8, 0.5), crag);                                                        // rough rim
  paint(mask([T.CLIFF], 8, 0.62), tc => { tc.fillStyle = 'rgba(190,175,150,0.35)'; tc.fillRect(0, 0, W, HT); }, -2, -3);   // sunlit lip
  // ramps: a sloping dirt track cut into the cliff, lit at the top and in shade at the bottom, with rocky
  // banks either side, worn wheel ruts, scattered stones and a fan of loose earth where it meets the ground
  const plats = [];
  for (const pl of MAP.plateaus || []) { plats.push(pl); const [x, y] = mirror([pl.x, pl.y]); plats.push({ ...pl, x, y, ramps: pl.ramps.map(a => a + Math.PI) }); }
  for (const pl of plats) for (const ra of pl.ramps) {
    const dx = Math.cos(ra), dy = Math.sin(ra), sx = -dy, sy = dx;
    let d = 0; while (d < 600 && elevAt(pl.x + dx * d, pl.y + dy * d)) d += 4;   // where the plateau ends along the ramp
    const ex = pl.x + dx * d, ey = pl.y + dy * d;
    // A ramp is simply the hilltop sloping down to the ground: the same grass, gently shaded so it reads as a
    // slope (lit at the top, a little darker at the bottom), soft shadows where the cliff ends either side,
    // and no hard edges, so it blends into the plateau above and the field below.
    const tx = ex - dx * 36, ty = ey - dy * 36, bx = ex + dx * 58, by = ey + dy * 58;
    const wt = Math.max(30, d * Math.sin(0.3) + 6), mx = (tx + bx) / 2, my = (ty + by) / 2, len = Math.hypot(bx - tx, by - ty);
    const R = Math.ceil(len / 2 + wt + 40), ox = mx - R, oy = my - R;
    const rc = document.createElement('canvas'); rc.width = rc.height = R * 2;
    const c = rc.getContext('2d'); c.translate(-ox, -oy);
    // Everything is built from soft round blobs that fade to nothing at their edges, so no shape has a border
    // and the slope melts into the grass around it.
    const blob = (x, y, r, rgb, a) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    };
    const at = (f, w) => [tx + (bx - tx) * f + sx * w, ty + (by - ty) * f + sy * w];
    // smooth over the hilltop's edge where it crosses the slope, so there is no step
    const fe = 36 / (36 + 58);
    for (let j = -2; j <= 2; j++) for (const df of [-0.06, 0, 0.06]) {
      const [x, y] = at(fe + df, j * wt * 0.3);
      blob(x, y, wt * 0.42, '84,118,58', 0.32);
    }
    // the ground rising and falling: the top of the slope catches the light, the bottom sits in shade
    for (let k = 0; k < 26; k++) {
      const f = rnd(), w = (rnd() - 0.5) * wt * 1.2, [x, y] = at(f, w), r = wt * (0.45 + rnd() * 0.3);
      if (f < 0.5) blob(x, y, r, '200,215,140', 0.07 + (0.5 - f) * 0.12);
      else blob(x, y, r, '25,35,12', 0.06 + (f - 0.5) * 0.22);
    }
    // a few gentle swells and dips across it
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + k * 0.2 + (rnd() - 0.5) * 0.08;
      for (let j = -1; j <= 1; j++) {
        const w = j * wt * 0.4 + (rnd() - 0.5) * 6;
        const [lx, ly] = at(f - 0.05, w), [dx2, dy2] = at(f + 0.05, w);
        blob(lx, ly, wt * 0.32, '215,225,160', 0.1);
        blob(dx2, dy2, wt * 0.34, '20,28,10', 0.13);
      }
    }
    // patches of bare, worn earth where feet and tracks have rubbed the grass away
    for (let k = 0; k < 14; k++) {
      const f = 0.15 + rnd() * 0.7, w = (rnd() - 0.5) * wt * 0.7, [x, y] = at(f, w);
      blob(x, y, 7 + rnd() * 10, rnd() < 0.5 ? '140,118,80' : '118,98,66', 0.16 + rnd() * 0.12);
    }
    // the slope's sides fall away into shade where the cliff runs out
    for (const side of [1, -1]) for (let k = 0; k < 5; k++) {
      const f = 0.05 + k * 0.12, [x, y] = at(f, side * wt * 0.95);
      blob(x, y + 4, wt * 0.38 * (1 - k * 0.12), '20,18,10', 0.22 - k * 0.03);
    }
    // a few stones where the cliff ends crumble onto the slope
    for (const side of [1, -1]) for (let k = 0; k < 6; k++) {
      const f = 0.1 + rnd() * 0.6, w = side * wt * (0.8 + rnd() * 0.25), x = tx + (bx - tx) * f + sx * w, y = ty + (by - ty) * f + sy * w;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(x + 1, y + 1.5, 2 + rnd() * 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = rnd() < 0.5 ? '#8d8070' : '#6f6455'; c.beginPath(); c.arc(x, y, 1.6 + rnd() * 2, 0, Math.PI * 2); c.fill();
    }
    b.drawImage(rc, ox, oy);
  }

  // forests: one dark mass of ground, then a dense canopy of trees that spills a little over its edge
  const woods = keep(mask([T.FOREST], 20, 0.5));
  paint(mask([T.FOREST], 20, 0.42), 'rgba(0,0,0,0.25)', 6, 8);  // shadow
  paint(woods, '#22401c');
  paint(mask([T.FOREST], 20, 0.35), tc => {
    const tree = (x, y, rad, col) => {
      tc.fillStyle = 'rgba(0,0,0,0.3)'; tc.beginPath(); tc.arc(x + 3, y + 4, rad, 0, Math.PI * 2); tc.fill();
      tc.fillStyle = col; tc.beginPath(); tc.arc(x, y, rad, 0, Math.PI * 2); tc.fill();
      tc.fillStyle = 'rgba(150,200,95,0.28)'; tc.beginPath(); tc.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.45, 0, Math.PI * 2); tc.fill();
    };
    const greens = ['#2a5524', '#2f6229', '#25491f', '#356b2c', '#3c7431'];
    each(T.FOREST, (x, y) => { for (let i = 0; i < 3; i++) tree(x + (rnd() - .5) * TC * 1.3, y + (rnd() - .5) * TC * 1.3, 8 + rnd() * 9, greens[Math.floor(rnd() * greens.length)]); });
  });

  // rocks and cliffs: a drop shadow, a sunlit rim, the rock body and a lighter weathered top with cracks
  const rockTypes = [T.ROCK];
  const paintRocks = () => {
  const body = mask(rockTypes, 16, 0.5); body.keep = true;
  paint(mask(rockTypes, 16, 0.44), 'rgba(0,0,0,0.42)', 8, 11);  // shadow on the ground
  paint(body, '#4c4741', 0, 4);                                // dark lower face
  paint(body, '#a49e91', -2, -3);                              // light upper rim
  paint(body, speckle('#6e685f', ['#77716a', '#625d55', '#7c766c'], 900, 4, 14));
  paint(mask(rockTypes, 24, 0.66), speckle('#878175', ['#918b7f', '#7d776c', '#9a9487'], 700, 3, 10), -2, -3);   // weathered top
  paint(body, tc => {                                          // cracks
    tc.strokeStyle = 'rgba(40,36,32,0.45)'; tc.lineWidth = 1.5;
    for (let i = 0; i < 1600 * (W * HT) / (2400 * 1500); i++) {
      let x = rnd() * W, y = rnd() * HT; tc.beginPath(); tc.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += (rnd() - .5) * 14; y += 4 + rnd() * 6; tc.lineTo(x, y); }
      tc.stroke();
    }
  });
  };
  paintRocks();
  // village paths: worn dirt tracks from each house to the derrick, and one leading out of the village
  for (const v of MAP.villages || []) for (const [vx, vy] of [[v.x, v.y], mirror([v.x, v.y])]) {
    const k = vx === v.x ? 1 : -1, dx0 = vx + v.derrick[0] * k, dy0 = vy + v.derrick[1] * k;
    const track = (x1, y1, x2, y2, w) => {
      const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.12;   // a gentle bend
      b.lineCap = 'round';
      b.strokeStyle = 'rgba(105,88,58,0.55)'; b.lineWidth = w + 6; b.beginPath(); b.moveTo(x1, y1); b.quadraticCurveTo(mx, my, x2, y2); b.stroke();
      b.strokeStyle = 'rgba(140,118,80,0.7)'; b.lineWidth = w; b.beginPath(); b.moveTo(x1, y1); b.quadraticCurveTo(mx, my, x2, y2); b.stroke();
    };
    b.fillStyle = 'rgba(120,102,68,0.45)'; b.beginPath(); b.ellipse(dx0, dy0 + 6, 70, 56, 0, 0, Math.PI * 2); b.fill();   // trodden square
    for (const [hx, hy] of v.houses) track(vx + hx * k, vy + hy * k + 18 * k, dx0, dy0, 10);
    const [ox, oy] = v.out || [0, 230];   // the track leading out of the village
    track(dx0, dy0, dx0 + ox * k, dy0 + oy * k, 12);
  }
  // the sea along the south edge (v5.57): a sandy beach, surf, shallows going out to deep water, and the river's mouth
  {
    const band = (off, fill) => { b.beginPath(); b.moveTo(0, HT); for (let x = 0; x <= W; x += 8) b.lineTo(x, coastY(x) + off); b.lineTo(W, HT); b.closePath(); b.fillStyle = fill; b.fill(); };
    // the river's channel across the beach: it follows the river and widens smoothly as it reaches the sea (v5.57.1)
    const half = MAP.river.half, y0 = H - 40, cy = coastY(riverX(H));
    const FR = 18, top = H - 12;   // the sand's corners where it meets the river are rounded off (a quarter circle), so nothing sticks out into the water
    const chanW = (y, w, round) => { const k = Math.max(0, Math.min(1, (y - (H - 10)) / (cy + 20 - (H - 10)))), t = y - top;
      const fillet = !round ? 0 : t < 0 ? FR : t < FR ? FR - Math.sqrt(FR * FR - (FR - t) * (FR - t)) : 0;
      return half * w * 1.1 * (1 + 1.5 * k * k * (3 - 2 * k)) + fillet; };   // (round: the sand's edge, with its corners rounded; the water itself isn't widened)
    const chan = (w, round) => { for (let y = y0; y <= HT; y += 1) b.lineTo(riverX(y) - chanW(y, w, round), y); for (let y = HT; y >= y0; y -= 1) b.lineTo(riverX(y) + chanW(y, w, round), y); b.closePath(); };
    b.save(); b.beginPath(); b.rect(0, 0, W, HT); b.moveTo(riverX(y0) - chanW(y0, 1, true), y0); chan(1, true); b.clip('evenodd');   // sand everywhere but the channel
    b.beginPath(); b.moveTo(0, HT); for (let x = 0; x <= W; x += 4) b.lineTo(x, H - 8 + 3 * Math.sin(x / 53) + 2 * Math.sin(x / 23)); b.lineTo(W, HT); b.closePath();
    b.fillStyle = '#c4ad73'; b.fill();                                            // the beach starts right where the grass ends
    band(-26, '#cdb77c'); band(-12, '#b9a36b'); band(-4, '#8f8a62');            // dry sand, wet sand, damp edge
    b.restore();
    const fade = (r, g, bl) => { const gr = b.createLinearGradient(0, y0, 0, H); gr.addColorStop(0, `rgba(${r},${g},${bl},0)`); gr.addColorStop(1, `rgba(${r},${g},${bl},1)`); return gr; };
    b.beginPath(); chan(1); b.fillStyle = fade(47, 99, 144); b.fill();            // water in the channel, blending in from the river above
    b.beginPath(); chan(0.5); b.fillStyle = fade(36, 83, 125); b.fill();          // its deeper middle
    b.save(); b.beginPath(); b.rect(0, H - 9, W, HT - H + 9); b.clip();            // a damp sandy edge down both banks
    b.strokeStyle = '#8f8a62'; b.lineWidth = 5; b.lineJoin = 'round';
    for (const sgn of [-1, 1]) { b.beginPath(); for (let y = top; y <= cy + 20; y += 1) b.lineTo(riverX(y) + sgn * (chanW(y, 1, true) + 2), y); b.stroke(); }
    b.restore();
    const D = HT - H;
    band(0, '#3e8bab'); band(D * 0.2, '#2f6f9c'); band(D * 0.42, '#255d8a'); band(D * 0.6, '#1d4c76');   // shallows to deep water
    b.lineCap = 'round';
    for (let k = 0; k < 2; k++) {                                                // surf: two broken white lines along the shore
      b.strokeStyle = k ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)'; b.lineWidth = k ? 2 : 3;
      for (let x = 0; x < W; x += 30 + rnd() * 30) { const l = 25 + rnd() * 50; b.beginPath(); for (let t = 0; t <= l; t += 6) b.lineTo(x + t, coastY(x + t) + 3 + k * 12 + Math.sin((x + t) / 9) * 1.5); b.stroke(); }
    }
    b.strokeStyle = 'rgba(200,230,245,0.3)'; b.lineWidth = 2;                   // swell further out
    for (let i = 0; i < W / 18; i++) { const x = rnd() * W, y = coastY(x) + 20 + rnd() * (HT - coastY(x) - 24), l = 10 + rnd() * 22; b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(x + l / 2, y - 4, x + l, y); b.stroke(); }
    for (let i = 0; i < W / 300; i++) { const x = rnd() * W, y = coastY(x) - 14 - rnd() * 8; if (Math.abs(x - riverX(y)) < chanW(y, 1) + 14) continue; b.fillStyle = 'rgba(120,100,70,0.6)'; b.beginPath(); b.ellipse(x, y, 4 + rnd() * 5, 2 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); b.fill(); }   // pebbles on the beach
    b.lineCap = 'butt';
  }
  if (terrain.subarray((H / TC) * TCOLS).includes(T.ROCK)) { b.save(); b.beginPath(); b.rect(0, H - 14, W, HT - H + 14); b.clip(); paintRocks(); b.restore(); }   // a random map's base wall, drawn again over the sand
  b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 6; b.strokeRect(3, 3, W - 6, HT - 6);
  for (const m of allMasks) free(m);
  free(tmp);
  }
})();

// a small copy of the background for the minimap (much cheaper to draw every frame)
const mmBg = document.createElement('canvas');
mmBg.width = 400; mmBg.height = Math.round(400 * HT / W);
mmBg.getContext('2d').drawImage(bg, 0, 0, mmBg.width, mmBg.height);

// ---------- Game state ----------
let game;

function newGame() {
  optsKnown = null; optsCheckAt = 0;   // (no "New construction options" for what a fresh game starts with)
  game = {
    ents: [], ore: [], nextId: 1, time: 0, grenades: [], rockets: [], strikes: [], napalmAt: [null, null],
    lost: [[], []],          // ids of each side's buildings that enemy engineers have taken (to win back)
    stats: [0, 1].map(() => ({ units: 0, buildings: 0, walls: 0, kills: 0, destroyed: 0, unitsLost: 0, buildingsLost: 0, earned: 0, spent: 0, captured: 0 })),
    credits: [START_CREDITS, START_CREDITS],
    selected: new Set(),
    placing: null,           // { type, ghost:{x,y} } while choosing where to build
    effects: [],
    over: null, paused: false,
    ai: { timer: 0, attacking: false, known: new Map(), scout: null, exploreTarget: null },
    track: { made: [{}, {}], lost: [{}, {}], hits: [{}, {}], whoKilled: [{}, {}], timeline: [], nextSample: 0 },   // for the game report: what each side made and lost, and a snapshot every 30 s
  };
  for (const f of fog) { f.vis.fill(0); f.exp.fill(0); }
  { const box = document.getElementById('results'); if (box) box.style.display = 'none'; }
  bldDirty = true;
  let seed = 99;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const f of ORE_FIELDS) {
    if (f.ring) {   // scattered round a ring near the edge, in mirrored pairs so both sides get the same
      // about half of it hugs the shore opposite the river lookouts (where they can shoot), the rest round the ring
      const look = (MAP.plateaus || []).find(pl => pl.overhang), toLook = look ? Math.atan2(look.y - f.y, look.x - f.x) : 0;
      for (let i = 0; i < f.nodes / 2; i++) {
        let x, y, tries = 0;
        const nearLook = look && i % 2 === 0;
        do {
          const a = nearLook ? toLook + (rnd() - 0.5) * 1.1 : rnd() * Math.PI * 2;
          const d = nearLook ? f.ring[1] - 60 + rnd() * 60 : f.ring[0] + rnd() * (f.ring[1] - f.ring[0]);
          x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d;
        }
        while ((terrainAt(x, y) !== T.GRASS || terrainAt(W - x, H - y) !== T.GRASS || game.ore.some(o => Math.hypot(o.x - x, o.y - y) < 45)) && ++tries < 40);
        const rot = rnd() * 6;
        game.ore.push({ id: game.nextId++, x, y, amount: f.amount * ORE_MULT, max: f.amount * ORE_MULT, rot });
        game.ore.push({ id: game.nextId++, x: W - x, y: H - y, amount: f.amount * ORE_MULT, max: f.amount * ORE_MULT, rot: rot + 3 });
      }
      for (let i = 0; i < (f.inner || 0) / 2; i++) {   // and more scattered across the middle, also in mirrored pairs
        let x, y, tries = 0;
        do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (f.ring[0] - 10); x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d; }
        while ((terrainAt(x, y) !== T.GRASS || Math.hypot(x - f.x, y - f.y) < 30 || game.ore.some(o => Math.hypot(o.x - x, o.y - y) < 50)) && ++tries < 40);
        const rot = rnd() * 6;
        game.ore.push({ id: game.nextId++, x, y, amount: f.amount * ORE_MULT, max: f.amount * ORE_MULT, rot });
        game.ore.push({ id: game.nextId++, x: W - x, y: H - y, amount: f.amount * ORE_MULT, max: f.amount * ORE_MULT, rot: rot + 3 });
      }
      continue;
    }
    for (let i = 0; i < f.nodes; i++) {
      let x, y, tries = 0;
      do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * f.spread; x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d; }
      while (terrainAt(x, y) !== T.GRASS && ++tries < 30);
      game.ore.push({ id: game.nextId++, x, y, amount: f.amount * ORE_MULT, max: f.amount * ORE_MULT, rot: rnd() * 6 });
    }
  }
  for (const v of MAP.villages || []) for (const [vx, vy] of [[v.x, v.y], mirror([v.x, v.y])]) {
    const k = vx === v.x ? 1 : -1;   // the mirrored village is turned round too
    spawn('derrick', NEUTRAL, vx + v.derrick[0] * k, vy + v.derrick[1] * k);
    v.houses.forEach(([dx, dy], i) => { spawn('house', NEUTRAL, vx + dx * k, vy + dy * k).look = i % 3; });
  }
  for (const ru of MAP.ruins || []) for (const [rx, ry] of [[ru.x, ru.y], mirror([ru.x, ru.y])]) {
    const k = rx === ru.x ? 1 : -1;   // the mirrored ruin is turned round too
    for (const [type, dx, dy] of ru.buildings) { const b = spawn(type, NEUTRAL, rx + dx * k, ry + dy * k); b.ruin = true; b.hp = b.maxHp * RUIN_HP; }
  }
  spawn('settler', 0, START[0].x, START[0].y);
  spawn('settler', 1, START[1].x, START[1].y);
  startLanding();
  cam.x = START[0].x; cam.y = (START[0].y + H) / 2; setZoom(1); clampCam();   // (between your start spot and the beach, so you see the boat come in)
  updateFog();
}

const spend = (team, n) => { game.credits[team] -= n; if (game.stats[team]) game.stats[team].spent += n; };
const ORE_MULT = 10 / 3;   // each crystal holds this many times the map's listed amount (v5.52: loads went from $150 to $500, so fields last as many trips as before)
const earn = (team, n) => { game.credits[team] += n; if (game.stats[team]) game.stats[team].earned += n; };

function spawn(type, team, x, y) {
  const s = STATS[type];
  const e = { id: game.nextId++, type, team, x, y, hp: s.hp, maxHp: s.hp, order: null,
              cooldown: 0, facing: team === 0 ? -0.6 : 2.5 };
  if (isBuildingType(type)) {
    bldDirty = true;
    e.size = s.size;
    if (type === 'hq' || isWallType(type) || isNeutralType(type) || team === NEUTRAL) { e.built = true; e.progress = 1; }   // walls go up instantly; neutral ruins are already standing
    else { e.built = false; e.progress = 0; e.hp = s.hp * 0.1; }
    e.queue = 0; e.trainT = 0; e.qTypes = [];
  } else {
    e.r = s.r;
    if (type === 'extractor') e.cargo = 0;
    if (s.air) { e.air = true; e.ammo = s.ammo; e.alt = 0; }
  }
  game.ents.push(e);
  return e;
}

function isBuildingType(t) { return t === 'derrick' || t === 'house' || t === 'hq' || t === 'barracks' || t === 'refinery' || t === 'factory' || t === 'tech' || t === 'power' || isTurretType(t) || t === 'radar' || t === 'medbay' || t === 'wall' || t === 'gate' || t === 'helipad' || t === 'sam' || t === 'reactor' || t === 'satellite'; }
const isWallType = t => t === 'wall' || t === 'gate';
const GATE_HALF = TC * 1.5;   // a gate is 3 tiles long
const gateHalf = vertical => vertical ? { hx: TC / 2, hy: GATE_HALF } : { hx: GATE_HALF, hy: TC / 2 };
const halfX = e => e.type === 'gate' ? gateHalf(e.vertical).hx : e.size / 2;
const halfY = e => e.type === 'gate' ? gateHalf(e.vertical).hy : e.size / 2;
const isBuilding = e => isBuildingType(e.type);
const isUnit = e => !isBuilding(e);
// who can shoot at what: only Rocket Soldiers and SAM sites can hit aircraft, and SAM sites shoot at nothing else
const canHit = (e, t) => t.air ? !!(e.type === 'rocket' || STATS[e.type].antiAir || STATS[e.type].hitsAir) : !STATS[e.type].antiAir;   // (Missile and Laser turrets hit aircraft too, v5.64)
// Damage, with a note of who did it (for the game report: which unit types killed what, and how much value they destroyed).
// Value destroyed = the share of the target's health taken off, times its price (things with no price, like Civilians and the HQ, count as $0).
function hurt(t, amount, srcType, srcTeam) {
  if (amount <= 0 || t.hp <= 0) return;
  if (game.track && srcType && (srcTeam === 0 || srcTeam === 1) && (t.team === 0 || t.team === 1) && t.team !== srcTeam) {
    const h = game.track.hits[srcTeam], k = h[srcType] || (h[srcType] = { kills: 0, killValue: 0, damageValue: 0 });
    k.damageValue += Math.min(amount, t.hp) / t.maxHp * (COST[t.type] || 0);
    t.lastHit = srcType; t.lastHitTeam = srcTeam;
  }
  t.hp -= amount;
}
function creditKill(e, extra) {   // e has just died: its killer's unit type gets the kill
  if (!game.track || !e.lastHit || e.lastHitTeam === e.team) return;
  const k = game.track.hits[e.lastHitTeam][e.lastHit]; if (!k) return;
  k.kills += 1 + (extra || 0); k.killValue += COST[e.type] || 0;
  // who killed whom: killer type -> what it killed -> how many (a Turret's gunner counts as its own kill)
  const w = game.track.whoKilled[e.lastHitTeam], row = w[e.lastHit] || (w[e.lastHit] = {});
  row[e.type] = (row[e.type] || 0) + 1;
  if (extra && e.crew) row[e.crew.type] = (row[e.crew.type] || 0) + extra;
}
const isSolid = e => isBuilding(e) && !STATS[e.type].walkOn;   // the Medbay is a pad units walk onto, so it doesn't block movement
const byId = id => game.ents.find(e => e.id === id);
const oreById = id => game.ore.find(o => o.id === id);
const hqOf = team => game.ents.find(e => e.team === team && e.type === 'hq');

// distance from a point to the edge of an entity
function edgeDist(x, y, t) {
  if (isBuilding(t)) {
    const dx = Math.max(Math.abs(x - t.x) - halfX(t), 0), dy = Math.max(Math.abs(y - t.y) - halfY(t), 0);
    return Math.hypot(dx, dy);
  }
  return Math.max(0, Math.hypot(x - t.x, y - t.y) - t.r);
}

function moveToward(e, tx, ty, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = STATS[e.type].speed * dt * (terrainAt(e.x, e.y) === T.FOREST ? 0.55 : 1);
  e.movedAt = game.time;
  if (d <= step || d < 0.5) { e.x = tx; e.y = ty; return true; }
  let ux = dx / d, uy = dy / d;
  // Look a little way ahead for another unit in the way. A friend standing still is asked to step aside;
  // anyone else (a friend on the move, or an enemy) gets steered around instead of bumped into.
  if (!e.docked) {
    const look = e.r * 2 + 14;
    let block = null, bp = Infinity, side = 0;
    const crusher = isTank(e) || e.type === 'extractor';
    for (const o of game.ents) {
      if (o === e || !isUnit(o) || o.docked || o.air || o.hp <= 0) continue;
      if (crusher && o.team !== e.team && isInfantry(o)) continue;   // tanks and extractors drive straight over enemy infantry
      const ox = o.x - e.x, oy = o.y - e.y;
      if (Math.abs(ox) > look + 20 || Math.abs(oy) > look + 20) continue;
      const along = ox * ux + oy * uy;
      if (along <= 0 || along > look || along > d) continue;
      const lat = ox * -uy + oy * ux, room = e.r + o.r + 2;
      if (Math.abs(lat) >= room) continue;
      if (along < bp) { bp = along; block = o; side = lat >= 0 ? -1 : 1; }
    }
    if (block) {
      const parked = block.team === e.team && !block.order && game.time - (block.movedAt || -9) > 0.3 && !(e.rolling && isInfantry(block));
      if (parked && !isBuilding(block) && (d > 70 || !isInfantry(e))) {   // passing through (or a vehicle squeezing by): nudge the parked friend aside
        const px = -uy * -side, py = ux * -side, nx = block.x + px * step * 1.1, ny = block.y + py * step * 1.1;
        if (walkable(terrainAt(nx, ny), isVehicle(block)) && !wallBlocks(nx, ny, block.team)) { block.x = nx; block.y = ny; }
      } else if (block.team === e.team && ((game.time - (block.movedAt || -9) < 0.3 && (block.pace || 0) > 0.6 && Math.cos(block.facing) * ux + Math.sin(block.facing) * uy > 0.5) ||
                 (block.order && block.order.type === 'attack') || (e.nav && e.nav.breaking))) {
        // a friend heading the same way, or busy fighting / smashing a wall: wait behind it instead of everyone swerving about
      } else {   // swerve around it (and keep swerving the same way, so it doesn't dither left-right)
        if (e.swerve && e.swerve.id === block.id && e.swerve.until > game.time) side = e.swerve.side;
        e.swerve = { id: block.id, side, until: game.time + 1.5 };
        const k = 1.1 * (1 - bp / (e.r * 2 + 14)) + 0.35;
        // room to swerve? (your own gate is open, so it doesn't count as in the way; if one side is walled off, try the other)
        const roomAt = (x, y) => walkable(terrainAt(x, y), isVehicle(e)) && !wallBlocks(x, y, e.team) && !bldList.some(b => b.hp > 0 && !(b.type === 'gate' && b.team === e.team) && edgeDist(x, y, b) < e.r);
        for (const sd of [side, -side]) {
          const sx = ux + -uy * sd * k, sy = uy + ux * sd * k, sl = Math.hypot(sx, sy);
          if (roomAt(e.x + sx / sl * step * 3, e.y + sy / sl * step * 3)) { ux = sx / sl; uy = sy / sl; e.swerve.side = sd; break; }
        }
      }
    }
  }
  // don't walk into buildings or walls: if this step would push the body into one, slide along its side instead
  // (an extractor docking at its own refinery is meant to drive in)
  if (!e.docked) {
    const nx = e.x + ux * step, ny = e.y + uy * step, dockRef = e.order && ['docking', 'unloading', 'undocking'].includes(e.order.phase) ? e.order.ref : null;   // only while actually using the bay
    for (const b of bldList) {
      if (b.hp <= 0 || b.id === dockRef || (b.type === 'gate' && b.team === e.team)) continue;
      if (Math.abs(b.x - nx) > halfX(b) + e.r + 2 || Math.abs(b.y - ny) > halfY(b) + e.r + 2) continue;
      const before = edgeDist(e.x, e.y, b);
      if (edgeDist(nx, ny, b) >= e.r || edgeDist(nx, ny, b) >= before) continue;
      // outward direction from the nearest point of the building to the unit
      const cx = Math.max(b.x - halfX(b), Math.min(b.x + halfX(b), e.x)), cy = Math.max(b.y - halfY(b), Math.min(b.y + halfY(b), e.y));
      let ox = e.x - cx, oy = e.y - cy, ol = Math.hypot(ox, oy);
      if (ol < 0.01) { ox = e.x - b.x; oy = e.y - b.y; ol = Math.hypot(ox, oy) || 1; }
      ox /= ol; oy /= ol;
      const into = ux * ox + uy * oy;
      if (into >= 0) continue;
      let sx = ux - into * ox, sy = uy - into * oy;
      const sl = Math.hypot(sx, sy);
      if (sl < 0.15) { sx = -oy; sy = ox; if (sx * dx + sy * dy < 0) { sx = -sx; sy = -sy; } }   // dead on: pick the side nearer the goal
      else { sx /= sl; sy /= sl; }
      ux = sx; uy = sy;
      break;
    }
  }
  // how freely it actually moved last time (1 = full speed), so others can tell a moving queue from a jam
  if (e.lastX !== undefined) e.pace = Math.min(1, Math.hypot(e.x - e.lastX, e.y - e.lastY) / (step || 1));
  e.x += ux * step; e.y += uy * step;
  e.lastX = e.x; e.lastY = e.y;
  e.facing = Math.atan2(uy, ux);
  return false;
}

// ---------- Fog of war (each side has its own; only yours is drawn) ----------
const fog = [0, 1].map(() => ({ vis: new Uint8Array(COLS * ROWS), exp: new Uint8Array(COLS * ROWS) }));
const fogCanvas = document.createElement('canvas');
fogCanvas.width = COLS; fogCanvas.height = ROWS;
const fogCtx = fogCanvas.getContext('2d');
const fogImg = fogCtx.createImageData(COLS, ROWS);

function cellIndex(x, y) {
  const c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)));
  const r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL)));
  return r * COLS + c;
}
const visibleAt = (x, y, team = 0) => fog[team].vis[cellIndex(x, y)] === 1;
const exploredAt = (x, y, team = 0) => fog[team].exp[cellIndex(x, y)] === 1;

// Line of sight: rocks block vision. Seeing is worked out from the viewer's tile to the middle of each fog square;
// a rock in between hides the square (the rock face itself can still be seen). Terrain never changes, so each
// tile + sight radius is worked out once and remembered.
const losCache = new Map();
// which fog squares count as high ground: the middle of the square is, or the only ground you can stand on in it is
// (along a cliff edge over the river the middle of a square can be over the cliff or the water)
const cellHigh = new Uint8Array(COLS * ROWS);
for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
  let hi = false, lo = false;
  for (let y = row * CELL + TC / 2; y < (row + 1) * CELL; y += TC) for (let x = col * CELL + TC / 2; x < (col + 1) * CELL; x += TC) {
    const t = terrainAt(x, y); if (t === T.WATER || t === T.CLIFF || t === T.ROCK) continue;
    if (elevAt(x, y)) hi = true; else lo = true;
  }
  cellHigh[row * COLS + col] = elevAt(col * CELL + CELL / 2, row * CELL + CELL / 2) || (hi && !lo) ? 1 : 0;
}
const overWater = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8); for (let k = 1; k < n; k++) if (terrainAt(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n) === T.WATER) return true; return false; };
function visibleCells(x, y, r) {
  const tc = Math.floor(x / TC), tr = Math.floor(y / TC), key = (tr * TCOLS + tc) * 512 + Math.round(r);
  let cells = losCache.get(key);
  if (cells) return cells;
  const ox = tc * TC + TC / 2, oy = tr * TC + TC / 2, out = [], high = elev[tr * TCOLS + tc];
  const c0 = Math.max(0, Math.floor((ox - r) / CELL)), c1 = Math.min(COLS - 1, Math.floor((ox + r) / CELL));
  const r0 = Math.max(0, Math.floor((oy - r) / CELL)), r1 = Math.min(ROWS - 1, Math.floor((oy + r) / CELL));
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
    const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2, dist = Math.hypot(cx - ox, cy - oy);
    if (dist > r) continue;
    // from low ground you can't see up onto a plateau (except right at the foot of its ramp)
    if (!high && cellHigh[row * COLS + col] && (dist > 60 || overWater(ox, oy, cx, cy))) continue;   // ...and never from across the river
    let clear = true;
    const steps = Math.ceil(dist / 8);
    for (let k = 1; k < steps; k++) {
      const sx = ox + (cx - ox) * k / steps, sy = oy + (cy - oy) * k / steps;
      if (Math.floor(sx / CELL) === col && Math.floor(sy / CELL) === row) break;   // reached the square itself
      if (Math.hypot(sx - ox, sy - oy) < TC * 0.75) continue;                    // standing right by a rock doesn't blind you
      const tt = terrainAt(sx, sy);
      if (tt === T.ROCK || (tt === T.CLIFF && !high)) { clear = false; break; }
    }
    if (clear) out.push(row * COLS + col);
  }
  cells = Int32Array.from(out);
  losCache.set(key, cells);
  return cells;
}

const radarCache = new Map();
function radarCells(x, y, r) {   // every fog square within r: a radar isn't blocked by rocks or cliffs
  const key = Math.round(x) + ',' + Math.round(y) + ',' + r;
  let cells = radarCache.get(key);
  if (cells) return cells;
  const out = [];
  for (let row = Math.max(0, Math.floor((y - r) / CELL)); row <= Math.min(ROWS - 1, Math.floor((y + r) / CELL)); row++)
    for (let col = Math.max(0, Math.floor((x - r) / CELL)); col <= Math.min(COLS - 1, Math.floor((x + r) / CELL)); col++)
      if (Math.hypot(col * CELL + CELL / 2 - x, row * CELL + CELL / 2 - y) <= r) out.push(row * COLS + col);
  cells = Int32Array.from(out); radarCache.set(key, cells);
  return cells;
}

function updateFog() {
  for (const f of fog) { f.vis.fill(0); f.vis.fill(1, SEA_VIEW_ROW * COLS); f.exp.fill(1, SEA_VIEW_ROW * COLS); }   // the open sea is always in view (only scenery: nobody can be out there), so you see your boat come in (v5.58)
  for (const e of game.ents) {
    if (e.team === NEUTRAL) continue;
    const f = fog[e.team];
    if (STATS[e.type].radar && e.built && ruinWorks(e)) { for (const i of radarCells(e.x, e.y, STATS[e.type].sight)) { f.vis[i] = 1; f.exp[i] = 1; } continue; }
    const r = (STATS[e.type].radar ? RUIN_SIGHT : STATS[e.type].sight) * (isBuilding(e) && !e.built ? 0.6 : 1) * (!e.air && elevAt(e.x, e.y) ? HIGH_SIGHT : 1) * (isUnit(e) && !e.air && terrainAt(e.x, e.y) === T.FOREST ? FOREST_SIGHT : 1);
    for (const i of visibleCells(e.x, e.y, r)) { f.vis[i] = 1; f.exp[i] = 1; }
  }
  // a Satellite Radar (v5.67): all the ground its side has explored is in view; black, unexplored ground stays unknown
  for (const t of [0, 1]) if (game.ents.some(b => b.team === t && b.type === 'satellite' && b.built && b.hp > 0)) { const f = fog[t]; for (let i = 0; i < f.vis.length; i++) if (f.exp[i]) f.vis[i] = 1; }
  const d = fogImg.data;
  const mine = fog[0];
  for (let i = 0; i < mine.vis.length; i++) {
    d[i * 4] = 4; d[i * 4 + 1] = 6; d[i * 4 + 2] = 4;
    d[i * 4 + 3] = mine.vis[i] ? 0 : mine.exp[i] ? 130 : 255;
  }
  fogCtx.putImageData(fogImg, 0, 0);
}

// soldiers in a forest can't be seen unless an enemy unit is close, or they've just fired
function hiddenFrom(e, team) {
  if (!isInfantry(e) || e.revealT > 0 || terrainAt(e.x, e.y) !== T.FOREST) return false;
  return !game.ents.some(o => o.team === team && isUnit(o) && Math.abs(o.x - e.x) < 90 && Math.abs(o.y - e.y) < 90 &&
    Math.hypot(o.x - e.x, o.y - e.y) < 90);
}

// can the human player see this thing?
function canSee(e) {
  if (e.team === 0) return true;
  return isBuilding(e) ? exploredAt(e.x, e.y) : visibleAt(e.x, e.y) && !hiddenFrom(e, 0);
}

// ---------- Deploying & building ----------
function siteIsFree(x, y, size) {
  const h = size / 2;
  if (x - h < 10 || y - h < 10 || x + h > W - 10 || y + h > H - 10) return false;
  if (game.ore.some(o => Math.abs(o.x - x) < h + 14 && Math.abs(o.y - y) < h + 14)) return false;
  for (let yy = y - h + 6; yy <= y + h - 6; yy += TC / 2)
    for (let xx = x - h + 6; xx <= x + h - 6; xx += TC / 2) if (terrainAt(xx, yy) !== T.GRASS) return false;
  return !game.ents.some(o => isBuilding(o) &&
    Math.abs(o.x - x) < o.size / 2 + h + 12 && Math.abs(o.y - y) < o.size / 2 + h + 12);
}

// the settler packs itself up and becomes a headquarters where it stands
function deploy(settler) {
  if (settler.boarded || settler.landing) {   // deployed before it has landed (the test tools do this): skip the landing, and the computer's wait
    settler.boarded = settler.landing = false; settler.x = START[settler.team].x; settler.y = START[settler.team].y;
    if (game.landing) { game.landing.phase = 'leave'; game.landing.t = 0; }
    game.aiDeployAt = 0;
  }
  if (!siteIsFree(settler.x, settler.y, STATS.hq.size)) return false;
  settler.hp = 0; settler.deployed = true;
  const hq = spawn('hq', settler.team, settler.x, settler.y);
  if (game.time > 0.1) { hq.unfold = 0; hq.unfoldFrom = settler.facing || 0; }   // the truck turns and the HQ unfolds out of it (v5.59; not when the tools deploy at the very start)
  if (game.selected.delete(settler.id) && settler.team === 0) game.selected.add(hq.id);
  return true;
}

// Your build area: a circle round the HQ plus one round every other finished building (walls and gates don't count),
// so it grows as your base spreads out.
function buildAreaSources(team) {
  return game.ents.filter(b => b.team === team && isBuilding(b) && b.built && !isWallType(b.type) && !isNeutralType(b.type) && !isTurretType(b.type))   // (turrets don't widen your build area)
    .map(b => ({ x: b.x, y: b.y, r: b.size / 2 + (b.type === 'hq' ? BUILD_RADIUS : b.ruin ? RUIN_BUILD : BUILD_RADIUS_OTHER), b }));   // (a captured ruin only reaches across its own clearing)
}
function inBuildArea(team, x, y, extra = 0) {
  if (!hqOf(team)) return false;   // the HQ does the building
  return buildAreaSources(team).some(s => edgeDist(x, y, s.b) <= s.r - s.b.size / 2 + extra);
}

function canPlace(team, type, x, y) {
  const size = STATS[type].size;
  if (!unlocked(team, type)) return false;
  if (!inBuildArea(team, x, y, type === 'sam' ? WALL_REACH : 0) || !siteIsFree(x, y, size)) return false;
  if (team === 1 && diff().walls && hqOf(1)) {   // the computer keeps its planned wall lines and gates clear
    if (!game.ai.wallPlans) { const pl = findEntrances(1).map(planGapWall).filter(Boolean); game.ai.wallPlans = pl.length ? pl : [aiWallPlan(hqOf(1))]; game.ai.gateTried = []; }
    if (game.ai.wallPlans.some(pl => [...pl.tiles, pl.gate].some(t => Math.abs(t.x - x) < size / 2 + 22 && Math.abs(t.y - y) < size / 2 + 22))) return false;
  }
  for (const b of game.ents) {   // never sit on the doorstep of a building that makes units
    if (!isBuilding(b) || !HAS_DOOR(b.type)) continue;
    const od = frontDoor(b);
    if (Math.abs(od.x - x) < size / 2 + 14 && Math.abs(od.y - y) < size / 2 + 14) return false;
  }
  if (!HAS_DOOR(type)) return true;   // towers etc. don't need a door
  // the new building's front door needs open ground in front of it
  const door = { x, y: y + size / 2 + 30 };
  for (const dx of [-16, 0, 16]) if (!walkable(terrainAt(door.x + dx, door.y), true) || terrainAt(door.x + dx, door.y) === T.BRIDGE) return false;
  if (door.y + 14 > H) return false;
  for (const b of game.ents) {
    if (!isBuilding(b)) continue;
    if (edgeDist(door.x, door.y, b) < 30) return false;                 // our door would face a wall
  }
  return true;
}

// walls snap to tiles; gates (3 tiles long) snap to the middle of a tile
const snapWall = (x, y) => ({ x: Math.floor(x / TC) * TC + TC / 2, y: Math.floor(y / TC) * TC + TC / 2 });
// a gate lines up with the tiles; it turns to match the wall it's dropped into unless you've rotated it yourself
function snapGate(x, y, vertical) {
  return { x: Math.floor(x / TC) * TC + TC / 2, y: Math.floor(y / TC) * TC + TC / 2, vertical };
}
function fitGate(x, y, team, forced) {
  if (forced !== undefined) return snapGate(x, y, forced);
  const isWall = (c, r) => c >= 0 && r >= 0 && c < TCOLS && r < TROWS && wallKind[r * TCOLS + c] && wallTeam[r * TCOLS + c] === team;
  const h = snapGate(x, y, false), v = snapGate(x, y, true);
  const c = Math.floor(h.x / TC), r = Math.floor(h.y / TC);
  const hs = isWall(c - 2, r) + isWall(c + 2, r), vs = isWall(c, r - 2) + isWall(c, r + 2);   // walls just past either end
  return vs > hs ? v : h;
}

function canPlaceWallPiece(team, type, x, y, vertical = false) {
  const { hx, hy } = type === 'gate' ? gateHalf(vertical) : { hx: TC / 2, hy: TC / 2 };
  if (!inBuildArea(team, x, y, WALL_REACH)) return false;
  if (x - hx < 0 || y - hy < 0 || x + hx > W || y + hy > H) return false;
  for (let yy = y - hy + TC / 2; yy < y + hy; yy += TC)
    for (let xx = x - hx + TC / 2; xx < x + hx; xx += TC) if (terrainAt(xx, yy) !== T.GRASS) return false;
  if (game.ore.some(o => Math.abs(o.x - x) < hx + 10 && Math.abs(o.y - y) < hy + 10)) return false;
  for (const b of game.ents) {
    if (!isBuilding(b)) continue;
    const gap = isWallType(b.type) ? 0 : 6;   // walls can touch each other, but not other buildings
    if (Math.abs(b.x - x) < halfX(b) + hx + gap - 0.5 && Math.abs(b.y - y) < halfY(b) + hy + gap - 0.5) return false;
    if (HAS_DOOR(b.type)) {   // keep doorways clear
      const d = frontDoor(b);
      if (Math.abs(d.x - x) < hx + 24 && Math.abs(d.y - y) < hy + 22) return false;
    }
  }
  return true;
}

// tiles from the anchor to the end, as a straight line (across, down, or 45°)
function wallLine(a, b) {
  const c0 = Math.floor(a.x / TC), r0 = Math.floor(a.y / TC);
  let dc = Math.floor(b.x / TC) - c0, dr = Math.floor(b.y / TC) - r0;
  if (Math.abs(dc) > 2 * Math.abs(dr)) dr = 0;
  else if (Math.abs(dr) > 2 * Math.abs(dc)) dc = 0;
  else { const n = Math.max(Math.abs(dc), Math.abs(dr)); dc = Math.sign(dc) * n; dr = Math.sign(dr) * n; }
  const steps = Math.max(Math.abs(dc), Math.abs(dr)), out = [];
  for (let i = 0; i <= Math.min(steps, 30); i++) {
    const c = c0 + Math.round(dc * i / (steps || 1)), r = r0 + Math.round(dr * i / (steps || 1));
    out.push({ x: c * TC + TC / 2, y: r * TC + TC / 2 });
  }
  return out;
}

function buildWallLine(team, tiles) {
  let built = 0;
  for (const t of tiles) {
    if (game.credits[team] < COST.wall) break;
    if (!canPlaceWallPiece(team, 'wall', t.x, t.y)) continue;
    spend(team, COST.wall); spawn('wall', team, t.x, t.y); built++; game.stats[team].walls++;
  }
  return built;
}

function placeBuilding(team, type, x, y, vertical) {
  if (type === 'gate') {
    const g = snapGate(x, y, !!vertical);
    if (game.credits[team] < COST.gate || !canPlaceWallPiece(team, 'gate', g.x, g.y, g.vertical)) return false;
    spend(team, COST.gate); game.stats[team].walls++;
    const e = spawn('gate', team, g.x, g.y); e.vertical = g.vertical; bldDirty = true;
    return true;
  }
  if (game.credits[team] < COST[type] || !canPlace(team, type, x, y)) return false;
  spend(team, COST[type]); if (!isWallType(type)) game.stats[team].buildings++;
  spawn(type, team, x, y);
  return true;
}

function produce(b, unit) {
  unit = unit || (PRODUCES[b.type] || [])[0];
  if (!unit || !(PRODUCES[b.type] || []).includes(unit) || !unlocked(b.team, unit) || !b.built || !ruinWorks(b) || b.queue >= STATS[b.type].maxQueue || game.credits[b.team] < COST[unit]) return false;
  if (unit === 'heli' && padHeli(b)) return false;   // a Helipad looks after one helicopter at a time
  spend(b.team, COST[unit]);
  b.queue++; b.qTypes.push(unit);
  return true;
}

// ---------- Ore & extractors ----------
function findOre(x, y, maxDist, team, mustBeExplored) {
  let best = null, bestD = maxDist;
  for (const o of game.ore) {
    if (o.amount <= 0) continue;
    if (mustBeExplored && !exploredAt(o.x, o.y, team)) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// Medbay: your units standing on the pad heal, up to 5 infantry at once, or 1 vehicle on its own. First come, first served.
const MEDBAY_PAD = 40;   // how far from the centre still counts as standing on it (the pad is 42 across from the middle)
function medbayOccupants(b) {
  return game.ents.filter(u => u.team === b.team && isUnit(u) && u.hp > 0 && u.type !== 'settler' && !u.docked && !u.air && Math.hypot(u.x - b.x, u.y - b.y) < MEDBAY_PAD);
}
function updateMedbay(b, dt) {
  const s = STATS.medbay;
  const hurt = medbayOccupants(b).filter(u => u.hp < u.maxHp);
  for (const u of hurt) if (u.medAt === undefined || u.medPad !== b.id) { u.medAt = game.time; u.medPad = b.id; }
  hurt.sort((p, q) => p.medAt - q.medAt);
  let healing = [];
  if (hurt.length) healing = isInfantry(hurt[0]) ? hurt.filter(isInfantry).slice(0, s.slots) : [hurt[0]];
  for (const u of healing) u.hp = Math.min(u.maxHp, u.hp + (isInfantry(u) ? s.heal : s.healVehicle) * dt);
  b.healing = healing.length;
}
// spots on the pad: the middle, then four round it
function medbaySpots(b) { return [[0, 0], [-17, -14], [17, -14], [-17, 14], [17, 14]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })); }
// send units onto a Medbay: one vehicle in the middle, or up to 5 infantry; anyone else waits beside it
function medbaySend(units, b) {
  const vehicles = units.filter(u => !isInfantry(u)), infantry = units.filter(isInfantry), spots = medbaySpots(b);
  let on = [];
  if (infantry.length) on = infantry.slice(0, STATS.medbay.slots).map((u, k) => [u, spots[k]]);
  else if (vehicles.length) on = [[vehicles[0], spots[0]]];
  for (const [u, p] of on) u.order = { type: 'move', x: p.x, y: p.y };
  const rest = units.filter(u => !on.some(([v]) => v === u));
  if (rest.length) groupMove(rest, b.x, b.y + b.size / 2 + 45);
}

function nearestRefinery(e) {
  let best = null, bestD = Infinity;
  for (const b of game.ents) {
    if (b.team !== e.team || b.type !== 'refinery' || !b.built) continue;
    const d = edgeDist(e.x, e.y, b);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}

function startHarvest(e, node) {
  e.outOfOre = false;
  e.order = { type: 'harvest', node: node.id, lastX: node.x, lastY: node.y,
              phase: e.cargo >= STATS.extractor.capacity ? 'toBase' : 'toNode' };
}

// send an idle extractor to the closest ore it knows about
function autoHarvest(e) {
  const node = findOre(e.x, e.y, Infinity, e.team, true);
  if (node) { startHarvest(e, node); return true; }
  e.outOfOre = true;
  return false;
}

// The computer's Extractors fight back, but only against infantry that are trying to kill them: shot by infantry they
// can reach, they drive at the shooter to run it over, and stop as soon as it stops attacking them (switches target, or
// hasn't fired at them for 1.5 s, e.g. it walked off), then go back to work. Also stops if it dies, hides in a forest,
// slips out of sight, or after 8 s / 220 of chasing.
const isAttacking = (t, e) => t.order && t.order.type === 'attack' && t.order.target === e.id;
function runOverShooter(e, dt) {
  const o = e.order;
  if (o && o.type === 'runover') {
    const t = byId(o.target);
    if (t && e.hitBy === t.id && e.hitAt > o.lastHit) o.lastHit = e.hitAt;
    const stillAttacking = t && isAttacking(t, e) && game.time - o.lastHit < 1.5;
    if (!t || t.hp <= 0 || !stillAttacking || game.time > o.until || Math.hypot(e.x - o.fromX, e.y - o.fromY) > 220 || !visibleAt(t.x, t.y, e.team) || !walkable(terrainAt(t.x, t.y), true)) {
      e.order = o.resume || null; e.nav = null; e.hitAt = -9; return false;
    }
    if (navigate(e, t.x, t.y, dt) === 'fail') { e.order = o.resume || null; e.nav = null; e.hitAt = -9; }
    return true;
  }
  if (e.docked || game.time - (e.hitAt || -9) > 1) return false;
  const t = byId(e.hitBy);
  if (!t || t.hp <= 0 || t.team === e.team || t.team === NEUTRAL || !isInfantry(t) || !isAttacking(t, e) || Math.hypot(t.x - e.x, t.y - e.y) > 200 || !walkable(terrainAt(t.x, t.y), true)) return false;
  e.order = { type: 'runover', target: t.id, resume: o && o.type === 'harvest' ? o : null, until: game.time + 8, fromX: e.x, fromY: e.y, lastHit: e.hitAt };
  e.nav = null;
  return true;
}

function updateExtractor(e, dt) {
  crush(e);   // like tanks, a moving extractor runs over enemy infantry in its way
  const s = STATS.extractor, o = e.order;
  e.mining = false;
  if (e.docked && (!o || o.type !== 'harvest' || !['docking', 'unloading', 'undocking'].includes(o.phase))) e.docked = false;
  if (e.team === 1 && runOverShooter(e, dt)) return;
  if (!e.order) return;
  if (e.order !== o) return updateExtractor(e, dt);   // just went back to its job after a chase
  if (o.type === 'move') { if (navigate(e, o.x, o.y, dt)) e.order = null; return; }

  if (o.phase === 'toNode' || o.phase === 'mining') {
    let node = oreById(o.node);
    if (!node || node.amount <= 0) {
      // this patch is used up: look for more ore in the same field
      node = findOre(o.lastX, o.lastY, 260, e.team, false);
      if (!node) {
        if (e.cargo > 0) { o.phase = 'toBase'; o.finish = true; }
        else {
          e.order = null; e.outOfOre = true;
          const r = nearestRefinery(e);   // don't go idle right on a refinery's doorstep
          if (r && Math.hypot(e.x - frontDoor(r).x, e.y - frontDoor(r).y) < 45) { const w = waitSpot(r, e); e.order = { type: 'move', x: w.x, y: w.y }; }
        }
        return;
      }
      o.node = node.id; o.phase = 'toNode';
    }
    o.lastX = node.x; o.lastY = node.y;
    if (o.phase === 'toNode') {
      const arrived = Math.hypot(node.x - e.x, node.y - e.y) <= e.r + 10 || navigate(e, node.x, node.y, dt);
      if (arrived === 'fail') { e.order = null; return; }
      if (arrived) o.phase = 'mining';
    } else {
      const take = Math.min(s.rate * dt, node.amount, s.capacity - e.cargo);
      node.amount -= take; e.cargo += take; e.mining = true;
      e.facing = Math.atan2(node.y - e.y, node.x - e.x);
      if (e.cargo >= s.capacity - 0.01) o.phase = 'toBase';
    }
    return;
  }

  const ref = o.ref && byId(o.ref);
  if (o.phase !== 'toBase' && !ref) {   // refinery destroyed mid-unload
    e.docked = false; o.phase = 'toBase'; o.ref = null; return;
  }

  if (o.phase === 'toBase') {
    const r = (ref && ref.built) ? ref : nearestRefinery(e);
    if (!r) { o.waiting = false; return; }   // no refinery: wait with the load
    o.ref = r.id;
    const d = dockOf(r), dist = Math.hypot(e.x - d.out.x, e.y - d.out.y);
    if (dist > 140) { navigate(e, d.out.x, d.out.y, dt); o.waiting = false; return; }
    if (dockBusy(r, e)) {                    // bay in use: wait to the side, out of the way
      const w = waitSpot(r, e);
      o.waiting = true;
      if (Math.hypot(e.x - w.x, e.y - w.y) > 10) navigate(e, w.x, w.y, dt);
      return;
    }
    o.waiting = false;
    if (r.dockedBy !== e.id) { r.dockedBy = e.id; o.reservedAt = game.time; }   // reserve the bay
    if (dist > 22) {
      navigate(e, d.out.x, d.out.y, dt);
      if (game.time - o.reservedAt > 12) { r.dockedBy = null; o.reservedAt = null; }   // give someone else a turn
      return;
    }
    e.docked = true; o.phase = 'docking';
    return;
  }

  const d = dockOf(ref);
  if (o.phase === 'docking') {
    if (!o.aligned) { o.aligned = moveToward(e, d.out.x, d.out.y, dt); return; }   // line up with the door first
    if (!o.turned) {   // swing round at the door so its tipper faces the bay (v5.55.1: it backs in, like a dump truck)
      const df = Math.atan2(Math.sin(Math.PI / 2 - e.facing), Math.cos(Math.PI / 2 - e.facing)), step = 3.2 * dt;
      if (Math.abs(df) <= step) { e.facing = Math.PI / 2; o.turned = true; } else e.facing += Math.sign(df) * step;
      return;
    }
    if (moveToward(e, d.pad.x, d.pad.y, dt)) { o.phase = 'unloading'; o.t = 0; o.aligned = false; o.turned = false; o.load = e.cargo; o.paid = 0; }
    e.facing = Math.PI / 2;   // then reverse straight in, tail first
    return;
  }

  if (o.phase === 'unloading') {
    // the money trickles in while it sits in the bay (v5.52), whole dollars at a time; cut short, the rest stays on board
    if (o.load === undefined) { o.load = e.cargo; o.paid = 0; }
    o.t += dt;
    const k = Math.min(1, o.t / s.unloadTime), mult = e.team === 1 ? diff().income : 1;
    const due = k >= 1 ? Math.round(o.load * mult) : Math.floor(o.load * k * mult);
    if (due > o.paid) { earn(e.team, due - o.paid); o.paid = due; }
    e.cargo = o.load * (1 - k);
    // (no floating +$ over the Refinery since v5.53.1, your call: the money box and the emptying load bar show it)
    if (k >= 1) { e.cargo = 0; o.load = undefined; o.phase = 'undocking'; }
    return;
  }

  if (o.phase === 'undocking') {
    const done = moveToward(e, d.out.x, d.out.y, dt);
    e.facing = Math.PI / 2;   // drive straight out, nose first
    if (done || edgeDist(e.x, e.y, ref) > e.r) {
      e.docked = false; if (ref.dockedBy === e.id) ref.dockedBy = null;
      if (o.finish) {   // nothing left to collect: park beside the door, not on it
        const w = waitSpot(ref, e);
        e.order = { type: 'move', x: w.x, y: w.y }; e.outOfOre = true;
      } else { o.phase = 'toNode'; o.ref = null; }
    }
  }
}

// ---------- The landing (v5.58) ----------
// The game opens with your Settler arriving on a landing craft: it sails in from the sea, drops its ramp on the beach,
// the Settler drives up onto the land and heads for its start spot, then the boat backs out and leaves.
// The computer starts far from the sea, so its Settler starts in place, but it waits about as long before deploying.
const BOAT_SPEED = 60, BOAT_RAMP = 0.6, BOAT_K = 1.4;
function startLanding() {
  const s0 = game.ents.find(e => e.team === 0 && e.type === 'settler'); if (!s0) return;
  const x = START[0].x, stopY = coastY(x) + 20, y = HT + 90;   // (its bow runs up onto the sand)
  s0.boarded = true; s0.x = x; s0.y = y - 8; s0.facing = -Math.PI / 2;
  game.landing = { x, y, stopY, phase: 'sail', t: 0, ramp: 0, sid: s0.id };
  // the computer deploys once your Settler could have reached its start spot
  game.aiDeployAt = (y - stopY) / BOAT_SPEED + BOAT_RAMP + (stopY - 8 - (H - 26)) / STATS.settler.speed + Math.hypot(START[0].x - x, START[0].y - (H - 26)) / STATS.settler.speed;
}
function updateLanding(dt) {
  const L = game.landing; if (!L) return;
  const s = byId(L.sid);
  if (L.phase === 'sail') {
    L.y = Math.max(L.stopY, L.y - BOAT_SPEED * dt);
    if (s && s.boarded) { s.x = L.x; s.y = L.y - 8; }
    if (L.y <= L.stopY) { L.phase = 'ramp'; L.t = 0; }
  } else if (L.phase === 'ramp') {
    L.t += dt; L.ramp = Math.min(1, L.t / BOAT_RAMP);
    if (L.ramp >= 1) { if (s && s.boarded) { s.boarded = false; s.landing = true; } L.phase = 'unload'; }   // it drives off from where it stands on the deck (v5.61: it used to jump to the end of the ramp)
  } else if (L.phase === 'unload') {
    if (!s || !s.landing) { L.phase = 'leave'; L.t = 0; }
    else if (moveToward(s, L.x, H - 26, dt)) {   // off the ramp and up the beach, then on to its start spot like any order
      s.landing = false; s.facing = -Math.PI / 2;
      if (!s.order) s.order = { type: 'move', x: START[0].x, y: START[0].y };
      L.phase = 'leave'; L.t = 0;
    }
  } else {   // ramp up, back out to sea
    L.t += dt; L.ramp = Math.max(0, 1 - L.t / 0.5);
    if (L.t > 0.6) L.y += BOAT_SPEED * 0.8 * Math.min(1, (L.t - 0.6) / 1.2) * dt;
    if (L.y > HT + 110) game.landing = null;
  }
}

// ---------- Update ----------
function update(dt) {
  if (game.over || game.paused) return;

  game.time += dt;
  if (game.track && game.time >= game.track.nextSample) { game.track.timeline.push(reportSnapshot()); game.track.nextSample += 30; }
  game.credits[0] += INCOME * dt;
  game.credits[1] += INCOME * dt;
  updateLanding(dt);
  for (const e of game.ents) if (e.unfold !== undefined && e.unfold < 1) e.unfold = Math.min(1, e.unfold + dt / HQ_UNFOLD);
  if (bldDirty) rebuildBuildingGrid();

  for (const e of game.ents) {
    if (e.boarded || e.landing) continue;   // your Settler on its boat, or driving off the ramp (the landing moves it)
    if (e.type === 'settler') { if (e.order && navigate(e, e.order.x, e.order.y, dt)) e.order = null; }
    else if (e.air) updateHeli(e, dt);
    else if (isCombat(e)) updateSoldier(e, dt);
    else if (e.type === 'engineer') updateEngineer(e, dt);
    else if (e.type === 'extractor') updateExtractor(e, dt);
    else if (isDefenceType(e.type)) updateTower(e, dt);
    else if (e.type === 'derrick') updateDerrick(e, dt);
    else if (isBuilding(e)) updateBuilding(e, dt);
  }

  separate();
  updateNapalm(dt);

  for (const e of game.ents) {
    if (e.team === NEUTRAL) { e.hp = e.maxHp * (e.ruin ? RUIN_HP : 1); continue; }   // neutral buildings can't be hurt (ruins stay as battered as they are)
    if (e.type === 'derrick' && e.hp <= 0) {
      game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: true });
      game.effects.push({ kind: 'text', x: e.x, y: e.y - 34, text: 'Derrick knocked out', t: 0, color: '#e7e5e4' });
      e.team = NEUTRAL; e.hp = e.maxHp; e.payT = 0; e.takenAt = undefined; e.target = null;
      game.ai.known.delete(e.id); bldDirty = true;
      continue;
    }
    if (e.ruin && e.hp <= 0 && !e.sold) {   // a ruined base's building isn't destroyed: it falls back into a neutral ruin, ready to be taken again
      const was = e.team;
      game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: true });
      if (was === 0 || visibleAt(e.x, e.y)) game.effects.push({ kind: 'text', x: e.x, y: e.y - 34, text: was === 0 ? 'Ruin lost' : 'Ruin knocked out', t: 0, color: '#e7e5e4' });
      if (was === 0 || was === 1) { game.stats[was].buildingsLost++; game.stats[1 - was].destroyed++; }
      creditKill(e);
      e.team = NEUTRAL; e.hp = e.maxHp * RUIN_HP; e.queue = 0; e.qTypes = []; e.trainT = 0; e.target = null; e.takenAt = undefined;
      game.selected.delete(e.id); game.ai.known.delete(e.id); bldDirty = true;
      continue;
    }
    if (e.hp <= 0) {
      if (!e.deployed && !e.sold && (e.team === 0 || e.team === 1) && !isWallType(e.type)) {
        const mine = game.stats[e.team], theirs = game.stats[1 - e.team];
        if (isBuilding(e)) { mine.buildingsLost++; theirs.destroyed++; } else { mine.unitsLost++; theirs.kills++; }
        if (game.track) game.track.lost[e.team][e.type] = (game.track.lost[e.team][e.type] || 0) + 1;
        creditKill(e);
        if (isTurretType(e.type) && e.team === 1) game.ai.turretLostAt = game.time;
      }
      game.selected.delete(e.id);
      if (isBuilding(e)) bldDirty = true;
      if (!e.deployed) game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: e.type !== 'soldier' && e.type !== 'buggy' });
    }
  }
  game.ents = game.ents.filter(e => e.hp > 0);
  game.ore = game.ore.filter(o => o.amount > 0);

  // grenades in flight: when one lands it hurts every enemy close by (most in the middle, half at the edge)
  for (const g of game.grenades) {
    g.t += dt;
    if (g.t < g.dur) continue;
    g.done = true;
    for (const o of game.ents) {
      if (o.team === g.team || o.hp <= 0 || o.air) continue;   // (they burst on the ground: aircraft are out of reach)
      const d = edgeDist(g.x, g.y, o);
      const vehicle = isUnit(o) && !isInfantry(o);
      const mult = isBuilding(o) ? (g.vsBuilding || 1) : vehicle ? (g.vsVehicle || STATS.grenadier.vsVehicle) : 1;
      if (d <= g.r) { hurt(o, g.dmg * (1 - 0.5 * d / g.r) * mult, g.srcType, g.team); if (g.src && isUnit(o)) { o.hitBy = g.src; o.hitAt = game.time; } }
    }
    game.effects.push({ kind: 'blast', x: g.x, y: g.y, r: g.r, t: 0, big: !!g.shell });
  }
  game.grenades = game.grenades.filter(g => !g.done);
  // rockets in flight: home in on the target and hit hard (double vs vehicles & buildings, weak vs infantry)
  for (const r of game.rockets) {
    const t = byId(r.target);
    if (t && t.hp > 0) { r.tx = t.x; r.ty = t.y - (t.air ? (t.alt || 0) * HELI_LIFT : 0); }   // (at an aircraft: up at its body, not its shadow)
    const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy), step = 480 * dt;
    r.ang = Math.atan2(dy, dx); r.life -= dt;
    if (Math.random() < 0.6) game.effects.push({ kind: 'dust', x: r.x, y: r.y, t: 0.2 });
    if (d <= step + (t ? t.r || 0 : 0) * 0.5 || r.life <= 0) {
      r.done = true;
      if (t && t.hp > 0 && d <= step + 30) {
        const S = STATS[r.srcType] || STATS.rocket;
        if (r.src && isUnit(t)) { t.hitBy = r.src; t.hitAt = game.time; }
        const mult = r.srcType === 'sam' ? 1
          : r.srcType === 'missile' ? (t.air ? S.vsAir : isInfantry(t) ? S.vsInfantry : isBuilding(t) ? S.vsBuilding : S.vsVehicle)   // Missile Turret: anything, aircraft best
          : r.srcType === 'heli' ? (isInfantry(t) ? S.vsInfantry : isBuilding(t) ? S.vsBuilding : S.vsVehicle)   // helicopter missiles: made for tanks and buildings
          : (t.air ? S.vsAir : isInfantry(t) ? S.vsInfantry : isBuilding(t) ? S.vsBuilding : t.type === 'heavy' ? S.vsHeavy : S.vsVehicle);   // the heavy tank's thick armour shrugs off some of it
        hurt(t, r.dmg * mult * (r.srcType === 'rocket' ? uphill(r.fromX, r.fromY, t) : 1), r.srcType, r.team);
      }
      game.effects.push({ kind: 'blast', x: r.tx, y: r.ty, r: 16, t: 0 });
    } else { r.x += dx / d * step; r.y += dy / d * step; }
  }
  game.rockets = game.rockets.filter(r => !r.done);
  for (const fx of game.effects) fx.t += dt;
  game.effects = game.effects.filter(fx => fx.t < (fx.kind === 'shot' ? 0.08 : fx.kind === 'text' ? 1.2 : fx.kind === 'spark' ? 0.3 : fx.kind === 'blast' ? 0.45 : fx.kind === 'beam' ? 0.35 : 0.6));

  defendBuildings();
  runAI(dt);
  updateFog();

  // a side is beaten once its HQ is gone (before it has deployed, its Settler)
  const alive = [0, 1].map(t => game.ents.some(e => e.team === t && (e.type === 'hq' || e.type === 'settler')));
  if (!alive[1]) endGame(true);
  else if (!alive[0]) endGame(false);
}

// a building one of your engineers is on its way to take back: don't shoot it
// (for the first minute after it's taken, everyone holds fire while an engineer gets there)
const beingRetaken = (o, team) => isBuilding(o) && ((o.takenAt !== undefined && o.team !== team && game.time - o.takenAt < 60 && game.lost[team].includes(o.id)) || game.ents.some(en => en.team === team && en.type === 'engineer' && en.order && en.order.type === 'capture' && en.order.target === o.id));
const lobs = e => !!(STATS[e.type].splash || STATS[e.type].siege);
const holdsGround = e => e.type === 'sniper' || !!elevAt(e.x, e.y);   // snipers and units up on high ground don't leave their spot to chase   // grenadiers and artillery arc their shots
function clearShot(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 8);
  for (let k = 1; k < n; k++) {
    const t = k / n, along = t * d;
    if (along < 14 || d - along < 14) continue;
    if (terrainAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) === T.ROCK) return false;
  }
  return true;
}
const canShoot = (e, t) => lobs(e) || e.air || t.air || clearShot(e.x, e.y, t.x, t.y);   // (shots up at aircraft, or down from them, clear the rocks)

function findEnemyNear(e, radius) {
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || hiddenFrom(o, e.team) || isWallType(o.type) || beingRetaken(o, e.team) || !canHit(e, o)) continue;
    if (!visibleAt(o.x, o.y, e.team)) continue;   // can't pick a target it can't see (behind rocks or in the fog)
    if (!canShoot(e, o)) continue;   // no clear line of fire (rock in the way)
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// Armour: rifles (soldiers, buggy machine gun, handguns) only do half damage to tanks (turrets have their own multipliers);
// tank shells do a quarter damage to infantry (v5.63, was half; but splash a little onto anyone standing next to the target). Rockets, grenades and snipers have their own rules.
const RIFLES = { soldier: 1, buggy: 1, civilian: 1 };   // (handguns count as rifles: half damage to tanks)
const armour = (attacker, t) => (isTank(t) && RIFLES[attacker] ? 0.5 : 1) * ((attacker === 'light' || attacker === 'heavy') && isInfantry(t) ? 0.25 : 1);   // (tank shells vs infantry: a quarter since v5.63, was half)
// tanks run over enemy infantry they drive into
function crush(e) {
  e.rolling = e.cx !== undefined && Math.hypot(e.x - e.cx, e.y - e.cy) > 0.2;
  if (e.rolling) {
    for (const o of game.ents) {
      if (o.team === e.team || !isInfantry(o) || o.hp <= 0) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < e.r * 0.75 + o.r * 0.5) {
        hurt(o, o.hp, e.type, e.team);
        game.effects.push({ kind: 'text', x: o.x, y: o.y - 10, text: 'Crushed!', t: 0, color: '#ffb0a0' });
      }
    }
  }
  e.cx = e.x; e.cy = e.y;
}

// The computer's tanks (Normal and Hard, v5.66): enemy infantry that come too close (within 60 of its hull) get run over:
// it drives straight at them for up to 3 s, then goes back to what it was doing, and waits 2 s before trying again.
const RUNOVER_RANGE = 60;
function aiRunOver(e, dt) {
  const o = e.order;
  const end = () => { e.order = o.resume || null; e.nav = null; e.crushCd = game.time + 2; };
  if (o && o.type === 'crush') {
    const t = byId(o.target);
    if (!t || t.hp <= 0 || game.time > o.until || Math.hypot(t.x - e.x, t.y - e.y) > 160 || !visibleAt(t.x, t.y, e.team) || !walkable(terrainAt(t.x, t.y), true)) { end(); return false; }
    if (navigate(e, t.x, t.y, dt) === 'fail') end();
    return true;
  }
  if (e.passive || game.time < (e.crushCd || 0)) return false;
  let t = null, td = RUNOVER_RANGE;
  for (const v of game.ents) {
    if (v.team === e.team || v.team === NEUTRAL || !isInfantry(v) || v.hp <= 0 || hiddenFrom(v, e.team)) continue;
    const d = Math.hypot(v.x - e.x, v.y - e.y) - e.r - v.r;
    if (d < td && walkable(terrainAt(v.x, v.y), true) && visibleAt(v.x, v.y, e.team)) { td = d; t = v; }
  }
  if (!t) return false;
  e.order = { type: 'crush', target: t.id, resume: o || null, until: game.time + 3 }; e.nav = null;
  return true;
}
// The computer's infantry (Normal and Hard, v5.66) step out of the way of an enemy tank or Extractor that is driving at them
// (close in front of it and moving): a quick sidestep to whichever side they're already on.
function aiDodge(e, dt) {
  for (const v of game.ents) {
    if (v.team === e.team || v.team === NEUTRAL || !(isTank(v) || v.type === 'extractor') || !v.rolling || v.hp <= 0) continue;
    const dx = e.x - v.x, dy = e.y - v.y, d = Math.hypot(dx, dy);
    if (d > v.r + e.r + 45 || d < 0.01) continue;
    const fx = Math.cos(v.facing || 0), fy = Math.sin(v.facing || 0);
    if ((dx * fx + dy * fy) / d < 0.55) continue;   // not in front of it
    let side = dx * -fy + dy * fx >= 0 ? 1 : -1;
    for (let k = 0; k < 2; k++, side = -side) {
      const tx = e.x - fy * side * 30, ty = e.y + fx * side * 30;
      if (walkable(terrainAt(tx, ty), false) && !game.ents.some(b => isSolid(b) && Math.abs(b.x - tx) < halfX(b) + e.r && Math.abs(b.y - ty) < halfY(b) + e.r)) { moveToward(e, tx, ty, dt); e.dodgedAt = game.time; return true; }
    }
  }
  return false;
}

// artillery picks its own targets by what it's for: turrets and SAM Sites first, then other buildings, then units
// a spot within this unit's range of a building that it can actually get to (nearest first), for when the building itself is boxed in
function approachSpot(e, b) {
  const d = Math.max(halfX(b), halfY(b)) + rangeOf(e) * 0.8, spots = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d; if (walkable(terrainAt(x, y), isVehicle(e))) spots.push({ x, y, dd: Math.hypot(x - e.x, y - e.y) }); }
  spots.sort((p, q) => p.dd - q.dd);
  for (const s of spots) if (findPath(e.x, e.y, s.x, s.y, isVehicle(e), e.team, isCombat(e), e.r)) return s;
  return null;
}

function findSiegeTarget(e, radius) {
  let best = null, bestScore = Infinity;
  const min = STATS[e.type].minRange || 0;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || o.air || hiddenFrom(o, e.team) || (isWallType(o.type) && o.type !== 'gate') || beingRetaken(o, e.team)) continue;
    if (!visibleAt(o.x, o.y, e.team)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d > radius || (isUnit(o) && d < min)) continue;
    const score = d + (isDefenceType(o.type) ? 0 : isBuilding(o) ? 300 : 600);
    if (score < bestScore) { bestScore = score; best = o; }
  }
  return best;
}

function findInfantryNear(e, radius) {   // nearest enemy infantry in view (not hidden in a forest)
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || !isInfantry(o) || hiddenFrom(o, e.team) || !visibleAt(o.x, o.y, e.team) || !canShoot(e, o)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function findVehicleNear(e, radius) {   // nearest enemy vehicle (buggy, extractor, settler) in view
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || !isUnit(o) || isInfantry(o) || !canHit(e, o) || !visibleAt(o.x, o.y, e.team) || !canShoot(e, o)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateSoldier(e, dt) {   // soldiers and buggies
  const s = STATS[e.type];
  if (s.tank) crush(e);
  e.cooldown -= dt;
  e.revealT = (e.revealT || 0) - dt;
  if (e.team === 1 && diff().behaviours) {   // the computer's tanks go out of their way to run over infantry; its infantry jump out of the way of tanks (v5.66)
    if (s.tank && aiRunOver(e, dt)) return;
    if (isInfantry(e) && aiDodge(e, dt)) return;
  }
  let o = e.order;

  // snipers would rather shoot infantry: swap to some in range if they're plinking at a vehicle or building
  if (e.type === 'sniper' && o && o.type === 'attack') {
    const cur = byId(o.target);
    if (cur && !isInfantry(cur)) { const v = findInfantryNear(e, s.range); if (v) { o.target = v.id; } }
  }
  // rocket soldiers would rather shoot a vehicle: swap to one in range if they're busy with infantry
  if (s.rocket && o && o.type === 'attack') {
    const cur = byId(o.target);
    if (cur && isInfantry(cur)) { const v = findVehicleNear(e, s.range); if (v) { o.target = v.id; } }
  }
  // idle or attack-moving soldiers look for nearby enemies on their own. Snipers, and anyone standing on high ground,
  // hold their ground when idle: they only take on what's already in range and never chase it off
  if ((!o && !e.passive) || (o && o.type === 'attackmove')) {
    const hold = !o && holdsGround(e), look = hold ? rangeOf(e) : s.sight;
    const foe = s.siege ? findSiegeTarget(e, Math.max(look, hold ? 0 : rangeOf(e)))
      : (s.rocket && findVehicleNear(e, look)) || (e.type === 'sniper' && findInfantryNear(e, look)) || findEnemyNear(e, look);
    if (foe) { e.order = { type: 'attack', target: foe.id, resume: o, hold }; o = e.order; }
  }
  if (!o) {
    // holding a place in a formation: drift back to it if something nudged it out of line
    if (e.home && !e.passive) {
      const hd = Math.hypot(e.home.x - e.x, e.home.y - e.y);
      const busy = game.ents.some(m => m !== e && m.team === e.team && isUnit(m) && m.order && game.time - (m.movedAt || -9) < 0.2 && Math.abs(m.x - e.x) < 50 && Math.abs(m.y - e.y) < 50);
      if (hd > 2.5 && hd < 45 && !busy) { moveToward(e, e.home.x, e.home.y, dt * 0.5); e.facing = e.home.face; }   // (wait while someone squeezes past)
      else if (hd >= 45) e.home = null;
    }
    return;
  }
  if (!o.slot) e.home = null;

  if (o.type === 'attackmove' && e.holdUntil > game.time) return;   // waiting for the rest of its wave
  if (o.type === 'move' || o.type === 'attackmove') {
    const close = Math.hypot(o.x - e.x, o.y - e.y);
    if (o.slot ? close < 5 : close < e.r + 6) {   // formation moves go (almost) to the exact spot; others just near it
      e.order = null;
      if (o.slot) { e.facing = o.face; e.home = { x: o.x, y: o.y, face: o.face }; }
      return;
    }
    const r = navigate(e, o.x, o.y, dt);
    if (r) { e.order = null; if (o.slot && r === true) { e.home = { x: o.x, y: o.y, face: o.face }; e.facing = o.face; } }   // arrived (true) or can't get there ('fail')
  } else if (o.type === 'attack') {
    const t = byId(o.target);
    if (!t || t.team === e.team || t.team === NEUTRAL || hiddenFrom(t, e.team) || !canHit(e, t)) { e.order = o.resume || null; return; }   // gone, captured, knocked back to neutral, or out of its reach (an aircraft)
    // holding its ground: if the target has moved out of reach (or out of sight), let it go rather than follow it
    if (o.hold && (edgeDist(e.x, e.y, t) > rangeOf(e) + 4 || !visibleAt(t.x, t.y, e.team) || !canShoot(e, t))) { e.order = o.resume || null; return; }
    // a unit that slips into the fog is lost: go to where it was last seen, then stop (no tracking it through the fog)
    if (isUnit(t) && !visibleAt(t.x, t.y, e.team) && Math.hypot(t.x - e.x, t.y - e.y) > s.sight) {
      // head for the last spot it was seen, ready to fight anything met on the way
      e.order = o.resume || { type: 'attackmove', x: o.seenX !== undefined ? o.seenX : t.x, y: o.seenY !== undefined ? o.seenY : t.y };
      return;
    }
    o.seenX = t.x; o.seenY = t.y;
    if (s.minRange && isUnit(t) && edgeDist(e.x, e.y, t) < s.minRange) {   // too close to shell: back off (or find something else)
      const away = Math.atan2(e.y - t.y, e.x - t.x);
      if (navigate(e, e.x + Math.cos(away) * 60, e.y + Math.sin(away) * 60, dt)) { const f = findSiegeTarget(e, rangeOf(e)); e.order = f ? { type: 'attack', target: f.id, resume: o.resume } : o.resume || null; }
      return;
    }
    // artillery may shell a building it has seen before even if nobody is looking at it right now (buildings don't move)
    const seen = visibleAt(t.x, t.y, e.team) || (s.siege && isBuilding(t) && exploredAt(t.x, t.y, e.team));
    if (edgeDist(e.x, e.y, t) > rangeOf(e) || !seen || !canShoot(e, t)) {   // out of range, out of sight (e.g. up on a cliff) or rock in the way: close in
      // can't get to it (a building boxed in by others, say)? head for the nearest spot it can reach within range of it and shoot from there
      if (isBuilding(t) && o.ax === undefined && o.nx === undefined) {   // aim for a spot on this side of it, in range of its nearest edge
        const cx = Math.max(t.x - halfX(t), Math.min(t.x + halfX(t), e.x)), cy = Math.max(t.y - halfY(t), Math.min(t.y + halfY(t), e.y));
        const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(d, rangeOf(e) * 0.6);
        o.nx = cx + dx / d * k; o.ny = cy + dy / d * k;
      }
      if (navigate(e, o.ax !== undefined ? o.ax : o.nx !== undefined ? o.nx : t.x, o.ay !== undefined ? o.ay : o.ny !== undefined ? o.ny : t.y, dt) === 'fail') {
        const ap = isBuilding(t) && !o.approachTried ? approachSpot(e, t) : null;
        o.approachTried = true;
        if (ap) { o.ax = ap.x; o.ay = ap.y; e.nav = null; } else e.order = o.resume || null;
      }
    } else {
      if (s.tank || s.siege) e.turret = Math.atan2(t.y - e.y, t.x - e.x);   // tanks swing the turret, not the hull
      else e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
        e.revealT = s.reveal || 1.5;   // firing gives away your position (snipers only briefly)
        t.hitBy = e.id; t.hitAt = game.time;   // who shot it (so the owner's units nearby can deal with it, and the computer's Extractors can run the shooter down)
        if (s.rocket) {   // rocket: flies fast and homes in, so it's hard to dodge
          game.rockets.push({ x: e.x + Math.cos(e.facing) * 12, y: e.y + Math.sin(e.facing) * 12, target: t.id, tx: t.x, ty: t.y, team: e.team, dmg: s.dmg, life: 1.5, fromX: e.x, fromY: e.y, src: e.id, srcType: e.type });
          e.throwT = 0.2;
        } else if (s.siege) {   // artillery shell: a long, high arc that lands near (not exactly on) the target
          const sp = isBuilding(t) ? 0 : s.spread;
          game.grenades.push({ x0: e.x + Math.cos(e.turret) * 26, y0: e.y + Math.sin(e.turret) * 26, x: t.x + (Math.random() - .5) * 2 * sp, y: t.y + (Math.random() - .5) * 2 * sp,
                               t: 0, dur: s.flight, team: e.team, dmg: s.dmg, r: s.splash, vsBuilding: s.vsBuilding, vsVehicle: s.vsVehicle, shell: true, srcType: e.type });
          game.effects.push({ kind: 'blast', x: e.x + Math.cos(e.turret) * 52, y: e.y + Math.sin(e.turret) * 52, r: 9, t: 0 });   // muzzle blast
        } else if (s.splash) {   // grenade: flies for a moment, so fast targets can dodge it
          game.grenades.push({ x0: e.x, y0: e.y, x: t.x + (Math.random() - .5) * 10, y: t.y + (Math.random() - .5) * 10,
                               t: 0, dur: s.flight, team: e.team, dmg: s.dmg, r: s.splash, src: e.id, srcType: e.type });
          e.throwT = 0.25;
        } else {
          hurt(t, s.dmg * (isInfantry(t) ? 1 : isBuilding(t) ? (s.vsBuilding || 1) : (s.vsVehicle || 1)) * armour(e.type, t) * uphill(e.x, e.y, t), e.type, e.team);
          if (s.tank) {   // shell burst: also nicks enemy infantry right next to the target (quarter damage)
            game.effects.push({ kind: 'blast', x: t.x, y: t.y, r: e.type === 'heavy' ? 18 : 13, t: 0 });
            for (const o of game.ents) if (o !== t && o.team !== e.team && isInfantry(o) && Math.hypot(o.x - t.x, o.y - t.y) < 22) hurt(o, s.dmg * 0.25 * armour(e.type, o) * uphill(e.x, e.y, o), e.type, e.team);
          }
          game.effects.push({ kind: 'shot', heavy: e.type === 'sniper' || !!s.tank, x: e.x, y: e.y, x2: t.x + (Math.random() - .5) * 8,
                              y2: t.y + (Math.random() - .5) * 8, team: e.team, t: 0 });
        }
        if (isCombat(t) && !t.order && !t.landed && canHit(t, e)) t.order = { type: 'attack', target: e.id };
      }
    }
  }
}

// Engineers: walk to a building, then either repair it (yours) or capture it (theirs). They're very fragile, so escort them.
const canCapture = b => isBuilding(b) && !isWallType(b.type) && !isDefenceType(b.type) && b.type !== 'house' && b.built;   // any finished building except walls, gates, turrets and SAM Sites. Capturing the enemy HQ wins the game, the same as destroying it
function updateEngineer(e, dt) {
  const o = e.order;
  e.working = false;
  if (!o) return;
  if (o.type === 'move') { if (navigate(e, o.x, o.y, dt)) e.order = null; return; }
  if (o.type === 'buildTurret') {   // walk to the spot, then build the turret there
    const far = Math.hypot(e.x - o.x, e.y - o.y);
    if (far > e.r + 14) {   // (in a crowd he may be stopped just short: close enough once he can get no nearer)
      const nav = navigate(e, o.x, o.y, dt);
      if (nav === 'fail') { e.order = null; if (e.team === 0) flash = { text: "The Engineer can't get there", t: performance.now() }; return; }
      if (!(nav === true && far < 60)) return;
    }
    const res = buildTurret(e);
    if (res === 'money' || res === 'spot') { if (e.team === 0) flash = { text: res === 'money' ? `Not enough money for a ${NAMES[o.kind]} ($${COST[o.kind]})` : `Can't build the ${NAMES[o.kind]} there: ${turretSiteProblem(e.team, o.kind, o.x, o.y) || 'blocked'}`, t: performance.now() }; e.order = null; }
    return;
  }
  const b = byId(o.target);
  if (!b) { e.order = null; return; }
  if (o.type === 'repair' && (b.team !== e.team || b.hp >= b.maxHp)) { e.order = null; return; }
  if (o.type === 'capture' && b.team === e.team) { e.order = null; return; }
  if (edgeDist(e.x, e.y, b) > e.r + 22) {   // close enough to work (routes keep a small gap from walls)
    if (navigate(e, b.x, b.y, dt) === 'fail') e.order = null;
    return;
  }
  e.facing = Math.atan2(b.y - e.y, b.x - e.x);
  if (o.type === 'repair') {
    b.hp = Math.min(b.maxHp, b.hp + STATS.engineer.repair * (b.ruin ? RUIN_REPAIR : 1) * dt);   // old ruins are slow going: bring a crew
    e.working = true;
    if (Math.random() < dt * 8) game.effects.push({ kind: 'spark', x: b.x + (Math.random() - .5) * halfX(b) * 1.6, y: b.y + (Math.random() - .5) * halfY(b) * 1.6, t: 0 });
    if (b.hp >= b.maxHp) e.order = null;
  } else if (o.type === 'capture') {
    if (!canCapture(b)) { e.order = null; return; }
    captureBuilding(b, e.team);
    e.hp = 0; e.deployed = true;   // the engineer goes inside and takes it over
  }
}

// Turrets (v5.64): an Engineer walks to the spot and builds one there (he's used up and the turret goes up on its own over its build time).
// The spot: open ground you can see, clear of buildings and ore, and never within TURRET_KEEP_OUT of an enemy building.
// (only enemy buildings this side has found count: you can't learn what's hidden in the fog by trying to build next to it)
const knowsBuilding = (team, b) => team === 0 ? exploredAt(b.x, b.y) : (game.ai.known.has(b.id) || visibleAt(b.x, b.y, 1));
function nearEnemyBuilding(team, x, y) {
  return game.ents.some(b => isBuilding(b) && b.team !== team && b.team !== NEUTRAL && b.hp > 0 && !isWallType(b.type) && edgeDist(x, y, b) < TURRET_KEEP_OUT && knowsBuilding(team, b));
}
function turretSiteOk(team, type, x, y) {
  return unlocked(team, type) && visibleAt(x, y, team) && siteIsFree(x, y, STATS[type].size) && !nearEnemyBuilding(team, x, y);
}
function turretSiteProblem(team, type, x, y) {   // why a spot won't do, for the info box (null = fine)
  if (!visibleAt(x, y, team)) return "You can't see there";
  if (nearEnemyBuilding(team, x, y)) return 'Too close to an enemy building';
  if (!siteIsFree(x, y, STATS[type].size)) return "Can't build here";
  return null;
}
function buildTurret(en) {   // the Engineer has arrived: pay, and the turret starts going up where he stood
  const o = en.order;
  if (!o || o.type !== 'buildTurret') return 'gone';
  if (game.credits[en.team] < COST[o.kind]) return 'money';
  if (!turretSiteOk(en.team, o.kind, o.x, o.y)) return 'spot';
  spend(en.team, COST[o.kind]);
  const t = spawn(o.kind, en.team, o.x, o.y);
  t.built = false; t.progress = 0; t.hp = Math.max(1, t.maxHp * 0.1);
  if (game.stats[en.team]) game.stats[en.team].buildings++;
  if (en.team === 1) game.ai.turretsBuilt = (game.ai.turretsBuilt || 0) + 1;
  game.effects.push({ kind: 'dust', x: o.x, y: o.y, t: 0 });
  en.hp = 0; en.deployed = true; en.order = null;   // the Engineer is used up building it
  game.selected.delete(en.id);
  bldDirty = true;
  return t;
}

function captureBuilding(b, team) {
  const was = b.team;
  b.team = team;
  b.takenAt = game.time;
  if (game.lost && was !== NEUTRAL) { game.lost[team] = game.lost[team].filter(id => id !== b.id); if (!game.lost[was].includes(b.id)) game.lost[was].push(b.id); }
  if (team === 0 || team === 1) game.stats[team].captured++;
  if (b.type === 'hq' && was !== NEUTRAL && !game.ents.some(e => e !== b && e.team === was && e.type === 'hq')) game.hqCaptured = true;   // that side has just lost its last HQ
  if (b.type === 'derrick') { b.payT = 0; if (!b.villageOut) { b.villageOut = true; villagersJoin(b, team); } }
  b.queue = 0; b.qTypes = []; b.trainT = 0; b.dockedBy = null; b.target = null;
  if (game.selected.has(b.id) && team !== 0) game.selected.delete(b.id);
  game.ai.known.delete(b.id);
  if (team === 0 || was === 0 || visibleAt(b.x, b.y)) game.effects.push({ kind: 'text', x: b.x, y: b.y - 30, text: team === 0 ? 'Captured!' : was === 0 ? 'Lost!' : 'Taken by the enemy', t: 0, color: team === 0 ? '#7dff7d' : '#ff6b6b' });
  bldDirty = true;
  if (team === 0 && was === 1) game.selected = new Set([b.id]);
}

// an owned Oil Derrick pumps money for its owner: $100 every 15 seconds
function updateDerrick(e, dt) {
  if (e.team === NEUTRAL) return;
  const s = STATS.derrick;
  e.payT = (e.payT || 0) + dt;
  if (e.payT < s.payEvery) return;
  e.payT -= s.payEvery;
  earn(e.team, e.team === 1 ? Math.round(s.pay * diff().income) : s.pay);
  if (e.team === 0) game.effects.push({ kind: 'text', x: e.x, y: e.y - 30, text: '+$' + s.pay, t: 0 });
}

function villagersJoin(derrick, team) {
  for (const h of game.ents.filter(h => h.type === 'house' && Math.hypot(h.x - derrick.x, h.y - derrick.y) < 250)) {
    for (let i = 0; i < 2; i++) {
      const c = spawn('civilian', team, h.x + (i ? 9 : -9), h.y + h.size / 2 + 12);
      c.facing = Math.PI / 2;
      c.order = { type: 'move', x: h.x + (i ? 22 : -22) + (derrick.x - h.x) * 0.3, y: h.y + h.size / 2 + 34 + (derrick.y - h.y) * 0.3 };
    }
  }
  if (team === 0 || visibleAt(derrick.x, derrick.y)) game.effects.push({ kind: 'text', x: derrick.x, y: derrick.y - 50, text: team === 0 ? 'The villagers join you!' : 'The villagers join the enemy', t: 0, color: team === 0 ? '#7dff7d' : '#ff6b6b' });
}

function updateBuilding(e, dt) {
  const s = STATS[e.type];
  if (!e.built) {   // construction happens on its own
    e.progress += dt / (s.buildTime * slowOf(e));
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.9 * dt / (s.buildTime * slowOf(e)));
    if (e.progress >= 1) {
      e.progress = 1; e.built = true;
      // every refinery comes with one free extractor (the computer's only while it's under its Extractor limit, v5.61: expanding used to take Hard past it)
      if (e.type === 'refinery' && !(e.team === 1 && game.ents.filter(x => x.team === 1 && x.type === 'extractor').length >= diff().extractors)) releaseUnit(e, 'extractor');
    }
    return;
  }
  if (e.type === 'medbay') { updateMedbay(e, dt); return; }
  if (!PRODUCES[e.type] || e.queue <= 0 || !ruinWorks(e)) return;   // a ruined Barracks knocked below half stops training until it's patched up
  e.trainT += dt;
  if (e.trainT >= TRAIN_TIME[e.qTypes[0]] * slowOf(e)) {
    e.trainT = 0; e.queue--;
    releaseUnit(e, e.qTypes.shift());
  }
}

// Turrets and SAM Sites shoot the nearest enemy in range on their own (v5.64)
const SAM_RISE = 1;   // seconds for a SAM Site to come up out of the ground (or sink back)
function updateTower(e, dt) {
  if (!e.built) return updateBuilding(e, dt);
  const s = STATS[e.type];
  e.cooldown -= dt;
  let t = e.target && byId(e.target);
  if (!t || t.hp <= 0 || t.team === e.team || t.team === NEUTRAL || !canHit(e, t) || hiddenFrom(t, e.team) || !visibleAt(t.x, t.y, e.team) || edgeDist(e.x, e.y, t) > rangeOf(e) || !canShoot(e, t)) { t = findEnemyNear(e, rangeOf(e)); e.target = t ? t.id : null; }
  // the Laser and Missile Turrets react to an enemy they can see within their sight (a little beyond their range), v5.65:
  // the Missile Turret's lights turn red, and the Laser only starts charging (and its legs spinning) once it has spotted one
  if (e.type === 'laser' || e.type === 'missile') e.spotted = !!(t || findEnemyNear(e, s.sight));
  if (e.type === 'laser') {   // its three legs turn round the core, faster and faster as it charges; with nothing in sight the charge drains away and they slow to a stop
    if (!e.spotted) e.cooldown = Math.min(s.cooldown, e.cooldown + 2 * dt);
    const charge = Math.max(0, Math.min(1, 1 - e.cooldown / s.cooldown)), want = e.spotted ? 0.4 + 13.6 * charge * charge : 0;
    e.spinV = (e.spinV || 0) + (want - (e.spinV || 0)) * Math.min(1, dt * 3);
    e.spin = (e.spin || 0) + e.spinV * dt;
    if (!e.spotted) return;
  }
  if (e.type === 'sam') {   // the SAM Site waits underground and comes up only while an aircraft is in range
    e.up = Math.max(0, Math.min(1, (e.up || 0) + (t ? dt : -dt) / SAM_RISE));
    if (e.up < 1) { if (e.cooldown < 0.3) e.cooldown = 0.3; return; }
  }
  if (!t) { if (e.cooldown < 0) e.cooldown = 0; return; }
  e.aim = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.cooldown > 0) return;
  e.cooldown = s.cooldown;
  if (e.type === 'sam') {   // a homing missile
    game.rockets.push({ x: e.x, y: e.y - 8, target: t.id, tx: t.x, ty: t.y, team: e.team, dmg: s.dmg, life: 2, fromX: e.x, fromY: e.y, src: e.id, srcType: e.type });
    e.fired = game.time;
    return;
  }
  if (e.type === 'missile') {   // a salvo of homing missiles, one from each pod
    for (let k = 0; k < s.salvo; k++) {
      const side = k % 2 ? 1 : -1, px = e.x + Math.cos(e.aim) * 10 - Math.sin(e.aim) * 8 * side, py = e.y - 12 + Math.sin(e.aim) * 10 + Math.cos(e.aim) * 8 * side;
      game.rockets.push({ x: px, y: py, target: t.id, tx: t.x, ty: t.y, team: e.team, dmg: s.dmg, life: 2.2, fromX: e.x, fromY: e.y, src: e.id, srcType: e.type });
    }
    e.fired = game.time;
  } else if (e.type === 'laser') {   // one big beam that can't miss
    hurt(t, s.dmg, e.type, e.team);
    game.effects.push({ kind: 'beam', x: e.x + Math.cos(e.aim) * 22, y: e.y + Math.sin(e.aim) * 22, x2: t.x, y2: t.y, team: e.team, t: 0 });
    e.fired = game.time;
  } else {   // machine gun and cannon
    const mult = isInfantry(t) ? (s.vsInfantry || 1) : isBuilding(t) ? (s.vsBuilding || 1) : (s.vsVehicle || 1);
    hurt(t, s.dmg * mult * uphill(e.x, e.y, t), e.type, e.team);
    const muzzle = e.type === 'cannon' ? 34 : 24;
    game.effects.push({ kind: 'shot', x: e.x + Math.cos(e.aim) * muzzle, y: e.y + Math.sin(e.aim) * muzzle, x2: t.x, y2: t.y, team: e.team, t: 0, heavy: e.type === 'cannon' });
    if (e.type === 'cannon') game.effects.push({ kind: 'blast', x: t.x, y: t.y, r: 14, t: 0 });
  }
  if (isCombat(t) && !t.order && canHit(t, e)) t.order = { type: 'attack', target: e.id };   // units charge the turret
}

// ---------- Aircraft: attack helicopters ----------
// Each one belongs to a Helipad. It flies straight over anything, fires its missiles, and flies home to land, reload and patch up.
const padHeli = b => game.ents.find(h => h.air && h.hp > 0 && h.pad === b.id && h.team === b.team);
const padOk = (b, team) => b && b.hp > 0 && b.type === 'helipad' && b.team === team && b.built;
function padOf(e) {   // its own pad, or (if that's gone) any free one of its side
  const p = e.pad && byId(e.pad);
  if (padOk(p, e.team)) return p;
  e.pad = null;
  let best = null, bd = Infinity;
  for (const b of game.ents) if (padOk(b, e.team) && !padHeli(b) && !b.queue) { const d = Math.hypot(b.x - e.x, b.y - e.y); if (d < bd) { bd = d; best = b; } }
  if (best) e.pad = best.id;
  return best;
}
// scout: false = it won't fly into land its side has never seen (black fog); it stops at the edge and returns 'edge'.
// Only an attack takes a helicopter into the unknown (v5.49.4); flying home is always allowed.
function flyToward(e, x, y, dt, scout = true) {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy), step = STATS[e.type].speed * dt;
  e.movedAt = game.time;
  e.facing = d > 0.01 ? Math.atan2(dy, dx) : e.facing;
  const nx = d <= step ? x : e.x + dx / d * step, ny = d <= step ? y : e.y + dy / d * step;
  if (!scout && !exploredAt(nx, ny, e.team)) return 'edge';
  e.x = nx; e.y = ny;
  return d <= step;
}
function heliFire(e, t) {
  const s = STATS[e.type];
  e.facing = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.cooldown > 0 || e.ammo <= 0) return;
  e.cooldown = s.cooldown; e.ammo--; e.side = -(e.side || 1);   // missiles leave from alternate sides
  const px = -Math.sin(e.facing) * 7 * e.side, py = Math.cos(e.facing) * 7 * e.side;
  game.rockets.push({ x: e.x + px, y: e.y - e.alt * HELI_LIFT + py, target: t.id, tx: t.x, ty: t.y, team: e.team, dmg: s.dmg, life: 1.5, fromX: e.x, fromY: e.y, src: e.id, srcType: e.type });
  t.hitBy = e.id; t.hitAt = game.time;
  if (isCombat(t) && !t.order && !t.landed && canHit(t, e)) t.order = { type: 'attack', target: e.id };
}
const goHome = e => { e.order = padOf(e) ? { type: 'return' } : null; };
const HELI_IDLE = 3;   // seconds a helicopter waits with nothing to shoot before it goes home (or, with no Helipad, lands where it is), v5.65
function updateHeli(e, dt) {
  const s = STATS[e.type];
  e.cooldown -= dt;
  e.alt += ((e.landed ? 0 : 1) - e.alt) * Math.min(1, dt * 2.5);   // climbs off the pad, settles back onto it
  const pad = padOf(e), o = e.order;
  // keep apart from other aircraft
  for (const h of game.ents) if (h !== e && h.air && h.hp > 0 && !h.landed && !e.landed) { const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy); if (d < 26 && d > 0.01) { e.x += dx / d * 20 * dt; e.y += dy / d * 20 * dt; } }
  e.x = Math.min(W - 10, Math.max(10, e.x)); e.y = Math.min(H - 10, Math.max(10, e.y));
  if (!o) {
    if (e.landed) {
      if (pad && Math.hypot(e.x - pad.x, e.y - pad.y) > 3) { e.landed = false; return; }   // landed away from a pad and one is free: up and home
      if (!pad) {   // landed out in the field with no Helipad to go to (v5.65): it sits there, and takes off only to fight
        if (e.ammo > 0 && findEnemyNear(e, rangeOf(e))) e.landed = false;
        return;
      }
      if (e.ammo < s.ammo) { e.reloadT = (e.reloadT || 0) + dt; const per = s.reload / s.ammo; while (e.reloadT >= per && e.ammo < s.ammo) { e.reloadT -= per; e.ammo++; } }
      else e.reloadT = 0;
      e.hp = Math.min(e.maxHp, e.hp + s.repair * dt);
      return;
    }
    if (pad) { e.order = { type: 'return' }; return; }
    const t = e.ammo > 0 && findEnemyNear(e, rangeOf(e));   // no pad to go home to: fight with what's left, and with nothing to fight it lands where it is (v5.65: it used to hover)
    if (t) { heliFire(e, t); e.idleT = 0; return; }
    if ((e.idleT = (e.idleT || 0) + dt) > HELI_IDLE) { e.idleT = 0; e.landed = true; }
    return;
  }
  e.landed = false;
  if (o.type === 'return') {
    if (!pad) { e.order = null; return; }
    if (flyToward(e, pad.x, pad.y, dt)) { e.order = null; e.landed = true; e.reloadT = 0; }
    return;
  }
  if (o.type === 'move' || o.type === 'attackmove') {   // fly there, shooting what comes in range; once it's there with nothing to shoot for a few seconds it goes home and lands (v5.65: it used to hover until out of missiles)
    if (!o.arrived) { const r = flyToward(e, o.x, o.y, dt, false); if (r) { o.arrived = true; if (r === true && o.face !== undefined) e.facing = o.face; } }   // (a move stops at the edge of land it has seen)
    if (e.ammo <= 0) { if (pad) goHome(e); else if (o.arrived) e.order = null; return; }   // (out of missiles with no Helipad to go to: it still flies where it's sent, then lands there)
    const t = findEnemyNear(e, rangeOf(e));
    if (t) { heliFire(e, t); e.idleT = 0; return; }
    if (o.arrived && (e.idleT = (e.idleT || 0) + dt) > HELI_IDLE) { e.idleT = 0; if (pad) goHome(e); else { e.order = null; e.landed = true; } }
    return;
  }
  if (o.type === 'attack') {
    const t = byId(o.target);
    if (!t || t.hp <= 0 || t.team === e.team || t.team === NEUTRAL || !canHit(e, t) || hiddenFrom(t, e.team) || e.ammo <= 0) { goHome(e); return; }
    if (isUnit(t) && !visibleAt(t.x, t.y, e.team)) { e.order = { type: 'move', x: o.seenX !== undefined ? o.seenX : t.x, y: o.seenY !== undefined ? o.seenY : t.y }; return; }   // lost in the fog: hover where it was last seen
    o.seenX = t.x; o.seenY = t.y;
    if (edgeDist(e.x, e.y, t) > rangeOf(e) - 4) flyToward(e, t.x, t.y, dt);
    else heliFire(e, t);
    return;
  }
  e.order = null;
}

// a new unit rolls out of the building's door
// Every building's front door faces the bottom of the screen.
const frontDoor = b => ({ x: b.x, y: b.y + b.size / 2 + 30 });

function releaseUnit(b, type) {
  if (type === 'heli') {   // a new helicopter sits on its pad, armed and ready
    const u = spawn('heli', b.team, b.x, b.y);
    u.pad = b.id; u.landed = true; u.facing = -Math.PI / 2;
    if (game.stats[b.team]) game.stats[b.team].units++;
    if (game.track && game.track.made[b.team]) { const m = game.track.made[b.team]; m.heli = (m.heli || 0) + 1; }
    return u;
  }
  const d = frontDoor(b);
  const u = spawn(type || PRODUCES[b.type][0], b.team, d.x, d.y - 10);
  if (game.stats[b.team]) game.stats[b.team].units++;
  if (game.track && game.track.made[b.team]) { const m = game.track.made[b.team], k = type || PRODUCES[b.type][0]; m[k] = (m[k] || 0) + 1; }
  u.facing = Math.PI / 2;
  u.order = { type: 'move', x: d.x + (Math.random() - .5) * 70, y: d.y + 28 };
  return u;
}

// Refinery unloading bay: extractors line up at the front door, drive onto the pad, unload, back out.
const dockOf = r => ({ out: frontDoor(r), pad: { x: r.x, y: r.y + r.size / 2 - 6 } });   // parked with its front half in the bay, back end sticking out
// is the bay reserved by another extractor that's still using it?
function dockBusy(ref, e) {
  const id = ref.dockedBy;
  if (!id || id === e.id) return false;
  const o = byId(id), ord = o && o.order;
  const using = ord && ord.type === 'harvest' && ord.ref === ref.id && ['toBase', 'docking', 'unloading', 'undocking'].includes(ord.phase);
  if (!using) { ref.dockedBy = null; return false; }
  return true;
}
// where to wait (off to the side of the door) while the bay is in use
function waitSpot(ref, e) {
  const d = frontDoor(ref), side = e.id % 2 ? -1 : 1;
  for (const [dx, dy] of [[side * 50, 26], [-side * 50, 26], [side * 30, 55], [0, 60]]) {
    const x = d.x + dx, y = d.y + dy;
    if (walkable(terrainAt(x, y), true) && !game.ents.some(b => isSolid(b) && edgeDist(x, y, b) < 28)) return { x, y };
  }
  return { x: d.x, y: d.y + 40 };
}

// keep units from stacking on top of each other or driving through buildings
function separate() {
  const units = game.ents.filter(e => isUnit(e) && !e.air && !e.boarded && !e.landing);   // (aircraft fly over everything; the landing Settler isn't on the ground yet)
  for (const u of units) { u.px = u.x; u.py = u.y; }
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) continue;
      if (a.team !== b.team && ((a.rolling && isInfantry(b)) || (b.rolling && isInfantry(a)))) continue;   // a moving tank drives over enemy infantry
      const d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
      if (d < min) {
        const push = (min - d) / 2;
        let wa = a.docked ? 0 : b.docked ? 2 : 1, wb = b.docked ? 0 : a.docked ? 2 : 1;
        if (!a.docked && !b.docked && a.team === b.team) {   // the one on the move has right of way; the parked one shuffles aside
          const am = game.time - (a.movedAt || -9) < 0.2, bm = game.time - (b.movedAt || -9) < 0.2;
          if (am && !bm) { wa = 0.25; wb = 1.75; } else if (bm && !am) { wa = 1.75; wb = 0.25; }
        }
        a.x -= dx / d * push * wa; a.y -= dy / d * push * wa;
        b.x += dx / d * push * wb; b.y += dy / d * push * wb;
      }
    }
    for (const bld of game.ents) {
      if (!isSolid(bld)) continue;   // (units stand on a Medbay)
      if (a.docked && a.order && a.order.ref === bld.id) continue;
      if (bld.type === 'gate' && bld.team === a.team) continue;
      const hx = halfX(bld) + a.r, hy = halfY(bld) + a.r, dx = a.x - bld.x, dy = a.y - bld.y;
      if (Math.abs(dx) < hx && Math.abs(dy) < hy) {
        if (hx - Math.abs(dx) < hy - Math.abs(dy)) a.x = bld.x + Math.sign(dx || 1) * hx;
        else a.y = bld.y + Math.sign(dy || 1) * hy;
      }
    }
    a.x = Math.min(W - a.r, Math.max(a.r, a.x));
    a.y = Math.min(HT - a.r, Math.max(a.r, a.y));   // (down onto the beach since v5.59; the water itself is blocked by the terrain)
  }
  for (const u of units) {
    if (!walkable(terrainAt(u.x, u.y), isVehicle(u)) || wallBlocks(u.x, u.y, u.team)) { u.x = u.px; u.y = u.py; }
  }
}

// ---------- Computer opponent ----------
function aiPlace(hq, type) {
  if (game.credits[1] < COST[type]) return false;
  const bases = buildAreaSources(1);
  for (let tries = 0; tries < 90; tries++) {
    const src = tries < 30 ? hq : bases[Math.floor(Math.random() * bases.length)].b;
    const toward = Math.atan2(H / 2 - src.y, W / 2 - src.x);
    const a = toward + (Math.random() - 0.5) * (tries < 60 ? 2.6 : 6.2), d = src.size / 2 + 60 + Math.random() * 200;
    if (placeBuilding(1, type, src.x + Math.cos(a) * d, src.y + Math.sin(a) * d)) return true;
  }
  game.ai.cantPlace = game.ai.cantPlace || {};
  game.ai.cantPlace[type] = game.time;   // no room right now: don't keep saving for it
  return false;
}
const aiBlocked = type => game.ai.cantPlace && game.time - (game.ai.cantPlace[type] || -1e9) < 40;

// pick a spot the computer hasn't explored yet (far from its own HQ when scouting for you)
function aiExploreSpot(fromX, fromY, preferFar) {
  const hq = hqOf(1), f = fog[1];
  let best = null, bestScore = -Infinity;
  for (let tries = 0; tries < 40; tries++) {
    const i = Math.floor(Math.random() * f.exp.length);
    if (f.exp[i]) continue;
    const x = (i % COLS) * CELL + CELL / 2, y = Math.floor(i / COLS) * CELL + CELL / 2;
    // only open ground a vehicle can get its body into: not hard against the map edge or tucked into a pocket of rock
    if (x < 60 || y < 60 || x > W - 60 || y > H - 60 || [[0, 0], [22, 0], [-22, 0], [0, 22], [0, -22]].some(([dx, dy]) => !walkable(terrainAt(x + dx, y + dy), true))) continue;
    const score = preferFar && hq ? Math.hypot(x - hq.x, y - hq.y) : -Math.hypot(x - fromX, y - fromY);
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best;
}

// where its army gathers: a little way out from the HQ toward the middle of the map
// The choke point on the way into a base: walk the route from the HQ towards the enemy and find the narrowest
// gap (between rocks, river and map edge) a few hundred pixels out. Worked out once per base.
const chokeCache = {};
// narrowest gap on a route from the HQ towards (tx, ty), a few hundred pixels out from the HQ
function chokeOnRoute(hq, tx, ty) {
  const path = findPath(hq.x, hq.y, tx, ty, false, -1, true);
  if (!path) return null;
  const blocked = (x, y) => x < 10 || y < 10 || x > W - 10 || y > H - 10 || (() => { const t = terrainAt(x, y); return t === T.ROCK || t === T.WATER || t === T.CLIFF; })();
  let best = null, ax = hq.x, ay = hq.y;
  for (const pt of path) {
    const sl = Math.hypot(pt.x - ax, pt.y - ay), ux = (pt.x - ax) / (sl || 1), uy = (pt.y - ay) / (sl || 1);
    for (let d = 0; d < sl; d += 12) {
      const x = ax + ux * d, y = ay + uy * d, fromHq = Math.hypot(x - hq.x, y - hq.y);
      if (fromHq < 260 || fromHq > 700) continue;   // out past the buildings, where the rocks close in
      // the narrowest line through this spot that runs from blocked ground to blocked ground (any angle)
      let bw = null;
      for (let k = 0; k < 18; k++) {
        const th = k * Math.PI / 18, cx = Math.cos(th), cy = Math.sin(th);
        let l = 0, r = 0;
        while (l < 420 && !blocked(x - cx * (l + 8), y - cy * (l + 8))) l += 8;
        if (l >= 420) continue;
        while (r < 420 && !blocked(x + cx * (r + 8), y + cy * (r + 8))) r += 8;
        if (r >= 420 || l + r > 560) continue;
        if (!bw || l + r < bw.l + bw.r) bw = { l, r, cx, cy };
      }
      if (!bw) continue;   // open ground: not a gap
      const { l, r, cx, cy } = bw;
      if (!planGapWall({ ax: x - cx * (l + 4), ay: y - cy * (l + 4), bx: x + cx * (r + 4), by: y + cy * (r + 4) })) continue;   // trees or ore in the way: can't wall it
      const width = l + r + fromHq * 0.15;   // slight preference for gaps closer to home
      if (!best || width < best.width) best = { width, x: x + cx * (r - l) / 2, y: y + cy * (r - l) / 2, ux, uy, gap: l + r,
        ax: x - cx * (l + 4), ay: y - cy * (l + 4), bx: x + cx * (r + 4), by: y + cy * (r + 4) };   // centre of the gap and its two rocky ends
    }
    ax = pt.x; ay = pt.y;
  }
  return best;
}
// The ways into a base: the gaps in the rocks (or between rocks, river and map edge) that attackers come through.
// One route is straight from the enemy HQ (the main entrance); others come from each bridge on this side of the river.
function findEntrances(team) {
  const hq = hqOf(team);
  if (!hq) return [];
  const key = team + ':' + hq.id;
  if (chokeCache[key]) return chokeCache[key];
  const foe = hqOf(1 - team) || { x: W - START[team].x, y: H - START[team].y };
  const targets = [foe];
  for (let r = 0; r < TROWS; r += 2) for (let c = 0; c < TCOLS; c += 2) {
    const x = c * TC + TC / 2, y = r * TC + TC / 2;
    if (terrainAt(x, y) !== T.BRIDGE) continue;
    if (targets.some(t => t.bridge && Math.hypot(t.x - x, t.y - y) < 200)) continue;
    targets.push({ x, y, bridge: true });
  }
  // For each route in: find its gap, pretend that gap is sealed, and look again. Attackers walk round a wall,
  // so this keeps going until there's no way in left (or no more narrow gaps), finding the side ways in too.
  const out = [];
  P.block = new Set();
  const seal = ch => { const L = Math.hypot(ch.bx - ch.ax, ch.by - ch.ay);
    for (let d = 0; d <= L; d += 6) { const c = Math.floor((ch.ax + (ch.bx - ch.ax) * d / L) / TC), r = Math.floor((ch.ay + (ch.by - ch.ay) * d / L) / TC);
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) P.block.add((r + dr) * TCOLS + c + dc); } };
  try {
    for (const t of targets) for (let k = 0; k < 4; k++) {
      const ch = chokeOnRoute(hq, t.x, t.y);
      if (!ch) break;
      seal(ch);
      if (!out.some(o => Math.hypot(o.x - ch.x, o.y - ch.y) < 160)) out.push(ch);
    }
  } finally { P.block = null; }
  return (chokeCache[key] = out.slice(0, 4));
}
const findChoke = team => findEntrances(team)[0] || null;

// A wall that seals a gap from one rocky end to the other, with a gate in the middle. The wall is a 4-connected
// staircase of tiles (nothing slips through diagonally) and the gate always sits on a straight 3-tile stretch,
// lined up with the wall, so it works however the gap is angled.
function line4(c0, r0, c1, r1) {
  const out = [[c0, r0]], dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0), nc = Math.abs(c1 - c0), nr = Math.abs(r1 - r0);
  let c = c0, r = r0, ec = 0, er = 0;
  while (c !== c1 || r !== r1) {
    if (r === r1 || (c !== c1 && (ec + 0.5) * nr < (er + 0.5) * nc)) { c += dc; ec++; } else { r += dr; er++; }
    out.push([c, r]);
  }
  return out;
}
function planGapWall(ch) {
  let a = [Math.floor(ch.ax / TC), Math.floor(ch.ay / TC)], b = [Math.floor(ch.bx / TC), Math.floor(ch.by / TC)];
  const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  if (horiz ? a[0] > b[0] : a[1] > b[1]) [a, b] = [b, a];   // a is left (or top) end
  const m = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
  const g1 = horiz ? [m[0] - 1, m[1]] : [m[0], m[1] - 1], g2 = m, g3 = horiz ? [m[0] + 1, m[1]] : [m[0], m[1] + 1];   // the gate's three tiles, in a line along the wall
  const cells = [...line4(a[0], a[1], g1[0], g1[1]), g2, ...line4(g3[0], g3[1], b[0], b[1])];
  const blockedT = ([c, r]) => { const t = terrainAt(c * TC + TC / 2, r * TC + TC / 2); return t === T.ROCK || t === T.WATER || t === T.CLIFF; };
  const isGate = ([c, r]) => [g1, g2, g3].some(g => g[0] === c && g[1] === r);
  const wallCells = cells.filter(t => !blockedT(t) && !isGate(t));
  // every piece must be buildable: open grass (no trees) and clear of ore
  const okCell = ([c, r]) => { const x = c * TC + TC / 2, y = r * TC + TC / 2;
    return terrainAt(x, y) === T.GRASS && !game.ore.some(o => Math.abs(o.x - x) < TC / 2 + 10 && Math.abs(o.y - y) < TC / 2 + 10); };
  if (!wallCells.every(okCell) || !okCell(g1) || !okCell(g2) || !okCell(g3) || wallCells.length < 2) return null;
  const gate = { x: g2[0] * TC + TC / 2, y: g2[1] * TC + TC / 2, vertical: !horiz };
  return { tiles: wallCells.map(([c, r]) => ({ x: c * TC + TC / 2, y: r * TC + TC / 2 })), gate };
}
// where to put guard towers for a gap: just behind the wall, near each rocky end
function gapTowerSpots(ch) {
  const out = [];
  for (const end of [[ch.ax, ch.ay], [ch.bx, ch.by]]) {
    const ex = end[0] + (ch.x - end[0]) * 0.3 - ch.ux * 75, ey = end[1] + (ch.y - end[1]) * 0.3 - ch.uy * 75;   // far enough back to leave room for the wall
    out.push({ x: ex, y: ey });
  }
  return out;
}

function aiRally(hq) {
  const ch = findChoke(1);
  if (ch) {   // wait just inside the choke point, on the home side
    const x = ch.x - ch.ux * 40, y = ch.y - ch.uy * 40;
    if (bldDirty) rebuildBuildingGrid();
    P.team = 1; P.breakable = false;
    const t = nearestPassable(Math.floor(x / TC), Math.floor(y / TC), false);
    if (t) return { x: t[0] * TC + TC / 2, y: t[1] * TC + TC / 2 };
  }
  const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x);
  const x = hq.x + Math.cos(a) * 190, y = hq.y + Math.sin(a) * 190;
  if (bldDirty) rebuildBuildingGrid();
  P.team = 1; P.breakable = false;
  const t = nearestPassable(Math.floor(x / TC), Math.floor(y / TC), false);
  return t ? { x: t[0] * TC + TC / 2, y: t[1] * TC + TC / 2 } : { x, y };
}

// a straight wall across the approach to its base, with a gate in the middle (Normal and Hard)
function aiWallPlan(hq) {
  const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x), R = 330;
  const cx = hq.x + Math.cos(a) * R, cy = hq.y + Math.sin(a) * R;
  const vertical = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));   // facing mostly sideways → wall runs up/down
  const tiles = [], gateAt = { x: Math.floor(cx / TC) * TC + TC / 2, y: Math.floor(cy / TC) * TC + TC / 2 };
  for (let k = -7; k <= 7; k++) {
    if (Math.abs(k) <= 1) continue;   // the gate's three tiles
    const x = vertical ? gateAt.x : gateAt.x + k * TC, y = vertical ? gateAt.y + k * TC : gateAt.y;
    tiles.push({ x, y });
  }
  return { tiles, gate: { ...gateAt, vertical } };
}

// Engineer raid: pick one of your buildings it knows about (not the HQ), then sneak round the edge of the map to it and capture it
// what an attack wave heads for
function aiWaveTarget(from, targets, focus) {
  const pref = focus === 'defences' ? ['mg', 'cannon', 'missile', 'laser', 'sam', 'gate', 'refinery', 'extractor'] : focus === 'economy' ? ['refinery', 'extractor', 'power'] : [];
  for (const kind of pref) {
    let best = null, bd = Infinity;
    for (const t of targets) if (t.type === kind) { const d = Math.hypot(t.x - from.x, t.y - from.y); if (d < bd) { bd = d; best = t; } }
    if (best) return best;
  }
  let best = null, bd = Infinity;
  for (const t of targets) { const d = Math.hypot(t.x - from.x, t.y - from.y); if (d < bd) { bd = d; best = t; } }
  return best;
}

function aiRaidPlan(en) {
  const prize = { refinery: 5, factory: 5, tech: 6, power: 3, barracks: 4 };
  let best = null, bestS = -1;
  for (const [id] of game.ai.known) {
    const b = byId(id);
    if (!b || b.team !== 0 || !canCapture(b) || b.type === 'hq') continue;   // HQs can be captured, but raids don't set out to steal one
    const hqA = hqOf(1);
    if (b.ruin && hqA && (b.x - W / 2) * (hqA.x - W / 2) < 0) continue;   // your ruined base is yours to keep: it only fights over its own
    if (b.type === 'derrick' && game.time - ((game.ai.derrickLostAt || {})[b.id] || -999) < 60) continue;   // a Derrick it just lost: leave it for now
    const sc = (prize[b.type] || 1) + Math.random() * 2;
    if (sc > bestS) { bestS = sc; best = b; }
  }
  if (!best) return null;
  // the long way round: out to a far corner first, then along the edge towards the target
  const home = hqOf(1) || best;
  const corners = [{ x: 90, y: 90 }, { x: W - 90, y: 90 }, { x: 90, y: H - 90 }, { x: W - 90, y: H - 90 }]
    .filter(k => Math.hypot(k.x - best.x, k.y - best.y) > 500 && Math.hypot(k.x - home.x, k.y - home.y) > 500);   // corners away from both bases
  const c = corners.length ? corners[Math.floor(Math.random() * corners.length)] : { x: W / 2, y: H / 2 };
  const mid = { x: c.x < W / 2 ? 90 : W - 90, y: best.y };
  const along = { x: best.x, y: c.y < H / 2 ? 90 : H - 90 };
  return { target: best.id, way: [c, Math.abs(best.x - c.x) > Math.abs(best.y - c.y) ? along : mid], step: 0 };
}
function aiRunRaid(en) {
  const r = en.raid;
  if (!r) return;
  const t = byId(r.target);
  if (!t || t.team !== 0) {   // gone or already ours: pick another, or give up and go home
    en.raid = aiRaidPlan(en);
    if (!en.raid) en.order = null;
    return;
  }
  if (en.order && en.order.type === 'capture') return;
  if (r.step < r.way.length) {
    if (!en.order) {
      const w = r.way[r.step];
      if (r.step > 0 && Math.hypot(en.x - w.x, en.y - w.y) < 60) { r.step++; return; }
      if (en.reached === r.step) { r.step++; en.reached = null; return; }
      en.order = { type: 'move', x: w.x, y: w.y };
      en.reached = r.step;
    }
    return;
  }
  en.order = { type: 'capture', target: t.id };
}

// When a building is under attack, every combat unit of the same side within reach drops what it's doing
// (unless it's already fighting, or you've just given it a move order) and goes after the attacker.
function defendBuildings() {
  game.defendT = (game.defendT || 0) - 1;
  if (game.defendT > 0) return;
  game.defendT = 5;   // every quarter of a second
  const alarms = [];
  for (const b of game.ents) {
    if (!isBuilding(b) || b.team === NEUTRAL || !b.hitAt || game.time - b.hitAt > 2) continue;
    const foe = byId(b.hitBy);
    if (foe && foe.hp > 0 && foe.team !== b.team) alarms.push({ b, foe });
  }
  // enemy fighters walking into your base (close to one of your buildings) raise the alarm too, before they start shooting
  for (const foe of game.ents) {
    if (!isCombat(foe) || alarms.some(a => a.foe === foe)) continue;
    const b = game.ents.find(b => isBuilding(b) && b.team !== foe.team && b.team !== NEUTRAL && !isWallType(b.type) && b.built && Math.hypot(b.x - foe.x, b.y - foe.y) < 250);
    if (b && visibleAt(foe.x, foe.y, b.team) && !hiddenFrom(foe, b.team)) alarms.push({ b, foe });
  }
  for (const { b, foe } of alarms) {
    for (const u of game.ents) {
      // anyone busy within 300 comes; units standing idle within 500
      const d = Math.hypot(u.x - b.x, u.y - b.y);
      if (u.team !== b.team || !isCombat(u) || u.air || !canHit(u, foe) || d > (u.order || u.role === 'wave' ? 300 : 500)) continue;   // (was 450 / 1000: units ran too far to help)
      if ((u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost') && d > 300) continue;
      if (!u.order && holdsGround(u) && d > rangeOf(u) + 60) continue;   // snipers and units on high ground stay put unless the fight is right there   // they hold their post unless the fight is right there
      const o = u.order;
      if (o && o.type === 'man') continue;   // on the way to man a Turret: that's the best help it can give
      if (o && o.type === 'attack' && byId(o.target) && byId(o.target).hp > 0 && !isBuilding(byId(o.target))) continue;   // already fighting a unit
      if (o && o.type === 'move' && u.team === 0 && game.time - (o.given || 0) < 3) continue;   // you only just told it where to go
      if (u.role === 'wave' && Math.hypot(u.x - b.x, u.y - b.y) > 300) continue;
      u.order = visibleAt(foe.x, foe.y, u.team) ? { type: 'attack', target: foe.id } : { type: 'attackmove', x: foe.x, y: foe.y };
      u.passive = false;
    }
  }
}

function runAI(dt) {
  const ai = game.ai;
  ai.timer -= dt;
  if (ai.timer > 0) return;
  ai.timer = diff().think;
  const D = diff();

  const mine = game.ents.filter(e => e.team === 1);
  const of = t => mine.filter(e => e.type === t && !e.ruin);   // (a captured ruin is a bonus: it doesn't stand in for the buildings it makes at home)
  const settler = of('settler')[0], hq = of('hq')[0];
  const barracks = of('barracks'), refineries = of('refinery'), extractors = of('extractor');
  const army = mine.filter(e => isCombat(e) && !e.air);   // soldiers, buggies and tanks (its helicopters fly their own raids: aiHelis)
  const cash = game.credits[1];
  // its Rocket Soldiers gang up on your Heavy Tanks: each one within 350 of a Heavy Tank it can see goes for the nearest (v5.50)
  const yourHeavies = game.ents.filter(v => v.team === 0 && v.type === 'heavy' && v.hp > 0 && visibleAt(v.x, v.y, 1));
  if (yourHeavies.length) for (const r of army) {
    if (r.type !== 'rocket' || r.role === 'heal' || AI_ERRANDS.includes(r.role) || (r.order && r.order.type === 'man')) continue;
    const cur = r.order && r.order.type === 'attack' ? byId(r.order.target) : null;
    if (cur && cur.type === 'heavy' && cur.hp > 0) continue;
    const h = yourHeavies.reduce((b, v) => Math.hypot(v.x - r.x, v.y - r.y) < Math.hypot(b.x - r.x, b.y - r.y) ? v : b);
    if (Math.hypot(h.x - r.x, h.y - r.y) < 350) r.order = { type: 'attack', target: h.id, resume: r.order && r.order.type !== 'attack' ? r.order : (r.order && r.order.resume) || null };
  }

  // remember any of your buildings it has seen; forget ones it sees are gone
  for (const e of game.ents) if (e.team === 0 && isBuilding(e) && !isWallType(e.type) && visibleAt(e.x, e.y, 1)) ai.known.set(e.id, { x: e.x, y: e.y, type: e.type });
  for (const [id, k] of ai.known) if (!byId(id) && visibleAt(k.x, k.y, 1)) ai.known.delete(id);

  if (settler && !hq && game.time >= (game.aiDeployAt || 0)) deploy(settler);   // (waits while your Settler lands, v5.58)
  if (!hq) return;

  // ---- base building (army comes first: extras only once it has a decent force) ----
  ai.waveSize = ai.waveSize || D.attackAt;
  // After each wave goes out it spends ~45s investing (refinery, towers, walls) before saving for the next wave.
  // how far along its building plan is: by waves sent, or on Normal and Hard by time too (as if it had sent its first wave after 5 minutes and its second after 8),
  // so waiting to gather a full wave doesn't hold up its War Factory, Radar, Medbay, walls and second Refinery
  const sent = Math.max(ai.wavesSent || 0, D.walls ? (game.time > 480 ? 2 : game.time > 300 ? 1 : 0) : 0);
  // its defences (v5.64: turrets built by its Engineers; the first ones guard its entrances, like its Guard Towers used to)
  const defs = game.ents.filter(e => e.team === 1 && (isTurretType(e.type) || (e.type === 'engineer' && e.turretAt)));
  const entranceDefs = defs.filter(e => isTurretType(e.type) ? e.entrance : e.turretAt.entrance).length;
  const wantTowers = sent === 0 ? (D.towers && barracks.some(b => b.built) && extractors.length >= 3 && game.time > 150 ? 1 : 0) : sent === 1 ? Math.min(1, D.towers) : D.towers;   // first tower early, at the choke point
  const extraDefs = game.time > 300 ? (D.turrets || 0) : 0, entranceNext = entranceDefs < wantTowers;
  const nextKind = aiTurretKind(D, defs), turretNeed = defs.length < wantTowers + extraDefs;
  // Hard puts down a second refinery straight away (after a minute); everyone builds the rest once its economy and first wave are going
  const reqRefineries = !D.factory ? D.refineries : extractors.length >= 3 && sent >= 1 ? D.refineries : D.earlyRefinery && game.time > 60 ? 2 : 1;   // (Easy has no War Factory to buy Extractors at, so it builds its Refineries for their free ones, v5.55)
  // the build phase lasts until this stage's extras are built (or 90s, so it never stalls)
  const wantFactory = D.factory && game.time >= (D.factoryAt || 0) && (sent >= 1 || !of('factory').length) && of('factory').length < (sent >= 3 && of('factory').some(f => f.built) ? (D.factories || 1) : 1) && unlocked(1, 'factory') && !aiBlocked('factory');   // (Hard adds a second one after 3 waves; Normal starts its first no earlier than 2:30, v5.61)
  // Normal (which waits until 2:30 to start its War Factory) saves for its first one even in a build phase or with a wave due, and builds nothing cheaper
  // in front of it: that War Factory is its economy, as Extractors are bought there (v5.61)
  const firstFactory = !!D.factoryAt && wantFactory && !of('factory').length;
  // (and on every level, its first War Factory is still saved for when an attack is due and it's short of troops: without it, a computer stuck on one Extractor could never get out, v5.64)
  const wantTech = D.heavyTanks && sent >= 2 && of('factory').some(f => f.built) && !of('tech').length && unlocked(1, 'tech') && !aiBlocked('tech');
  const wantReactor = D.reactor && sent >= 2 && !of('reactor').length && unlocked(1, 'reactor') && !aiBlocked('reactor');   // Hard (v5.67): its Heavy Tanks and Lasers need one
  const wantSatellite = D.reactor && sent >= 3 && !of('satellite').length && unlocked(1, 'satellite') && !aiBlocked('satellite');   // Hard: for its Napalm Strike
  const wantRadar = D.walls && sent >= 1 && !of('radar').length && unlocked(1, 'radar') && !aiBlocked('radar');   // Normal and Hard
  const wantMedbay = D.walls && sent >= 1 && of('factory').some(f => f.built) && !of('medbay').length && unlocked(1, 'medbay') && !aiBlocked('medbay');   // Normal and Hard: somewhere to patch up the wounded (v5.61: only once its War Factory is up)
  const wantPad = D.helis && sent >= 2 && of('factory').some(f => f.built) && of('helipad').length < aiHeliPads(D) && (game.ai.heliMode === 'wave' || !of('helipad').some(p => !padHeli(p)))   /* no second pad while one stands empty (except while it builds up a bigger wave) */ && unlocked(1, 'helipad') && !aiBlocked('helipad');   // 1 on Normal, 2 on Hard
  const wantSam = D.sams && ai.seenAir && of('sam').length < D.sams && unlocked(1, 'sam') && !aiBlocked('sam');
  const extrasDone = (refineries.length >= reqRefineries || aiBlocked('refinery')) && entranceDefs >= wantTowers && !wantFactory && !wantTech && !wantReactor && !wantSatellite;
  const building = game.time < (ai.buildUntil || 0) && !extrasDone;
  if (refineries.length === 0) aiPlaceRefinery(hq);
  else if (barracks.length === 0) aiPlace(hq, 'barracks');
  else if (wantSam && cash >= COST.sam) aiPlaceSam(hq, refineries);   // your aircraft are about: a SAM Site first
  else if (of('power').length < D.plants && cash >= COST.power) aiPlace(hq, 'power');
  else if (refineries.length < reqRefineries && cash >= COST.refinery && !aiBlocked('refinery')) aiPlaceRefinery(hq);
  else if (wantFactory && cash >= COST.factory) aiPlace(hq, 'factory');   // War Factory before any extra Barracks (v5.61: Hard used to build its 2nd and 3rd Barracks first)
  else if (barracks.length < D.barracks && cash >= 900) aiPlace(hq, 'barracks');
  else if (wantTech && cash >= COST.tech) aiPlace(hq, 'tech');
  else if (wantReactor && cash >= COST.reactor) aiPlace(hq, 'reactor');
  else if (wantSatellite && cash >= COST.satellite) aiPlace(hq, 'satellite');
  else if (wantMedbay && cash >= COST.medbay) aiPlace(hq, 'medbay');
  else if (wantRadar && !firstFactory && cash >= COST.radar + 150) aiPlace(hq, 'radar');
  else if (wantPad && cash >= COST.helipad + (D.heliSpare ?? AI_SPARE)) aiPlace(hq, 'helipad');   // helicopters are bought with spare money only (v5.49.2; Hard needs none to spare, v5.49.3)

  // expand toward fresh ore once the ore by its refineries is running out
  const expanding = aiExpand(hq, refineries, sent);

  // wall line + gate across the approach, a few pieces at a time
  if (D.walls && sent >= 1 && game.credits[1] >= 200) {
    // every way into the base gets its own wall and gate (the main entrance first)
    if (!ai.wallPlans) { const pl = findEntrances(1).map(planGapWall).filter(Boolean); ai.wallPlans = pl.length ? pl : [aiWallPlan(hq)]; ai.gateTried = []; }
    let n = 0;
    for (let i = 0; i < ai.wallPlans.length; i++) {
      const plan = ai.wallPlans[i];
      const hasGate = of('gate').some(g => Math.hypot(g.x - plan.gate.x, g.y - plan.gate.y) < 30);
      if (!hasGate) {
        if (game.time - (ai.gateTried[i] || -99) > 20 && game.credits[1] >= COST.gate + 100) {   // (try again now and then if it didn't fit)
          ai.gateTried[i] = game.time;
          placeBuilding(1, 'gate', plan.gate.x, plan.gate.y, plan.gate.vertical);
        }
        break;   // never wall itself in: each gate goes up before that wall's pieces, and one entrance at a time
      }
      for (const t of plan.tiles) {
        if (n >= 3 || game.credits[1] < COST.wall + 150) break;
        if (game.ents.some(w => w.type === 'wall' && w.team === 1 && Math.abs(w.x - t.x) < 1 && Math.abs(w.y - t.y) < 1)) continue;
        if (canPlaceWallPiece(1, 'wall', t.x, t.y)) { spend(1, COST.wall); spawn('wall', 1, t.x, t.y); n++; game.stats[1].walls++; }
      }
      if (n >= 3) break;
    }
  }

  // ---- economy ----
  const wantExtractors = Math.min(D.extractors, refineries.filter(r => r.built).length * 3);
  const xFactories = of('factory').filter(f => f.built);   // Extractors are bought at the War Factory (v5.55), one at a time per factory
  const qx = xFactories.reduce((n, f) => n + f.qTypes.filter(t => t === 'extractor').length, 0);
  for (const f of xFactories) if (extractors.length + qx < wantExtractors && !f.qTypes.includes('extractor') && f.queue < STATS.factory.maxQueue && (extractors.length < 3 || game.time - (ai.extractorAt || -99) > 30) && produce(f, 'extractor')) { ai.extractorAt = game.time; break; }   // (replacing lost ones: one every 30 s at most, so the money goes into troops)
  for (const x of extractors) {   // idle extractors go to ore it knows about, or drive off to look for some
    if (x.order || autoHarvest(x)) continue;
    const spot = aiExploreSpot(x.x, x.y, false);
    if (spot) x.order = { type: 'move', x: spot.x, y: spot.y };
  }

  // ---- training ----
  const xWanted = xFactories.length && extractors.length + qx < wantExtractors;   // (no War Factory yet: nothing to save for)
  let reserve = xWanted ? COST.extractor : 0;
  const defended = army.length >= D.guard + 2;   // never stops training while its home is thin
  if (expanding && defended) reserve += expanding;   // saving for a stepping stone or a new refinery
  if (building && defended) {   // in a build phase: save for the next thing it wants, not for units
    if (refineries.length < reqRefineries && !aiBlocked('refinery')) reserve += COST.refinery;
    else if (entranceDefs < wantTowers) reserve += COST.mg + COST.engineer;
  }
  const pendingTurrets = of('engineer').reduce((n, en) => n + (en.turretAt ? COST[en.turretAt.kind] : 0), 0);   // Engineers already on their way or waiting at the spot
  const turretSaving = pendingTurrets || (turretNeed && (entranceNext || !building) ? COST[nextKind] + (of('engineer').length ? 0 : COST.engineer) : 0);
  if (defended) reserve += turretSaving;   // saving for its turrets, and an Engineer to build them (v5.64)
  const padEmpty = D.heliSave && game.ai.heliMode !== 'done' && army.length >= D.minWave + D.guard && of('helipad').some(p => p.built && !padHeli(p) && !p.queue);   // Hard: an empty Helipad makes its Barracks wait (not its War Factories), so it can afford the helicopter, but only once it has a full wave's worth of troops (v5.49.6: it used to starve its army waiting)
  if (padEmpty) reserve += COST.heli;
  if (wantSam && defended) reserve += COST.sam;   // your aircraft are about: a SAM Site comes before more troops and tanks
  const vReserve = reserve - (padEmpty ? COST.heli : 0);   // vehicles don't wait for the Tech Centre savings, or for a helicopter
  // the War Factory (and later the Tech Centre) are worth saving for whenever home is safe
  const otherExtrasDone = (refineries.length >= reqRefineries || aiBlocked('refinery')) && entranceDefs >= wantTowers;
  if (defended && (!building || otherExtrasDone || firstFactory)) reserve += wantFactory ? COST.factory : wantTech ? COST.tech : wantReactor ? COST.reactor : wantSatellite ? COST.satellite : 0;
  // an attack is due but there aren't enough troops yet: troops come first, savings wait (it never stops attacking)
  const waveDue = game.time >= D.attackAfter && game.time >= (ai.nextWave || 0);
  if (waveDue && army.filter(u => !u.role).length < D.minWave + 4) reserve = Math.min(reserve, (xWanted ? COST.extractor : 0) + (wantSam && defended ? COST.sam : 0) + (padEmpty ? COST.heli : 0) + (wantFactory && !of('factory').length && defended ? COST.factory : 0) + (defended && (pendingTurrets || (turretNeed && entranceNext)) ? turretSaving : 0) + (defended && building && (wantReactor || wantSatellite) ? (wantReactor ? COST.reactor : COST.satellite) : 0));   // (Hard's Reactor and Satellite Radar: saved for in the building spell after each wave, v5.67)   // (its turrets too, v5.64)   // (a SAM Site it needs, and on Hard a helicopter for an empty pad, still come first)
  const queued = barracks.reduce((n, b) => n + b.queue, 0) + of('factory').reduce((n, f) => n + f.queue, 0);
  const qBuggies = of('factory').reduce((n, b) => n + b.qTypes.filter(t => t === 'buggy').length, 0);
  const wantBuggy = D.buggies && unlocked(1, 'buggy') && (of('buggy').length + qBuggies < (of('soldier').length + 2) / ((game.ai.seen && game.ai.seen.snipers >= 3) ? 1.3 : 2) || (ai.patrolWant && !qBuggies));   // (or one for its scouting loop, v5.66)   // ~1 per 2 soldiers, more if you field snipers/grenadiers
  const qOf = t => barracks.reduce((n, b) => n + b.qTypes.filter(q => q === t).length, 0);
  const wantGren = D.grenadiers && unlocked(1, 'grenadier') && of('grenadier').length + qOf('grenadier') < (of('soldier').length + 1) / ((ai.seen && ai.seen.infantry >= 8) ? 2 : 3);   // ~1 per 3 soldiers, 1 per 2 against big infantry armies
  // rocket soldiers once it has seen your vehicles: about one for each buggy it has spotted
  // what it has seen of your army (the most of each kind at once): it trains counters to match
  const seenNow = { infantry: 0, vehicles: 0, snipers: 0 };
  for (const v of game.ents) if (v.team === 0 && isCombat(v) && visibleAt(v.x, v.y, 1) && !hiddenFrom(v, 1)) {
    if (isInfantry(v)) seenNow.infantry++; else seenNow.vehicles++;
    if (v.type === 'sniper' || v.type === 'grenadier') seenNow.snipers++;
  }
  ai.seen = ai.seen || { infantry: 0, vehicles: 0, snipers: 0 };
  for (const k in seenNow) ai.seen[k] = Math.max(ai.seen[k], seenNow[k]);
  ai.seenBuggies = Math.max(ai.seenBuggies || 0, game.ents.filter(v => v.team === 0 && (v.type === 'buggy' || isTank(v) || v.air) && visibleAt(v.x, v.y, 1)).length);
  // your aircraft: once it has seen one it builds SAM Sites, and it keeps a heat map of where they fly (squares of 150) to put them under the busiest spots
  ai.airHeat = ai.airHeat || {};
  for (const v of game.ents) if (v.team === 0 && v.air && !v.landed && visibleAt(v.x, v.y, 1)) { ai.seenAir = true; const k = Math.floor(v.x / AIR_HEAT) + ',' + Math.floor(v.y / AIR_HEAT); ai.airHeat[k] = (ai.airHeat[k] || 0) + 1; }
  // Hard sizes its answer to your vehicles by what it has seen of them (still alive), heavier ones counting for more:
  // one Rocket Soldier per point (Buggy or Artillery 1, Light Tank 1.5, Heavy Tank 2.5), up to antiArmor; Normal keeps the simple rule
  ai.seenVeh = ai.seenVeh || {};
  for (const v of game.ents) if (v.team === 0 && (v.type === 'buggy' || isTank(v) || v.type === 'artillery' || v.air) && visibleAt(v.x, v.y, 1)) { ai.seenVeh[v.id] = v.type; if (v.air) ai.seenAir = true; }
  for (const id in ai.seenVeh) { const v = byId(+id); if (!v || v.hp <= 0 || v.team !== 0) delete ai.seenVeh[id]; }
  const armour = Object.values(ai.seenVeh).reduce((s, t) => s + (t === 'heavy' ? 2.5 : t === 'heli' ? 2 : t === 'light' ? 1.5 : 1), 0);   // (a helicopter counts 2)
  const tanksSeen = Object.values(ai.seenVeh).filter(t => t === 'light' || t === 'heavy').length;
  const wantRocket = D.rockets && unlocked(1, 'rocket') && (D.antiArmor
    ? armour > 0 && of('rocket').length + qOf('rocket') < Math.min(D.antiArmor, Math.ceil(armour))
    : (ai.seenBuggies || 0) > 0 && of('rocket').length + qOf('rocket') < Math.min(6, ai.seenBuggies));
  const wantSniper = unlocked(1, 'sniper') && game.time > 240 && (of('sniper').length + qOf('sniper') < D.snipers || (ai.harassWant && !qOf('sniper')));   // (or one to harass your base, v5.66)   // (the ones it has go up the plateaus first)
  // engineers: a repairer only when something is badly damaged, and now and then a raider sent the long way round to steal a building
  const repairers = of('engineer').filter(en => !en.raid).length + qOf('engineer') - (ai.raidPending ? 1 : 0);
  const needsFix = mine.some(b => isBuilding(b) && !isWallType(b.type) && b.built && b.hp < b.maxHp * 0.6);
  const brokenRuin = mine.some(b => b.ruin && !ruinWorks(b));   // a ruin it has taken but not yet patched up: worth one extra repairer
  const raidDue = D.raidEvery && game.time > 360 && game.time - (ai.lastRaid || 0) > D.raidEvery && !ai.raidPending && [...ai.known.keys()].some(id => { const b = byId(id); return b && b.team === 0 && b.type !== 'hq' && canCapture(b); });
  // win back buildings your engineers took: send an engineer with an escort (try again if it's killed)
  const retake = D.engineers > 0 ? game.lost[1].map(byId).filter(b => b && b.team === 0 && canCapture(b)) : [];
  if (D.derricks && game.time > D.derrickAfter) for (const d of game.ents) if (d.type === 'derrick' && d.team !== 1 && !retake.includes(d)) retake.push(d);
  if (game.time > (D.ruinAfter || Infinity)) for (const r of game.ents) if (r.ruin && r.team !== 1 && (r.x - W / 2) * (hq.x - W / 2) > 0 && canCapture(r) && !retake.includes(r)) retake.push(r);   // the old ruined base on its own half (yours it leaves alone), one building at a time, without rushing
  // an Oil Derrick it held and lost: leave it for a minute before going back for it (a longer wait cost it too much income)
  ai.heldDerricks = ai.heldDerricks || {};
  for (const d of game.ents) if (d.type === 'derrick') { if (d.team === 1) ai.heldDerricks[d.id] = true; else if (ai.heldDerricks[d.id]) { delete ai.heldDerricks[d.id]; (ai.derrickLostAt = ai.derrickLostAt || {})[d.id] = game.time; } }
  for (let i = retake.length - 1; i >= 0; i--) if (retake[i].type === 'derrick' && game.time - ((ai.derrickLostAt || {})[retake[i].id] || -999) < 60) retake.splice(i, 1);   // it knows where the villages are, like a player who knows the map   // and Oil Derricks it has found
  // a capture attempt that cost an Engineer (killed on the way) puts that target off limits for 3 minutes, so it doesn't throw Engineers at it
  ai.retakeWatch = (ai.retakeWatch || []).filter(w => { const en = byId(w.en), t = byId(w.t); if (en && en.hp > 0) return true; if (t && t.team !== 1) (ai.retakeFail = ai.retakeFail || {})[w.t] = game.time; return false; });
  for (let i = retake.length - 1; i >= 0; i--) if (game.time - ((ai.retakeFail || {})[retake[i].id] || -999) < 180) retake.splice(i, 1);
  const retaking = of('engineer').some(en => en.retake) || ai.retakePending;
  const retakeDue = (D.engineers > 0 || D.derricks) && retake.length && !retaking && game.time - (ai.lastRetake || -99) > 45;
  // turrets (v5.64): an Engineer walks out and builds one - first at its entrances (as many as it used to have Guard Towers), then one more
  // at the pinch on its side of the river or by an Oil Derrick (from 5 minutes). Which kind depends on what it has seen of your army.
  // (the Engineer goes as soon as it has half the price; it waits at the spot for the rest)
  const turretSoon = turretNeed && game.time - (ai.lastTurret || -99) > (entranceNext ? 20 : 60) && (entranceNext || game.time - (ai.turretLostAt || -999) > 180);
  const turretDue = turretSoon && game.credits[1] >= COST[nextKind] * 0.5;   // (an Engineer for it is trained as soon as one is wanted, below)
  const idleEng = of('engineer').find(en => !en.raid && !en.retake && !en.turretAt && (!en.order || en.order.type === 'move'));
  if (turretDue && idleEng) { const spot = entranceNext ? aiEntranceTurretSpot(hq, nextKind) : aiTurretSpot(hq, nextKind); if (spot) { idleEng.turretAt = { ...spot, kind: nextKind, entrance: entranceNext }; idleEng.order = null; ai.lastTurret = game.time; } }
  const engCount = of('engineer').length + qOf('engineer');
  const wantEngineer = engCount < (D.engineerCap || 3) + (turretSoon && !idleEng ? 1 : 0) && (((D.engineers > 0 || brokenRuin) && needsFix && repairers < D.engineers + (brokenRuin ? 1 : 0)) || raidDue || retakeDue || (turretSoon && !idleEng));
  // War Factory first: buggies (about one per two soldiers) and tanks (a share of its army; heavies once it has a Tech Centre).
  // While it wants a vehicle, the barracks hold back so the money can build up.
  const qF = t => of('factory').reduce((n, f) => n + f.qTypes.filter(q => q === t).length, 0);
  const lights = of('light').length + qF('light'), heavies = of('heavy').length + qF('heavy');
  const wantTank = D.tanks > 0 && lights + heavies < Math.max(1, Math.floor(army.length * D.tanks * ((ai.seen && ai.seen.infantry >= 10) ? 1.5 : 1) * (D.antiArmor && tanksSeen >= 3 ? 1.33 : 1)));   // more tanks against infantry-heavy armies (and on Hard, against tank-heavy ones)
  // artillery once it has attacked a couple of times, to crack towers and walls from beyond their reach
  const guns = of('artillery').length + qF('artillery');
  const wantArty = D.artillery > 0 && sent >= 2 && unlocked(1, 'artillery') && guns < D.artillery;
  const vehicle = !of('factory').some(f => f.built) ? null
    : ai.patrolWant && !qBuggies && unlocked(1, 'buggy') ? 'buggy'   // a Buggy for its scouting loop comes first (v5.66)
    : wantArty && (!wantTank || lights + heavies >= 1) ? 'artillery'
    : wantTank ? (unlocked(1, 'heavy') && D.heavyTanks && heavies <= lights ? 'heavy' : 'light')
    : wantBuggy ? 'buggy' : null;
  for (const f of of('factory')) {
    if (!vehicle || !f.built || f.queue >= 1 || army.length + queued >= D.maxArmy) continue;
    if (game.credits[1] >= COST[vehicle] + vReserve) produce(f, vehicle);
  }
  if (vehicle && defended && !of('factory').some(f => f.queue > 0)) reserve += COST[vehicle];
  aiHelis(D);
  for (const b of barracks) {
    if (b.queue >= 2) continue;
    if (wantEngineer && game.credits[1] >= COST.engineer && produce(b, 'engineer')) {
      if (retakeDue) { ai.retakePending = true; ai.lastRetake = game.time; } else if (raidDue) { ai.raidPending = true; ai.lastRaid = game.time; } else if (turretDue && !idleEng) { ai.turretPending = true; ai.lastTurret = game.time; }
      continue;
    }
    if (army.length + queued >= D.maxArmy) continue;
    if (wantRocket) { if (game.credits[1] >= COST.rocket) produce(b, 'rocket'); }   // answering your vehicles comes before saving up
    else if (wantSniper) { if (game.credits[1] >= COST.sniper) produce(b, 'sniper'); }   // only 1-2 of them, so they don't wait for savings
    else if (wantGren) { if (game.credits[1] >= COST.grenadier + reserve) produce(b, 'grenadier'); }
    else if (game.credits[1] >= COST.soldier + reserve) produce(b, 'soldier');
  }
  // engineers fix its most damaged building, and otherwise wait safely by the HQ
  // an engineer already standing about at home takes the job straight away
  if ((D.engineers > 0 || D.derricks) && retake.length && !of('engineer').some(en => en.retake)) {
    const spare = of('engineer').find(en => !en.raid && !en.turretAt && (!en.order || en.order.type === 'move'));
    if (spare) { spare.retake = true; spare.order = null; ai.retakePending = false; }
  }
  for (const en of of('engineer')) {
    if (ai.retakePending && !en.raid && !en.retake && !en.turretAt && !en.order && retake.length) { en.retake = true; ai.retakePending = false; }
    if (en.retake) {
      const t = retake.sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y))[0];
      if (!t) { en.retake = false; continue; }
      if (!en.order || en.order.target !== t.id) { en.order = { type: 'capture', target: t.id }; ai.retakeWatch = (ai.retakeWatch || []).filter(w => w.en !== en.id); ai.retakeWatch.push({ en: en.id, t: t.id }); }
      for (const u of army) if (u.order && u.order.type === 'attack' && u.order.target === t.id) u.order = null;   // stop shooting what it's taking back
      // escort: up to four home units clear the way just ahead of it
      const escort = army.filter(u => u.role === 'guard' || !u.role).sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y)).slice(0, D.escort || 4);
      for (const u of escort) if (!u.order || u.order.type === 'move') { u.order = { type: 'attackmove', x: en.x + (t.x - en.x) * 0.5, y: en.y + (t.y - en.y) * 0.5 }; u.passive = false; }
      continue;
    }
    if (en.turretAt) {   // walk to the spot and build the turret (another spot if this one won't do; wait if it's short of money)
      const sp = en.turretAt;
      if (Math.hypot(en.x - sp.x, en.y - sp.y) > en.r + 12) {
        if (!en.order || en.order.type !== 'move') {   // (its last walk ended short of the spot: after a few goes, the spot can't be reached - pick another)
          en.turretWalks = (en.turretWalks || 0) + 1;
          if (en.turretWalks > 4) { const nsp = sp.entrance ? aiEntranceTurretSpot(hq, sp.kind) : aiTurretSpot(hq, sp.kind); en.turretWalks = 0; en.turretAt = nsp ? { ...nsp, kind: sp.kind, entrance: sp.entrance } : null; continue; }
          en.order = { type: 'move', x: sp.x, y: sp.y };
        }
        continue;
      }
      en.order = { type: 'buildTurret', kind: sp.kind, x: sp.x, y: sp.y };
      const r = buildTurret(en);
      if (typeof r === 'object') { r.entrance = !!sp.entrance; continue; }
      en.order = null;
      if (r === 'spot') { const nsp = sp.entrance ? aiEntranceTurretSpot(hq, sp.kind) : aiTurretSpot(hq, sp.kind); en.turretAt = nsp ? { ...nsp, kind: sp.kind, entrance: sp.entrance } : null; }
      continue;
    }
    if (ai.raidPending && !en.raid && !en.order) { en.raid = aiRaidPlan(en); ai.raidPending = false; }
    if (en.raid) { aiRunRaid(en); continue; }
    if (en.order) continue;
    const hurt = mine.filter(b => isBuilding(b) && !isWallType(b.type) && b.built && b.hp < b.maxHp * 0.75).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) en.order = { type: 'repair', target: hurt.id };
    else if (Math.hypot(en.x - hq.x, en.y - hq.y) > 140) en.order = { type: 'move', x: hq.x + (Math.random() - .5) * 80, y: hq.y + hq.size / 2 + 50 };
  }

  // ---- army ----
  const rally = aiRally(hq);
  const targets = game.ents.filter(e => e.team === 0 && !isWallType(e.type) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1)).map(e => ({ x: e.x, y: e.y, type: e.type }));
  for (const [id, k] of ai.known) if (!beingRetaken(byId(id) || {}, 1)) targets.push(k);
  const nearest = (u, list) => { let b = null, bd = Infinity; for (const t of list) { const d = Math.hypot(t.x - u.x, t.y - u.y); if (d < bd) { bd = d; b = t; } } return b; };

  // scout: one unit (a buggy if it has one) looks for your base, then runs home to report
  const scout = ai.scout && byId(ai.scout);
  if (!ai.known.size && army.length) {
    const sc = scout || army.find(u => u.type === 'buggy' && !u.role) || army.find(u => !u.role);
    if (sc) {
      ai.scout = sc.id; sc.role = 'scout'; sc.passive = true;
      if (!sc.order) { const spot = aiExploreSpot(sc.x, sc.y, true); if (spot) sc.order = { type: 'move', x: spot.x, y: spot.y }; }
    }
  } else if (scout) {
    scout.order = { type: 'move', x: rally.x, y: rally.y }; scout.passive = false; scout.role = null; ai.scout = null;
  }

  // home guard: keep a few units at home (the first wave gets priority, so guards are picked from what's left over)
  const guards = army.filter(u => u.role === 'guard');
  const free = army.filter(u => !u.role);
  for (const u of free) {
    if (guards.length >= D.guard || (!ai.wavesSent && free.length - (D.guard - guards.length) < ai.waveSize)) break;
    u.role = 'guard'; guards.push(u);
  }
  // HQ guard: a few more stand right by the Headquarters (losing it loses the game), picked once the entrance guards are in place
  const hqGuards = army.filter(u => u.role === 'hqguard');
  if (guards.length >= D.guard) for (const u of army.filter(u => !u.role)) {
    if (hqGuards.length >= (D.hqGuard || 0) || (!ai.wavesSent && army.filter(v => !v.role).length <= ai.waveSize)) break;
    u.role = 'hqguard'; u.passive = false; hqGuards.push(u);
  }
  // high ground and derricks: once it has a few units to spare, it holds its best plateaus with its longest-range
  // units, and leaves a small garrison at every Oil Derrick it owns. Losses are topped up from new units.
  const spare = () => army.filter(u => !u.role && !(u.order && u.order.type === 'attack'));
  const spareNow = (ai.wavesSent || 0) >= 1 || army.length >= D.guard + D.minWave + 2;
  // more waiting at home than the next wave needs: the extras go out (one at a time) to hold useful ground instead of
  // crowding the base: bigger hill squads, bigger Derrick garrisons, then the middle island and the river crossings
  const atHome = army.filter(u => !u.role && Math.hypot(u.x - rally.x, u.y - rally.y) < 300).length;
  const surplus = spareNow && atHome > (ai.waveSize || D.minWave) + 4;
  if (spareNow && D.hill && game.time > D.hillAfter) aiHoldHills(army, spare, surplus ? 6 : D.hillSize);
  if (spareNow && D.garrison) aiGarrisonDerricks(army, spare, surplus ? 5 : D.garrison);
  if (surplus) aiManOutposts(army, spare);
  aiHeal(army, of('medbay').find(b => b.built));

  // defend: if your units come near its base, the guards and everyone gathering (and any wave close to home) fight back
  const base = mine.filter(e => isBuilding(e) && !isWallType(e.type));
  const intruders = game.ents.filter(e => e.team === 0 && isUnit(e) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1) &&
    base.some(b => Math.hypot(b.x - e.x, b.y - e.y) < 450));
  const hqThreat = (hq.hitAt && game.time - hq.hitAt < 4) || intruders.some(e => Math.hypot(e.x - hq.x, e.y - hq.y) < 450);
  if (intruders.length) {
    for (const u of army) {
      if (u.role === 'scout' || AI_ERRANDS.includes(u.role)) continue;   // (scouts and units on an errand, v5.66, carry on)
      // posted units and waves out in the field stay put, unless the HQ itself is under threat: then waves within reach come home
      const far = Math.hypot(u.x - hq.x, u.y - hq.y);
      if ((u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost') && far > 700) continue;
      if (u.role === 'wave' && far > (hqThreat ? 1600 : 700)) continue;
      if (u.order && u.order.type === 'attack' && byId(u.order.target)) continue;
      const t = nearest(u, intruders);
      u.order = { type: 'attack', target: t.id }; u.passive = false;
    }
  } else {
    // guards stand watch at the ways into the base (spread over all of them); new units wait at the rally point
    const ents = findEntrances(1);
    hqGuards.forEach((u, k) => {   // in front of the HQ, spread across its face
      if (u.order) return;
      const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x) + (k - (hqGuards.length - 1) / 2) * 0.6, d = hq.size / 2 + 40;
      const x = hq.x + Math.cos(a) * d, y = hq.y + Math.sin(a) * d;
      if (Math.hypot(u.x - x, u.y - y) > 40) u.order = { type: 'move', x, y };
    });
    guards.forEach((u, k) => {
      if (u.order || !ents.length) return;
      const ch = ents[k % ents.length], x = ch.x - ch.ux * 35 + (Math.random() - 0.5) * 40, y = ch.y - ch.uy * 35 + (Math.random() - 0.5) * 40;
      if (Math.hypot(u.x - x, u.y - y) > 60) u.order = { type: 'move', x, y };
    });
    for (const u of army) {
      if (u.role === 'wave' || u.role === 'scout' || AI_ERRANDS.includes(u.role) || u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost' || u.role === 'heal' || u.role === 'hqguard' || u.role === 'guard' && ents.length || u.order) continue;
      if (Math.hypot(u.x - rally.x, u.y - rally.y) > 90) u.order = { type: 'move', x: rally.x + (Math.random() - .5) * 60, y: rally.y + (Math.random() - .5) * 60 };
    }
  }

  // waves: it keeps attacking until the game is over, one wave every few minutes (4 on Easy, 3 on Normal, 2 on Hard).
  // When a wave is due it sends whatever has gathered (as long as there's a minimum), and each wave aims a little bigger.
  // Easy goes for the nearest building, Normal for your economy, Hard for your towers and walls first.
  // when you're nearly beaten (only a few buildings left that it knows of, and it clearly has the bigger army) it goes all in, guards too
  const yourArmy = game.ents.filter(e => e.team === 0 && isCombat(e) && visibleAt(e.x, e.y, 1)).length;
  const allIn = ai.known.size > 0 && ai.known.size <= 3 && army.length >= Math.max(6, yourArmy * 2);
  const keepSnipers = D.hill > 0 && game.time > D.hillAfter && (game.ai.hills || []).length;   // Snipers wait for a place on the high ground instead of joining waves
  const gathered = army.filter(u => !(keepSnipers && u.type === 'sniper' && !allIn) && !(!allIn && ((ai.harassWant && u.type === 'sniper') || (ai.patrolWant && u.type === 'buggy'))) &&   /* (one held back for an errand, v5.66) */ (allIn ? u.role !== 'scout' && u.role !== 'wave' && u.role !== 'hill' && u.role !== 'garrison' && u.role !== 'outpost' : !u.role) && (allIn || Math.hypot(u.x - rally.x, u.y - rally.y) < 160));
  const lost = !ai.known.size && game.time > D.attackAfter + 90;   // still hasn't found you: go looking in force
  const due = game.time >= D.attackAfter && game.time >= (ai.nextWave || 0);
  // when it's due it waits for a full wave (its target size), but not for ever: after waveWait more seconds it goes with what it has, as long as there's a minimum
  const fullWave = Math.max(D.minWave, Math.min(ai.waveSize, army.length - D.guard));
  const enough = gathered.length >= fullWave || (gathered.length >= D.minWave && game.time >= (ai.nextWave || 0) + (D.waveWait || 0));
  if (!intruders.length && due && enough && (ai.known.size || lost)) {
    const target = aiWaveTarget(rally, targets, D.focus) || aiExploreSpot(hq.x, hq.y, true);
    if (target) {
      ai.waveInfo = { size: gathered.length, vehicles: gathered.filter(u => !isInfantry(u)).length, fled: false };   // (for the retreat, v5.66)
      gathered.forEach((u, k) => { const a = k * 2.4, rr = 14 * Math.sqrt(k); u.role = 'wave'; u.passive = false; u.order = { type: 'attackmove', x: target.x + Math.cos(a) * rr, y: target.y + Math.sin(a) * rr }; });   // spread out so they don't queue nose to tail
      ai.waveSize = Math.min(D.maxWave, (D.maxArmy === Infinity ? 99 : D.maxArmy - D.guard), ai.waveSize + (D.waveGrow || 2));   // each wave a little bigger
      ai.wavesSent = (ai.wavesSent || 0) + 1;
      ai.nextWave = game.time + D.waveEvery;
      ai.buildUntil = game.time + Math.min(60, D.waveEvery / 3);   // a short spell of building after each wave
      ai.waveTarget = target;
    }
  }

  // keep each wave together: units that run ahead wait for the rest; idle wave units pick the next target
  const wave = army.filter(u => u.role === 'wave');
  if (wave.length) {
    if (!targets.length && (!ai.exploreTarget || exploredAt(ai.exploreTarget.x, ai.exploreTarget.y, 1))) ai.exploreTarget = aiExploreSpot(hq.x, hq.y, true);
    const goal = ai.waveTarget || ai.exploreTarget;
    if (goal) {
      const dists = wave.map(u => Math.hypot(u.x - goal.x, u.y - goal.y)).sort((a, b) => a - b);
      const middle = dists[Math.floor(dists.length / 2)];
      for (const u of wave) {
        const d = Math.hypot(u.x - goal.x, u.y - goal.y);
        u.holdUntil = d < middle - 140 && d > 260 ? game.time + D.think + 0.1 : 0;
      }
    }
    // a target that's gone (destroyed, captured, or a Derrick knocked back to neutral): don't all pile onto the empty spot
    const enemyBuildingAt = (x, y) => game.ents.some(b => b.team === 0 && isBuilding(b) && !isWallType(b.type) && Math.abs(b.x - x) < 60 && Math.abs(b.y - y) < 60);
    if (ai.waveTarget && ai.waveTarget.type && !enemyBuildingAt(ai.waveTarget.x, ai.waveTarget.y) && wave.some(u => Math.hypot(u.x - ai.waveTarget.x, u.y - ai.waveTarget.y) < 220)) ai.waveTarget = null;
    for (const u of wave) {
      if (u.order && u.order.type === 'attackmove' && u.order.bld && Math.hypot(u.x - u.order.x, u.y - u.order.y) < 220 && !enemyBuildingAt(u.order.x, u.order.y)) u.order = null;
      if (u.order) continue;
      const t = aiWaveTarget(u, targets, D.focus) || ai.exploreTarget;
      if (t) { u.order = { type: 'attackmove', x: t.x, y: t.y, bld: !!t.type }; ai.waveTarget = t; }
    }
  }
  if (D.behaviours) aiBehaviours(D, army, hq, rally);
  if (D.reactor) aiNapalm();
}

// ---------- Napalm Strike (v5.67) ----------
// With a Satellite Radar you can call a Napalm Strike once every 5 minutes (the first as soon as the Radar is up): a plane
// comes in from your side and lays a 300-long strip of fire on ground you can see, centred where you tapped. The fire burns
// for 6 s: deadly to infantry (70 a second), it hurts vehicles a little (12) and buildings a bit (15). It never hurts your
// own side, and aircraft fly over it. The computer (Hard) calls it on your bunched-up units.
const NAPALM_EVERY = 300, NAPALM_LEN = 300, NAPALM_HALF = 26, NAPALM_DELAY = 1.6, NAPALM_BURN = 6, NAPALM_FLIGHT = 0.5;
const NAPALM_DPS = { infantry: 70, vehicle: 12, building: 15 };
const hasSatellite = team => game.ents.some(b => b.team === team && b.type === 'satellite' && b.built && b.hp > 0);
const napalmReady = team => hasSatellite(team) && (game.napalmAt[team] === null || game.time >= game.napalmAt[team]);
const napalmWait = team => game.napalmAt[team] === null ? 0 : Math.max(0, game.napalmAt[team] - game.time);
function napalmLine(team, x, y) {   // the strip: along the plane's path, which comes from the caller's HQ toward the target
  const from = hqOf(team) || { x: START[team].x, y: START[team].y };
  let dx = x - from.x, dy = y - from.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
  return { x1: x - dx * NAPALM_LEN / 2, y1: y - dy * NAPALM_LEN / 2, x2: x + dx * NAPALM_LEN / 2, y2: y + dy * NAPALM_LEN / 2, dx, dy };
}
function callNapalm(team, x, y) {
  if (!napalmReady(team) || !visibleAt(x, y, team)) return false;
  game.strikes.push({ team, ...napalmLine(team, x, y), t: 0 });
  game.napalmAt[team] = game.time + NAPALM_EVERY;
  if (team === 1 && visibleAt(x, y, 0)) game.effects.push({ kind: 'text', x, y: y - 30, text: 'Napalm incoming!', t: 0, color: '#ff8a50' });
  return true;
}
const segDistTo = (px, py, s) => segDist(px, py, s.x1, s.y1, s.x2, s.y2);
function updateNapalm(dt) {
  for (const st of game.strikes) {
    st.t += dt;
    const burn = st.t - NAPALM_DELAY;
    if (burn < 0 || burn > NAPALM_BURN) continue;
    const lit = Math.min(1, burn / NAPALM_FLIGHT);   // the fire spreads along the strip as the plane passes
    const ex = st.x1 + (st.x2 - st.x1) * lit, ey = st.y1 + (st.y2 - st.y1) * lit, seg = { x1: st.x1, y1: st.y1, x2: ex, y2: ey };
    for (const e of game.ents) {
      if (e.team === st.team || e.team === NEUTRAL || e.hp <= 0 || e.air || e.boarded) continue;
      if (isWallType(e.type)) continue;
      const reach = isBuilding(e) ? NAPALM_HALF + Math.max(halfX(e), halfY(e)) * 0.7 : NAPALM_HALF + e.r * 0.5;
      if (segDistTo(e.x, e.y, seg) > reach) continue;
      const dps = isBuilding(e) ? NAPALM_DPS.building : isInfantry(e) ? NAPALM_DPS.infantry : NAPALM_DPS.vehicle;
      hurt(e, dps * dt, 'napalm', st.team);
      if (e.hp <= 0 && isInfantry(e) && Math.random() < 0.5) game.effects.push({ kind: 'text', x: e.x, y: e.y - 10, text: 'Burned!', t: 0, color: '#ffb070' });
    }
  }
  game.strikes = game.strikes.filter(st => st.t < NAPALM_DELAY + NAPALM_BURN + 6);   // (the scorch mark fades for 6 s after)
}
function drawNapalm() {
  const now = performance.now() / 1000;
  for (const st of game.strikes) {
    const burn = st.t - NAPALM_DELAY, len = NAPALM_LEN;
    // scorched ground: dark, fading out after the fire
    if (burn > 0) {
      const lit = Math.min(1, burn / NAPALM_FLIGHT), fade = burn > NAPALM_BURN ? Math.max(0, 1 - (burn - NAPALM_BURN) / 6) : 1;
      const ex = st.x1 + (st.x2 - st.x1) * lit, ey = st.y1 + (st.y2 - st.y1) * lit;
      if (visibleAt((st.x1 + ex) / 2, (st.y1 + ey) / 2) || visibleAt(st.x1, st.y1) || visibleAt(ex, ey)) {
        ctx.strokeStyle = `rgba(30,22,16,${0.45 * fade})`; ctx.lineCap = 'round'; ctx.lineWidth = NAPALM_HALF * 2;
        ctx.beginPath(); ctx.moveTo(st.x1, st.y1); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
      }
      if (burn < NAPALM_BURN) {   // the flames: flickering tongues all along the strip, dying down at the end
        const die = burn > NAPALM_BURN - 1.5 ? (NAPALM_BURN - burn) / 1.5 : 1;
        for (let k = 0; k <= lit * len; k += 11) {
          const px = st.x1 + st.dx * k, py = st.y1 + st.dy * k;
          if (!visibleAt(px, py)) continue;
          const j = Math.sin(k * 1.7 + now * 11) * 0.5 + 0.5, side = Math.sin(k * 0.9 + now * 3) * NAPALM_HALF * 0.55;
          const qx = px - st.dy * side, qy = py + st.dx * side, r = (10 + 8 * j) * die;
          const g = ctx.createRadialGradient(qx, qy - r * 0.3, 1, qx, qy, r * 1.6);
          g.addColorStop(0, `rgba(255,240,170,${0.9 * die})`); g.addColorStop(0.4, `rgba(255,140,40,${0.75 * die})`); g.addColorStop(1, 'rgba(200,40,10,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(qx, qy, r * 1.6, 0, Math.PI * 2); ctx.fill();
          if ((k / 11 | 0) % 3 === 0) { ctx.fillStyle = `rgba(60,55,50,${0.25 * die})`; ctx.beginPath(); ctx.arc(qx + 4, qy - 14 - j * 10, 7 + j * 5, 0, Math.PI * 2); ctx.fill(); }   // smoke
        }
      }
    }
    // the plane: a dark jet with a shadow, flying in along the strip and away
    const along = (st.t - NAPALM_DELAY) / NAPALM_FLIGHT * len;   // distance past the strip's start
    if (along > -2200 && along < len + 1600) {
      const px = st.x1 + st.dx * along, py = st.y1 + st.dy * along, a = Math.atan2(st.dy, st.dx);
      ctx.save(); ctx.translate(px + 26, py + 34); ctx.rotate(a); ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-14, -18); ctx.lineTo(-8, 0); ctx.lineTo(-14, 18); ctx.closePath(); ctx.fill(); ctx.restore();   // shadow on the ground
      ctx.save(); ctx.translate(px, py - 10); ctx.rotate(a);
      ctx.fillStyle = '#4a4f55'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-14, -19); ctx.lineTo(-7, 0); ctx.lineTo(-14, 19); ctx.closePath(); ctx.fill();
      ctx.fillStyle = TEAMS[st.team].color; ctx.fillRect(-10, -3, 26, 6);
      ctx.fillStyle = '#9fd8ff'; ctx.fillRect(12, -1.5, 6, 3);
      ctx.fillStyle = 'rgba(255,170,80,0.8)'; ctx.beginPath(); ctx.arc(-12, 0, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();   // afterburner
      ctx.restore();
    }
  }
}
// The computer (Hard) calls its Napalm Strike on a bunch of your units: the spot where the most of them (infantry count
// full, vehicles a third) stand within reach of one strip, if that's at least 5.
function aiNapalm() {
  if (!napalmReady(1)) return;
  const yours = game.ents.filter(u => u.team === 0 && isUnit(u) && !u.air && u.hp > 0 && visibleAt(u.x, u.y, 1) && !hiddenFrom(u, 1));
  let best = null, bs = 0;
  for (const c of yours) {
    const line = napalmLine(1, c.x, c.y);
    let sc = 0; for (const u of yours) if (segDist(u.x, u.y, line.x1, line.y1, line.x2, line.y2) < NAPALM_HALF + 10) sc += isInfantry(u) ? 1 : 0.33;
    if (sc > bs) { bs = sc; best = c; }
  }
  if (best && bs >= 5) callNapalm(1, best.x, best.y);
}

// ---------- Computer behaviours (v5.66, Normal and Hard) ----------
// Errands that take a unit or two away from the usual jobs for a while: a Buggy's scouting loop round the map (every 3 minutes),
// a Sniper harassing the edge of your base (every 7 minutes), and a pair of infantry going after an Extractor (every 4 minutes).
// Plus the retreat: a wave of 7+ that's losing and down to its last 2 runs home (infantry; a vehicle runs when it's the last of 4+).
// (Tanks running over infantry and infantry dodging tanks happen unit by unit: updateSoldier.)
const AI_ERRANDS = ['patrol', 'harass', 'xraid', 'retreat'];
const PATROL_EVERY = 180, HARASS_EVERY = 420, XRAID_EVERY = 240, HARASS_TIME = 150, XRAID_TIME = 90;
// a spot near (x, y) that a unit can stand on (nudged toward the middle of the map if it's water or rock)
function landNear(x, y, vehicle) {
  for (let k = 0; k <= 12; k++) {
    const px = x + (W / 2 - x) * k / 14, py = y + (H / 2 - y) * k / 14;
    if (walkable(terrainAt(px, py), vehicle) && !elevAt(px, py)) return { x: px, y: py };
  }
  return null;
}
function aiBehaviours(D, army, hq, rally) {
  const ai = game.ai, now = game.time;
  const free = army.filter(u => !u.role && !(u.order && u.order.type === 'attack'));
  const yoursNear = (u, r) => game.ents.filter(o => o.team === 0 && isCombat(o) && !o.air && o.hp > 0 && visibleAt(o.x, o.y, 1) && !hiddenFrom(o, 1) && Math.hypot(o.x - u.x, o.y - u.y) < r);
  const sendHome = u => { u.role = null; u.passive = false; u.order = { type: 'move', x: rally.x + (Math.random() - .5) * 60, y: rally.y + (Math.random() - .5) * 60 }; u.errand = null; };

  // ---- retreat: a wave of 7+ that is losing and down to fewer than 3 runs home (infantry only); a vehicle runs when it's the
  // last one left of a group of 4+ vehicles. "Losing": more of your fighters near them than they have left.
  const wave = army.filter(u => u.role === 'wave'), wi = ai.waveInfo;
  if (wi && wave.length) {
    const near = new Set(); for (const u of wave) for (const o of yoursNear(u, 350)) near.add(o);
    const losing = near.size > wave.length;
    const inf = wave.filter(isInfantry), veh = wave.filter(u => !isInfantry(u));
    const run = [];
    if (losing && wi.size >= 7 && wave.length < 3) run.push(...inf);
    if (losing && wi.vehicles >= 4 && veh.length === 1) run.push(veh[0]);
    for (const u of run) { u.role = 'retreat'; u.passive = true; u.order = { type: 'move', x: rally.x, y: rally.y }; u.holdUntil = 0; }
    if (run.length) wi.fled = true;
  }
  for (const u of army.filter(u => u.role === 'retreat')) if (!u.order || Math.hypot(u.x - rally.x, u.y - rally.y) < 120) { u.role = null; u.passive = false; }

  // ---- scout patrol: a Buggy drives a loop round the map every 3 minutes, without stopping to fight
  const pat = army.find(u => u.role === 'patrol');
  const patrolDue = !pat && now - (ai.patrolAt ?? -999) > PATROL_EVERY && now > 180;
  const buggyFor = u => u.type === 'buggy' && (!u.role || u.role === 'guard' || u.role === 'hqguard') && !(u.order && u.order.type === 'attack');   // (a guard can go: one takes its place)
  ai.patrolWant = patrolDue && !army.some(buggyFor);   // none spare: its War Factory makes one for the job
  if (patrolDue) {
    const b = army.find(buggyFor);
    if (b) {
      const m = 260, pts = [[m, m], [W / 2, m], [W - m, m], [W - m, H / 2], [W - m, H - m - 180], [W / 2, H - m - 180], [m, H - m - 180], [m, H / 2]].map(([x, y]) => landNear(x, y, false)).filter(Boolean);
      let first = 0, bd = Infinity; pts.forEach((p, i) => { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; first = i; } });
      b.role = 'patrol'; b.passive = true; b.errand = { pts: pts.slice(first).concat(pts.slice(0, first)), i: 0 }; b.order = null;
      ai.patrolAt = now;
    }
  }
  if (pat) {
    const er = pat.errand;
    if (!er || er.i >= er.pts.length) sendHome(pat);
    else if (!pat.order) { const p = er.pts[er.i]; if (Math.hypot(pat.x - p.x, pat.y - p.y) < 90) er.i++; else if (er.last === er.i) er.i++; else { er.last = er.i; pat.order = { type: 'move', x: p.x, y: p.y }; } }   // (a point it couldn't reach: on to the next)
  }

  // ---- harassing Sniper: every 7 minutes one goes to the edge of your base, picks off what comes in range, and runs off
  // when your units come close, then comes back; after 2.5 minutes it goes home
  const har = army.find(u => u.role === 'harass');
  const yourBuildings = [...ai.known.values()].filter(k => k.type !== 'wall' && k.type !== 'gate');
  const harassDue = !har && now - (ai.harassAt ?? -999) > HARASS_EVERY && now > 300 && yourBuildings.length;
  const sniperFor = u => u.type === 'sniper' && (!u.role || u.role === 'hill') && !(u.order && u.order.type === 'attack');
  ai.harassWant = harassDue && !army.some(sniperFor);   // none spare (they've all gone off with waves): its Barracks trains one for the job
  if (harassDue) {
    const sn = army.find(sniperFor);
    if (sn) {
      const b = yourBuildings.reduce((a, k) => Math.hypot(k.x - hq.x, k.y - hq.y) < Math.hypot(a.x - hq.x, a.y - hq.y) ? k : a);   // your building nearest its side
      const ang = Math.atan2(hq.y - b.y, hq.x - b.x), spot = landNear(b.x + Math.cos(ang) * 260, b.y + Math.sin(ang) * 260, false);
      if (spot) {
        const back = landNear(spot.x + Math.cos(ang) * 260, spot.y + Math.sin(ang) * 260, false) || spot;
        sn.role = 'harass'; sn.passive = true; sn.errand = { spot, back, phase: 'go', until: now + HARASS_TIME }; sn.order = { type: 'move', x: spot.x, y: spot.y };
        ai.harassAt = now;
      }
    }
  }
  if (har) {
    const er = har.errand;
    if (!er || now > er.until) sendHome(har);
    else {
      const close = yoursNear(har, 130).length > 0;
      if (close && er.phase !== 'flee') { er.phase = 'flee'; har.passive = true; har.order = { type: 'move', x: er.back.x, y: er.back.y }; }   // too close: run
      else if (er.phase === 'flee' && !har.order && !yoursNear(har, 200).length) { er.phase = 'go'; har.order = { type: 'move', x: er.spot.x, y: er.spot.y }; }   // shaken off: back to the edge
      else if (er.phase === 'go' && !har.order) { er.phase = 'snipe'; har.passive = false; }   // in place: snipe (it holds its ground and shoots what's in range)
    }
  }

  // ---- Extractor raid: every 4 minutes two infantry (Rocket Soldiers if it has them) go after one of your Extractors:
  // the last one it saw, or else the ore by one of your Refineries; they don't stop to fight on the way
  ai.seenX = ai.seenX || {};
  for (const x of game.ents) if (x.team === 0 && x.type === 'extractor' && visibleAt(x.x, x.y, 1)) ai.seenX[x.id] = { x: x.x, y: x.y, t: now };
  for (const id in ai.seenX) { const x = byId(+id); if (!x || x.hp <= 0 || x.team !== 0) delete ai.seenX[id]; }
  const raiders = army.filter(u => u.role === 'xraid');
  if (!raiders.length && now - (ai.xraidAt ?? -999) > XRAID_EVERY && now > 300) {
    const seen = Object.values(ai.seenX).sort((a, b) => b.t - a.t)[0];
    const ref = yourBuildings.find(k => k.type === 'refinery');
    const ore = !seen && ref ? findOre(ref.x, ref.y, 500, 0, false) : null;
    const goal = seen ? { x: seen.x, y: seen.y } : ore ? { x: ore.x, y: ore.y } : null;
    const pick = free.filter(u => isInfantry(u) && u.type !== 'sniper' && u.type !== 'engineer' && u.type !== 'civilian').sort((a, b) => (b.type === 'rocket') - (a.type === 'rocket')).slice(0, 2);
    if (goal && pick.length === 2) {
      for (const u of pick) { u.role = 'xraid'; u.passive = true; u.errand = { goal, until: now + XRAID_TIME + Math.hypot(goal.x - u.x, goal.y - u.y) / STATS[u.type].speed, look: 0 }; u.order = { type: 'move', x: goal.x, y: goal.y }; }
      ai.xraidAt = now;
    }
  }
  for (const u of raiders) {
    const er = u.errand;
    if (!er || now > er.until) { sendHome(u); continue; }
    if (u.order && u.order.type === 'attack' && byId(u.order.target) && byId(u.order.target).hp > 0) continue;
    const x = game.ents.filter(v => v.team === 0 && v.type === 'extractor' && v.hp > 0 && visibleAt(v.x, v.y, 1) && Math.hypot(v.x - u.x, v.y - u.y) < 400).sort((a, b) => Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y))[0];
    if (x) { u.passive = false; u.order = { type: 'attack', target: x.id }; continue; }
    if (!u.order) { if (++er.look > 20 / D.think) sendHome(u); else { const s2 = Object.values(ai.seenX).sort((a, b) => b.t - a.t)[0]; if (s2 && Math.hypot(s2.x - u.x, s2.y - u.y) > 60) u.order = { type: 'move', x: s2.x, y: s2.y }; } }   // nothing here: try where one was last seen, else give up
  }
}

// The plateaus worth holding, best first: on its own half of the map, the river lookouts first, then the ones
// nearest the middle. Each comes with a few spots along its top edge, facing the middle (where enemies come from).
function aiHillSpots(team = 1) {   // (the test player borrows this for its own side)
  const hq = hqOf(team); if (!hq) return [];
  const foe = START[1 - team], mid = { x: W / 2, y: H / 2 }, out = [];
  for (const base of MAP.plateaus || []) for (const pl of [base, { ...base, x: W - base.x, y: H - base.y }]) {
    if (Math.hypot(pl.x - hq.x, pl.y - hq.y) > Math.hypot(pl.x - foe.x, pl.y - foe.y)) continue;   // the enemy's half
    // every bit of standable high ground on this plateau; the edge that faces the middle is where to stand
    const tiles = [], R = Math.max(pl.rx, pl.ry) + 30;
    for (let y = pl.y - R; y <= pl.y + R; y += TC) for (let x = pl.x - R; x <= pl.x + R; x += TC) {
      const cx = (Math.floor(x / TC) + 0.5) * TC, cy = (Math.floor(y / TC) + 0.5) * TC;
      if (elevAt(cx, cy) && terrainAt(cx, cy) === T.GRASS && Math.hypot(cx - pl.x, cy - pl.y) < R) tiles.push({ x: cx, y: cy, d: Math.hypot(cx - mid.x, cy - mid.y) });
    }
    if (tiles.length < 6) continue;
    tiles.sort((p, q) => p.d - q.d);
    const spots = [];
    for (const t of tiles) { if (spots.length >= 5) break; if (Math.hypot(t.x - tiles[0].x, t.y - tiles[0].y) < 90 && spots.every(s => Math.hypot(s.x - t.x, s.y - t.y) >= 26)) spots.push({ x: t.x, y: t.y }); }
    if (spots.length) out.push({ x: pl.x, y: pl.y, spots, score: (pl.overhang ? -10000 : 0) + Math.hypot(pl.x - mid.x, pl.y - mid.y) });
  }
  return out.sort((p, q) => p.score - q.score);
}
const RANGED = ['sniper', 'rocket', 'grenadier', 'soldier', 'civilian'];   // who it sends up the hills, best first
function aiHoldHills(army, spare, size) {
  const ai = game.ai, D = diff();
  if (!ai.hills) ai.hills = aiHillSpots().slice(0, D.hill);
  let sentOne = false;
  ai.hills.forEach((h, k) => {
    const squad = army.filter(u => u.role === 'hill' && u.hill === k);
    const earlierFull = ai.hills.slice(0, k).every((_, i) => army.filter(u => u.role === 'hill' && u.hill === i).length >= size);
    if (squad.length < size && earlierFull && !sentOne) {
      const pick = spare().filter(u => RANGED.includes(u.type)).sort((a, b) => RANGED.indexOf(a.type) - RANGED.indexOf(b.type)).slice(0, 1);
      if (pick.length) sentOne = true;
      for (const u of pick) { u.role = 'hill'; u.hill = k; u.passive = false; u.order = null; squad.push(u); }
    }
    // a Sniper waiting at home takes the place of a lesser unit up there (Snipers are the best at holding high ground)
    if (squad.length >= size && !sentOne) {
      const sn = spare().find(u => u.type === 'sniper'), worst = squad.filter(u => u.type !== 'sniper').sort((a, b) => RANGED.indexOf(b.type) - RANGED.indexOf(a.type))[0];
      if (sn && worst) { worst.role = null; worst.order = null; squad.splice(squad.indexOf(worst), 1, sn); sn.role = 'hill'; sn.hill = k; sn.passive = false; sn.order = null; sentOne = true; }
    }
    squad.forEach((u, j) => {
      const s = h.spots[j % h.spots.length], k2 = Math.floor(j / h.spots.length), x = s.x + k2 * 12, y = s.y - k2 * 10;   // a second lot stands just beside the first
      if (!u.order && Math.hypot(u.x - x, u.y - y) > 30) u.order = { type: 'move', x, y };
    });
  });
}
// wounded units at home (guards and those waiting for the next wave), and badly hurt ones posted out or on a wave not far off,
// go and stand on the Medbay until they're patched up:
// up to 5 infantry at a time, or one vehicle when no infantry are waiting
const foeNear = u => game.ents.some(o => o.team !== u.team && o.team !== NEUTRAL && o.hp > 0 && (isUnit(o) || STATS[o.type].dmg) && Math.hypot(o.x - u.x, o.y - u.y) < STATS[u.type].sight);
function aiHeal(army, med) {
  const healers = army.filter(u => u.role === 'heal');
  for (const u of healers) {
    if (!med || u.hp >= u.maxHp * 0.95) { u.role = null; if (u.order && u.order.type === 'move') u.order = null; }
    else if (!u.order) { const p = medbaySpots(med)[healers.filter(v => v.role === 'heal').indexOf(u) % 5]; if (Math.hypot(u.x - p.x, u.y - p.y) > 12) u.order = { type: 'move', x: p.x, y: p.y }; }
  }
  if (!med) return;
  const now = army.filter(u => u.role === 'heal');
  const vehicleIn = now.some(u => !isInfantry(u));
  const away = u => u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost' || u.role === 'wave';   // posted out, or on a wave: only when badly hurt and not far off
  const wounded = army.filter(u => !(u.order && u.order.type === 'attack') && (
      ((!u.role || u.role === 'guard' || u.role === 'hqguard') && u.hp < u.maxHp * 0.55 && Math.hypot(u.x - med.x, u.y - med.y) < 900) ||
      (u.role === 'wave' && !u.order && u.hp < u.maxHp * 0.6 && !foeNear(u)) ||   // left idle after a fight, wounded: its chance to get patched up
      (away(u) && u.hp < u.maxHp * 0.4 && Math.hypot(u.x - med.x, u.y - med.y) < 700)))
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const inf = wounded.filter(isInfantry), veh = wounded.filter(u => !isInfantry(u));
  let add = [];
  if (!vehicleIn && inf.length) add = inf.slice(0, Math.max(0, STATS.medbay.slots - now.length));
  else if (!now.length && veh.length) add = [veh[0]];
  const spots = medbaySpots(med);
  for (const u of add) { u.role = 'heal'; u.passive = false; const p = spots[now.length % 5]; now.push(u); u.order = { type: 'move', x: p.x, y: p.y }; }
}

function aiGarrisonDerricks(army, spare, size) {
  for (const u of army) if (u.role === 'garrison') { const d = byId(u.post); if (!d || d.team !== 1) { u.role = null; u.post = null; } }   // lost it: back to the pool
  for (const d of game.ents) {
    if (d.type !== 'derrick' || d.team !== 1) continue;
    const g = army.filter(u => u.role === 'garrison' && u.post === d.id);
    if (g.length < size) {
      const pick = spare().sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y)).slice(0, 1);   // one at a time
      for (const u of pick) { u.role = 'garrison'; u.post = d.id; u.passive = false; u.order = null; g.push(u); }
    }
    g.forEach((u, j) => {
      const a = 1.2 + j * 2.1, rr = 70 + Math.floor(j / 3) * 26, x = d.x + Math.cos(a) * rr, y = d.y + Math.sin(a) * rr;
      if (!u.order && Math.hypot(u.x - x, u.y - y) > 40) u.order = { type: 'move', x, y };
    });
  }
}

// Places worth holding with spare units, on its own side: among the gold on the middle island under its lookout,
// the middle of the island, and its ends of the river crossings. Worked out once per game.
function aiOutpostSpots() {
  const hq = hqOf(1); if (!hq) return [];
  const side = Math.sign(hq.x - riverX(hq.y)) || 1, out = [];
  const look = (MAP.plateaus || []).map(pl => [pl, { ...pl, x: W - pl.x, y: H - pl.y }]).flat().filter(pl => pl.overhang && Math.sign(pl.x - riverX(pl.y)) === side)[0];
  if (look) { const a = Math.atan2(look.y - ISLAND.y, look.x - ISLAND.x); out.push({ key: 'island-gold', x: ISLAND.x + Math.cos(a) * 330, y: ISLAND.y + Math.sin(a) * 330, cap: 6 }); }
  out.push({ key: 'island-middle', x: ISLAND.x + side * 60, y: ISLAND.y, cap: 4 });
  for (const b of BRIDGES) out.push({ key: 'bridge@' + Math.round(b.x) + ',' + Math.round(b.y), x: b.x + side * (b.hw + 70), y: b.y, cap: 4 });
  return out.filter(o => { const t = terrainAt(o.x, o.y); return t === T.GRASS || t === T.FOREST; }).filter(o => Math.sign(o.x - riverX(o.y)) === side || o.key.startsWith('island'));
}
function aiManOutposts(army, spare) {
  const ai = game.ai;
  if (!ai.outposts) ai.outposts = aiOutpostSpots();
  let sent = false;
  for (const o of ai.outposts) {
    const crew = army.filter(u => u.role === 'outpost' && u.post === o.key);
    if (!sent && crew.length < o.cap) {
      const u = spare().sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))[0];
      if (u) { u.role = 'outpost'; u.post = o.key; u.passive = false; u.order = null; crew.push(u); sent = true; }
    }
    crew.forEach((u, j) => {
      const a = j * 2.4, rr = 18 * Math.sqrt(j), x = o.x + Math.cos(a) * rr, y = o.y + Math.sin(a) * rr;
      if (!u.order && Math.hypot(u.x - x, u.y - y) > 35) u.order = { type: 'move', x, y };
    });
  }
}

// When the ore near its refineries is nearly gone, it heads for the nearest field it knows about:
// cheap Power Plants as stepping stones to stretch its build area, then a refinery right by the ore.
// Returns how much money it wants to keep for that (0 if it isn't expanding).
function aiExpand(hq, refineries, sent) {
  if (aiRunSettler()) return 0;   // a Settler it bought is on its way to a new base: nothing else until it has deployed
  if (refineries.length >= 4 || (!sent && game.time < 200) || aiBlocked('expand')) return 0;
  const oreNear = (x, y, r) => game.ore.reduce((s, o) => s + (o.amount > 0 && Math.hypot(o.x - x, o.y - y) < r ? o.amount : 0), 0);
  if (refineries.some(r => !r.built || oreNear(r.x, r.y, 450) > (diff().expandAt || 600) * ORE_MULT)) return 0;   // still plenty to mine (Hard moves on sooner)
  // never more than a few stepping stones
  if (game.ents.filter(e => e.team === 1 && e.type === 'power').length >= diff().plants + 4) return 0;
  // the nearest known ore on its own side of the river (it can't build across water) that isn't already by a refinery
  const mySide = Math.sign(hq.x - riverX(hq.y));
  let target = null, td = Infinity;
  for (const o of game.ore) {
    if (o.amount < 100 * ORE_MULT || !exploredAt(o.x, o.y, 1) || refineries.some(r => Math.hypot(r.x - o.x, r.y - o.y) < 450)) continue;
    if (Math.sign(o.x - riverX(o.y)) !== mySide || Math.hypot(o.x - ISLAND.x, o.y - ISLAND.y) < ISLAND.r + 40) continue;
    const d = Math.hypot(o.x - hq.x, o.y - hq.y);
    if (d < td) { td = d; target = o; }
  }
  if (!target) return 0;
  // the spot in its build area that gets closest to that ore
  let best = null, bd = Infinity;
  for (const src of buildAreaSources(1)) {
    for (let k = 0; k < 40; k++) {
      const a = Math.atan2(target.y - src.y, target.x - src.x) + (Math.random() - 0.5) * 1.6, d = src.r * (0.5 + Math.random() * 0.5);
      const x = src.x + Math.cos(a) * d, y = src.y + Math.sin(a) * d, dd = Math.hypot(target.x - x, target.y - y);
      if (dd < bd && canPlace(1, 'power', x, y)) { bd = dd; best = { x, y }; }
    }
  }
  const giveUp = () => { game.ai.cantPlace = game.ai.cantPlace || {}; game.ai.cantPlace.expand = game.time; return 0; };
  if (!best) return giveUp();
  if (bd >= 600) { const s = aiBuySettler(hq, target, sent); if (s) return s; }   // too far for a stepping stone or two: a new Settler, if it can spare one (v5.65)
  if (bd < 280) {   // close enough: put the refinery down by the ore
    if (game.credits[1] >= COST.refinery) {
      const before = refineries.length;
      aiPlaceRefinery(hq);
      if (game.ents.filter(e => e.team === 1 && e.type === 'refinery').length === before) return giveUp();
    }
    return COST.refinery;
  }
  if (game.credits[1] >= COST.power && !placeBuilding(1, 'power', best.x, best.y)) return giveUp();   // stepping stone
  return COST.power;
}

// A new Settler (v5.65): bought at the War Factory ($3,000 since v5.67, 40 s; needs a Nuclear Reactor and a Satellite Radar) and driven to fresh ore too far away to reach with
// stepping stones, where it deploys as a second HQ. The computer is careful with them: Normal and Hard only, never in its
// first 8 minutes or before two waves, only with a rich field to go for, its home well guarded and the Settler's price to spare beyond
// what it is saving for, one at a time, and at least 5 minutes after the last one (bought or lost).
const SETTLER_GAP = 300;
function aiBuySettler(hq, target, sent) {
  const D = diff(), ai = game.ai;
  if (!D.settlers || sent < 2 || game.time < 480 || game.time - (ai.settlerAt ?? -999) < SETTLER_GAP) return 0;
  const field = game.ore.reduce((s, o) => s + (o.amount > 0 && Math.hypot(o.x - target.x, o.y - target.y) < 300 ? o.amount : 0), 0);
  if (field < 2500 * ORE_MULT) return 0;   // not worth a whole new base
  if ([...ai.known.values()].some(k => Math.hypot(k.x - target.x, k.y - target.y) < 700)) return 0;   // not on your doorstep
  const army = game.ents.filter(e => e.team === 1 && isCombat(e) && !e.air).length;
  if (army < D.guard + D.minWave) return 0;   // home stays guarded
  const f = game.ents.find(e => e.team === 1 && e.type === 'factory' && e.built && !e.queue);
  if (!f) return 0;
  if (game.credits[1] < COST.settler + 500) return COST.settler + 500;   // save up for it (with a cushion)
  if (!produce(f, 'settler')) return 0;
  ai.settlerAt = game.time; ai.settlerGoal = { x: target.x, y: target.y }; ai.settlerTries = 0;
  return 0;
}
// drives its bought Settler to the new ore and deploys it close by; returns true while one is queued or on its way
function aiRunSettler() {
  const ai = game.ai;
  if (!ai.settlerGoal) return false;
  const queued = game.ents.some(e => e.team === 1 && e.type === 'factory' && e.qTypes.includes('settler'));
  const s = game.ents.find(e => e.team === 1 && e.type === 'settler' && e.hp > 0);
  if (!s) { if (!queued) { ai.settlerGoal = null; ai.settlerAt = game.time; } return queued; }   // lost on the way (or deployed): the 5-minute wait starts again
  const g = ai.settlerGoal;
  if (!ai.settlerSpot) {   // a free spot for the HQ near the ore, on the side facing home
    const hq = hqOf(1) || s;
    for (let k = 0; k < 60 && !ai.settlerSpot; k++) {
      const a = Math.atan2(hq.y - g.y, hq.x - g.x) + (Math.random() - 0.5) * 2.4, d = 150 + Math.random() * 150;
      const x = g.x + Math.cos(a) * d, y = g.y + Math.sin(a) * d;
      if (x > 60 && y > 60 && x < W - 60 && y < H - 60 && siteIsFree(x, y, STATS.hq.size)) ai.settlerSpot = { x, y };
    }
    if (!ai.settlerSpot) ai.settlerSpot = { x: g.x, y: g.y };
    // a small escort clears the way
    game.ents.filter(u => u.team === 1 && isCombat(u) && !u.air && !u.role).slice(0, 3).forEach(u => { u.order = { type: 'attackmove', x: ai.settlerSpot.x, y: ai.settlerSpot.y }; u.passive = false; });
  }
  const sp = ai.settlerSpot;
  // stuck (hasn't got 30 further in 15 s): try another spot, and after a few goes settle for wherever it can deploy
  if (!s.stuckAt || Math.hypot(s.x - s.stuckAt.x, s.y - s.stuckAt.y) > 30) s.stuckAt = { x: s.x, y: s.y, t: game.time };
  else if (game.time - s.stuckAt.t > 15) {
    s.stuckAt = null; s.order = null; ai.settlerTries++;
    if (ai.settlerTries > 4 && deploy(s)) { ai.settlerGoal = ai.settlerSpot = null; return false; }
    ai.settlerSpot = null;
    if (ai.settlerTries > 6) {   // still trapped: the nearest open ground it can see, in widening rings
      for (let r = 120; r <= 600 && !ai.settlerSpot; r += 80) for (let k = 0; k < 16 && !ai.settlerSpot; k++) {
        const a = k * Math.PI / 8, x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
        if (x > 60 && y > 60 && x < W - 60 && y < H - 60 && siteIsFree(x, y, STATS.hq.size) && walkable(terrainAt(x, y), true)) ai.settlerSpot = { x, y };
      }
    }
    return true;
  }
  if (Math.hypot(s.x - sp.x, s.y - sp.y) > 40) { if (!s.order) { if (++ai.settlerTries > 8) { if (deploy(s)) ai.settlerGoal = ai.settlerSpot = null; } else s.order = { type: 'move', x: sp.x, y: sp.y }; } return true; }
  if (deploy(s)) { ai.settlerGoal = ai.settlerSpot = null; return false; }
  ai.settlerSpot = null; ai.settlerTries++;   // no room right there: look for another spot
  return true;
}

// a new refinery goes as close as it can get to ore it knows about that still has plenty left
function aiPlaceRefinery(hq) {
  const ore = game.ore.filter(o => o.amount > 100 * ORE_MULT && (exploredAt(o.x, o.y, 1) || Math.hypot(o.x - hq.x, o.y - hq.y) < 600));
  if (!ore.length) return aiPlace(hq, 'refinery');
  let best = null, bestD = Infinity;
  for (const src of buildAreaSources(1)) {
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * (src.r + 40);
      const x = src.x + Math.cos(a) * d, y = src.y + Math.sin(a) * d;
      let od = Infinity; for (const o of ore) od = Math.min(od, Math.hypot(o.x - x, o.y - y));
      if (od < bestD && canPlace(1, 'refinery', x, y)) { bestD = od; best = { x, y }; }
    }
  }
  if (best && placeBuilding(1, 'refinery', best.x, best.y)) return true;
  return aiPlace(hq, 'refinery');
}

// Pinch points: the narrow pass between two plateaus that stand close together (the river lookout and the road plateau beside it).
// Returns the middle of each pass on low ground, for both sides; worked out once.
let pinchCache = null;
function pinchSpots() {
  if (pinchCache) return pinchCache;
  const pls = [];
  for (const pl of MAP.plateaus || []) { pls.push(pl); const [x, y] = mirror([pl.x, pl.y]); pls.push({ ...pl, x, y }); }
  const tilesOf = pl => { const out = []; for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++) { const x = c * TC + TC / 2, y = r * TC + TC / 2, dx = x - pl.x, dy = y - pl.y, co = Math.cos(pl.tilt), si = Math.sin(pl.tilt); const u = (dx * co + dy * si) / pl.rx, v = (-dx * si + dy * co) / pl.ry; if (Math.hypot(u, v) < 1.1 && elev[r * TCOLS + c]) out.push([x, y]); } return out; };
  const tiles = pls.map(tilesOf);
  pinchCache = [];
  for (let i = 0; i < pls.length; i++) for (let j = i + 1; j < pls.length; j++) {
    if (Math.hypot(pls[i].x - pls[j].x, pls[i].y - pls[j].y) > Math.max(pls[i].rx, pls[i].ry) + Math.max(pls[j].rx, pls[j].ry) + 220) continue;
    let best = null, bd = Infinity;
    for (const a of tiles[i]) for (const b of tiles[j]) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d < bd) { bd = d; best = [a, b]; } }
    if (!best || bd - TC > 160) continue;   // a real pinch: no more than about 160 wide
    const x = (best[0][0] + best[1][0]) / 2, y = (best[0][1] + best[1][1]) / 2;
    pinchCache.push({ x, y, width: bd - TC });
  }
  return pinchCache;
}

// where the computer digs in its next Turret: just inside a way into its base (clear of its planned walls), at the pinch on its side of
// the river, or by one of its Oil Derricks - each about equally likely to be its first choice
const aiTurretsAndPlans = () => game.ents.filter(e => e.team === 1 && (isTurretType(e.type) || (e.type === 'engineer' && e.turretAt))).map(t => isTurretType(t.type) ? t : t.turretAt);
const aiOnWallPlan = (x, y, pad = 45) => (game.ai.wallPlans || []).some(pl => [...pl.tiles, pl.gate].some(t => Math.abs(t.x - x) < pad && Math.abs(t.y - y) < pad));
function aiTurretSpot(hq, kind = 'mg') {
  const turrets = aiTurretsAndPlans();
  const taken = (x, y) => turrets.some(p => Math.hypot(p.x - x, p.y - y) < 90);
  const onPlan = (x, y) => (game.ai.wallPlans || []).some(pl => [...pl.tiles, pl.gate].some(t => Math.abs(t.x - x) < 45 && Math.abs(t.y - y) < 45));
  const mySide = p => (p.x - W / 2) * (hq.x - W / 2) > 0;   // on the computer's half of the map
  const pinches = pinchSpots().filter(mySide).map(p => ({ x: p.x, y: p.y, pull: 0, lowGround: true }));
  const entrances = findEntrances(1).map(ch => ({ x: ch.x, y: ch.y, pull: 80 }));
  const derricks = game.ents.filter(d => d.type === 'derrick' && d.team === 1).map(d => ({ x: d.x, y: d.y, pull: 70 }));
  // first choice at random, equal odds, among the kinds of spot it has: an entrance, the pinch, or one of its Oil Derricks; then the rest in that order
  const kinds = [entrances, pinches, derricks].filter(k => k.length), first = kinds.splice(Math.floor(Math.random() * kinds.length), 1)[0] || [];
  const near = [...first, ...kinds.flat()];
  for (const p of near) {
    const a = Math.atan2(hq.y - p.y, hq.x - p.x);
    for (const [da, dd] of [[0, 0], [0.5, 0], [-0.5, 0], [0, 30], [0.8, 20], [-0.8, 20]]) {
      const x = p.x + Math.cos(a + da) * (p.pull + dd), y = p.y + Math.sin(a + da) * (p.pull + dd);
      if (p.lowGround && elevAt(x, y)) continue;   // in the pass itself, not up on a plateau
      if (!taken(x, y) && !onPlan(x, y) && turretSiteOk(1, kind, x, y)) return { x, y };
    }
  }
  return null;
}

// towers go near its gate (if it has one) or toward the middle from the HQ
// SAM Site: under the busiest spot on its heat map of your aircraft that it can build on (or close enough to cover it),
// skipping spots another of its SAM Sites already covers; with nothing on the heat map yet, beside a Refinery (the one nearest you first), else by its HQ
const AIR_HEAT = 150;
const AI_SPARE = 300;   // the computer buys a Helipad or helicopter only with this much to spare on top of its price
function aiPlaceSam(hq, refineries) {
  const have = game.ents.filter(e => e.team === 1 && e.type === 'sam');
  const hot = Object.entries(game.ai.airHeat || {}).map(([k, n]) => { const [c, r] = k.split(',').map(Number); return { x: (c + 0.5) * AIR_HEAT, y: (r + 0.5) * AIR_HEAT, n }; })
    .filter(h => !have.some(s => Math.hypot(s.x - h.x, s.y - h.y) < STATS.sam.range * 0.8) && inBuildArea(1, h.x, h.y, WALL_REACH + STATS.sam.range * 0.7)).sort((a, b) => b.n - a.n);   // (only spots it could cover from where it can build)
  for (const h of hot.slice(0, 6)) {   // from the hot spot, walk toward its HQ until there's room to build, as long as the spot stays in reach
    const d = Math.hypot(hq.x - h.x, hq.y - h.y) || 1, ux = (hq.x - h.x) / d, uy = (hq.y - h.y) / d;
    for (let along = 0; along <= STATS.sam.range * 0.7; along += 20)
      for (const side of [0, 30, -30, 60, -60]) {
        const x = h.x + ux * along - uy * side, y = h.y + uy * along + ux * side;
        if (placeBuilding(1, 'sam', x, y)) return true;
      }
  }
  const yours = hqOf(0) || { x: W / 2, y: H / 2 };
  const refs = refineries.filter(r => r.built && !have.some(s => Math.hypot(s.x - r.x, s.y - r.y) < 200)).sort((a, b) => Math.hypot(a.x - yours.x, a.y - yours.y) - Math.hypot(b.x - yours.x, b.y - yours.y));
  for (const r of refs) for (let tries = 0; tries < 25; tries++) {
    const a = Math.random() * Math.PI * 2, d = r.size / 2 + 40 + Math.random() * 70;
    if (placeBuilding(1, 'sam', r.x + Math.cos(a) * d, r.y + Math.sin(a) * d)) return true;
  }
  return aiPlace(hq, 'sam');
}
// The computer's helicopters: each Helipad keeps one. Fully armed and patched up, it raids the closest of your buildings it knows of,
// keeping clear of SAM Sites it has spotted; badly hurt, it flies home.
// Giving up on helicopters (v5.65): a helicopter that dies having done less damage than its own price is a cheap loss.
// After 3 cheap losses it tries one bigger wave: twice its usual Helipads (2 on Normal, 4 on Hard), all helicopters held
// on their pads until every one is ready (or 4 minutes have passed, with at least 2), then sent together. If that wave
// also does less damage than it cost, it stops buying helicopters for the rest of the game (the ones it has keep flying).
// If the wave pays for itself, it goes back to raiding as before and the count starts again.
// Defence (v5.65): whenever your units are on its half of the map (past the river), its helicopters that are ready go after
// them first. Deaths on defence don't count as cheap losses, and after giving up on raids it keeps its usual Helipads filled for defence only.
const HELI_CHEAP_LOSSES = 3, HELI_WAVE_WAIT = 240;
const heliDamage = () => ((game.track && game.track.hits[1].heli) || { damageValue: 0 }).damageValue;
const aiHeliPads = D => !D.helis ? 0 : game.ai.heliMode === 'wave' ? D.helis * 2 : D.helis;   // (after giving up on raids: its usual pads, for defence)
function aiHelis(D) {
  if (!D.helis) return;
  const ai = game.ai, mine = game.ents.filter(h => h.team === 1 && h.air && h.hp > 0);
  ai.heliMode = ai.heliMode || 'raid'; ai.heliCheap = ai.heliCheap || 0;
  // which of its helicopters have died since it last looked, and how much they had done since the one before
  const ids = new Set(mine.map(h => h.id)), dmg = heliDamage();
  ai.heliDef = (ai.heliDef || []).filter(id => { const h = byId(id); return h && h.hp > 0 && !(h.landed && !h.order) || !ids.has(id); });
  for (const id of ai.heliIds || []) if (!ids.has(id) && !(ai.heliWave && ai.heliWave.ids.includes(id)) && !ai.heliDef.includes(id)) {   // (lost on defence: doesn't count)
    if (dmg - (ai.heliDmgMark || 0) < COST.heli) ai.heliCheap++; else ai.heliCheap = 0;
    ai.heliDmgMark = dmg;
  }
  ai.heliIds = [...ids]; ai.heliDef = ai.heliDef.filter(id => ids.has(id));
  if (ai.heliMode === 'raid' && ai.heliCheap >= HELI_CHEAP_LOSSES) { ai.heliMode = 'wave'; ai.heliWaveSince = game.time; }
  // the bigger wave: when it's out, wait for every one of its helicopters to be shot down or back home, then judge it
  const wv = ai.heliWave;
  if (wv && !wv.ids.some(id => { const h = byId(id); return h && h.hp > 0 && !(h.landed && !h.order); })) {
    const paid = dmg - wv.dmg >= wv.ids.length * COST.heli;
    ai.heliWave = null; ai.heliCheap = 0; ai.heliDmgMark = dmg;
    ai.heliMode = paid ? 'raid' : 'done';
  }
  let room = ai.heliMode === 'done' ? D.helis - mine.length - game.ents.filter(p => p.team === 1 && p.type === 'helipad' && p.queue).length : Infinity;   // (defence only: just its usual number, even with the wave's extra pads)
  for (const p of game.ents) if (room > 0 && p.team === 1 && p.type === 'helipad' && p.built && !padHeli(p) && !p.queue && game.credits[1] >= COST.heli + (D.heliSpare ?? AI_SPARE) && produce(p, 'heli')) room--;
  const sams = [...ai.known.values()].filter(k => k.type === 'sam');
  const safe = (x, y) => !sams.some(k => Math.hypot(k.x - x, k.y - y) < STATS.sam.range + 60);
  const target = h => { let best = null, bd = Infinity;   // the closest of your buildings it knows of (not walls or gates), away from SAM Sites (v5.65: it used to go for Extractors and Artillery first, then Refineries)
    for (const [id, k] of ai.known) if (!isWallType(k.type) && safe(k.x, k.y)) { const b = byId(id); const d = Math.hypot(k.x - h.x, k.y - h.y); if (b && b.team === 0 && d < bd) { bd = d; best = b; } }
    return best; };
  const ready = h => h.landed && !h.order && h.ammo >= STATS.heli.ammo && h.hp >= h.maxHp * 0.8;
  for (const h of mine) if (!h.landed && h.hp < h.maxHp * 0.4 && padOf(h)) { if (!h.order || h.order.type !== 'return') h.order = { type: 'return' }; }
  const home = hqOf(1), mySide = home ? Math.sign(home.x - riverX(home.y)) : 0;
  // (a helicopter left hovering where its target slipped into the fog now goes home by itself: updateHeli, HELI_IDLE)
  // one whose Helipad is gone (and no other is free) used to hover where it was for good: now it spends its missiles on the
  // closest target, then waits by its HQ until a Helipad is free again (it rebuilds lost pads as usual)
  for (const h of mine) {
    if (h.order || padOf(h) || (h.landed && !h.ammo)) continue;   // (landed out in the field with missiles left: it goes again)
    const t = h.ammo > 0 && (target(h) || null);
    if (t) h.order = { type: 'attack', target: t.id };
    else if (!h.landed && home && Math.hypot(h.x - home.x, h.y - home.y) > 120) h.order = { type: 'move', x: home.x + 60, y: home.y - 80 };   // (and lands there)
  }
  // defence first: your units it can see on its half of the map
  const intruders = mySide ? game.ents.filter(u => u.team === 0 && isUnit(u) && u.hp > 0 && !u.air && Math.sign(u.x - riverX(u.y)) === mySide && visibleAt(u.x, u.y, 1) && !hiddenFrom(u, 1) && safe(u.x, u.y)) : [];
  if (intruders.length) for (const h of mine) {
    if (!h.landed || h.order || h.ammo < STATS.heli.ammo / 2 || h.hp < h.maxHp * 0.5) continue;
    let t = null, td = Infinity; for (const u of intruders) { const d = Math.hypot(u.x - h.x, u.y - h.y); if (d < td && canHit(h, u)) { td = d; t = u; } }
    if (t) { h.order = { type: 'attack', target: t.id }; if (!ai.heliDef.includes(h.id)) ai.heliDef.push(h.id); }
  }
  if (ai.heliMode === 'done') return;   // given up on raids: defence only
  if (ai.heliMode === 'wave' && !ai.heliWave) {   // hold them all on their pads until the wave is ready, then send them together
    const pads = game.ents.filter(p => p.team === 1 && p.type === 'helipad' && p.built).length, set = mine.filter(ready);
    const full = pads >= D.helis * 2 && set.length >= pads, late = game.time - (ai.heliWaveSince || 0) > HELI_WAVE_WAIT && set.length >= 2;
    if ((full || late) && set.length) {
      const t = target(set[0]);
      if (t) { for (const h of set) h.order = { type: 'attack', target: t.id }; ai.heliWave = { ids: set.map(h => h.id), dmg }; }
    }
    return;
  }
  if (ai.heliWave) return;   // (the wave finds its own next targets once its first is gone)
  for (const h of mine) { if (!ready(h)) continue; const t = target(h); if (t) h.order = { type: 'attack', target: t.id }; }
}
// an entrance turret: just behind each gap in its base wall in turn (main one first), near a rocky end, then a second at each from the other end
function aiEntranceTurretSpot(hq, kind) {
  const ents = findEntrances(1), have = aiTurretsAndPlans().filter(p => p.entrance).length;
  const ok = (x, y) => !aiOnWallPlan(x, y, STATS[kind].size / 2 + 22) && turretSiteOk(1, kind, x, y) && !aiTurretsAndPlans().some(p => Math.hypot(p.x - x, p.y - y) < 60);
  if (ents.length) {
    const ch = ents[have % ents.length], spot = gapTowerSpots(ch)[Math.floor(have / ents.length) % 2];
    for (let tries = 0; tries < 25; tries++) {
      const x = spot.x + (Math.random() - 0.5) * tries * 3, y = spot.y + (Math.random() - 0.5) * tries * 3;
      if (ok(x, y)) return { x, y };
    }
  }
  const gate = game.ents.find(e => e.type === 'gate' && e.team === 1);
  if (gate) for (let tries = 0; tries < 30; tries++) {
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90, x = gate.x + Math.cos(a) * d, y = gate.y + Math.sin(a) * d;
    if (Math.hypot(x - hq.x, y - hq.y) < Math.hypot(gate.x - hq.x, gate.y - hq.y) && ok(x, y)) return { x, y };   // on the inside of the wall
  }
  for (let tries = 0; tries < 40; tries++) {   // otherwise toward the middle of the map from its HQ
    const a = Math.atan2(H / 2 - hq.y, W / 2 - hq.x) + (Math.random() - 0.5) * 1.6, d = 150 + Math.random() * 120, x = hq.x + Math.cos(a) * d, y = hq.y + Math.sin(a) * d;
    if (ok(x, y)) return { x, y };
  }
  return null;
}
// which turret to build next, from what it has seen of your army: a Laser now and then on Hard once it has a Tech Centre and money to spare,
// a Missile Turret once it has seen your aircraft (if it has a Helipad), Cannons against vehicles, Machine Guns against infantry
function aiTurretKind(D, defs) {
  const ai = game.ai, seen = ai.seen || { infantry: 0, vehicles: 0 }, have = k => defs.filter(d => (isTurretType(d.type) ? d.type : d.turretAt.kind) === k).length;
  if (D.heavyTanks && unlocked(1, 'laser') && game.credits[1] >= COST.laser + 300 && have('laser') < 1) return 'laser';
  if (ai.seenAir && unlocked(1, 'missile') && have('missile') < 1) return 'missile';
  if (unlocked(1, 'cannon') && seen.vehicles * 2 >= seen.infantry && have('cannon') <= have('mg')) return 'cannon';
  return unlocked(1, 'mg') ? 'mg' : 'mg';
}

// ---------- Drawing ----------
function draw() {
  const { dpr } = scr, s = scale();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const ox = scr.w / 2 - cam.x * s, oy = scr.h / 2 - cam.y * s;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);

  // only draw the part of the background that's on screen
  const vx = Math.max(0, cam.x - scr.w / 2 / s), vy = Math.max(0, cam.y - scr.h / 2 / s);
  const vw = Math.min(W - vx, scr.w / s + 2), vh = Math.min(HT - vy, scr.h / s + 2);
  if (vw > 0 && vh > 0) ctx.drawImage(bg, vx, vy, vw, vh, vx, vy, vw, vh);

  for (const o of game.ore) if (exploredAt(o.x, o.y)) drawOre(o);

  const sel = game.selected;
  const ents = game.ents.filter(canSee).sort((a, b) => (isBuilding(b) - isBuilding(a)) || (!!a.air - !!b.air) || a.y - b.y);   // buildings, then ground units, then aircraft on top
  if (game.landing) drawBoat(game.landing);
  for (const e of ents) {
    if (e.boarded) continue;   // drawn on its boat
    if (sel.has(e.id)) drawSelection(e);
    if (e.type === 'hq') drawHQ(e);
    else if (e.type === 'barracks') drawBarracks(e);
    else if (e.type === 'refinery') drawRefinery(e);
    else if (isDefenceType(e.type)) drawDefence(e);
    else if (e.type === 'power') drawPower(e);
    else if (e.type === 'radar') drawRadar(e);
    else if (e.type === 'reactor') drawReactor(e);
    else if (e.type === 'satellite') drawSatellite(e);
    else if (e.type === 'medbay') drawMedbay(e);
    else if (e.type === 'wall') drawWall(e);
    else if (e.type === 'gate') drawGate(e);
    else if (e.type === 'settler') drawSettler(e);
    else if (e.type === 'extractor') drawExtractor(e);
    else if (e.type === 'buggy') drawBuggy(e);
    else if (e.type === 'grenadier' || e.type === 'engineer' || e.type === 'rocket' || e.type === 'sniper' || e.type === 'civilian') drawSoldier(e);
    else if (e.type === 'factory') drawFactory(e);
    else if (e.type === 'tech') drawTech(e);
    else if (e.type === 'light') drawTank(e);
    else if (e.type === 'heavy') drawHeavyTank(e);
    else if (e.type === 'artillery') drawArtillery(e);
    else if (e.type === 'derrick') drawDerrick(e);
    else if (e.type === 'house') drawHouse(e);
    else if (e.type === 'helipad') drawHelipad(e);
    else if (e.air) drawHeli(e);
    else drawSoldier(e);
    if (e.ruin && !ruinWorks(e)) drawRuin(e);
    if (e.hp < e.maxHp * DMG_DAMAGED) drawDamageMarks(e);
  }
  for (const e of ents) if (e.hp < e.maxHp * DMG_DAMAGED) drawDamageSmoke(e);   // smoke and fire over everything on the ground
  for (const e of ents) if ((sel.has(e.id) || e.hp < e.maxHp) && e.type !== 'house') drawHealth(e);
  for (const e of ents) if (sel.has(e.id) && isBuilding(e)) drawNameTag(e);
  for (const e of ents) if (sel.has(e.id) && isDefenceType(e.type)) drawRange(e.x, e.y, rangeOf(e));
  for (const e of ents) if (sel.has(e.id) && e.type === 'artillery' && e.team === 0) drawRange(e.x, e.y, rangeOf(e));

  for (const fx of game.effects) {
    if (fx.kind !== 'marker' && fx.kind !== 'text' && !visibleAt(fx.x, fx.y)) continue;
    if (fx.kind === 'beam') {   // the Laser Turret's shot: a thick glowing beam with a white core that fades out
      const k = 1 - fx.t / 0.35;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(120,230,255,${0.55 * k})`; ctx.lineWidth = 9 * k + 1; ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 3 * k + 0.5; ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
      ctx.fillStyle = `rgba(200,250,255,${0.8 * k})`; ctx.beginPath(); ctx.arc(fx.x2, fx.y2, 10 * k + 2, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'butt';
    } else if (fx.kind === 'shot') {
      ctx.strokeStyle = fx.heavy ? '#ffe9a0' : fx.team === 0 ? '#dbeafe' : '#fee2e2'; ctx.lineWidth = fx.heavy ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    } else if (fx.kind === 'boom') {
      const k = fx.t / 0.6, r = (fx.big ? 50 : 18) * (0.4 + k);
      ctx.fillStyle = `rgba(255,${160 - 100 * k | 0},40,${1 - k})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'marker') {
      const k = fx.t / 0.6;
      ctx.strokeStyle = fx.color || `rgba(120,255,120,${1 - k})`; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 6 + 14 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (fx.kind === 'blast') {   // grenade explosion
      const k = fx.t / 0.45;
      ctx.fillStyle = `rgba(255,${190 - 120 * k | 0},60,${0.75 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.35 + 0.65 * k), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(80,70,60,${0.6 * (1 - k)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.5 + 0.6 * k), 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'spark') {   // engineer repairing
      const k = fx.t / 0.3;
      ctx.fillStyle = `rgba(150,255,170,${1 - k})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y - k * 8, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(fx.x - 4, fx.y - k * 8 - 0.8, 8, 1.6); ctx.fillRect(fx.x - 0.8, fx.y - k * 8 - 4, 1.6, 8);
    } else if (fx.kind === 'dust') {
      const k = fx.t / 0.6;
      ctx.fillStyle = `rgba(170,150,110,${0.35 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 3 + k * 7, 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'text') {
      const k = fx.t / 1.2;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = fx.color || '#ffd86b'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(fx.text, fx.x, fx.y - 25 * k); ctx.globalAlpha = 1;
    }
  }

  drawNapalm();
  // grenades in flight: a little ball on an arc
  for (const g of game.grenades) {
    const arc = g.shell ? 90 : 28, k = g.t / g.dur, gx = g.x0 + (g.x - g.x0) * k, gy = g.y0 + (g.y - g.y0) * k, x = gx, y = gy - Math.sin(k * Math.PI) * arc;
    if (!visibleAt(gx, gy)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(gx, gy, g.shell ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.shell ? '#2a2a24' : '#3d4a2a'; ctx.beginPath(); ctx.arc(x, y, g.shell ? 4.2 : 3.2, 0, Math.PI * 2); ctx.fill();
  }

  // rockets in flight: a small missile with a bright exhaust
  for (const r of game.rockets) {
    if (!visibleAt(r.x, r.y)) continue;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.ang || 0);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-6, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#555c48'; ctx.fillRect(-5, -1.6, 9, 3.2);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(4, -1.6); ctx.lineTo(7, 0); ctx.lineTo(4, 1.6); ctx.fill();
    ctx.restore();
  }

  // fog on top of the world
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogCanvas, 0, 0, COLS, ROWS, 0, 0, W, HT);

  if (game.placing) drawPlacement();

  if (input.box) {
    const b = input.box;
    ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 2 / s; ctx.fillStyle = 'rgba(125,255,125,0.1)';
    ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
    ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
  }

  if (!MM.hidden) drawMinimap();
}

function drawPlacement() {
  if (game.placing.strike) {   // the Napalm Strike: where the strip of fire will go
    const g = game.placing.ghost; if (!g) return;
    const l = napalmLine(0, g.x, g.y), ok = visibleAt(g.x, g.y, 0);
    ctx.strokeStyle = ok ? 'rgba(255,140,60,0.35)' : 'rgba(255,60,60,0.3)'; ctx.lineWidth = NAPALM_HALF * 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = ok ? '#ffb070' : '#ff6b6b'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(ok ? 'Tap again to call the Napalm Strike' : "You can't see there", g.x, g.y - NAPALM_HALF - 12);
    return;
  }
  const type = game.placing.type, size = STATS[type].size;
  const extra = isWallType(type) || type === 'sam' ? WALL_REACH : 0;
  const areas = game.placing.turret ? [] : buildAreaSources(0);
  if (areas.length) {   // the build area: all the circles merged into one shape
    ctx.fillStyle = 'rgba(125,255,125,0.08)';
    ctx.beginPath();
    for (const a of areas) { ctx.moveTo(a.x + a.r + extra, a.y); ctx.arc(a.x, a.y, a.r + extra, 0, Math.PI * 2); }
    ctx.fill();
    ctx.strokeStyle = 'rgba(125,255,125,0.35)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
    ctx.stroke(); ctx.setLineDash([]);
  }
  if (type === 'wall') {
    const p = game.placing;
    if (!p.anchor) return;
    const tiles = p.end ? wallLine(p.anchor, p.end) : [p.anchor];
    let cost = 0;
    for (const t of tiles) {
      const ok = canPlaceWallPiece(0, 'wall', t.x, t.y);
      if (ok) cost += COST.wall;
      ctx.fillStyle = ok ? 'rgba(80,255,80,0.4)' : 'rgba(255,60,60,0.4)';
      ctx.fillRect(t.x - TC / 2 + 1, t.y - TC / 2 + 1, TC - 2, TC - 2);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(p.anchor.x - TC / 2, p.anchor.y - TC / 2, TC, TC);
    const last = tiles[tiles.length - 1];
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`$${cost} — tap ${p.end ? 'the end' : 'it'} again to build`, last.x, last.y - 18);
    return;
  }
  const g = game.placing.ghost;
  if (game.placing.turret) {   // a turret: anywhere you can see, but not within TURRET_KEEP_OUT of an enemy building (their no-build rings show in red)
    const cx = g ? g.x : cam.x, cy = g ? g.y : cam.y;
    ctx.strokeStyle = 'rgba(255,90,90,0.45)'; ctx.fillStyle = 'rgba(255,60,60,0.06)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    for (const b of game.ents) {
      if (!isBuilding(b) || b.team === 0 || b.team === NEUTRAL || isWallType(b.type) || b.hp <= 0 || !knowsBuilding(0, b) || Math.hypot(b.x - cx, b.y - cy) > 1400) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(halfX(b), halfY(b)) + TURRET_KEEP_OUT, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (!g) return;
    const ok = turretSiteOk(0, type, g.x, g.y) && game.credits[0] >= COST[type];
    drawRange(g.x, g.y, STATS[type].range * (elevAt(g.x, g.y) ? HIGH_RANGE : 1));
    ctx.fillStyle = ok ? 'rgba(80,255,80,0.3)' : 'rgba(255,60,60,0.3)'; ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(NAMES[type], g.x, g.y - size / 2 - 18);
    ctx.font = '11px system-ui';
    ctx.fillText(ok ? 'Tap again to send your Engineer' : (game.credits[0] < COST[type] ? 'Not enough money' : turretSiteProblem(0, type, g.x, g.y) || "Can't build here"), g.x, g.y - size / 2 - 5);
    return;
  }
  if (!g) return;
  if (type === 'gate') {
    const ok = canPlaceWallPiece(0, 'gate', g.x, g.y, g.vertical) && game.credits[0] >= COST.gate;
    const { hx, hy } = gateHalf(g.vertical);
    ctx.fillStyle = ok ? 'rgba(80,255,80,0.35)' : 'rgba(255,60,60,0.35)';
    ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
    ctx.fillRect(g.x - hx, g.y - hy, hx * 2, hy * 2); ctx.strokeRect(g.x - hx, g.y - hy, hx * 2, hy * 2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(ok ? 'Gate — tap again' : "Can't build here", g.x, g.y - hy - 8);
    return;
  }
  const ok = canPlace(0, type, g.x, g.y) && game.credits[0] >= COST[type];
  if (type === 'sam') drawRange(g.x, g.y, STATS.sam.range);
  ctx.fillStyle = ok ? 'rgba(80,255,80,0.3)' : 'rgba(255,60,60,0.3)';
  ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
  ctx.fillRect(g.x - size / 2, g.y - size / 2, size, size);
  ctx.strokeRect(g.x - size / 2, g.y - size / 2, size, size);
  ctx.fillRect(g.x - 14, g.y + size / 2, 28, 12);   // front door / apron
  ctx.strokeRect(g.x - 14, g.y + size / 2, 28, 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(NAMES[type], g.x, g.y - 4);
  ctx.font = '11px system-ui';
  ctx.fillText(ok ? 'Tap again to build' : "Can't build here", g.x, g.y + 12);
}

function drawMinimap() {
  const { dpr } = scr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = MM.w / W;
  ctx.fillStyle = '#000'; ctx.fillRect(MM.x - 2, MM.y - 2, MM.w + 4, MM.h + 4);
  ctx.drawImage(mmBg, 0, 0, mmBg.width, mmBg.height, MM.x, MM.y, MM.w, MM.h);
  ctx.fillStyle = '#e6c34a';
  for (const o of game.ore) if (exploredAt(o.x, o.y)) ctx.fillRect(MM.x + o.x * k - 1.5, MM.y + o.y * k - 1.5, 3, 3);
  for (const e of game.ents) {
    if (!canSee(e)) continue;
    ctx.fillStyle = TEAMS[e.team].color;
    const sz = isWallType(e.type) ? 2 : isBuilding(e) ? 6 : 3;
    ctx.fillRect(MM.x + e.x * k - sz / 2, MM.y + e.y * k - sz / 2, sz, sz);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogCanvas, 0, 0, COLS, ROWS, MM.x, MM.y, MM.w, MM.h);
  // camera rectangle
  const s = scale();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  const rx = MM.x + (cam.x - scr.w / 2 / s) * k, ry = MM.y + (cam.y - scr.h / 2 / s) * k;
  ctx.save(); ctx.beginPath(); ctx.rect(MM.x, MM.y, MM.w, MM.h); ctx.clip();
  ctx.strokeRect(rx, ry, scr.w / s * k, scr.h / s * k); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(MM.x - 0.5, MM.y - 0.5, MM.w + 1, MM.h + 1);
}

function drawOre(o) {
  const k = Math.sqrt(o.amount / o.max), r = 5 + 11 * k;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(3, 4, r * 1.2, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  const shards = [[0, 0, 1], [-0.7, 0.3, 0.7], [0.6, 0.4, 0.75], [0.1, -0.6, 0.6]];
  for (const [sx, sy, m] of shards) {
    const x = sx * r, y = sy * r, h = r * m * 1.3, w = r * m * 0.55;
    ctx.fillStyle = '#c9a227';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h * 0.4); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5dc72';
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.4, y - h * 0.1); ctx.lineTo(x - w * 0.5, y); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawSelection(e) {
  ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 2;
  if (isBuilding(e)) {
    const hx = halfX(e) + 5, hy = halfY(e) + 5;
    ctx.strokeRect(e.x - hx, e.y - hy, hx * 2, hy * 2);
  } else {
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.5, e.r + 5, (e.r + 5) * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---- Visible damage (v5.51; vehicle fires drawn bigger than a scaled-down building fire so they read at normal zoom) ----
// Buildings and vehicles show how hurt they are: below 2/3 health scorch marks, cracks or dents and a thin wisp of smoke;
// below 1/3 more scorching, flickering fires, thick black smoke and sparks. Infantry don't show it.
const DMG_DAMAGED = 2 / 3, DMG_CRITICAL = 1 / 3;
const DMG_VEHICLES = new Set(['settler', 'extractor', 'buggy', 'light', 'heavy', 'artillery', 'heli']);
function dmgShows(e) { return e.built !== false && e.type !== 'house' && !(e.ruin && !ruinWorks(e)) && (isBuilding(e) || DMG_VEHICLES.has(e.type)); }
function dmgRand(e, i) { const x = Math.sin(e.id * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x); }   // the same marks every frame for a given unit
function dmgSpots(e, n, salt) {   // spots spread over a building's footprint, or over a vehicle's hull (in its own turned frame)
  const out = [];
  if (isBuilding(e)) { const hx = halfX(e) * 0.75, hy = halfY(e) * 0.7; for (let i = 0; i < n; i++) out.push({ x: e.x + (dmgRand(e, salt + i * 2) * 2 - 1) * hx, y: e.y + (dmgRand(e, salt + i * 2 + 1) * 2 - 1) * hy, s: 0.6 + dmgRand(e, salt + i + 50) * 0.6 }); }
  else { const r = e.r * 0.7; for (let i = 0; i < n; i++) out.push({ x: (dmgRand(e, salt + i * 2) * 2 - 1) * r, y: (dmgRand(e, salt + i * 2 + 1) * 2 - 1) * r * 0.6, s: 0.6 + dmgRand(e, salt + i + 50) * 0.6 }); }
  return out;
}
function dmgScale(e) { return isBuilding(e) ? Math.max(0.5, Math.min(2.2, Math.min(halfX(e), halfY(e)) / 30)) : e.r / 14; }
function dmgVehicleFrame(e) { ctx.translate(e.x, e.y - (e.air ? (e.alt || 0) * HELI_LIFT : 0)); ctx.rotate(e.facing || 0); }
function drawDamageMarks(e) {
  if (!dmgShows(e)) return;
  const crit = e.hp < e.maxHp * DMG_CRITICAL, sc = dmgScale(e), wall = e.type === 'wall' || e.type === 'gate';
  ctx.save();
  if (!isBuilding(e)) dmgVehicleFrame(e);
  else { ctx.beginPath(); ctx.rect(e.x - halfX(e), e.y - halfY(e), halfX(e) * 2, halfY(e) * 2); ctx.clip(); }   // marks stay on the building
  // scorch marks: soft dark blotches
  for (const p of dmgSpots(e, wall ? (crit ? 2 : 1) : crit ? 5 : 3, 1)) {
    const r = (isBuilding(e) ? 11 : 5) * sc * p.s;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, 'rgba(20,16,12,0.75)'); g.addColorStop(0.6, 'rgba(30,24,18,0.4)'); g.addColorStop(1, 'rgba(30,24,18,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }
  // cracks on buildings, dents and scrapes on vehicles
  ctx.strokeStyle = 'rgba(15,12,10,0.8)'; ctx.lineWidth = isBuilding(e) ? 1.4 : 1; ctx.lineCap = 'round';
  for (const [k, p] of dmgSpots(e, crit ? 4 : 2, 20).entries()) {
    let x = p.x, y = p.y, a = dmgRand(e, 70 + k) * Math.PI * 2;
    const len = (isBuilding(e) ? 7 : 3) * sc, steps = isBuilding(e) ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < steps; j++) { a += (dmgRand(e, 90 + k * 7 + j) - 0.5) * 1.6; x += Math.cos(a) * len; y += Math.sin(a) * len; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  if (crit && isBuilding(e) && !wall) {   // holes punched through the roof
    for (const p of dmgSpots(e, 2, 40)) { ctx.fillStyle = 'rgba(8,6,5,0.85)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4.5 * sc * p.s, 3 * sc * p.s, dmgRand(e, p.x | 0), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function drawDamageSmoke(e) {
  if (!dmgShows(e)) return;
  const crit = e.hp < e.maxHp * DMG_CRITICAL, sc = dmgScale(e), t = performance.now() / 1000, wall = e.type === 'wall' || e.type === 'gate';
  if (wall && !crit) return;
  // where the smoke comes from, in world space (vehicles: turned with the hull)
  const src = dmgSpots(e, wall ? 1 : isBuilding(e) ? (crit ? 3 : 1) : 1, 40).map(p => {
    if (isBuilding(e)) return p;
    const lift = e.air ? (e.alt || 0) * HELI_LIFT : 0, c = Math.cos(e.facing || 0), s = Math.sin(e.facing || 0);
    return { x: e.x + p.x * c - p.y * s, y: e.y - lift + p.x * s + p.y * c, s: p.s };
  });
  for (const [k, p] of src.entries()) {
    const seed = dmgRand(e, 200 + k), n = crit ? 7 : 4, life = crit ? 2.2 : 2.6, rise = (crit ? 46 : 32) * Math.max(0.7, sc);
    for (let i = 0; i < n; i++) {
      const f = ((t / life) + i / n + seed) % 1;   // 0 = just out, 1 = gone
      const x = p.x + f * 14 * Math.max(0.7, sc) + Math.sin((t + i) * 1.7 + seed * 9) * 2.5, y = p.y - f * rise;
      const r = (crit ? 4 : 3) * Math.max(0.7, sc) * (0.6 + f * 1.8), a = (crit ? 0.6 : 0.45) * (1 - f) * Math.min(1, f * 6);
      ctx.fillStyle = crit ? `rgba(28,26,24,${a})` : `rgba(95,93,88,${a})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    if (!crit) continue;
    // fire: a few flickering tongues of flame
    const fr = (isBuilding(e) ? 6 * Math.max(0.7, sc) : 6.5 * Math.max(1, sc)) * p.s;
    for (let j = 0; j < 3; j++) {
      const fl = 0.75 + 0.25 * Math.sin(t * 13 + j * 2.1 + seed * 20) + 0.1 * Math.sin(t * 29 + j);
      const fx = p.x + (j - 1) * fr * 0.55, h = fr * 1.7 * fl, w = fr * 0.55;
      ctx.fillStyle = 'rgba(255,120,30,0.85)';
      ctx.beginPath(); ctx.moveTo(fx - w, p.y); ctx.quadraticCurveTo(fx - w * 0.6, p.y - h * 0.6, fx, p.y - h); ctx.quadraticCurveTo(fx + w * 0.6, p.y - h * 0.6, fx + w, p.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,90,0.9)';
      ctx.beginPath(); ctx.moveTo(fx - w * 0.5, p.y); ctx.quadraticCurveTo(fx - w * 0.3, p.y - h * 0.35, fx, p.y - h * 0.6); ctx.quadraticCurveTo(fx + w * 0.3, p.y - h * 0.35, fx + w * 0.5, p.y); ctx.closePath(); ctx.fill();
    }
    // sparks now and then
    if (Math.sin(t * 7 + seed * 40) > 0.6) for (let j = 0; j < 3; j++) {
      const a = dmgRand(e, (t * 10 | 0) + j) * Math.PI * 2, d = 4 + dmgRand(e, (t * 10 | 0) + j + 9) * 8 * Math.max(0.7, sc);
      ctx.fillStyle = 'rgba(255,240,170,0.95)'; ctx.fillRect(p.x + Math.cos(a) * d, p.y - 3 + Math.sin(a) * d * 0.6, 1.6, 1.6);
    }
  }
}

function drawHealth(e) {
  const w = isBuilding(e) ? halfX(e) * 2 : e.r * 2.6;
  const top = isBuilding(e) ? e.y - halfY(e) - 10 : e.y - e.r - 9 - (e.air ? e.alt * HELI_LIFT : 0);
  const k = Math.max(0, e.hp / e.maxHp);
  if (e.air && e.team === 0) for (let i = 0; i < STATS.heli.ammo; i++) { ctx.fillStyle = i < e.ammo ? '#ffd86b' : 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x - w / 2 + i * (w / STATS.heli.ammo), top + 5, w / STATS.heli.ammo - 1, 3); }   // missiles left
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, top - 1, w + 2, 6);
  ctx.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillRect(e.x - w / 2, top, w * k, 4);
  if (e.type === 'extractor' && e.cargo > 0) {
    const c = e.cargo / STATS.extractor.capacity;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, top + 5, w + 2, 5);
    ctx.fillStyle = '#ffd86b'; ctx.fillRect(e.x - w / 2, top + 6, w * c, 3);
  }
}

// The landing craft: seen from above, bow (and its ramp) to the north, a wheelhouse at the stern, your colour along the sides
function drawBoat(L) {
  const t = performance.now() / 1000, moving = L.phase === 'sail' || (L.phase === 'leave' && L.t > 0.6);
  ctx.save(); ctx.translate(L.x, L.y); ctx.scale(BOAT_K, BOAT_K);   // (1.4x since v5.59, to carry the bigger Settler)
  if (moving) {   // wake: a white V behind it and foam at the bow
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 14, 30); ctx.quadraticCurveTo(sg * 22, 55, sg * 36, 82); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(Math.sin(t * 7 + k) * 12, 40 + k * 9, 3 + k * 0.6, 0, Math.PI * 2); ctx.fill(); }
  } else { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 4, 24, 40, 0, 0, Math.PI * 2); ctx.stroke(); }   // ripples round it while it waits
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.roundRect(-16, -30, 36, 70, 6); ctx.fill();   // shadow
  // ramp: a ridged steel plate hinged at the bow, folding down onto the sand
  const rl = 6 + 16 * L.ramp;
  ctx.fillStyle = '#6d6f62'; ctx.fillRect(-13, -34 - rl, 26, rl + 4);
  ctx.strokeStyle = '#4b4d43'; ctx.lineWidth = 1.2; for (let y = -34 - rl + 3; y < -32; y += 3.5) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); }
  // hull, deck and side walls
  ctx.fillStyle = '#4f5a46'; ctx.beginPath(); ctx.roundRect(-18, -34, 36, 70, 7); ctx.fill();
  ctx.fillStyle = TEAMS[0].color; ctx.fillRect(-18, -20, 3, 36); ctx.fillRect(15, -20, 3, 36);   // your colour along both sides
  ctx.fillStyle = '#6a7560'; ctx.fillRect(-13, -30, 26, 50);                                      // the well deck
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; for (let y = -26; y < 20; y += 6) { ctx.beginPath(); ctx.moveTo(-13, y); ctx.lineTo(13, y); ctx.stroke(); }
  // wheelhouse at the stern, with windows and a little flag
  ctx.fillStyle = '#3c4536'; ctx.beginPath(); ctx.roundRect(-11, 20, 22, 13, 2); ctx.fill();
  ctx.fillStyle = '#bfe3ff'; ctx.fillRect(-8, 21.5, 16, 3);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(8, 15); ctx.stroke();
  ctx.fillStyle = TEAMS[0].color; ctx.beginPath(); ctx.moveTo(8, 15); ctx.lineTo(14 + Math.sin(t * 6) * 1.2, 17); ctx.lineTo(8, 19); ctx.fill();
  ctx.restore();
  const s = byId(L.sid); if (s && s.boarded) drawSettler(s);   // its cargo, riding on the deck
}
// The Settler (v5.59): a big mobile-HQ truck, seen from above, nose along +x: a cab in your colour, six big wheels,
// and the folded Headquarters on its back (panel seams, the star emblem, a folded radar dish, hazard stripes on the tail)
function drawSettler(e) { ctx.save(); ctx.translate(e.x, e.y); drawTruck(e.team, e.facing); ctx.restore(); }
function drawTruck(team, facing) {   // drawn at the current origin
  const c = TEAMS[team];
  ctx.save(); ctx.rotate(facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-23, -14, 52, 34);                              // shadow
  for (const wx of [-18, -6, 15]) for (const sg of [-1, 1]) {                                      // tyres
    ctx.fillStyle = '#1e1e1c'; ctx.beginPath(); ctx.roundRect(wx - 5, sg * 16 - 3.5, 10, 7, 2.5); ctx.fill();
    ctx.fillStyle = '#5a5a52'; ctx.fillRect(wx - 1, sg * 16 - 1, 2, 2);
  }
  ctx.fillStyle = '#34342f'; ctx.fillRect(-25, -12, 50, 24);                                      // chassis
  // the folded HQ: a concrete-grey module with your colour along its edges
  ctx.fillStyle = '#a3a39a'; ctx.beginPath(); ctx.roundRect(-25, -15, 34, 30, 3); ctx.fill();
  ctx.fillStyle = c.color; ctx.fillRect(-25, -15, 34, 3); ctx.fillRect(-25, 12, 34, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let x = -17; x <= 1; x += 6) { ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, 12); ctx.stroke(); }   // folding panel seams
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(-5, 0, 7.5, 0, Math.PI * 2); ctx.fill();         // the star emblem, as on the HQ
  ctx.fillStyle = '#f2efe6'; ctx.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.4 : 5.6, a = -Math.PI / 2 + k * Math.PI / 5; ctx.lineTo(-5 + Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9d9d0'; ctx.beginPath(); ctx.arc(-18, -5, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();   // folded radar dish
  ctx.strokeStyle = '#6b6b63'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-13, -5); ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-20, 8); ctx.lineTo(6, 8); ctx.stroke();   // aerial, laid flat
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#222' : '#f2c230'; ctx.fillRect(-27, -15 + i * 6, 2, 6); }   // hazard stripes on the tail
  // cab
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.roundRect(9, -13, 18, 26, 4); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(10, -12, 15, 24, 4); ctx.fill();
  ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.roundRect(19, -9, 5, 18, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(20, -8, 1.5, 6);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(12, -4, 4, 8);                                           // roof hatch
  ctx.fillStyle = '#ffe9a0'; ctx.fillRect(25.5, -11, 1.6, 3.5); ctx.fillRect(25.5, 7.5, 1.6, 3.5);   // headlights
  ctx.restore();
}

function drawExtractor(e) {
  // while it's in a refinery's bay, only the part still outside shows normally; the part under the roof is hidden,
  // and the part in the open bay is in shadow — so it looks like it has driven in
  const o = e.order, ref = e.docked && o && o.ref && byId(o.ref);
  if (ref && ref.type === 'refinery') {
    const h = ref.size / 2, x0 = ref.x - h, y0 = ref.y - h;
    ctx.save(); ctx.beginPath(); ctx.rect(e.x - 60, e.y - 60, 120, 120); ctx.rect(x0, y0, ref.size, ref.size); ctx.clip('evenodd');
    drawExtractorBody(e); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(ref.x - 20, y0 + ref.size - 24, 40, 24); ctx.clip();
    drawExtractorBody(e);
    ctx.fillStyle = 'rgba(20,18,14,0.45)'; ctx.fillRect(ref.x - 20, y0 + ref.size - 24, 40, 24);   // shade inside the bay
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(ref.x - 20, y0 + ref.size - 26, 40, 3);        // edge of the roof over the bay
    return;
  }
  drawExtractorBody(e);
}

// Extractor art (v5.54, your pick): a big mining dump truck
function drawExtractorBody(e) {
  const moving = e.exLx !== undefined && Math.hypot(e.x - e.exLx, e.y - e.exLy) > 0.2;
  e.exLx = e.x; e.exLy = e.y;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
  drawExtractorTruck(e, TEAMS[e.team], moving, performance.now() / 1000, e.cargo / STATS.extractor.capacity);
  ctx.restore();
  drawExtractorIdle(e);
}
function drawExtractorIdle(e) {
  if (e.team === 0 && !e.order) {   // "!" when idle so you notice it
    ctx.fillStyle = e.outOfOre ? '#ff9b3d' : '#ffd86b'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x, e.y - e.r - 14);
  }
}
// ore crystals heaped in a load: up to n little gold shards, the same spots every frame
function drawOreHeap(x0, y0, w, h, fill, n) {
  const k = Math.round(n * fill);
  for (let i = 0; i < k; i++) {
    const rx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, ry = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
    const x = x0 + 2 + rx * (w - 4), y = y0 + 2 + ry * (h - 4), s = 1.8 + (i % 3) * 0.6;
    ctx.fillStyle = i % 4 === 0 ? '#fff1a8' : i % 2 ? '#f2c94c' : '#d9a520';
    ctx.beginPath(); ctx.moveTo(x, y - s * 1.3); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
  }
}
function drawBeacon(x, y, t, on) {   // amber roof light, flashing while it works
  const lit = on && Math.sin(t * 9) > 0;
  if (lit) { ctx.fillStyle = 'rgba(255,170,40,0.35)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = lit ? '#ffb02e' : '#8a5a12'; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
}
// The mining truck — six fat tyres, a ribbed tipper body that heaps up with ore, a rounded cab and a drill on the front
function drawExtractorTruck(e, c, moving, t, fill) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-15, -10, 36, 24);
  for (const wx of [-13, -4, 11]) for (const s of [-1, 1]) {   // tyres with a hub
    ctx.fillStyle = '#1e1e1c'; ctx.beginPath(); ctx.roundRect(wx - 3.5, s * 11 - 3, 8, 6, 2); ctx.fill();
    ctx.fillStyle = '#55554e'; ctx.fillRect(wx - 0.5, s * 11 - 1, 2, 2);
  }
  ctx.fillStyle = '#3a3a35'; ctx.fillRect(-16, -8, 34, 16);                                   // chassis
  // tipper body: ribbed sides, hazard stripes on the tail
  ctx.fillStyle = '#c4952c'; ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(4, -10); ctx.lineTo(6, -8); ctx.lineTo(6, 8); ctx.lineTo(4, 10); ctx.lineTo(-17, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a4416'; ctx.fillRect(-15, -8, 19, 16);                                   // the tub
  drawOreHeap(-15, -8, 19, 16, fill, 22);
  ctx.strokeStyle = '#8f6b1c'; ctx.lineWidth = 1;
  for (let x = -14; x <= 3; x += 4) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, -8); ctx.moveTo(x, 8); ctx.lineTo(x, 10); ctx.stroke(); }
  for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#222' : '#f2c230'; ctx.fillRect(-18, -10 + i * 5, 2, 5); }
  // cab, in team colour, with a windscreen, a roof light and an exhaust stack
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.roundRect(6, -9, 13, 18, 3); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(7, -8, 11, 16, 3); ctx.fill();
  ctx.fillStyle = '#bfe3ff'; ctx.beginPath(); ctx.roundRect(13.5, -6, 3.5, 12, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(14.3, -5, 1, 4);
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(8.5, -6.5, 1.6, 0, Math.PI * 2); ctx.fill();   // exhaust
  drawBeacon(10, 0, t, moving || e.mining || (e.order && e.order.phase === 'unloading'));
  ctx.fillStyle = '#ffe9a0'; ctx.fillRect(18.5, -7, 1.2, 2.5); ctx.fillRect(18.5, 4.5, 1.2, 2.5);   // headlights
  if (e.mining) {   // a spinning drill bit on an arm
    ctx.fillStyle = '#6b6b63'; ctx.fillRect(18, -1.5, 4, 3);
    const a = t * 18; ctx.fillStyle = '#d8d8d0';
    ctx.beginPath(); ctx.moveTo(22, -4); ctx.lineTo(29, 0); ctx.lineTo(22, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7a7a70'; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const x = 22.5 + ((a + k * 2.3) % 6); ctx.beginPath(); ctx.moveTo(x, -3.5 + (x - 22) * 0.55); ctx.lineTo(x + 1.2, 3.5 - (x - 22) * 0.55); ctx.stroke(); }
  }
}
function drawSoldier(e) {   // soldiers, grenadiers and engineers share a body; their kit differs
  const c = TEAMS[e.team];
  const hidden = e.team === 0 && hiddenFrom(e, 1);   // your infantry is hidden in a forest
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.05;
  e.lx = e.x; e.ly = e.y;
  if (hidden) ctx.globalAlpha = 0.55;
  const kind = e.type;
  e.throwT = Math.max(0, (e.throwT || 0) - 1 / 60);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();

  // drawn from above, facing along +x, then rotated to where they're looking
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing); ctx.scale(1.15, 1.15);
  // legs (step back and forth while walking)
  const step = moving ? Math.sin(performance.now() / 90 + e.id) * 4 : 0;
  ctx.fillStyle = '#2a2a24';
  ctx.beginPath(); ctx.ellipse(step, -3.5, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-step, 3.5, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  // pack: backpack, grenade satchel or tool bag
  ctx.fillStyle = kind === 'engineer' ? '#7a5a32' : kind === 'grenadier' ? '#3f4a2c' : kind === 'rocket' ? '#5a5240' : kind === 'sniper' ? '#4a5a34' : '#4b4f30';
  if (kind !== 'civilian') ctx.fillRect(-9, -4.5, 5, 9);
  if (kind === 'engineer') { ctx.fillStyle = '#c9a227'; ctx.fillRect(-8.5, -1, 4, 2); }   // tape measure / buckle
  // shoulders / uniform in team colour
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-0.5, 0, 5.5, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round';
  if (kind === 'grenadier') {
    // bandolier of grenades across the chest
    ctx.strokeStyle = '#3a3226'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(3, 6); ctx.stroke();
    ctx.fillStyle = '#3d4a2a';
    for (const [gx, gy] of [[-2.6, -3.6], [-0.6, 0], [1.4, 3.6]]) { ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill(); }
    // throwing arm: pulled back, then flung forward when it throws
    const fling = e.throwT > 0;
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(fling ? 10 : -3, fling ? 4 : 9); ctx.stroke();
    ctx.fillStyle = '#e0b48a'; ctx.beginPath(); ctx.arc(fling ? 10.5 : -3.5, fling ? 4 : 9.5, 1.9, 0, Math.PI * 2); ctx.fill();
    if (!fling) { ctx.fillStyle = '#3d4a2a'; ctx.beginPath(); ctx.arc(-3.5, 9.5, 2.2, 0, Math.PI * 2); ctx.fill(); }   // grenade ready
  } else if (kind === 'rocket') {
    // launcher tube on the right shoulder, pointing forward (kicks back when it fires)
    const kick = e.throwT > 0 ? -2.5 : 0;
    ctx.fillStyle = '#4a5238'; ctx.strokeStyle = '#2b2f20'; ctx.lineWidth = 1;
    ctx.fillRect(-9 + kick, 2.2, 24, 4.6); ctx.strokeRect(-9 + kick, 2.2, 24, 4.6);
    ctx.fillStyle = '#2b2f20'; ctx.fillRect(13 + kick, 1.6, 3, 5.8); ctx.fillRect(-10 + kick, 1.6, 2.5, 5.8);   // muzzle and back end
    if (e.throwT <= 0) { ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(16 + kick, 2.4); ctx.lineTo(19.5 + kick, 4.5); ctx.lineTo(16 + kick, 6.6); ctx.fill(); }   // warhead loaded
    ctx.fillStyle = '#e0b48a';
    ctx.beginPath(); ctx.arc(2, 1.6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6.5, 1.8, 2, 0, Math.PI * 2); ctx.fill();
    // a spare rocket strapped to the pack
    ctx.fillStyle = '#555c48'; ctx.fillRect(-9.5, -6.5, 7, 2.4); ctx.fillStyle = '#c0392b'; ctx.fillRect(-2.6, -6.5, 1.8, 2.4);
  } else if (kind === 'sniper') {
    // long rifle with a scope, held well forward
    ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(21, 2.4); ctx.stroke();
    ctx.fillStyle = '#5b4630'; ctx.fillRect(-4, 2.6, 6, 3);   // wooden stock
    ctx.fillStyle = '#111'; ctx.fillRect(4, 0.4, 7, 2.2);       // scope
    ctx.fillStyle = '#7fb6ff'; ctx.fillRect(10.4, 0.7, 1, 1.6); // lens glint
    ctx.fillStyle = '#e0b48a';
    ctx.beginPath(); ctx.arc(2, 4.6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 3.2, 2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'engineer') {
    // toolbox carried at the side; when working, it's set down and the free hand reaches forward
    const work = e.working, wob = work ? Math.sin(performance.now() / 70) * 1.5 : 0;
    const bx = work ? 5 : -2, by = work ? 8.5 : 7.5;
    ctx.fillStyle = '#c0392b'; ctx.strokeStyle = '#6e1f17'; ctx.lineWidth = 0.9;
    ctx.fillRect(bx - 4, by - 2.2, 8, 4.4); ctx.strokeRect(bx - 4, by - 2.2, 8, 4.4);
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(bx - 4, by - 0.5, 8, 1);   // metal latch strip
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(bx - 1.8, by - 2.2); ctx.lineTo(bx - 1.2, by - 3.6); ctx.lineTo(bx + 1.2, by - 3.6); ctx.lineTo(bx + 1.8, by - 2.2); ctx.stroke();   // handle
    ctx.fillStyle = '#e0b48a';
    if (work) { ctx.beginPath(); ctx.arc(9 + wob, -3, 2, 0, Math.PI * 2); ctx.fill(); }   // reaching in to fix something
    else { ctx.beginPath(); ctx.arc(-1.5, 5.2, 2, 0, Math.PI * 2); ctx.fill(); }          // hand on the toolbox handle
  } else if (kind === 'civilian') {
    // handgun held out in one hand, the other arm down by the side
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, 4.5); ctx.lineTo(7, 3.5); ctx.stroke();
    ctx.fillStyle = '#1c1c1c'; ctx.fillRect(7.5, 2.4, 5, 2);
    ctx.fillStyle = '#e0b48a';
    ctx.beginPath(); ctx.arc(7.5, 3.6, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1.5, -6.5, 1.7, 0, Math.PI * 2); ctx.fill();
  } else {
    // rifle held forward, with both hands on it
    ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-1, 4); ctx.lineTo(15, 2.5); ctx.stroke();
    ctx.fillStyle = '#e0b48a';
    ctx.beginPath(); ctx.arc(3, 4.6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8.5, 2.9, 2, 0, Math.PI * 2); ctx.fill();
  }
  // headgear: engineers wear a yellow hard hat, grenadiers a helmet with a team stripe
  if (kind === 'engineer') {
    // white hard hat: wide brim that sticks out at the front, a dome, and a raised ridge front-to-back
    ctx.fillStyle = '#e9e6dc'; ctx.strokeStyle = '#9c988c'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(1.3, 0, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // brim
    ctx.fillStyle = '#fbfaf5'; ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // dome
    ctx.fillStyle = '#d8d4c8'; ctx.fillRect(-3.6, -0.8, 7.2, 1.6);   // ridge
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(4.6, 0, 1.4, 0, Math.PI * 2); ctx.fill();   // team badge on the front
  } else if (kind === 'sniper') {
    // camouflage hood with leafy patches over the shoulders, team colour band
    ctx.fillStyle = '#6b8a40'; for (const [px, py, pr] of [[-3.5, -5, 2], [-3.5, 5, 2], [-5.5, 0, 2], [0.5, -6, 1.6], [0.5, 6, 1.6]]) { ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#3a4d26'; ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#56733a'; ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.6, 0, Math.PI * 2); ctx.arc(1.2, 1.8, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.color; ctx.fillRect(-0.6, -4.8, 2.2, 9.6);   // team stripe like the others
  } else if (kind === 'civilian') {
    // bare head: skin with a mop of hair (dark, brown or fair) on top
    ctx.fillStyle = '#e0b48a'; ctx.beginPath(); ctx.arc(0.5, 0, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ['#3b2a1e', '#6e4a2a', '#c9a35e'][e.id % 3];
    ctx.beginPath(); ctx.arc(-0.6, 0, 4, Math.PI * 0.45, Math.PI * 1.55); ctx.fill();
    ctx.beginPath(); ctx.arc(-0.2, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.arc(0.5, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (kind === 'grenadier') { ctx.fillStyle = '#f2c230'; ctx.fillRect(-0.6, -4.8, 2.2, 9.6); }
    if (kind === 'rocket') { ctx.fillStyle = '#d64535'; ctx.fillRect(-0.6, -4.8, 2.2, 9.6); }   // red stripe
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(-0.5, -1.5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (kind === 'rocket' && e.throwT > 0.1) {   // back-blast
    ctx.fillStyle = 'rgba(255,200,120,0.7)';
    ctx.beginPath(); ctx.arc(e.x - Math.cos(e.facing) * 13, e.y - Math.sin(e.facing) * 13, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (kind === 'sniper' && e.cooldown > STATS.sniper.cooldown - 0.08) {   // sniper muzzle flash
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath(); ctx.arc(e.x + Math.cos(e.facing) * 25, e.y + Math.sin(e.facing) * 25, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // muzzle flash right after a rifle shot
  if ((kind === 'soldier' || kind === 'civilian') && e.cooldown > STATS[kind].cooldown - 0.07) {
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.arc(e.x + Math.cos(e.facing) * 17, e.y + Math.sin(e.facing) * 17, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Heavy tank: a different silhouette from the light tank — wide boxy hull with side skirts and road wheels,
// a big angular turret set back on the hull, twin long barrels with muzzle brakes, fuel drums on the back
function drawHeavyTank(e) {
  const c = TEAMS[e.team];
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.2;
  e.lx = e.x; e.ly = e.y;
  if (e.turret === undefined) e.turret = e.facing;
  if (!e.order || e.order.type !== 'attack') { let d = e.facing - e.turret; d = Math.atan2(Math.sin(d), Math.cos(d)); e.turret += d * 0.06; }
  if (moving && Math.random() < 0.45) game.effects.push({ kind: 'dust', x: e.x - Math.cos(e.facing) * 22, y: e.y - Math.sin(e.facing) * 22, t: 0 });
  const L = 23, Wd = 17;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.save(); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(-L + 4, -Wd + 5, L * 2, Wd * 2);
  // wide tracks with road wheels showing under the skirts
  ctx.fillStyle = '#1a1a17'; ctx.fillRect(-L, -Wd, L * 2, 8); ctx.fillRect(-L, Wd - 8, L * 2, 8);
  const off = moving ? (performance.now() / 45) % 5 : 0;
  ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 1;
  for (let k = -L + off; k < L; k += 5) { ctx.beginPath(); ctx.moveTo(k, -Wd); ctx.lineTo(k, -Wd + 8); ctx.moveTo(k, Wd - 8); ctx.lineTo(k, Wd); ctx.stroke(); }
  ctx.fillStyle = '#4a4a42';
  for (let k = -L + 5; k < L - 2; k += 8) { ctx.beginPath(); ctx.arc(k, -Wd + 4, 2.4, 0, Math.PI * 2); ctx.arc(k, Wd - 4, 2.4, 0, Math.PI * 2); ctx.fill(); }
  // armoured side skirts in the dark team colour
  ctx.fillStyle = c.dark; ctx.fillRect(-L + 3, -Wd + 1, L * 2 - 8, 3); ctx.fillRect(-L + 3, Wd - 4, L * 2 - 8, 3);
  // boxy hull: dark armour with a team-colour deck, angled glacis plate at the front
  ctx.fillStyle = c.dark; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-L + 1, -Wd + 5); ctx.lineTo(L - 7, -Wd + 5); ctx.lineTo(L, -Wd + 10); ctx.lineTo(L, Wd - 10); ctx.lineTo(L - 7, Wd - 5); ctx.lineTo(-L + 1, Wd - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.color; ctx.fillRect(-L + 4, -Wd + 8, L * 2 - 12, Wd * 2 - 16);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(L - 7, -Wd + 9, 5, Wd * 2 - 18);   // glacis highlight
  // engine deck grilles and two fuel drums on the back
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = 0; k < 4; k++) ctx.fillRect(-L + 6 + k * 2.5, -6, 1.2, 12);
  ctx.fillStyle = '#5a5a4c'; ctx.strokeStyle = '#2a2a22'; ctx.lineWidth = 1;
  for (const dy of [-6.5, 6.5]) { ctx.beginPath(); ctx.ellipse(-L - 1, dy, 2.6, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  // big angular turret set back on the hull, with twin long barrels
  ctx.rotate(e.turret);
  const recoil = e.cooldown > STATS.heavy.cooldown - 0.18 ? -4 : 0;
  ctx.strokeStyle = '#1e1e19'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(L + 14 + recoil, -3); ctx.moveTo(4, 3); ctx.lineTo(L + 14 + recoil, 3); ctx.stroke();
  ctx.fillStyle = '#1e1e19'; ctx.fillRect(L + 11 + recoil, -5, 4, 4); ctx.fillRect(L + 11 + recoil, 1, 4, 4);   // muzzle brakes
  ctx.fillStyle = c.dark; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(4, -9); ctx.lineTo(9, -5); ctx.lineTo(9, 5); ctx.lineTo(4, 9); ctx.lineTo(-12, 9); ctx.lineTo(-14, 5); ctx.lineTo(-14, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.moveTo(-10, -6.5); ctx.lineTo(3, -6.5); ctx.lineTo(6.5, -3.5); ctx.lineTo(6.5, 3.5); ctx.lineTo(3, 6.5); ctx.lineTo(-10, 6.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c.dark; ctx.fillRect(-9, -4, 5, 8);                                  // commander's hatch
  ctx.fillStyle = '#2a2a24'; ctx.fillRect(-1, 3.5, 4, 2);                              // periscope
  ctx.strokeStyle = '#2a2a24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(-17, -11); ctx.stroke();   // radio antenna
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-9, -6, 10, 1.6);
  if (recoil) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(L + 17, -3, 4.5, 0, Math.PI * 2); ctx.arc(L + 17, 3, 4.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// Artillery: a long, low six-wheeled carriage with an open gun deck, a small gun shield and one very long barrel
// (with a big muzzle brake) that swings round on its own. Two stabiliser spades fold down at the back.
function drawArtillery(e) {
  const c = TEAMS[e.team];
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.2;
  e.lx = e.x; e.ly = e.y;
  if (e.turret === undefined) e.turret = e.facing;
  if (!e.order || e.order.type !== 'attack') { let d = e.facing - e.turret; d = Math.atan2(Math.sin(d), Math.cos(d)); e.turret += d * 0.05; }
  if (moving && Math.random() < 0.3) game.effects.push({ kind: 'dust', x: e.x - Math.cos(e.facing) * 18, y: e.y - Math.sin(e.facing) * 18, t: 0 });
  const L = 19, Wd = 8;
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1.2, 1.2);
  ctx.save(); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L + 3, -Wd + 3, L * 2, Wd * 2);
  // six chunky wheels
  const spin = moving ? (performance.now() / 60) % 3 : 0;
  for (const wx of [-13, -1, 11]) for (const wy of [-Wd, Wd - 4.5]) {
    ctx.fillStyle = '#1c1c19'; ctx.fillRect(wx - 4.5, wy, 9, 4.5);
    ctx.fillStyle = '#3a3a33'; ctx.fillRect(wx - 4.5 + spin, wy + 0.8, 1.2, 3); ctx.fillRect(wx - 1 + spin, wy + 0.8, 1.2, 3);
  }
  // stabiliser spades at the back
  ctx.strokeStyle = '#2b2b25'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-L + 2, -3.5); ctx.lineTo(-L - 6, -6); ctx.moveTo(-L + 2, 3.5); ctx.lineTo(-L - 6, 6); ctx.stroke();
  ctx.fillStyle = '#2b2b25'; ctx.fillRect(-L - 8, -8, 3, 4); ctx.fillRect(-L - 8, 4, 3, 4);
  // long, narrow carriage: cab at the front, open gun deck behind it
  ctx.fillStyle = c.dark; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-L + 1, -Wd + 3); ctx.lineTo(L - 3, -Wd + 3); ctx.lineTo(L, -Wd + 5); ctx.lineTo(L, Wd - 5); ctx.lineTo(L - 3, Wd - 3); ctx.lineTo(-L + 1, Wd - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.color; ctx.fillRect(L - 11, -Wd + 4, 9, Wd * 2 - 8);                // cab roof
  ctx.fillStyle = 'rgba(160,210,255,0.55)'; ctx.fillRect(L - 3.5, -3, 1.8, 6);           // windscreen
  ctx.fillStyle = '#5c5a4c'; ctx.fillRect(-L + 3, -Wd + 4, L * 2 - 16, Wd * 2 - 8);    // steel gun deck
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  for (let k = -L + 6; k < L - 13; k += 4) { ctx.beginPath(); ctx.moveTo(k, -Wd + 4); ctx.lineTo(k, Wd - 4); ctx.stroke(); }   // deck plates
  ctx.fillStyle = '#7a6a3a'; ctx.fillRect(-L + 4, -Wd + 4.5, 4, 2.5); ctx.fillRect(-L + 4, Wd - 7, 4, 2.5);   // shell crates
  ctx.restore();
  // the gun: turntable, small team-coloured shield, and a very long barrel
  ctx.rotate(e.turret);
  const recoil = e.cooldown > STATS.artillery.cooldown - 0.25 ? -5 : 0;
  ctx.fillStyle = '#2a2a24'; ctx.beginPath(); ctx.arc(-4, 0, 5, 0, Math.PI * 2); ctx.fill();   // turntable
  ctx.strokeStyle = '#1b1b17'; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(40 + recoil, 0); ctx.stroke();
  ctx.strokeStyle = '#34342c'; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(4 + recoil * 0.5, 0); ctx.stroke();               // recoil cylinder
  ctx.fillStyle = '#1b1b17'; ctx.fillRect(38 + recoil, -3, 6, 6);                             // muzzle brake
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.lineTo(5.5, -5); ctx.lineTo(5.5, 5); ctx.lineTo(2, 6.5); ctx.lineTo(0, 5); ctx.lineTo(0, -5); ctx.closePath(); ctx.fill(); ctx.stroke();   // gun shield
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(3, -4.5, 1.5, 9);
  if (recoil) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(47, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(46, 0, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawTank(e) {
  const c = TEAMS[e.team], heavy = e.type === 'heavy';
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.2;
  e.lx = e.x; e.ly = e.y;
  if (e.turret === undefined) e.turret = e.facing;
  if (!e.order || e.order.type !== 'attack') {   // turret drifts back to the front when not fighting
    let d = e.facing - e.turret; d = Math.atan2(Math.sin(d), Math.cos(d)); e.turret += d * 0.08;
  }
  if (moving && Math.random() < 0.35) game.effects.push({ kind: 'dust', x: e.x - Math.cos(e.facing) * e.r, y: e.y - Math.sin(e.facing) * e.r, t: 0 });
  const L = heavy ? 21 : 17, Wd = heavy ? 15 : 12;   // half length / half width of the hull
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.save(); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L + 3, -Wd + 4, L * 2, Wd * 2);
  // tracks, with treads that scroll while driving
  ctx.fillStyle = '#1f1f1c';
  ctx.fillRect(-L, -Wd, L * 2, 6); ctx.fillRect(-L, Wd - 6, L * 2, 6);
  ctx.strokeStyle = '#3d3d38'; ctx.lineWidth = 1;
  const off = moving ? (performance.now() / 40) % 4 : 0;
  for (let k = -L + off; k < L; k += 4) { ctx.beginPath(); ctx.moveTo(k, -Wd); ctx.lineTo(k, -Wd + 6); ctx.moveTo(k, Wd - 6); ctx.lineTo(k, Wd); ctx.stroke(); }
  // hull: sloped front, team colour, darker edge plates
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-L + 2, -Wd + 4); ctx.lineTo(L - 5, -Wd + 4); ctx.lineTo(L - 1, -Wd + 8); ctx.lineTo(L - 1, Wd - 8); ctx.lineTo(L - 5, Wd - 4); ctx.lineTo(-L + 2, Wd - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.dark; ctx.fillRect(-L + 2, -2, 5, 4);   // engine deck grille
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 3; k++) ctx.fillRect(-L + 3 + k * 2, -Wd + 6, 1, Wd * 2 - 12);
  if (heavy) { ctx.fillStyle = c.dark; ctx.fillRect(-L + 2, -Wd + 4, L * 2 - 6, 2); ctx.fillRect(-L + 2, Wd - 6, L * 2 - 6, 2); }   // extra side armour
  ctx.restore();
  // turret and gun(s), which turn on their own
  ctx.rotate(e.turret);
  const tr = heavy ? 8.5 : 6.5, recoil = e.cooldown > STATS[e.type].cooldown - 0.15 ? -3 : 0;
  ctx.strokeStyle = '#26261f'; ctx.lineWidth = heavy ? 3.2 : 3;
  ctx.beginPath();
  if (heavy) { ctx.moveTo(4, -2.4); ctx.lineTo(L + 9 + recoil, -2.4); ctx.moveTo(4, 2.4); ctx.lineTo(L + 9 + recoil, 2.4); }   // twin barrels
  else { ctx.moveTo(3, 0); ctx.lineTo(L + 7 + recoil, 0); }
  ctx.stroke();
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(-1, 0, tr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(-1.5, -0.5, tr - 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(-3, 0, heavy ? 3 : 2.3, 0, Math.PI * 2); ctx.fill();   // hatch
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-3.5, -2.5, 1.6, 0, Math.PI * 2); ctx.fill();
  if (recoil) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(L + 10, 0, heavy ? 5 : 4, 0, Math.PI * 2); ctx.fill(); }   // muzzle flash
  ctx.restore();
}

// Tech Centre: research lab with a radar dish and a glowing dome
function drawTech(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = performance.now() / 1000;
  ctx.fillStyle = '#8f8a7e'; ctx.fillRect(x0 - 3, y0 - 3, e.size + 6, e.size + 6);
  // main lab: flat roof with skylights, front wall with a door and lit windows
  block(x0 + 4, y0 + 20, e.size - 8, e.size - 24, '#86826f', '#4e4b42', 12);
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 4, y0 + 20, e.size - 8, 3);
  ctx.fillStyle = '#9fd8ff'; for (let k = 0; k < 3; k++) ctx.fillRect(x0 + 10 + k * 12, y0 + 30, 8, 5);   // skylights
  ctx.fillStyle = `rgba(150,220,255,${0.7 + 0.3 * Math.sin(t * 2)})`;
  for (const wx of [x0 + 9, x0 + 18, x0 + e.size - 25, x0 + e.size - 16]) ctx.fillRect(wx, y0 + e.size - 13, 5, 4);
  ctx.fillStyle = '#2a2824'; ctx.fillRect(e.x - 5, y0 + e.size - 14, 10, 10);
  // glass dome (right) with a pulsing core
  const dx = x0 + e.size - 18, dy = y0 + 36;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(dx + 2, dy + 2, 9, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(dx - 3, dy - 3, 1, dx, dy, 9);
  g.addColorStop(0, '#e9fbff'); g.addColorStop(1, '#5aa7c9');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(120,255,200,${0.5 + 0.4 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
  // radar mast and a slowly turning dish (left, at the back)
  const mx = x0 + 16, my = y0 + 13;
  ctx.strokeStyle = '#5c5a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, y0 + 24); ctx.stroke();
  ctx.save(); ctx.translate(mx, my); ctx.rotate(t * 0.8);
  ctx.fillStyle = '#d8d4c8'; ctx.strokeStyle = '#8c887c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#6c6a62'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, 0); ctx.stroke();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(7, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // antenna with a blinking light
  const ax = x0 + e.size - 12, ay = y0 + 6;
  ctx.strokeStyle = '#5c5a52'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, y0 + 22); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.fillStyle = (t * 2 + e.id) % 2 < 1 ? '#ff5a4a' : '#5a2a24'; ctx.beginPath(); ctx.arc(ax, ay, 2, 0, Math.PI * 2); ctx.fill();
  emblemPlate(e.x - 4, y0 + 44, 6, e.team);
}

function drawBuggy(e) {
  const c = TEAMS[e.team];
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.3;
  e.lx = e.x; e.ly = e.y;
  if (moving && Math.random() < 0.5) game.effects.push({ kind: 'dust', x: e.x - Math.cos(e.facing) * 14, y: e.y - Math.sin(e.facing) * 14, t: 0 });
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-12, -8, 28, 20);
  // big off-road wheels
  ctx.fillStyle = '#1e1e1e';
  for (const [wx, wy] of [[-12, -12], [6, -12], [-12, 7], [6, 7]]) ctx.fillRect(wx, wy, 9, 5);
  // body
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-13, -7); ctx.lineTo(9, -7); ctx.lineTo(15, -3); ctx.lineTo(15, 3); ctx.lineTo(9, 7); ctx.lineTo(-13, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  // roll cage
  ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2;
  ctx.strokeRect(-9, -6, 11, 12);
  ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(2, 6); ctx.moveTo(2, -6); ctx.lineTo(-9, 6); ctx.stroke();
  // mounted machine gun
  ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-3, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(13, 0); ctx.stroke();
  if (e.cooldown > STATS.buggy.cooldown - 0.06) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(16, 0, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawFactory(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h;
  ctx.fillStyle = '#8a857a'; ctx.fillRect(x0 - 3, y0 - 3, e.size + 6, e.size + 6);
  // big workshop hall with saw-tooth roof
  block(x0 + 4, y0 + 6, e.size - 8, e.size - 12, '#7b766a', '#4c4840', 22);
  ctx.fillStyle = '#918b7d';
  for (let k = 0; k < 4; k++) {
    const yy = y0 + 10 + k * 14;
    ctx.beginPath(); ctx.moveTo(x0 + 8, yy + 12); ctx.lineTo(x0 + e.size - 8, yy + 12); ctx.lineTo(x0 + e.size - 8, yy); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 4, y0 + 6, e.size - 8, 5);
  // emblem: a little tank seen from the side
  const ex = x0 + e.size - 22, ey = y0 + 26;
  emblemPlate(ex, ey, 12, e.team);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(ex - 8, ey + 2); ctx.lineTo(ex + 8, ey + 2); ctx.lineTo(ex + 6, ey + 6); ctx.lineTo(ex - 6, ey + 6); ctx.closePath(); ctx.fill();   // tracks
  ctx.fillRect(ex - 6, ey - 2, 12, 4);                                   // hull
  ctx.beginPath(); ctx.arc(ex - 1, ey - 3, 3.5, Math.PI, 0); ctx.fill(); // turret
  ctx.fillRect(ex + 1, ey - 5, 8, 2);                                    // barrel
  ctx.fillStyle = TEAMS[e.team].dark;
  for (const wx of [-4, 0, 4]) { ctx.beginPath(); ctx.arc(ex + wx, ey + 4, 1, 0, Math.PI * 2); ctx.fill(); }   // road wheels
  // large garage door in the front wall (rolls up while a vehicle is being made)
  const dw = 44, dh = 20, dy = y0 + e.size - 6 - dh;
  ctx.fillStyle = '#222'; ctx.fillRect(e.x - dw / 2, dy, dw, dh);
  const open = e.queue ? 0.35 + 0.65 * (e.trainT / (TRAIN_TIME[e.qTypes[0]] * slowOf(e))) : 0;
  ctx.fillStyle = '#9a958a';
  for (let k = 0; k < dh * (1 - open); k += 4) ctx.fillRect(e.x - dw / 2, dy + k, dw, 3);
  ctx.fillStyle = c.color; ctx.fillRect(e.x - dw / 2 - 3, dy - 3, dw + 6, 3);
  // vehicle ramp sloping down from the garage door: ribbed steel, hazard-striped edges, side rails
  const ry = y0 + e.size, rl = 18, topW = dw + 4, botW = dw + 16;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.moveTo(e.x - topW / 2 + 3, ry + 3); ctx.lineTo(e.x + topW / 2 + 3, ry + 3); ctx.lineTo(e.x + botW / 2 + 3, ry + rl + 3); ctx.lineTo(e.x - botW / 2 + 3, ry + rl + 3); ctx.closePath(); ctx.fill();
  const rg = ctx.createLinearGradient(0, ry, 0, ry + rl);
  rg.addColorStop(0, '#9c978b'); rg.addColorStop(1, '#6f6b61');   // lighter at the top: it slopes away from you
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.moveTo(e.x - topW / 2, ry); ctx.lineTo(e.x + topW / 2, ry); ctx.lineTo(e.x + botW / 2, ry + rl); ctx.lineTo(e.x - botW / 2, ry + rl); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let k = 3; k < rl; k += 3) {   // anti-slip ribs
    const w = topW + (botW - topW) * k / rl;
    ctx.beginPath(); ctx.moveTo(e.x - w / 2 + 5, ry + k); ctx.lineTo(e.x + w / 2 - 5, ry + k); ctx.stroke();
  }
  for (const side of [-1, 1]) {        // hazard-striped edges
    for (let k = 0; k < rl; k += 3) {
      const w = topW + (botW - topW) * k / rl;
      ctx.fillStyle = (k / 3) % 2 ? '#1e1e1e' : '#f2c230';
      ctx.fillRect(e.x + side * (w / 2) - (side > 0 ? 4 : 0), ry + k, 4, 3);
    }
    ctx.strokeStyle = '#4a4740'; ctx.lineWidth = 2;   // rails
    ctx.beginPath(); ctx.moveTo(e.x + side * (topW / 2 + 2), ry); ctx.lineTo(e.x + side * (botW / 2 + 2), ry + rl); ctx.stroke();
  }
  drawQueue(e);
}

function drawConstruction(e) {
  const c = TEAMS[e.team], h = e.size / 2, k = e.progress;
  ctx.fillStyle = 'rgba(120,95,60,0.85)'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.setLineDash([6, 5]); ctx.strokeStyle = c.light; ctx.lineWidth = 2;
  ctx.strokeRect(e.x - h, e.y - h, e.size, e.size); ctx.setLineDash([]);
  ctx.fillStyle = c.dark; ctx.fillRect(e.x - h + 6, e.y + h - 6 - (e.size - 12) * k, e.size - 12, (e.size - 12) * k);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(Math.floor(k * 100) + '%', e.x, e.y + 5);
}

function drawQueue(e) {
  if (!e.queue) return;
  const h = e.size / 2, k = e.trainT / (TRAIN_TIME[e.qTypes[0]] * slowOf(e));
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - h + 4, e.y - h + 4, e.size - 8, 7);
  ctx.fillStyle = '#ffd86b'; ctx.fillRect(e.x - h + 4, e.y - h + 4, (e.size - 8) * k, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - h + 4, e.y - h + 12, 26, 15);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('×' + e.queue, e.x - h + 8, e.y - h + 24);
}

// shared helpers for buildings (slight 3D: lit roof, darker front wall)
function block(x, y, w, h, roof, wall, wallH) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 5, y + 6, w, h);
  ctx.fillStyle = wall; ctx.fillRect(x, y + h - wallH, w, wallH);
  ctx.fillStyle = roof; ctx.fillRect(x, y, w, h - wallH);
}
function emblemPlate(x, y, r, team) {
  ctx.fillStyle = TEAMS[team].dark; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = TEAMS[team].light; ctx.lineWidth = 1.5; ctx.stroke();
}
function flag(x, y, team) {
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 22); ctx.stroke();
  const wave = Math.sin(performance.now() / 300 + x) * 1.5;
  ctx.fillStyle = TEAMS[team].color;
  ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + 15, y - 19 + wave); ctx.lineTo(x, y - 13); ctx.fill();
}
function star(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

// concrete apron in front of the door so you can see where units come and go
function frontApron(e, w) {
  const y = e.y + e.size / 2;
  ctx.fillStyle = '#a39e92'; ctx.fillRect(e.x - w / 2, y, w, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(e.x - w / 2, y + 10, w, 2);
}
function door(e, w, hgt) {
  const y = e.y + e.size / 2 - hgt;
  ctx.fillStyle = '#2a2824'; ctx.fillRect(e.x - w / 2, y, w, hgt);
  ctx.fillStyle = TEAMS[e.team].color; ctx.fillRect(e.x - w / 2 - 2, y - 2, w + 4, 2);
}

// Headquarters: the command centre, drawn in a 140 x 140 box and scaled to the HQ's real size.
// A helicopter takes off from its pad every so often and circles the building; the radar sweeps, lights chase and blink.
// Deploying (v5.59): over HQ_UNFOLD seconds the truck swings round to face south and rolls forward to the front, its folded module splits
// and the halves slide out as the HQ's walls, the building opening out behind them, then the cab drives in through the doorway and is gone,
// and the HQ settles in a puff of dust.
const HQ_UNFOLD = 3.2;
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
function drawHQ(real) {
  const k = real.size / 140, u = real.unfold === undefined ? 1 : real.unfold;
  const x0 = real.x - real.size / 2, y0 = real.y - real.size / 2, X = lx => x0 + lx * k, Y = ly => y0 + ly * k;
  const art = () => { ctx.save(); ctx.translate(x0, y0); ctx.scale(k, k); drawHQArt(real); ctx.restore(); };
  if (u >= 1) { art(); return; }
  // the truck, or part of it, at a spot on the HQ's own 140 x 140 layout; clip = [left, top, right, bottom] in that layout
  const truckAt = (lx, ly, f, clip, dx = 0) => {
    ctx.save();
    if (clip) { ctx.beginPath(); ctx.rect(X(clip[0] + dx), Y(clip[1]), (clip[2] - clip[0]) * k, (clip[3] - clip[1]) * k); ctx.clip(); }   // (the window moves with the part)
    ctx.translate(X(lx + dx), Y(ly)); ctx.scale(k, k); drawTruck(real.team, f); ctx.restore();
  };
  const S = Math.PI / 2;   // facing south
  if (u < 0.15) {   // 1: the truck swings round to face south, where the HQ's front will be
    let d = S - real.unfoldFrom; d = Math.atan2(Math.sin(d), Math.cos(d));
    truckAt(70, 70, real.unfoldFrom + d * ease(u / 0.15)); return;
  }
  if (u < 0.3) { truckAt(70, 70 + 34 * ease((u - 0.15) / 0.15), S); return; }   // 2: it rolls forward to the front
  // 3: its folded module splits down the middle and the halves slide apart as the HQ's walls, the building opening out behind them
  const open = ease((u - 0.3) / 0.42), settle = ease((u - 0.82) / 0.18), bump = 1 + 0.025 * Math.sin(settle * Math.PI);
  const L = 54 + (-4 - 54) * open, T = 78 + (-4 - 78) * open, Rr = 86 + (144 - 86) * open, B = 131 + (144 - 131) * open;
  ctx.save(); ctx.translate(real.x, real.y); ctx.scale(bump, bump); ctx.translate(-real.x, -real.y);
  ctx.beginPath(); ctx.rect(X(L), Y(T), (Rr - L) * k, (B - T) * k); ctx.clip(); art();
  ctx.restore();
  const halves = 1 - ease((u - 0.42) / 0.34);   // the halves fade gently into the walls as they slide out
  if (halves > 0) {
    ctx.save(); ctx.globalAlpha *= halves;
    truckAt(70, 104, S, [40, 70, 70, 112], -(54 - L) * 0.5);   // west half of the module (the truck's back part only)
    truckAt(70, 104, S, [70, 70, 100, 112], (Rr - 86) * 0.5);  // east half
    ctx.restore();
  }
  if (open < 1) {   // the walls' edges as they slide out
    ctx.strokeStyle = 'rgba(40,40,36,0.85)'; ctx.lineWidth = 3; ctx.strokeRect(X(L), Y(T), (Rr - L) * k, (B - T) * k);
    ctx.strokeStyle = TEAMS[real.team].color; ctx.lineWidth = 1.5; ctx.strokeRect(X(L) + 2, Y(T) + 2, (Rr - L) * k - 4, (B - T) * k - 4);
  }
  // 4: the cab rolls forward into the doorway, fading away as it goes (no hard cut-off)
  const inside = ease((u - 0.5) / 0.36);
  if (inside < 1) { ctx.save(); ctx.globalAlpha *= 1 - inside; truckAt(70, 104 - 16 * inside, S, [50, 108, 90, 140]); ctx.restore(); }
  if (u > 0.7) {   // 5: dust puffs at the corners as it settles
    const dk = (u - 0.7) / 0.3, hs = real.size / 2;
    ctx.fillStyle = `rgba(170,150,110,${0.45 * (1 - dk)})`;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let j = 0; j < 3; j++) {
      ctx.beginPath(); ctx.arc(real.x + sx * (hs + 6 + dk * 18 + j * 6), real.y + sy * (hs + 4 + dk * 14 - j * 5), 6 + dk * 10 - j * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function hqHeli(x, y, ang, alt, t) {   // a small team helicopter seen from above; alt 0 = parked
  const s = 1 + alt * 0.25;
  ctx.fillStyle = 'rgba(0,0,0,' + (0.35 - alt * 0.15) + ')';
  ctx.beginPath(); ctx.ellipse(x + 3 + alt * 14, y + 4 + alt * 18, 9, 4.5, ang, 0, Math.PI * 2); ctx.fill();   // shadow drifts off as it climbs
  ctx.save(); ctx.translate(x, y - alt * 6); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = '#4c5a3c'; ctx.fillRect(-15, -1.5, 11, 3);                // tail boom
  ctx.fillRect(-16, -4, 2.5, 8);                                             // tail fin
  ctx.fillStyle = '#5f7049'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.8, 0, 0, Math.PI * 2); ctx.fill();   // body
  ctx.fillStyle = '#9fd6ff'; ctx.beginPath(); ctx.ellipse(4.5, 0, 3, 3, 0, 0, Math.PI * 2); ctx.fill();   // cockpit glass
  ctx.strokeStyle = 'rgba(30,30,30,0.85)'; ctx.lineWidth = 1.6;
  const spin = t * (alt > 0 ? 40 : 6);
  for (let k = 0; k < 2; k++) { const a = spin + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 13, -Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke(); }
  if (alt > 0) { ctx.fillStyle = 'rgba(40,40,40,0.18)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); }   // rotor blur
  ctx.restore();
}
const HELI_LIFT = 16;   // how far up a flying helicopter is drawn above its shadow
// Attack helicopter, seen from above: shadow on the ground, body lifted by its height; missiles on the stub wings show what it has left
function drawHeli(e) {
  const c = TEAMS[e.team], t = performance.now() / 1000, alt = e.alt || 0, lift = alt * HELI_LIFT;
  ctx.fillStyle = `rgba(0,0,0,${0.38 - alt * 0.14})`;
  ctx.save(); ctx.translate(e.x + 2 + alt * 8, e.y + 3 + alt * 4); ctx.rotate(e.facing);
  ctx.beginPath(); ctx.ellipse(-2, 0, 15, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-26, -1.5, 14, 3);
  ctx.restore();
  ctx.save(); ctx.translate(e.x, e.y - lift); ctx.rotate(e.facing);
  const sc = 1 + alt * 0.08; ctx.scale(sc, sc);
  // tail boom, fin and tail rotor
  ctx.fillStyle = '#3d4a33'; ctx.fillRect(-27, -2, 18, 4);
  ctx.fillStyle = c.dark; ctx.fillRect(-29, -6, 4, 12);
  ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 1.2;
  const ts = t * (alt > 0.1 ? 50 : 4); ctx.beginPath(); ctx.moveTo(-27, -6 * Math.cos(ts)); ctx.lineTo(-27, 6 * Math.cos(ts)); ctx.stroke();
  // stub wings with missile pods (4 a side)
  ctx.fillStyle = '#2f3a28'; ctx.fillRect(-4, -13, 6, 26);
  for (let i = 0; i < STATS.heli.ammo; i++) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), y = side * (7.5 + k * 1.9);
    ctx.fillStyle = i < e.ammo ? '#e8e4d8' : 'rgba(0,0,0,0.35)'; ctx.fillRect(-3, y - 0.9, 9, 1.8);
    if (i < e.ammo) { ctx.fillStyle = '#d33'; ctx.fillRect(5, y - 0.9, 1.6, 1.8); }
  }
  // fuselage
  ctx.fillStyle = '#4c5a3c'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 5.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.fillRect(-9, -5, 5, 10);   // team band
  ctx.fillStyle = '#26301f'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(18, -1.5); ctx.lineTo(18, 1.5); ctx.closePath(); ctx.fill();   // nose gun
  ctx.fillStyle = '#9fd6ff'; ctx.beginPath(); ctx.ellipse(6, 0, 4.2, 3, 0, 0, Math.PI * 2); ctx.fill();   // front cockpit
  ctx.fillStyle = '#7fb8e0'; ctx.beginPath(); ctx.ellipse(0.5, 0, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();   // rear cockpit
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(5, -2, 2.5, 1.2);
  // main rotor: four blades, a blur when it's flying
  const spin = t * (alt > 0.1 ? 34 : e.ammo < STATS.heli.ammo || e.hp < e.maxHp ? 3 : 0.6);
  if (alt > 0.1) { ctx.fillStyle = 'rgba(30,30,30,0.16)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = alt > 0.1 ? 'rgba(25,25,25,0.55)' : 'rgba(25,25,25,0.9)'; ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke(); }
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// Helipad: a concrete pad with the big H, landing lights in your colour and a small control hut
function drawHelipad(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, t = animT(e);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 5, e.y - h + 6, e.size, e.size);
  ctx.fillStyle = '#8d8f8a'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.strokeStyle = '#5f615c'; ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(e.x - h + k * e.size / 4, e.y - h); ctx.lineTo(e.x - h + k * e.size / 4, e.y + h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.x - h, e.y - h + k * e.size / 4); ctx.lineTo(e.x + h, e.y - h + k * e.size / 4); ctx.stroke(); }
  ctx.strokeStyle = '#4b4d48'; ctx.lineWidth = 3; ctx.strokeRect(e.x - h + 1.5, e.y - h + 1.5, e.size - 3, e.size - 3);
  ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, h - 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f4f1e8'; const hw = 4, hh = 13, hs = 8;
  ctx.fillRect(e.x - hs - hw / 2, e.y - hh, hw, hh * 2); ctx.fillRect(e.x + hs - hw / 2, e.y - hh, hw, hh * 2); ctx.fillRect(e.x - hs, e.y - hw / 2, hs * 2, hw);
  // landing lights round the edge, chasing in your colour
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2, on = Math.floor(t * 4) % 8 === k;
    ctx.fillStyle = on ? c.light : c.dark; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * (h - 4), e.y + Math.sin(a) * (h - 4), on ? 2.6 : 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // control hut and wind sock in the corner
  ctx.fillStyle = '#5b5e57'; ctx.fillRect(e.x + h - 15, e.y - h - 6, 16, 12);
  ctx.fillStyle = c.color; ctx.fillRect(e.x + h - 15, e.y - h - 6, 16, 4);
  ctx.fillStyle = '#9fd6ff'; ctx.fillRect(e.x + h - 12, e.y - h - 1, 10, 3);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.x - h + 4, e.y - h + 4); ctx.lineTo(e.x - h + 4, e.y - h - 10); ctx.stroke();
  const flap = Math.sin(t * 3) * 0.25;
  ctx.save(); ctx.translate(e.x - h + 4, e.y - h - 9); ctx.rotate(flap); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(10, -1); ctx.lineTo(10, 1); ctx.lineTo(0, 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(4, -1.5, 2, 3); ctx.restore();
}
// SAM site: a concrete ring with a turning launcher of four missiles that points at its target

function drawHQArt(e) {
  const c = TEAMS[e.team], t = performance.now() / 1000 + (e.id || 0) * 3.7;
  const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const circ = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  // pad
  R(6, 8, 140, 140, 'rgba(0,0,0,0.3)');
  R(-4, -4, 148, 148, '#7f7a6f'); R(0, 0, 140, 140, '#a29d91');
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1;
  for (let k = 35; k < 140; k += 35) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 140); ctx.moveTo(0, k); ctx.lineTo(140, k); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 133, 140, 7); ctx.clip();
  R(0, 133, 140, 7, '#e2b33a'); ctx.fillStyle = '#26231f';
  for (let k = -10; k < 150; k += 12) { ctx.beginPath(); ctx.moveTo(k, 140); ctx.lineTo(k + 6, 140); ctx.lineTo(k + 13, 133); ctx.lineTo(k + 7, 133); ctx.fill(); }
  ctx.restore();
  // helipad with landing lights chasing round it
  circ(22, 118, 15, '#5d5a54'); ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(22, 118, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f2efe6'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 22, 119);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, on = Math.floor(t * 8) % 8 === k; circ(22 + Math.cos(a) * 15, 118 + Math.sin(a) * 15, on ? 2 : 1.2, on ? '#ffe36b' : '#8a7d4a'); }
  // main building: angled corners
  poly([[22, 14], [130, 14], [134, 18], [134, 116], [14, 116], [14, 22]], 'rgba(0,0,0,0.35)');
  poly([[10, 92], [130, 92], [130, 110], [10, 110]], '#4f4b43');
  poly([[18, 8], [122, 8], [130, 16], [130, 94], [10, 94], [10, 16]], '#6f6a5f');
  poly([[20, 11], [120, 11], [127, 18], [127, 91], [13, 91], [13, 18]], '#837d71');
  poly([[18, 8], [122, 8], [126, 12], [14, 12]], c.color);
  poly([[10, 16], [18, 8], [18, 14], [16, 16], [16, 94], [10, 94]], c.dark); poly([[130, 16], [122, 8], [122, 14], [124, 16], [124, 94], [130, 94]], c.dark);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {
    const wx = 15 + i * 11 + (i >= 5 ? 14 : 0); if (wx > 122) continue;
    const flick = Math.sin(t * 0.7 + i * 2.3 + row * 5) > 0.75;
    R(wx, 95 + row * 7, 7, 4, flick ? '#fff6c8' : '#a9d8ff');
  }
  // entrance
  R(56, 110, 28, 8, '#b8b3a7'); R(58, 116, 24, 5, '#cbc6ba');
  R(60, 96, 20, 14, '#1f2a33'); R(62, 98, 7, 12, '#5f8fae'); R(71, 98, 7, 12, '#5f8fae');
  R(56, 92, 28, 4, c.color); R(56, 96, 28, 1.5, 'rgba(0,0,0,0.4)');
  // roof machinery: fans and steam vents
  for (const [ax, ay] of [[20, 20], [20, 44]]) {
    R(ax + 2, ay + 3, 22, 18, 'rgba(0,0,0,0.3)'); R(ax, ay, 22, 18, '#b4b0a6'); R(ax, ay + 15, 22, 3, '#8d897f');
    circ(ax + 11, ay + 8, 6.5, '#55524c');
    ctx.save(); ctx.translate(ax + 11, ay + 8); ctx.rotate(t * 6); ctx.strokeStyle = '#d6d2c8'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5.5, 0); ctx.stroke(); }
    ctx.restore();
  }
  R(20, 68, 22, 18, '#5b7f98'); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(20 + k * 5.5, 68); ctx.lineTo(20 + k * 5.5, 86); ctx.stroke(); }
  // command tower: two tiers, the upper one set back, with a control-room band that glows
  R(54, 22, 46, 54, 'rgba(0,0,0,0.4)');
  R(48, 62, 44, 10, '#58544b'); R(48, 16, 44, 48, '#948e82'); R(48, 16, 44, 4, c.light);
  const glow = 0.6 + 0.4 * Math.sin(t * 2);
  for (let i = 0; i < 6; i++) R(50 + i * 7, 64, 5, 6, `rgba(127,208,255,${0.55 + 0.45 * glow})`);
  R(58, 26, 30, 32, 'rgba(0,0,0,0.35)'); R(55, 50, 30, 6, '#6c675d'); R(55, 22, 30, 30, '#aaa498');
  emblemPlate(70, 37, 14, e.team); star(70, 37, 10, '#fff');
  // steam puffs from a vent on the tower roof
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.6 + k / 3) % 1;
    ctx.fillStyle = `rgba(235,235,235,${0.45 * (1 - ph)})`; ctx.beginPath(); ctx.arc(88 + ph * 6, 20 - ph * 16, 2.5 + ph * 5, 0, Math.PI * 2); ctx.fill();
  }
  R(85, 19, 6, 5, '#5a564e');
  // radar with a green scan sweep
  const ra = t * 1.4;
  ctx.save(); ctx.translate(110, 30);
  const sweep = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
  sweep.addColorStop(0, 'rgba(120,255,140,0.35)'); sweep.addColorStop(1, 'rgba(120,255,140,0)');
  ctx.fillStyle = sweep; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 26, ra - 0.7, ra); ctx.closePath(); ctx.fill();
  circ(0, 0, 5, '#555'); ctx.rotate(ra);
  ctx.strokeStyle = '#ececec'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 13, -0.95, 0.95); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, 0); ctx.stroke(); ctx.restore();
  // satellite dish that slowly tracks back and forth
  ctx.save(); ctx.translate(110, 66); ctx.rotate(-0.6 + 0.35 * Math.sin(t * 0.4));
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(3, 3, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e4e7ea'; ctx.strokeStyle = '#8c9399'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#8c9399'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke(); circ(0, -9, 1.8, c.color);
  ctx.restore();
  ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(122, 86); ctx.lineTo(122, 50); ctx.stroke();
  ctx.lineWidth = 1; for (let k = 54; k < 86; k += 8) { ctx.beginPath(); ctx.moveTo(119, k); ctx.lineTo(125, k + 4); ctx.stroke(); }
  if (Math.floor(t * 2) % 2) circ(122, 49, 2.6, '#ff5a5a');
  // floodlight beams sweeping across the front
  for (const [fx, dir] of [[6, 1], [134, -1]]) {
    const a = -Math.PI / 2 + dir * (1.9 + 0.35 * Math.sin(t * 0.8 + fx));
    const beam = ctx.createRadialGradient(fx, 124, 2, fx, 124, 46);
    beam.addColorStop(0, 'rgba(255,246,200,0.38)'); beam.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(fx, 124); ctx.arc(fx, 124, 46, a - 0.22, a + 0.22); ctx.closePath(); ctx.fill();
    circ(fx, 124, 3, '#3a3833'); circ(fx, 124, 1.8, '#fff6c8');
  }
  ctx.fillStyle = '#b8a77a';
  for (const sx of [40, 88]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(sx + k * 6, 121, 3.5, 2.3, 0, 0, Math.PI * 2); ctx.fill(); }
  flag(4, 6, e.team);
  // the helicopter: parked, takes off, circles the HQ, lands (a 30 second loop)
  const cyc = t % 30, pad = [22, 118];
  if (cyc < 12) hqHeli(pad[0], pad[1], -0.4, 0, t);
  else if (cyc < 14) { const k = (cyc - 12) / 2; hqHeli(pad[0], pad[1], -0.4 - k * 1.2, k, t); }
  else if (cyc < 26) {
    const k = (cyc - 14) / 12, a = 2.2 - k * Math.PI * 2, rr = 70 + 18 * Math.sin(k * Math.PI);
    const hx = 70 + Math.cos(a) * rr, hy = 70 + Math.sin(a) * rr;
    const sx = 70 + Math.cos(2.2) * 70, sy = 70 + Math.sin(2.2) * 70, blend = Math.min(1, k * 6, (1 - k) * 6);
    hqHeli(pad[0] + (hx - pad[0]) * blend, pad[1] + (hy - pad[1]) * blend, a - Math.PI / 2, 1, t);
  } else if (cyc < 28) { const k = (cyc - 26) / 2; hqHeli(pad[0], pad[1], -0.4, 1 - k, t); }
  else hqHeli(pad[0], pad[1], -0.4, 0, t);
}

// an old ruined building: dusty and faded, cracked, scorched, with rubble round it and the jungle creeping over it
function drawRuin(e) {
  const h = e.size / 2, round = e.type === 'radar';
  let seed = e.id * 7919 % 2147483647 || 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.save();
  ctx.beginPath(); if (round) ctx.arc(e.x, e.y, h + 3, 0, Math.PI * 2); else ctx.rect(e.x - h - 3, e.y - h - 3, e.size + 6, e.size + 6); ctx.clip();
  ctx.fillStyle = 'rgba(70,64,52,0.45)'; ctx.fillRect(e.x - h - 4, e.y - h - 4, e.size + 8, e.size + 8);   // faded and grimy
  for (let i = 0; i < 2; i++) {   // scorch marks
    const sx = e.x + (rnd() - 0.5) * e.size * 0.7, sy = e.y + (rnd() - 0.5) * e.size * 0.7, sr = 9 + rnd() * 9;
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, sr); g.addColorStop(0, 'rgba(20,16,12,0.75)'); g.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(25,22,18,0.8)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {   // cracks
    let x = e.x + (rnd() - 0.5) * e.size * 0.8, y = e.y + (rnd() - 0.5) * e.size * 0.8, a = rnd() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) { a += (rnd() - 0.5) * 1.4; x += Math.cos(a) * (5 + rnd() * 6); y += Math.sin(a) * (5 + rnd() * 6); ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 9; i++) {   // rubble round the edges
    const a = rnd() * Math.PI * 2, d = h * (0.85 + rnd() * 0.35), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d, s = 2.5 + rnd() * 4;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - s / 2 + 1.5, y - s / 2 + 1.5, s, s);
    ctx.fillStyle = rnd() < 0.5 ? '#8a8476' : '#6d685d'; ctx.fillRect(x - s / 2, y - s / 2, s, s * 0.8);
  }
  for (let i = 0; i < 4; i++) {   // vines and leaves creeping in from the edges
    const a = rnd() * Math.PI * 2;
    let x = e.x + Math.cos(a) * h * 1.05, y = e.y + Math.sin(a) * h * 1.05, dir = a + Math.PI + (rnd() - 0.5);
    ctx.strokeStyle = '#2f5a22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y);
    const leaves = [];
    for (let k = 0; k < 5; k++) { dir += (rnd() - 0.5) * 1.2; x += Math.cos(dir) * 5; y += Math.sin(dir) * 5; ctx.lineTo(x, y); leaves.push([x, y]); }
    ctx.stroke();
    for (const [lx, ly] of leaves) { ctx.fillStyle = rnd() < 0.5 ? '#3f7a2c' : '#2c5e20'; ctx.beginPath(); ctx.arc(lx + (rnd() - 0.5) * 4, ly + (rnd() - 0.5) * 4, 2.2 + rnd() * 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
}

function drawBarracks(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h;
  ctx.fillStyle = '#8f8a74'; ctx.fillRect(x0 - 3, y0 - 3, e.size + 6, e.size + 6);   // gravel yard
  // two curved-roof huts
  for (let i = 0; i < 2; i++) {
    const hy = y0 + 6 + i * 30, hw = e.size - 12, hh = 24;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 10, hy + 5, hw, hh);
    const g = ctx.createLinearGradient(0, hy, 0, hy + hh);
    g.addColorStop(0, '#8c9a5b'); g.addColorStop(0.45, '#6d7a43'); g.addColorStop(1, '#3f4826');
    ctx.fillStyle = g; ctx.fillRect(x0 + 6, hy, hw, hh);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let k = x0 + 14; k < x0 + 6 + hw; k += 8) { ctx.beginPath(); ctx.moveTo(k, hy); ctx.lineTo(k, hy + hh); ctx.stroke(); }
    ctx.fillStyle = c.color; ctx.fillRect(x0 + 6, hy, 5, hh); ctx.fillRect(x0 + 1 + hw, hy, 5, hh);   // team-coloured ends
  }
  // emblem: sergeant chevrons
  emblemPlate(e.x, e.y + 3, 12, e.team);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(e.x - 7, e.y + 1 + k * 5); ctx.lineTo(e.x, e.y - 4 + k * 5); ctx.lineTo(e.x + 7, e.y + 1 + k * 5); ctx.stroke(); }
  // front door + sandbags either side of it
  frontApron(e, 26);
  door(e, 16, 10);
  const sy = y0 + e.size + 3;
  ctx.fillStyle = '#c2ad7c'; ctx.strokeStyle = '#7d6c45'; ctx.lineWidth = 1;
  for (let k = x0; k < x0 + e.size; k += 9) {
    if (Math.abs(k + 4 - e.x) < 15) continue;   // gap for the door
    ctx.beginPath(); ctx.ellipse(k + 4, sy, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  flag(x0 + e.size - 4, y0 + 2, e.team);
  drawQueue(e);
}

function drawRefinery(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = performance.now() / 1000;
  ctx.fillStyle = '#8a857a'; ctx.fillRect(x0 - 3, y0 - 3, e.size + 6, e.size + 6);   // concrete
  // processing hall (right)
  block(x0 + 40, y0 + 6, e.size - 46, 40, '#857f70', '#55504a', 10);
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 40, y0 + 6, e.size - 46, 5);
  // chimney with smoke
  ctx.fillStyle = '#444'; ctx.fillRect(x0 + e.size - 16, y0 + 2, 8, 14);
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    ctx.fillStyle = `rgba(200,200,200,${0.45 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(x0 + e.size - 12 + p * 8, y0 - p * 22, 3 + p * 6, 0, Math.PI * 2); ctx.fill();
  }
  // two storage tanks (left)
  for (const [tx, ty] of [[x0 + 17, y0 + 16], [x0 + 17, y0 + 42]]) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(tx + 4, ty + 5, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8b3a6'; ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(tx - 4, ty - 4, 3, 0, Math.PI * 2); ctx.fill();
  }
  // pipe from tanks to the hall
  ctx.strokeStyle = '#6a665d'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x0 + 29, y0 + 29); ctx.lineTo(x0 + 42, y0 + 29); ctx.stroke();
  // emblem: ore crystal
  emblemPlate(x0 + 59, y0 + 24, 11, e.team);
  ctx.fillStyle = '#f5dc72';
  ctx.beginPath(); ctx.moveTo(x0 + 59, y0 + 16); ctx.lineTo(x0 + 64, y0 + 24); ctx.lineTo(x0 + 59, y0 + 31); ctx.lineTo(x0 + 54, y0 + 24); ctx.fill();
  // unloading pad with hazard stripes
  const py = y0 + e.size - 26;
  ctx.fillStyle = '#5a564c'; ctx.fillRect(x0 + 4, py, e.size - 8, 22);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 + 4, py, e.size - 8, 22); ctx.clip();
  ctx.strokeStyle = '#e6c34a'; ctx.lineWidth = 3;
  for (let k = -30; k < e.size; k += 10) { ctx.beginPath(); ctx.moveTo(x0 + k, py + 22); ctx.lineTo(x0 + k + 22, py); ctx.stroke(); }
  ctx.restore();
  // the bay itself: open at the front so trucks can drive in
  ctx.fillStyle = '#3d3a33'; ctx.fillRect(e.x - 20, py + 2, 40, 24);
  ctx.fillStyle = '#a39e92'; ctx.fillRect(e.x - 22, y0 + e.size, 44, 14);           // apron outside the bay
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(e.x - 22, y0 + e.size + 12, 44, 2);
  // arrows pointing into the bay (they light up while someone is unloading)
  const busy = e.dockedBy && byId(e.dockedBy);
  ctx.strokeStyle = busy ? '#ffd86b' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) {
    const ay = y0 + e.size + 9 - k * 6;
    ctx.beginPath(); ctx.moveTo(e.x - 6, ay); ctx.lineTo(e.x, ay - 4); ctx.lineTo(e.x + 6, ay); ctx.stroke();
  }
  // little piles of ore beside the bay
  ctx.fillStyle = '#c9a227';
  ctx.beginPath(); ctx.moveTo(x0 + 8, py + 18); ctx.lineTo(x0 + 14, py + 9); ctx.lineTo(x0 + 20, py + 18); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x0 + e.size - 20, py + 18); ctx.lineTo(x0 + e.size - 14, py + 9); ctx.lineTo(x0 + e.size - 8, py + 18); ctx.fill();
  drawQueue(e);
}





// ---------- Turret art (v5.64): Machine Gun, Cannon, Missile tower (stepped tiers with an antenna), Laser (spinning legs), and the SAM Site that hides underground ----------
// Each draws at the origin, about 44 across; the caller moves to the turret first.
const TURRET_ART = (() => {
  const circ = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  const ngon = (n, r, rot = 0) => Array.from({ length: n }, (_, i) => [Math.cos(rot + i / n * Math.PI * 2) * r, Math.sin(rot + i / n * Math.PI * 2) * r]);
  const shadow = (r, sq) => { ctx.fillStyle = 'rgba(0,0,0,0.33)'; if (sq) ctx.fillRect(-r + 4, -r + 5, r * 2, r * 2); else { ctx.beginPath(); ctx.arc(4, 5, r, 0, Math.PI * 2); ctx.fill(); } };
  const sandbags = (r, n) => { ctx.fillStyle = '#c2ad7c'; ctx.strokeStyle = '#7d6c45'; ctx.lineWidth = 1; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r, 5.5, 3.8, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); } };
  const flash = (x, r) => { circ(x, 0, r, '#ffe9a0'); circ(x, 0, r * 0.5, '#fff'); };
  function mgA(c, a, fire) {   // sandbagged ring, twin-barrel gun on a round mount with a shield
    shadow(22); circ(0, 0, 21, '#6b5b3e'); sandbags(17, 12); circ(0, 0, 12, '#5d5a52');
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = '#262626'; ctx.fillRect(4, -4.5, 19, 2.6); ctx.fillRect(4, 1.9, 19, 2.6);   // twin barrels
    if (fire) { flash(25, 4); }
    ctx.fillStyle = '#3d3d3d'; ctx.fillRect(-4, -6, 11, 12);   // gun body
    poly([[6, -9], [9, -9], [9, 9], [6, 9]], '#4a4a44');        // gun shield
    circ(-3, 0, 6.5, c.dark); circ(-3, 0, 4.8, c.color); circ(-4.5, -1.5, 1.8, 'rgba(255,255,255,0.35)');
    ctx.restore();
  }
  function cnA(c, a, fire) {   // octagon concrete base, boxy armoured turret, long barrel
    shadow(23); poly(ngon(8, 23, Math.PI / 8), '#857f72'); poly(ngon(8, 19.5, Math.PI / 8), '#9f998b');
    for (let k = 0; k < 8; k++) { const [x, y] = ngon(8, 16, k / 8 * Math.PI * 2)[0]; circ(x, y, 1.3, '#6d675b'); }   // bolts
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(8, -3.2, 26, 6.4); ctx.fillStyle = '#1b1b1b'; ctx.fillRect(30, -4.4, 5, 8.8);   // barrel + muzzle brake
    if (fire) flash(37, 6.5);
    poly([[-12, -11], [9, -9], [12, 0], [9, 9], [-12, 11]], c.dark); poly([[-9, -8], [7, -6.5], [9, 0], [7, 6.5], [-9, 8]], c.color);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-7, -6, 6, 3); ctx.fillStyle = c.dark; ctx.fillRect(-5, -2, 6, 4);   // hatch
    ctx.restore();
  }
  function msHead(c, a, fire) {
    ctx.save(); ctx.rotate(a);
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#3a3c36'; ctx.fillRect(-8, sd * 7 - 5, 20, 10);
      for (let k = 0; k < 3; k++) { const yy = sd * 7 - 3.3 + k * 3.3; circ(12, yy, 1.5, fire && sd < 0 && k === 0 ? '#111' : '#c62828'); }
      ctx.fillStyle = c.color; ctx.fillRect(-8, sd * 7 - 5, 4, 10);
    }
    circ(0, 0, 7.5, c.dark); circ(1, 0, 5, c.color); ctx.fillStyle = '#cfe8ff'; ctx.fillRect(3, -2, 4, 4);
    ctx.restore();
  }
  function antenna(c, mx, my, sweep, blink, lean = 12) {
    ctx.strokeStyle = '#3a3c36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - lean / 2, my - lean); ctx.stroke();
    const tx = mx - lean / 2, ty = my - lean;
    ctx.strokeStyle = '#d9d9d2'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(tx - Math.cos(sweep) * 8, ty - Math.sin(sweep) * 8 * 0.6); ctx.lineTo(tx + Math.cos(sweep) * 8, ty + Math.sin(sweep) * 8 * 0.6); ctx.stroke();
    circ(tx, ty, 2, c.color); if (blink) { circ(tx, ty, 5, 'rgba(255,80,60,0.35)'); circ(tx, ty, 2, '#ff5040'); }
  }
  function tall2(c, a, fire, sweep, alert) {   // (alert 0..1: an enemy in sight - its lights glow red)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(11, 10, 23, 18, 0.6, 0, Math.PI * 2); ctx.fill();
    const tiers = [[0, 22, '#77756d', '#8f8d84'], [-5, 16, '#6e6c65', '#86847b'], [-10, 11, '#66645d', '#7c7a72']];
    tiers.forEach(([dy, r, edge, top], i) => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(1.5, dy + 2.5, r, 0, Math.PI * 2); ctx.fill();   // each tier casts onto the one below
      circ(0, dy, r, edge); circ(0, dy - 1.2, r - 2.2, top);
      if (i === 0) for (let k = 0; k < 12; k++) { const q = k / 12 * Math.PI * 2; if (alert) { circ(Math.cos(q) * 20, Math.sin(q) * 20, 3.2, `rgba(255,60,40,${0.3 * alert})`); circ(Math.cos(q) * 20, Math.sin(q) * 20, 1.5, '#ff4030'); } else circ(Math.cos(q) * 20, Math.sin(q) * 20, 1.1, '#5f5d56'); }
      if (i === 1) for (let k = 0; k < 8; k++) { const q = k / 8 * Math.PI * 2; ctx.fillStyle = k % 2 ? '#f2c94c' : '#2a2a2a'; ctx.beginPath(); ctx.arc(0, dy - 1.2, r - 2.2, q, q + Math.PI / 8); ctx.arc(0, dy - 1.2, r - 4.2, q + Math.PI / 8, q, true); ctx.fill(); }
    });
    ctx.save(); ctx.translate(0, -12); ctx.scale(1.1, 1.1); msHead(c, a, fire); ctx.restore();
    antenna(c, -13, 13, alert ? sweep * 2.5 : sweep, !!alert, 18);
  }
  function lzE2(c, a, charge, spin, beam) {
    const glow = 0.25 + 0.75 * charge;
    circ(4, 5, 13, 'rgba(0,0,0,0.3)');
    for (let k = 0; k < 3; k++) { const q = spin + k * Math.PI * 2 / 3;
      ctx.save(); ctx.translate(4, 5); ctx.rotate(q); poly([[4, -5], [24, -3], [27, 0], [24, 3], [4, 5]], 'rgba(0,0,0,0.22)'); ctx.restore();   // leg shadow, offset like every other shadow
      ctx.save(); ctx.rotate(q);
      poly([[4, -5], [24, -3], [24, 3], [4, 5]], '#6a6e78'); ctx.fillStyle = '#80858f'; ctx.fillRect(6, -1, 16, 2);
      circ(23, 0, 4, '#555963'); circ(23, 0, 1.8, c.color);
      ctx.restore(); }
    if (charge > 0.3) {   // motion blur ring once the legs are spinning fast
      ctx.strokeStyle = `rgba(200,210,225,${0.5 * (charge - 0.3)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.stroke(); }
    circ(0, 0, 11, '#4a4e57');
    ctx.save(); ctx.rotate(a);
    ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(120,230,255,${0.6 * glow})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
    poly([[11, -4], [21, -2], [21, 2], [11, 4]], c.dark);
    const g = ctx.createRadialGradient(22, 0, 0, 22, 0, 3 + 6 * charge + 4 * beam); g.addColorStop(0, `rgba(235,255,255,${Math.min(1, glow + beam)})`); g.addColorStop(1, 'rgba(120,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(22, 0, 3 + 6 * charge + 4 * beam, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 8); g2.addColorStop(0, `rgba(240,255,255,${glow})`); g2.addColorStop(0.6, `rgba(120,230,255,${0.7 * glow})`); g2.addColorStop(1, 'rgba(60,140,200,0.4)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  }
  function samPop(c, a, e, fire) {
    const h = 22;
    circ(3, 4, h, 'rgba(0,0,0,0.25)');
    circ(0, 0, h, '#8f8f88');   // concrete collar, low and flat
    for (let k = 0; k < 8; k++) { const q = k / 8 * Math.PI * 2 + Math.PI / 8; ctx.fillStyle = k % 2 ? '#f2c94c' : '#2a2a2a'; ctx.beginPath(); ctx.arc(0, 0, h - 1, q, q + Math.PI / 8); ctx.arc(0, 0, h - 4, q + Math.PI / 8, q, true); ctx.fill(); }
    circ(0, 0, h - 5, '#1b1c19');   // the shaft
    // two hatch doors sliding apart
    const open = Math.min(1, e * 1.6), r = h - 5;
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    for (const sd of [-1, 1]) { ctx.fillStyle = '#6f706a'; ctx.fillRect(sd < 0 ? -r - open * r : open * r, -r, r, r * 2); ctx.fillStyle = '#5c5d57'; ctx.fillRect(sd < 0 ? -2 - open * r : open * r, -r, 2, r * 2);
      ctx.fillStyle = c.color; ctx.fillRect(sd < 0 ? -r * 0.55 - open * r : r * 0.35 + open * r, -3, r * 0.2, 6); }
    ctx.restore();
    if (e > 0.35) {   // launcher rises out of the shaft (drawn bigger as it comes up)
      const up = (e - 0.35) / 0.65, k = 0.6 + 0.4 * up;
      ctx.save(); ctx.rotate(a); ctx.scale(k, k);
      circ(3 * up, 4 * up, 12, `rgba(0,0,0,${0.3 * up})`);
      ctx.fillStyle = c.dark; ctx.fillRect(-8, -10, 14, 20); ctx.fillStyle = c.color; ctx.fillRect(-6, -8, 4, 16);
      for (let m = 0; m < 4; m++) { const y = -7.5 + m * 5; if (fire && m === 0) continue;
        ctx.fillStyle = '#ecebe4'; ctx.fillRect(-3, y - 1.6, 17, 3.2); poly([[14, y - 1.6], [18, y], [14, y + 1.6]], '#c62828'); }
      ctx.restore();
    }
    circ(-h + 7, h - 7, 2.6, '#ddd');   // its radar keeps watch above ground
    ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-h + 7, h - 7); ctx.lineTo(-h + 11, h - 9); ctx.stroke();
    if (fire) { ctx.strokeStyle = 'rgba(220,220,220,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 16 + Math.sin(a) * 7.5, Math.sin(a) * 16 - Math.cos(a) * 7.5); ctx.lineTo(Math.cos(a) * 32 + Math.sin(a) * 7.5, Math.sin(a) * 32 - Math.cos(a) * 7.5); ctx.stroke(); }
  }
  return { mg: mgA, cannon: cnA, missile: tall2, laser: lzE2, sam: samPop };
})();
function drawDefence(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], s = STATS[e.type], now = performance.now() / 1000;
  const a = e.aim !== undefined ? e.aim : (e.team === 0 ? -Math.PI / 2 : Math.PI / 2);
  const justFired = e.fired !== undefined && game.time - e.fired < 0.3;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.type === 'mg') TURRET_ART.mg(c, a, e.cooldown > s.cooldown - 0.07);
  else if (e.type === 'cannon') TURRET_ART.cannon(c, a, e.cooldown > s.cooldown - 0.1);
  else if (e.type === 'missile') TURRET_ART.missile(c, a, justFired, now * 2.2 + e.id, e.spotted ? 0.65 + 0.35 * Math.sin(now * 9) : 0);   // (red lights only while it has an enemy in sight, v5.65)
  else if (e.type === 'laser') TURRET_ART.laser(c, a, e.spotted ? Math.max(0, Math.min(1, 1 - e.cooldown / s.cooldown)) : 0, e.spin || 0, justFired ? 1 - (game.time - e.fired) / 0.3 : 0);
  else if (e.type === 'sam') TURRET_ART.sam(c, a, e.up || 0, e.fired !== undefined && game.time - e.fired < 0.25);
  ctx.restore();
}

// wall pieces join up with neighbouring walls/gates of the same side
function drawWall(e) {
  const c0 = Math.floor(e.x / TC), r0 = Math.floor(e.y / TC);
  const linked = (dc, dr) => {
    const c = c0 + dc, r = r0 + dr;
    if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return false;
    const i = r * TCOLS + c; return wallKind[i] && wallTeam[i] === e.team;
  };
  ctx.lineCap = 'butt';
  for (const pass of [0, 1]) {   // shadow, then wall
    ctx.strokeStyle = pass ? '#9b968b' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 12;
    const ox = pass ? 0 : 3, oy = pass ? 0 : 4;
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]]) {
      if (!linked(dc, dr)) continue;
      if (dc && dr && (linked(dc, 0) || linked(0, dr))) continue;   // diagonal only when there's no straight link
      ctx.beginPath(); ctx.moveTo(e.x + ox, e.y + oy); ctx.lineTo(e.x + ox + dc * (TC / 2 + 1), e.y + oy + dr * (TC / 2 + 1)); ctx.stroke();   // a pixel past halfway, so the two halves meet without a hairline seam
    }
    ctx.fillStyle = pass ? '#b3aea2' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(e.x - 8 + ox, e.y - 8 + oy, 16, 16);
  }
  ctx.strokeStyle = '#6f6a60'; ctx.lineWidth = 1; ctx.strokeRect(e.x - 8, e.y - 8, 16, 16);
  ctx.fillStyle = TEAMS[e.team].color; ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
}

function drawGate(e) {
  const c = TEAMS[e.team];
  // opens only while one of its own units is on the move right by it (going through), not for guards standing next to it
  const near = game.ents.some(u => u.team === e.team && isUnit(u) && game.time - (u.movedAt || -9) < 0.3 &&
    Math.abs(u.x - e.x) < (e.vertical ? 40 : GATE_HALF + 20) && Math.abs(u.y - e.y) < (e.vertical ? GATE_HALF + 20 : 40));
  e.openK = Math.max(0, Math.min(1, (e.openK || 0) + (near ? 0.08 : -0.05)));
  const k = e.openK, L = GATE_HALF, T = TC / 2;   // half-length along the wall, half-thickness
  ctx.save(); ctx.translate(e.x, e.y); if (e.vertical) ctx.rotate(Math.PI / 2);
  // ground: track the doors run in
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L + 3, -T + 4, L * 2, T * 2);
  ctx.fillStyle = '#6a665c'; ctx.fillRect(-L, -5, L * 2, 10);
  ctx.strokeStyle = '#3e3b35'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L, 0); ctx.stroke();
  // two sliding doors: steel frame, cross-braced, hazard stripes where they meet
  const P = 7, span = L - P;                 // post width, length of each door
  ctx.save(); ctx.beginPath(); ctx.rect(-L + P, -T, (L - P) * 2, T * 2); ctx.clip();   // doors slide into the posts
  for (const side of [-1, 1]) {
    const left = side < 0 ? -span - span * k : span * k;   // left edge of the door
    ctx.fillStyle = '#8d887c'; ctx.fillRect(left, -6, span, 12);
    ctx.strokeStyle = '#55524a'; ctx.lineWidth = 1.2; ctx.strokeRect(left + 0.5, -5.5, span - 1, 11);
    ctx.beginPath();   // cross bracing
    ctx.moveTo(left + 2, -4); ctx.lineTo(left + span - 2, 4); ctx.moveTo(left + 2, 4); ctx.lineTo(left + span - 2, -4);
    ctx.stroke();
    ctx.fillStyle = c.color; ctx.fillRect(left + 2, -1.2, span - 4, 2.4);          // team stripe
    // hazard stripes on the edge that meets the other door
    const edge = side < 0 ? left + span - 4 : left;
    for (let j = 0; j < 4; j++) { ctx.fillStyle = j % 2 ? '#1e1e1e' : '#f2c230'; ctx.fillRect(edge, -6 + j * 3, 4, 3); }
  }
  ctx.restore();
  // heavy posts with a team cap and a signal lamp (red = shut, green = opening)
  for (const side of [-1, 1]) {
    const px = side < 0 ? -L : L - P, PH = 9;   // posts match the thickness of the wall posts
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + 2, -PH + 3, P, PH * 2);
    ctx.fillStyle = '#a7a296'; ctx.fillRect(px, -PH, P, PH * 2);
    ctx.fillStyle = '#7d786c'; ctx.fillRect(px, PH - 3, P, 3);
    ctx.fillStyle = c.color; ctx.fillRect(px, -PH, P, 3);
    ctx.fillStyle = k > 0.05 ? '#5dff7a' : '#ff5a5a';
    ctx.beginPath(); ctx.arc(px + P / 2, -PH + 6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = k > 0.05 ? 'rgba(93,255,122,0.25)' : 'rgba(255,90,90,0.25)';
    ctx.beginPath(); ctx.arc(px + P / 2, -PH + 6, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Radar: everything round. A circular concrete pad, a round control building with a band in the team colour,
// and on top a pedestal carrying a wide dish that sweeps slowly round
function drawRadar(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], R = e.size / 2, t = animT(e), x = e.x, y = e.y;
  // round pad with a darker kerb and spokes in the concrete
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 4, y + 5, R + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7d786c'; ctx.beginPath(); ctx.arc(x, y, R + 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#958f82'; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62); ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke(); }
  // round control building: a short drum, its wall showing at the front, a team-coloured band, small lit windows
  const B = R * 0.62;
  ctx.fillStyle = '#4c4840'; ctx.beginPath(); ctx.ellipse(x, y + 5, B, B, 0, 0, Math.PI); ctx.fill();               // front wall
  ctx.fillStyle = '#9fe0ff'; for (const a of [0.55, 1.25, 1.95, 2.6]) ctx.fillRect(x + Math.cos(a) * B * 0.86 - 2, y + 4 + Math.sin(a) * B * 0.86, 4, 3);
  ctx.fillStyle = '#7b766a'; ctx.beginPath(); ctx.arc(x, y, B, 0, Math.PI * 2); ctx.fill();                          // roof
  ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, B - 1.5, 0, Math.PI * 2); ctx.stroke(); // team band
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(x - B * 0.3, y - B * 0.3, B * 0.45, 0, Math.PI * 2); ctx.fill();
  // pedestal
  ctx.fillStyle = '#5c5a55'; ctx.beginPath(); ctx.arc(x, y, B * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6f6c66'; ctx.beginPath(); ctx.arc(x, y - 1, B * 0.28, 0, Math.PI * 2); ctx.fill();
  // the dish: a wide round reflector seen at a tilt, with ribs and a feed on struts, sweeping round
  ctx.save(); ctx.translate(x, y - 3); ctx.rotate(t * 0.9);
  const D = R * 0.78;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(4, 6, D, D * 0.62, 0, 0, Math.PI * 2); ctx.fill();   // its shadow
  const gr = ctx.createRadialGradient(-D * 0.25, -D * 0.2, 2, 0, 0, D);
  gr.addColorStop(0, '#f4f6f7'); gr.addColorStop(0.7, '#cfd5d9'); gr.addColorStop(1, '#a9b1b7');
  ctx.fillStyle = gr; ctx.strokeStyle = '#7f878d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, D, D * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(110,120,128,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, D * 0.62, D * 0.38, 0, 0, Math.PI * 2); ctx.stroke();                            // inner ring
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * D, Math.sin(a) * D * 0.62); ctx.stroke(); }   // ribs
  ctx.strokeStyle = '#6c7378'; ctx.lineWidth = 1.2;
  for (const a of [0.5, 2.6, 4.7]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * D * 0.8, Math.sin(a) * D * 0.5); ctx.lineTo(D * 0.15, -D * 0.25); ctx.stroke(); }   // feed struts
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(D * 0.15, -D * 0.25, 3, 0, Math.PI * 2); ctx.fill();               // feed horn
  ctx.restore();
  if (Math.floor(t * 1.5) % 2) { ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(x + R * 0.72, y - R * 0.72, 2.4, 0, Math.PI * 2); ctx.fill(); }   // beacon
  flag(x - R * 0.72, y - R * 0.62, e.team);
}

// Nuclear Reactor (v5.67): a big round containment dome beside a tall cooling tower letting off steam, on a fenced pad;
// the core glows through a window in the dome, pulsing, with warning stripes and the team colour round the dome.
function drawReactor(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = animT(e), S = e.size;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0 + 2, y0 + 5, S + 4, S + 2);
  ctx.fillStyle = '#8d887c'; ctx.fillRect(x0 - 3, y0 - 3, S + 6, S + 6);   // pad
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let k = 14; k < S; k += 14) { ctx.beginPath(); ctx.moveTo(x0 - 3 + k, y0 - 3); ctx.lineTo(x0 - 3 + k, y0 + S + 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 - 3, y0 - 3 + k); ctx.lineTo(x0 + S + 3, y0 - 3 + k); ctx.stroke(); }
  // hazard stripes along the front edge
  for (let k = 0; k < S + 6; k += 10) { ctx.fillStyle = (k / 10) % 2 ? '#2a2a2a' : '#f2c94c'; ctx.fillRect(x0 - 3 + k, y0 + S - 2, 10, 5); }
  // turbine hall along the bottom, with lit windows
  block(x0 + 4, y0 + S - 26, S - 8, 22, '#7b766a', '#4c4840', 8);
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 4, y0 + S - 26, S - 8, 3);
  ctx.fillStyle = `rgba(255,214,110,${0.75 + 0.25 * Math.sin(t * 3)})`; for (let k = 0; k < 5; k++) ctx.fillRect(x0 + 10 + k * 14, y0 + S - 9, 6, 3);
  // cooling tower (right): a tall waisted tower seen from above, steam pouring out
  const tx = x0 + S - 22, ty = y0 + 22;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(tx + 5, ty + 6, 19, 0, Math.PI * 2); ctx.fill();
  let g = ctx.createRadialGradient(tx - 6, ty - 6, 3, tx, ty, 19); g.addColorStop(0, '#ece8de'); g.addColorStop(1, '#a29d91');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tx, ty, 15.5, 0, Math.PI * 2); ctx.stroke();
  g = ctx.createRadialGradient(tx, ty, 1, tx, ty, 12); g.addColorStop(0, '#26241f'); g.addColorStop(1, '#5d594f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 4; k++) {   // steam
    const p = (t * 0.4 + k / 4 + e.id * 0.17) % 1;
    ctx.fillStyle = `rgba(245,245,245,${0.6 * (1 - p)})`;
    ctx.beginPath(); ctx.arc(tx + Math.sin(p * 3 + k) * 4 + p * 8, ty - 4 - p * 34, 6 + p * 12, 0, Math.PI * 2); ctx.fill();
  }
  // containment dome (left): a big shaded dome with a ring of team colour and a glowing window onto the core
  const dx = x0 + 28, dy = y0 + 30, R = 23;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(dx + 5, dy + 6, R + 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5d5a52'; ctx.beginPath(); ctx.arc(dx, dy, R + 2, 0, Math.PI * 2); ctx.fill();
  g = ctx.createRadialGradient(dx - 8, dy - 9, 3, dx, dy, R); g.addColorStop(0, '#f1efe8'); g.addColorStop(0.6, '#c9c5ba'); g.addColorStop(1, '#8f8a7e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = c.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dx, dy, R - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dx, dy, R * 0.55, 0, Math.PI * 2); ctx.stroke();
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.6);
  g = ctx.createRadialGradient(dx + 6, dy + 8, 0, dx + 6, dy + 8, 11); g.addColorStop(0, `rgba(190,255,230,${0.95})`); g.addColorStop(0.5, `rgba(80,240,190,${0.6 + 0.3 * pulse})`); g.addColorStop(1, 'rgba(40,200,160,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx + 6, dy + 8, 11, 0, Math.PI * 2); ctx.fill();
  // the radiation trefoil on the dome
  emblemPlate(dx - 6, dy - 6, 8, e.team);
  ctx.fillStyle = '#f2c94c';
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(dx - 6, dy - 6); ctx.arc(dx - 6, dy - 6, 6, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = TEAMS[e.team].dark; ctx.beginPath(); ctx.arc(dx - 6, dy - 6, 1.8, 0, Math.PI * 2); ctx.fill();
  // pipe from the dome to the tower
  ctx.strokeStyle = '#6a665d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(dx + R - 2, dy - 4); ctx.lineTo(tx - 17, ty + 2); ctx.stroke();
  flag(x0 + 6, y0 + 8, e.team);
}

// Satellite Radar (v5.67): a raised octagonal platform ringed with antenna masts whose lights chase round it, a great
// gold-rimmed dish on a turntable that slowly tracks the sky with a glowing core, energy rings pulsing up out of it, and a
// small satellite with solar wings circling high above, linked to the dish by a flickering beam.
function drawSatellite(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, S = e.size, x = e.x, y = e.y, t = animT(e);
  const oct = (r, dy = 0) => { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * r, y + dy + Math.sin(a) * r); } ctx.closePath(); };
  // shadow, then a two-step octagonal platform with a team-coloured trim
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; oct(h + 4, 6); ctx.fill();
  ctx.fillStyle = '#6f6b63'; oct(h + 3, 3); ctx.fill();               // the platform's side
  ctx.fillStyle = '#9a958a'; oct(h + 2); ctx.fill();                  // top
  ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; oct(h - 2); ctx.stroke();
  ctx.fillStyle = '#7e796f'; oct(h - 8); ctx.fill();
  // glowing floor lines spiralling into the middle
  ctx.strokeStyle = `rgba(120,220,255,${0.25 + 0.15 * Math.sin(t * 2)})`; ctx.lineWidth = 1.2;
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (h - 9), y + Math.sin(a) * (h - 9)); ctx.lineTo(x + Math.cos(a + 0.5) * 14, y + Math.sin(a + 0.5) * 14); ctx.stroke(); }
  // eight antenna masts round the edge, their lights chasing round
  for (let k = 0; k < 8; k++) {
    const a = Math.PI / 8 + k * Math.PI / 4, mx = x + Math.cos(a) * (h - 3), my = y + Math.sin(a) * (h - 3);
    ctx.strokeStyle = '#4e4c47'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 11); ctx.stroke();
    ctx.strokeStyle = '#8a8f94'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx - 3, my - 8); ctx.lineTo(mx + 3, my - 8); ctx.stroke();
    const on = Math.max(0, Math.cos(a - t * 3)) ** 6;   // a light that runs round the ring
    ctx.fillStyle = `rgba(255,${120 + 100 * on},${80 + 60 * on},${0.35 + 0.65 * on})`; ctx.beginPath(); ctx.arc(mx, my - 12, 1.8 + 1.6 * on, 0, Math.PI * 2); ctx.fill();
    if (on > 0.3) { ctx.fillStyle = `rgba(255,190,120,${0.25 * on})`; ctx.beginPath(); ctx.arc(mx, my - 12, 6 * on, 0, Math.PI * 2); ctx.fill(); }
  }
  // turntable and yoke
  ctx.fillStyle = '#4b4945'; ctx.beginPath(); ctx.arc(x, y + 2, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 2, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#5d5b56'; ctx.fillRect(x - 4, y - 14, 8, 16);
  // the great dish: tilted to the sky, slowly tracking, gold rim, glowing core
  const look = t * 0.35, tilt = Math.sin(t * 0.5) * 0.18, D = S * 0.43;
  ctx.save(); ctx.translate(x, y - 14); ctx.rotate(Math.sin(look) * 0.6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(7, 18, D, D * 0.45, 0, 0, Math.PI * 2); ctx.fill();   // its shadow on the platform
  const sq = 0.62 + tilt;
  const g = ctx.createRadialGradient(-D * 0.35, -D * 0.3 * sq, 2, 0, 0, D);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#dfe5ea'); g.addColorStop(1, '#9ea8b0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, D, D * sq, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(100,112,122,0.45)'; ctx.lineWidth = 1;
  for (const k of [0.3, 0.55, 0.8]) { ctx.beginPath(); ctx.ellipse(0, 0, D * k, D * sq * k, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * D * 0.18, Math.sin(a) * D * sq * 0.18); ctx.lineTo(Math.cos(a) * D, Math.sin(a) * D * sq); ctx.stroke(); }
  // a glint sweeping across the dish
  const gl = ((t * 0.4) % 1.6) - 0.3;
  if (gl > -0.2 && gl < 1.2) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, D, D * sq, 0, 0, Math.PI * 2); ctx.clip();
    const lg = ctx.createLinearGradient(-D + gl * 2 * D - 12, 0, -D + gl * 2 * D + 12, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.7)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.fillRect(-D, -D, 2 * D, 2 * D); ctx.restore(); }
  ctx.strokeStyle = '#d8b04a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(0, 0, D, D * sq, 0, 0, Math.PI * 2); ctx.stroke();      // gold rim
  ctx.strokeStyle = c.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, D - 3.5, D * sq - 3.5, 0, 0, Math.PI * 2); ctx.stroke();
  // feed arms up to a glowing emitter
  const fx = 0, fy = -D * 0.42;
  ctx.strokeStyle = '#6c7378'; ctx.lineWidth = 1.6;
  for (const a of [0.5, 2.64, 4.71]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * D * 0.9, Math.sin(a) * D * sq * 0.9); ctx.lineTo(fx, fy); ctx.stroke(); }
  const pulse = 0.6 + 0.4 * Math.sin(t * 5);
  const eg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9 + 3 * pulse); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.35, `rgba(140,235,255,${0.9})`); eg.addColorStop(1, 'rgba(60,170,255,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(fx, fy, 9 + 3 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // energy rings rising from the emitter
  const ex = x + Math.sin(Math.sin(look) * 0.6) * D * 0.42, ey = y - 14 - D * 0.42;
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    ctx.strokeStyle = `rgba(140,230,255,${0.6 * (1 - p)})`; ctx.lineWidth = 2 - p;
    ctx.beginPath(); ctx.ellipse(ex, ey - p * 46, 5 + p * 18, 2 + p * 7, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // the satellite: circling high above, solar wings catching the light, linked to the dish by a flickering beam
  const oa = t * 0.45 + e.id, sx = x + Math.cos(oa) * 34, sy = y - 78 + Math.sin(oa) * 12;
  ctx.strokeStyle = `rgba(140,230,255,${0.18 + 0.22 * Math.abs(Math.sin(t * 7))})`; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 30;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(sx, sy); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(sx + 30, sy + 92, 10, 4, 0, 0, Math.PI * 2); ctx.fill();   // its far-off shadow
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.sin(t * 0.8) * 0.25);
  for (const side of [-1, 1]) {   // solar wings
    ctx.fillStyle = '#23407a'; ctx.fillRect(side > 0 ? 6 : -20, -4, 14, 8);
    ctx.strokeStyle = '#7fa6e8'; ctx.lineWidth = 0.6; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo((side > 0 ? 6 : -20) + k * 3.5, -4); ctx.lineTo((side > 0 ? 6 : -20) + k * 3.5, 4); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,255,255,${0.35 * Math.max(0, Math.sin(t * 2 + side))})`; ctx.fillRect(side > 0 ? 6 : -20, -4, 14, 3);
  }
  ctx.fillStyle = '#d6d0c2'; ctx.fillRect(-5, -5, 10, 10);
  ctx.fillStyle = '#c9a54a'; ctx.fillRect(-5, -5, 10, 2.5);
  ctx.fillStyle = c.color; ctx.fillRect(-2, -2, 4, 4);
  ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 9); ctx.stroke();
  if (Math.floor(t * 2) % 2) { ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.arc(0, -7, 1.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  flag(x + h - 12, y + h, e.team);
}

// Medbay: a round landing pad with a big cross. It glows green, on and off, while it is healing someone.
function drawMedbay(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], R = e.size / 2, x = e.x, y = e.y, t = performance.now() / 1000;
  const circ = (rr, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); };
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(x + 3, y + 4, R + 2, 0, Math.PI * 2); ctx.fill();
  circ(R + 2, '#6f6b62');                       // kerb
  circ(R, '#a7a296');                           // concrete ring
  ctx.strokeStyle = c.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R - 5, 0, Math.PI * 2); ctx.stroke();   // team ring
  circ(R - 9, '#d9e6df');                       // the pad itself
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (R - 22), y + Math.sin(a) * (R - 22)); ctx.lineTo(x + Math.cos(a) * (R - 9), y + Math.sin(a) * (R - 9)); ctx.stroke(); }
  const on = e.healing > 0, pulse = on ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  // big cross in the middle, brighter while it heals
  const cw = 9, cl = 24;
  ctx.fillStyle = on ? `rgb(${60 + 60 * pulse},${200 + 55 * pulse},${90 + 60 * pulse})` : '#3f9a5a';
  ctx.beginPath();
  for (const [px, py] of [[-cw, -cl], [cw, -cl], [cw, -cw], [cl, -cw], [cl, cw], [cw, cw], [cw, cl], [-cw, cl], [-cw, cw], [-cl, cw], [-cl, -cw], [-cw, -cw]]) ctx.lineTo(x + px, y + py);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
  // lamps round the rim: dim when idle, green and pulsing while healing
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8, lx = x + Math.cos(a) * (R - 1.5), ly = y + Math.sin(a) * (R - 1.5);
    ctx.fillStyle = on ? `rgba(120,255,150,${0.55 + 0.45 * pulse})` : '#5c6f60'; ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  if (on) {   // the green glow, on and off
    const g = ctx.createRadialGradient(x, y, R * 0.2, x, y, R + 14);
    g.addColorStop(0, `rgba(110,255,140,${0.10 + 0.30 * pulse})`); g.addColorStop(0.75, `rgba(110,255,140,${0.08 + 0.22 * pulse})`); g.addColorStop(1, 'rgba(110,255,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R + 14, 0, Math.PI * 2); ctx.fill();
  }
  flag(x - R * 0.72, y - R * 0.6, e.team);
}

function drawPower(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = animT(e);
  // concrete pad with panel lines
  ctx.fillStyle = '#8f8a7e'; ctx.fillRect(x0 - 3, y0 - 3, e.size + 6, e.size + 6);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let k = 12; k < e.size; k += 12) {
    ctx.beginPath(); ctx.moveTo(x0 - 3 + k, y0 - 3); ctx.lineTo(x0 - 3 + k, y0 + e.size + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 - 3, y0 - 3 + k); ctx.lineTo(x0 + e.size + 3, y0 - 3 + k); ctx.stroke();
  }
  // generator hall: lit roof with vents, darker front wall with glowing windows and a door
  block(x0 + 3, y0 + 28, e.size - 6, e.size - 31, '#7b766a', '#4c4840', 9);
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 3, y0 + 28, e.size - 6, 3);
  ctx.fillStyle = '#5b574e';
  for (let k = 0; k < 3; k++) ctx.fillRect(x0 + 8 + k * 8, y0 + 34, 5, 3);       // roof vents
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 40); ctx.lineTo(x0 + e.size - 4, y0 + 40); ctx.stroke();
  const glow = 0.75 + 0.25 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(255,214,110,${glow})`;
  for (const wx of [x0 + 7, x0 + 15, x0 + e.size - 20]) ctx.fillRect(wx, y0 + e.size - 9, 5, 3);
  ctx.fillStyle = '#2a2824'; ctx.fillRect(e.x - 4, y0 + e.size - 10, 8, 7);
  // transformer yard (right): box, insulators and the odd spark
  const tx = x0 + e.size - 17, ty = y0 + 33;
  ctx.fillStyle = '#4f5a52'; ctx.fillRect(tx, ty, 12, 10);
  ctx.fillStyle = '#e8e2d0'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(tx + 2 + k * 4, ty - 1, 1.4, 0, Math.PI * 2); ctx.fill(); }
  if ((t * 7 + e.id) % 6 < 0.5) {
    ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(tx + 2, ty - 2); ctx.lineTo(tx + 4, ty - 6); ctx.lineTo(tx + 6, ty - 3); ctx.lineTo(tx + 10, ty - 7); ctx.stroke();
  }
  // pipes from the towers down into the hall
  ctx.strokeStyle = '#6a665d'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x0 + 16, y0 + 22); ctx.lineTo(x0 + 16, y0 + 30); ctx.moveTo(x0 + e.size - 16, y0 + 22); ctx.lineTo(x0 + e.size - 16, y0 + 30); ctx.stroke();
  ctx.fillStyle = '#4a4740'; ctx.fillRect(x0 + 13, y0 + 25, 6, 2); ctx.fillRect(x0 + e.size - 19, y0 + 25, 6, 2);   // pipe joints
  // two cooling towers: shaded rim, dark throat, team band, rising steam
  for (const cx of [x0 + 16, x0 + e.size - 16]) {
    const cy = y0 + 13;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(cx + 3, cy + 3, 12.5, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 13);
    g.addColorStop(0, '#e6e1d6'); g.addColorStop(1, '#a9a498');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 12.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 10.5, 0, Math.PI * 2); ctx.stroke();
    const throat = ctx.createRadialGradient(cx, cy, 1, cx, cy, 7.5);
    throat.addColorStop(0, '#2c2a26'); throat.addColorStop(1, '#5f5b52');
    ctx.fillStyle = throat; ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.45 + k / 3 + cx * 0.013) % 1;
      ctx.fillStyle = `rgba(240,240,240,${0.55 * (1 - p)})`;
      ctx.beginPath(); ctx.arc(cx + Math.sin(p * 3 + k) * 3 + p * 5, cy - 2 - p * 24, 4 + p * 8, 0, Math.PI * 2); ctx.fill();
    }
  }
  // emblem: pulsing lightning bolt on the hall roof
  const ex = x0 + 33, ey = y0 + 44;
  emblemPlate(ex, ey, 8, e.team);
  ctx.fillStyle = `rgba(255,222,90,${0.7 + 0.3 * Math.sin(t * 6)})`;
  ctx.beginPath(); ctx.moveTo(ex + 2, ey - 6); ctx.lineTo(ex - 3, ey + 1); ctx.lineTo(ex, ey + 1); ctx.lineTo(ex - 2, ey + 6); ctx.lineTo(ex + 3, ey - 1); ctx.lineTo(ex, ey - 1); ctx.closePath(); ctx.fill();
}

// Oil Derrick: a nodding-donkey pump on a dirt pad with a storage tank. It only pumps once someone owns it.
function drawDerrick(e) {
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = performance.now() / 1000, owned = e.team !== NEUTRAL;
  // packed-dirt pad with oil stains
  ctx.fillStyle = '#857a62'; ctx.fillRect(x0 - 6, y0 - 4, e.size + 12, e.size + 8);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x0 - 6, y0 + e.size + 1, e.size + 12, 3);
  ctx.fillStyle = 'rgba(20,16,10,0.55)';
  ctx.beginPath(); ctx.ellipse(e.x + 12, e.y + 12, 14, 6, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x0 + 10, y0 + e.size - 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  // storage tank (back left) with a band in the owner's colour
  const tx = x0 + 10, ty = y0 + 6;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(tx + 4, ty + 12, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9d988c'; ctx.fillRect(tx - 8, ty, 16, 10);
  ctx.beginPath(); ctx.ellipse(tx, ty + 10, 8, 3, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = c.color; ctx.fillRect(tx - 8, ty + 4, 16, 3);
  ctx.fillStyle = '#d6d2c7'; ctx.beginPath(); ctx.ellipse(tx, ty, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7d786c'; ctx.lineWidth = 1; ctx.stroke();
  // pipe from the wellhead to the tank
  ctx.strokeStyle = '#4a4740'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(e.x + 24, e.y + 14); ctx.lineTo(e.x + 24, y0 + 20); ctx.lineTo(tx + 8, y0 + 20); ctx.lineTo(tx + 8, ty + 8); ctx.stroke();
  // skid the pump stands on
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - 14, e.y + 15, 44, 7);
  ctx.fillStyle = '#5b574f'; ctx.fillRect(e.x - 16, e.y + 11, 44, 7);
  ctx.fillStyle = c.color; ctx.fillRect(e.x - 16, e.y + 11, 44, 2);
  // wellhead
  ctx.fillStyle = '#3d3a34'; ctx.fillRect(e.x + 21, e.y + 6, 7, 9);
  // crank and counterweight at the back end (turns while pumping)
  const spin = owned ? t * 2.2 : 0.6;
  const cx = e.x - 8, cy = e.y + 4;
  ctx.fillStyle = '#4a4740'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin);
  ctx.fillStyle = '#6b665c'; ctx.fillRect(-2, -2, 13, 4);
  ctx.fillStyle = '#3f3c36'; ctx.beginPath(); ctx.arc(10, 0, 6, -1.2, 1.2); ctx.lineTo(10, 0); ctx.fill();
  ctx.restore();
  // samson post: an A-frame up to the pivot
  const px = e.x + 8, py = e.y - 12;
  ctx.strokeStyle = '#6b665c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(px - 8, e.y + 12); ctx.lineTo(px, py); ctx.lineTo(px + 8, e.y + 12); ctx.stroke();
  // walking beam with the horse's head over the well, nodding up and down
  const nod = owned ? Math.sin(spin) * 0.28 : 0.12;
  ctx.save(); ctx.translate(px, py); ctx.rotate(nod);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-19, 3, 40, 5);
  ctx.fillStyle = '#d9a520'; ctx.fillRect(-20, -3, 38, 6);
  ctx.fillStyle = '#f0c548'; ctx.fillRect(-20, -3, 38, 2);
  ctx.fillStyle = '#d9a520';   // horse's head
  ctx.beginPath(); ctx.moveTo(16, -6); ctx.quadraticCurveTo(26, -4, 25, 10); ctx.lineTo(19, 10); ctx.quadraticCurveTo(19, 0, 14, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a4740'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // the rod down into the well, hanging from the horse's head
  const hx = px + Math.cos(nod) * 22 - Math.sin(nod) * 10, hy = py + Math.sin(nod) * 22 + Math.cos(nod) * 10;
  ctx.strokeStyle = '#2b2924'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(e.x + 24, e.y + 6); ctx.stroke();
  flag(x0 + e.size + 2, y0 + 4, e.team);
}

// village house: walls, a pitched tiled roof with a chimney, a door and windows. Three looks so a village isn't all the same.
const HOUSE_LOOKS = [
  { roof: '#a2513f', roofDark: '#7e3b2d', wall: '#dccfb2', wallDark: '#b9ab8d' },
  { roof: '#7b5a3c', roofDark: '#5c422b', wall: '#e3dccb', wallDark: '#c2b9a4' },
  { roof: '#5f6f78', roofDark: '#46535a', wall: '#d6c7a6', wallDark: '#b3a383' },
];
function drawHouse(e) {
  const L = HOUSE_LOOKS[e.look || 0], s = e.size, x0 = e.x - s / 2, y0 = e.y - s / 2;
  // little dirt yard
  ctx.fillStyle = 'rgba(120,100,65,0.55)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, s * 0.72, s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  // shadow, then the front wall
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 + 5, y0 + 6, s, s - 2);
  const wallH = 14;
  ctx.fillStyle = L.wall; ctx.fillRect(x0 + 2, y0 + s - wallH, s - 4, wallH);
  ctx.fillStyle = L.wallDark; ctx.fillRect(x0 + 2, y0 + s - 3, s - 4, 3);
  // door and two windows
  ctx.fillStyle = '#5a3d24'; ctx.fillRect(e.x - 4, y0 + s - 11, 8, 11);
  ctx.fillStyle = '#c9a03c'; ctx.fillRect(e.x + 2, y0 + s - 6, 1.5, 1.5);
  ctx.fillStyle = '#9cc9e8'; ctx.fillRect(x0 + 7, y0 + s - 10, 6, 5); ctx.fillRect(x0 + s - 13, y0 + s - 10, 6, 5);
  ctx.strokeStyle = L.wallDark; ctx.lineWidth = 1; ctx.strokeRect(x0 + 7, y0 + s - 10, 6, 5); ctx.strokeRect(x0 + s - 13, y0 + s - 10, 6, 5);
  // pitched roof: the far slope catches the light, the near slope is darker, a ridge along the top
  const rh = s - wallH;
  ctx.fillStyle = L.roof; ctx.fillRect(x0, y0, s, rh / 2);
  ctx.fillStyle = L.roofDark; ctx.fillRect(x0, y0 + rh / 2, s, rh / 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;   // rows of tiles
  for (let y = y0 + 4; y < y0 + rh; y += 4) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + s, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0, y0 + rh / 2 - 1.5, s, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, y0 + rh - 2, s, 2);   // eaves
  // chimney
  ctx.fillStyle = '#8a7f72'; ctx.fillRect(x0 + s - 12, y0 + 2, 6, 9);
  ctx.fillStyle = '#5e564c'; ctx.fillRect(x0 + s - 12, y0 + 2, 6, 2);
}

function drawRange(x, y, r) {
  ctx.strokeStyle = 'rgba(255,233,160,0.55)'; ctx.fillStyle = 'rgba(255,233,160,0.06)';
  ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
}

// name tag under a selected building
function drawNameTag(e) {
  const txt = (e.ruin && !ruinWorks(e) ? 'Ruined ' : '') + NAMES[e.type];
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  const w = ctx.measureText(txt).width + 12, y = e.y - halfY(e) - 32;   // above the health bar, clear of the door
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - w / 2, y, w, 17);
  ctx.fillStyle = '#fff'; ctx.fillText(txt, e.x, y + 13);
}

// ---------- Input: drag to scroll, pinch to zoom, tap to select / command ----------
const input = { pointers: new Map(), mode: null, sx: 0, sy: 0, camX: 0, camY: 0, pinch: null, box: null, boxMode: false };

const inMinimap = (x, y) => !MM.hidden && x >= MM.x && x <= MM.x + MM.w && y >= MM.y && y <= MM.y + MM.h;
function minimapJump(x, y) {
  cam.x = (x - MM.x) / MM.w * W; cam.y = (y - MM.y) / MM.h * HT; clampCam();
}

canvas.addEventListener('pointerdown', ev => {
  if (game.over) return;
  canvas.setPointerCapture(ev.pointerId);
  input.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (input.pointers.size === 1) {
    input.sx = ev.clientX; input.sy = ev.clientY; input.camX = cam.x; input.camY = cam.y;
    if (inMinimap(ev.clientX, ev.clientY)) { input.mode = 'minimap'; minimapJump(ev.clientX, ev.clientY); }
    else input.mode = 'pending';
  } else if (input.pointers.size === 2) {
    const [a, b] = [...input.pointers.values()];
    input.mode = 'pinch'; input.box = null;
    input.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: cam.zoom, world: toWorld((a.x + b.x) / 2, (a.y + b.y) / 2) };
  }
});

canvas.addEventListener('pointermove', ev => {
  if (game.placing && ev.pointerType === 'mouse' && input.pointers.size === 0) {
    const w = toWorld(ev.clientX, ev.clientY);
    if (game.placing.type === 'wall') { if (game.placing.anchor) game.placing.end = snapWall(w.x, w.y); }
    else game.placing.ghost = game.placing.type === 'gate' ? fitGate(w.x, w.y, 0, game.placing.manual ? !!game.placing.vertical : undefined) : w;
  }
  if (!input.pointers.has(ev.pointerId)) return;
  input.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

  if (input.mode === 'minimap') { minimapJump(ev.clientX, ev.clientY); return; }
  if (input.mode === 'pending' && Math.hypot(ev.clientX - input.sx, ev.clientY - input.sy) > 10) {
    input.mode = input.boxMode ? 'box' : 'pan';
  }
  if (input.mode === 'pan') {
    const s = scale();
    cam.x = input.camX - (ev.clientX - input.sx) / s;
    cam.y = input.camY - (ev.clientY - input.sy) / s;
    clampCam();
  } else if (input.mode === 'box') {
    const a = toWorld(input.sx, input.sy), p = toWorld(ev.clientX, ev.clientY);
    input.box = { x1: Math.min(a.x, p.x), y1: Math.min(a.y, p.y), x2: Math.max(a.x, p.x), y2: Math.max(a.y, p.y) };
  } else if (input.mode === 'pinch' && input.pointers.size >= 2) {
    const [a, b] = [...input.pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    setZoom(input.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / input.pinch.d);
    const s = scale();
    cam.x = input.pinch.world.x - (mid.x - scr.w / 2) / s;
    cam.y = input.pinch.world.y - (mid.y - scr.h / 2) / s;
    clampCam();
  }
});

function endPointer(ev, cancelled) {
  if (!input.pointers.has(ev.pointerId)) return;
  input.pointers.delete(ev.pointerId);
  if (!cancelled && input.mode === 'pending' && input.pointers.size === 0) {
    const p = toWorld(ev.clientX, ev.clientY);
    handleTap(p.x, p.y);
  }
  if (input.mode === 'box' && input.box) {
    const b = input.box;
    const inside = game.ents.filter(e => e.team === 0 && isUnit(e) && e.x >= b.x1 && e.x <= b.x2 && e.y >= b.y1 && e.y <= b.y2);
    if (inside.length) game.selected = new Set(inside.map(e => e.id));
    input.boxMode = false;
  }
  input.box = null;
  if (input.pointers.size === 0) input.mode = null;
  else if (input.mode === 'pinch') input.mode = 'after-pinch';
}
canvas.addEventListener('pointerup', ev => endPointer(ev, false));
canvas.addEventListener('pointercancel', ev => endPointer(ev, true));

canvas.addEventListener('wheel', ev => {
  ev.preventDefault();
  const before = toWorld(ev.clientX, ev.clientY);
  setZoom(cam.zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12));
  const s = scale();
  cam.x = before.x - (ev.clientX - scr.w / 2) / s;
  cam.y = before.y - (ev.clientY - scr.h / 2) / s;
  clampCam();
}, { passive: false });

function hitTest(x, y) {
  const slop = 14 / scale();
  let best = null, bestScore = Infinity;
  for (const e of game.ents) {
    if (!canSee(e) || e.boarded || e.landing) continue;
    const d = e.air ? Math.max(0, Math.hypot(x - e.x, y - (e.y - e.alt * HELI_LIFT)) - e.r) : edgeDist(x, y, e);
    if (d <= (isBuilding(e) ? 0.01 : slop)) {
      const score = (isUnit(e) ? 0 : 1000) + d;   // prefer units over buildings
      if (score < bestScore) { bestScore = score; best = e; }
    }
  }
  return best;
}

function oreAt(x, y) {
  const slop = 22 / scale();
  let best = null, bestD = slop + 16;
  for (const o of game.ore) {
    if (!exploredAt(o.x, o.y)) continue;
    const d = Math.hypot(o.x - x, o.y - y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// walls: 1st tap = start, 2nd tap = preview a straight run, tap the end again = build it (and keep going from there)
function wallTap(x, y) {
  const p = game.placing, t = snapWall(x, y);
  const same = (a, b) => a && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  if (!p.anchor) { p.anchor = t; p.end = null; return; }
  if (!p.end && same(p.anchor, t)) { confirmWall(); return; }   // single piece
  if (p.end && same(p.end, t)) { confirmWall(); return; }
  p.end = t;
}
function confirmWall() {
  const p = game.placing;
  if (!p || p.type !== 'wall' || !p.anchor) return;
  const tiles = p.end ? wallLine(p.anchor, p.end) : [p.anchor];
  if (buildWallLine(0, tiles)) { p.anchor = tiles[tiles.length - 1]; p.end = null; }
  else flash = { text: "Can't build a wall there", t: performance.now() };
}

function tryPlace() {
  const p = game.placing;
  if (p && p.type === 'wall') return confirmWall();
  if (p && p.strike) {   // the Napalm Strike: called on the marked spot
    if (!p.ghost) return;
    if (callNapalm(0, p.ghost.x, p.ghost.y)) { game.placing = null; game.effects.push({ kind: 'marker', x: p.ghost.x, y: p.ghost.y, t: 0, color: '#ff8a50' }); }
    else flash = { text: napalmReady(0) ? "You can't see there" : 'Napalm Strike not ready', t: performance.now() };
    return;
  }
  if (p && p.turret) {
    if (!p.ghost) return;
    const why = game.credits[0] < COST[p.type] ? `Not enough money for a ${NAMES[p.type]} ($${COST[p.type]})` : turretSiteProblem(0, p.type, p.ghost.x, p.ghost.y);
    if (why) { flash = { text: why, t: performance.now() }; return; }
    const en = selectedOfType('engineer').sort((a, b) => Math.hypot(a.x - p.ghost.x, a.y - p.ghost.y) - Math.hypot(b.x - p.ghost.x, b.y - p.ghost.y))[0];
    if (!en) { game.placing = null; return; }
    en.order = { type: 'buildTurret', kind: p.type, x: p.ghost.x, y: p.ghost.y };
    game.effects.push({ kind: 'marker', x: p.ghost.x, y: p.ghost.y, t: 0, color: '#7dff7d' });
    game.placing = null;
    return;
  }
  if (p && p.ghost && placeBuilding(0, p.type, p.ghost.x, p.ghost.y, p.ghost.vertical)) game.placing = null;
}

function handleTap(x, y) {
  if (game.paused) return;

  if (game.placing && game.placing.type === 'wall') { wallTap(x, y); return; }
  if (game.placing && game.placing.strike) {   // aiming the Napalm Strike: the first tap marks the spot, a tap on the mark calls it
    const g = game.placing.ghost;
    if (g && Math.hypot(x - g.x, y - g.y) < 40) tryPlace(); else game.placing.ghost = { x, y };
    return;
  }
  if (game.placing) {
    const pt = game.placing.type === 'gate' ? fitGate(x, y, 0, game.placing.manual ? !!game.placing.vertical : undefined) : { x, y };
    const g = game.placing.ghost;
    const hx = game.placing.type === 'gate' ? gateHalf(g && g.vertical).hx : STATS[game.placing.type].size / 2;
    const hy = game.placing.type === 'gate' ? gateHalf(g && g.vertical).hy : STATS[game.placing.type].size / 2;
    if (g && Math.abs(x - g.x) < hx + 6 && Math.abs(y - g.y) < hy + 6) tryPlace();
    else game.placing.ghost = pt;
    return;
  }

  const hit = hitTest(x, y);
  const myUnits = [...game.selected].map(byId).filter(e => e && e.team === 0 && isUnit(e));

  const engineers = myUnits.filter(e => e.type === 'engineer');
  const helis = myUnits.filter(e => e.air);
  if (hit && hit.team === 0 && hit.type === 'helipad' && helis.length) {   // helicopters selected + your Helipad tapped = fly home to land
    for (const h of helis) { const own = byId(h.pad); if (!padOk(own, 0) && hit.built && !padHeli(hit)) h.pad = hit.id; h.order = { type: 'return' }; }
    game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#7dff7d' });
    if (myUnits.length === helis.length) return;
  }
  if (hit && hit.team === 0) {
    // engineers selected + one of your damaged buildings tapped = repair it
    if (engineers.length && isBuilding(hit) && !isWallType(hit.type) && hit.hp < hit.maxHp) {
      for (const en of engineers) en.order = { type: 'repair', target: hit.id };
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#7dff7d' });
      return;
    }
    // units selected + your Medbay tapped = go and stand on it to heal
    if (hit.type === 'medbay' && hit.built && myUnits.some(u => !u.air)) {
      medbaySend(myUnits.filter(u => !u.air), hit);
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#7dff7d' });
      return;
    }
    game.selected = new Set([hit.id]);
    return;
  }

  if (hit && hit.team === 1) {
    const soldiers = myUnits.filter(u => isCombat(u) && canHit(u, hit));   // (only Rocket Soldiers can go after an aircraft)
    for (const s of soldiers) s.order = { type: 'attack', target: hit.id };
    if (engineers.length && canCapture(hit)) {
      // send the nearest engineer in to capture it; any others follow along as backups
      engineers.sort((a, b) => Math.hypot(a.x - hit.x, a.y - hit.y) - Math.hypot(b.x - hit.x, b.y - hit.y));
      for (const en of engineers) en.order = { type: 'capture', target: hit.id };
    }
    if (soldiers.length || engineers.length) game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#ff6b6b' });
    return;
  }

  if (hit && hit.team === NEUTRAL) {
    if (engineers.length && canCapture(hit)) {   // engineers go in to capture it; anyone else selected goes along to guard it
      engineers.sort((a, b) => Math.hypot(a.x - hit.x, a.y - hit.y) - Math.hypot(b.x - hit.x, b.y - hit.y));
      for (const en of engineers) en.order = { type: 'capture', target: hit.id };
      const others = myUnits.filter(e => e.type !== 'engineer');
      if (others.length) groupMove(others, hit.x, hit.y + hit.size / 2 + 40);
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#7dff7d' });
      return;
    }
    if (!myUnits.length) { game.selected = new Set([hit.id]); return; }   // nothing selected: show what it is
  }

  const ore = oreAt(x, y);
  const extractors = myUnits.filter(e => e.type === 'extractor');
  if (ore && extractors.length) {
    for (const e of extractors) startHarvest(e, ore);
    game.effects.push({ kind: 'marker', x: ore.x, y: ore.y, t: 0, color: '#ffd86b' });
    const others = myUnits.filter(e => e.type !== 'extractor');
    if (!others.length) return;
    groupMove(others, x, y);
    return;
  }

  if (myUnits.length) groupMove(myUnits, x, y);
  else game.selected.clear();
}

// Group moves use a Command & Conquer style formation: infantry gather in stacks of up to 5 per square
// (one in the middle, four round it), vehicles get a square each. Vehicles take the front rows, infantry behind,
// and the whole block faces the way the group is travelling.
function groupMove(units, x, y) {
  const cx = units.reduce((a, u) => a + u.x, 0) / units.length, cy = units.reduce((a, u) => a + u.y, 0) / units.length;
  let fx = x - cx, fy = y - cy; const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;   // forward
  const sx = -fy, sy = fx;                                                                   // sideways
  const vehicles = units.filter(u => !isInfantry(u) && u.type !== 'artillery'), infantry = units.filter(isInfantry), guns = units.filter(u => u.type === 'artillery');
  const side = u => (u.x - cx) * sx + (u.y - cy) * sy;   // keep left-hand units on the left so paths don't cross
  vehicles.sort((a, b) => side(a) - side(b)); infantry.sort((a, b) => side(a) - side(b)); guns.sort((a, b) => side(a) - side(b));
  // vehicles fill the front row(s), infantry squares the rows behind — never mixed in the same row
  const stacks = []; for (let i = 0; i < infantry.length; i += 5) stacks.push(infantry.slice(i, i + 5));
  const cols = Math.max(1, Math.ceil(Math.sqrt((vehicles.length + stacks.length + guns.length) * 1.6)));
  const rowsOf = list => { const r = []; for (let i = 0; i < list.length; i += cols) r.push(list.slice(i, i + cols)); return r; };
  const rows = [...rowsOf(vehicles.map(v => [v])), ...rowsOf(stacks), ...rowsOf(guns.map(v => [v]))];   // artillery right at the back
  const CELL = vehicles.some(v => v.type === 'heavy') ? 64 : 58, face = Math.atan2(fy, fx);
  const SPOTS = [[0, 0], [-15, -15], [15, -15], [-15, 15], [15, 15]];   // the five places in an infantry square
  rows.forEach((row, ri) => {
    const back = (ri - (rows.length - 1) / 2) * CELL;
    row.forEach((cell, ci) => {
      const lat = (ci - (row.length - 1) / 2) * CELL;
      const px = x + sx * lat - fx * back, py = y + sy * lat - fy * back;
      cell.forEach((u, k) => {
        const [a, b] = cell.length === 1 ? [0, 0] : SPOTS[k];
        u.order = { type: 'move', x: px + sx * a - fx * b, y: py + sy * a - fy * b, given: game.time, slot: isCombat(u) || u.type === 'engineer', face };
        if (u.type === 'extractor') u.outOfOre = false;
      });
    });
  });
  game.effects.push({ kind: 'marker', x, y, t: 0 });
}

const selectedOfType = type => [...game.selected].map(byId).filter(e => e && e.team === 0 && e.type === type);

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const ui = {
  credits: $('credits'), clock: $('clock'), info: $('info'), powerChip: $('powerChip'), sell: $('btnSell'),
  deploy: $('btnDeploy'), radar: $('btnRadar'), medbay: $('btnMedbay'), barracks: $('btnBarracks'), refinery: $('btnRefinery'), power: $('btnPower'), factory: $('btnFactory'), tech: $('btnTech'), wall: $('btnWall'), gate: $('btnGate'), rotate: $('btnRotate'), 
  harvest: $('btnHarvest'), mg: $('btnMg'), cannon: $('btnCannon'), missile: $('btnMissile'), laser: $('btnLaser'), helipad: $('btnHelipad'), sam: $('btnSam'), reactor: $('btnReactor'), satellite: $('btnSatellite'), napalm: $('btnNapalm'), heliHome: $('btnReturn'), place: $('btnPlace'), cancel: $('btnCancel'), deselect: $('btnDeselect'),
  box: $('btnBox'), all: $('btnAll'), pause: $('btnPause'), map: $('btnMap'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovBtn: $('ovBtn'),
};
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
const TURRET_INFO = { mg: 'fast machine gun: strong against infantry, weak against vehicles, can\'t hit aircraft',
  cannon: 'heavy cannon: strong against vehicles, weak against infantry, can\'t hit aircraft',
  missile: 'long-range missile salvos: hits anything, aircraft hardest',
  laser: 'one huge beam every few seconds: hits anything, but slow to charge' };
let flash = null;   // temporary message in the info box

function startPlacing(type) {
  const hq = hqOf(0);
  if (!hq) return;
  game.placing = { type, ghost: null, anchor: null, end: null };
  cam.x = hq.x; cam.y = hq.y; clampCam();
}

ui.deploy.addEventListener('click', () => {
  const st = selectedOfType('settler')[0];
  if (st && !deploy(st)) flash = { text: 'No room here — move the settler first', t: performance.now() };
});
ui.barracks.addEventListener('click', () => startPlacing('barracks'));
ui.refinery.addEventListener('click', () => startPlacing('refinery'));
// Turrets (v5.64): pick one with an Engineer selected, then tap where it goes; the nearest selected Engineer walks there and builds it
function startTurretPlacing(kind) {
  if (!selectedOfType('engineer').length) return;
  game.placing = { type: kind, turret: true, ghost: null, anchor: null, end: null };
}
for (const k of TURRET_TYPES) ui[k].addEventListener('click', () => startTurretPlacing(k));
ui.power.addEventListener('click', () => startPlacing('power'));
ui.radar.addEventListener('click', () => startPlacing('radar'));
ui.medbay.addEventListener('click', () => startPlacing('medbay'));
ui.helipad.addEventListener('click', () => startPlacing('helipad'));
ui.sam.addEventListener('click', () => startPlacing('sam'));
ui.reactor.addEventListener('click', () => startPlacing('reactor'));
ui.satellite.addEventListener('click', () => startPlacing('satellite'));
ui.napalm.addEventListener('click', () => { if (napalmReady(0)) { game.placing = { type: 'napalm', strike: true, ghost: null }; flash = { text: 'Napalm Strike: tap ground you can see, then tap again to call it in', t: performance.now() }; } });
ui.heliHome.addEventListener('click', () => { for (const h of selectedOfType('heli')) h.order = padOf(h) ? { type: 'return' } : h.order; });
ui.factory.addEventListener('click', () => startPlacing('factory'));
ui.tech.addEventListener('click', () => startPlacing('tech'));
ui.wall.addEventListener('click', () => startPlacing('wall'));
ui.gate.addEventListener('click', () => startPlacing('gate'));
ui.rotate.addEventListener('click', () => {
  const p = game.placing;
  if (!p || p.type !== 'gate') return;
  p.manual = true; p.vertical = !(p.ghost ? p.ghost.vertical : p.vertical);
  if (p.ghost) p.ghost = snapGate(p.ghost.x, p.ghost.y, p.vertical);
});
ui.place.addEventListener('click', tryPlace);
ui.cancel.addEventListener('click', () => { game.placing = null; });
// one button per unit the selected building can make (built when you select a different kind of building)
const produceBox = document.getElementById('produceBtns');
let produceFor = null;
function syncProduceButtons(type) {
  if (type === produceFor) return;
  produceFor = type;
  produceBox.innerHTML = type ? PRODUCES[type].map(u => `<button data-unit="${u}">${SHORT[u] || NAMES[u]} $${COST[u]}</button>`).join('') : '';
}
produceBox.addEventListener('click', ev => {
  const btn = ev.target.closest('button[data-unit]');
  if (!btn) return;
  for (const b of [...game.selected].map(byId)) if (b && b.team === 0 && PRODUCES[b.type] && PRODUCES[b.type].includes(btn.dataset.unit)) produce(b, btn.dataset.unit);
});
ui.harvest.addEventListener('click', () => {
  let any = false;
  for (const e of selectedOfType('extractor')) any = autoHarvest(e) || any;
  if (!any) flash = { text: 'No known ore — explore to find more', t: performance.now() };
});
ui.deselect.addEventListener('click', () => { game.selected.clear(); game.placing = null; });
// Selling: tap Sell, then tap again to confirm. You get half the building's price back (plus anything still queued in it).
const sellable = b => b && b.team === 0 && isBuilding(b) && COST[b.type] > 0 && !b.ruin;   // captured ruins can't be sold (turrets can, since v5.64)
const sellValue = b => Math.floor(COST[b.type] / 2) + (b.qTypes || []).reduce((s, t) => s + COST[t], 0);
let sellArmed = null;
// guard against selling by accident (clicking on after placing a building lands on Sell, which sits where the build buttons were):
// Sell ignores clicks for a second after it appears for a building, and the confirming tap must come at least half a second after the first
const SELL_SETTLE = 1000, SELL_CONFIRM_GAP = 500;
let sellFor = null, sellShownAt = 0, sellArmedAt = 0;
function sellBuilding(b) {
  if (!sellable(b)) return false;
  const value = sellValue(b);
  earn(b.team, value);
  game.effects.push({ kind: 'text', x: b.x, y: b.y - 20, text: 'Sold +$' + value, t: 0, color: '#ffd86b' });
  game.effects.push({ kind: 'dust', x: b.x, y: b.y, t: 0 });
  b.hp = 0; b.deployed = true; b.sold = true;   // removed this frame, without an explosion
  game.selected.delete(b.id);
  return true;
}
ui.sell.addEventListener('click', () => {
  const sel = [...game.selected].map(byId).filter(Boolean), b = sel.length === 1 && sel[0];
  if (!sellable(b) || game.paused || game.over) return;   // never from behind the pause menu or the results screen
  const now = performance.now();
  if (now - sellShownAt < SELL_SETTLE) return;   // it only just appeared: this click was meant for whatever was here before
  if (sellArmed !== b.id) { sellArmed = b.id; sellArmedAt = now; return; }
  if (now - sellArmedAt < SELL_CONFIRM_GAP) return;   // a double-click doesn't sell: the second tap has to be deliberate
  sellBuilding(b); sellArmed = null;
});
// build buttons show the real price from COST, so labels can never drift from what you're charged
for (const [btn, type, label] of [[ui.barracks, 'barracks', 'Barracks'], [ui.refinery, 'refinery', 'Refinery'], [ui.factory, 'factory', 'War Factory'],
  [ui.power, 'power', 'Power Plant'], [ui.mg, 'mg', 'Machine Gun'], [ui.cannon, 'cannon', 'Cannon'], [ui.missile, 'missile', 'Missile'], [ui.laser, 'laser', 'Laser'], [ui.wall, 'wall', 'Wall'], [ui.gate, 'gate', 'Gate']]) btn.textContent = `${label} $${COST[type]}`;
ui.box.addEventListener('click', () => { input.boxMode = !input.boxMode; });
// minimap: tap Map to hide it (so it doesn't cover the corner of the battlefield) and again to bring it back
try { MM.hidden = localStorage.getItem('mini-rts-minimap') === 'hidden'; } catch (err) {}
ui.map.addEventListener('click', () => {
  MM.hidden = !MM.hidden;
  try { localStorage.setItem('mini-rts-minimap', MM.hidden ? 'hidden' : 'shown'); } catch (err) {}
});
ui.all.addEventListener('click', () => {
  game.placing = null;
  const soldiers = game.ents.filter(e => e.team === 0 && isCombat(e));
  game.selected = new Set(soldiers.map(e => e.id));
});
// ---------- Pause menu ----------
const pm = { menu: $('pauseMenu'), resume: $('pmResume'), restart: $('pmRestart'), toMenu: $('pmMenu'), notes: $('pmNotes'), report: $('pmReport') };
pm.report.addEventListener('click', () => saveReport());
$('ovReport').addEventListener('click', () => saveReport());
let restartArmed = false, menuArmed = false;
function setPaused(on) {
  game.paused = on;
  ui.pause.textContent = on ? '▶' : '❚❚';
  pm.menu.style.display = on ? 'flex' : 'none';
  restartArmed = false; pm.restart.textContent = 'Restart'; pm.restart.classList.remove('danger');
  menuArmed = false; pm.toMenu.textContent = 'Exit Game'; pm.toMenu.classList.remove('danger');
}
ui.pause.addEventListener('click', () => { if (!game.over) setPaused(!game.paused); });
pm.resume.addEventListener('click', () => setPaused(false));
pm.restart.addEventListener('click', () => {
  if (!restartArmed) {   // ask once more so a stray tap doesn't wipe your game
    restartArmed = true; pm.restart.textContent = 'Tap again to restart'; pm.restart.classList.add('danger');
    return;
  }
  newGame(); setPaused(false);
});
pm.toMenu.addEventListener('click', () => {
  if (!menuArmed) {   // ask once more: leaving ends this game
    menuArmed = true; pm.toMenu.textContent = 'Tap again to exit'; pm.toMenu.classList.add('danger');
    return;
  }
  setPaused(false); showMenu();
});
pm.notes.addEventListener('click', () => { $('notes').style.display = 'flex'; });
// ---------- Patch notes ----------
const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
$('version').textContent = 'Version ' + PATCH_NOTES[0].version;
$('notesBody').innerHTML = PATCH_NOTES.map(n =>
  `<h3>v${esc(n.version)} — ${esc(n.title)}<small>${esc(n.date)}</small></h3><ul>${n.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`).join('');
$('ovNotes').addEventListener('click', () => { $('notes').style.display = 'flex'; });
$('notesClose').addEventListener('click', () => { $('notes').style.display = 'none'; });
$('notes').addEventListener('click', ev => { if (ev.target.id === 'notes') $('notes').style.display = 'none'; });

// ---------- Map picker (changing it reloads the page, since the whole world is built for one map size) ----------
for (const b of document.querySelectorAll('#mapRow button')) {
  b.classList.toggle('on', b.dataset.m === mapChoice);
  b.addEventListener('click', () => {
    if (b.dataset.m === mapChoice) return;
    try { localStorage.setItem('mini-rts-map', b.dataset.m); } catch (err) {}
    location.reload();
  });
}
// a Random map: its size, its number (play it again, or send it to a friend), and a button to roll a new one
$('randRow').style.display = mapChoice === 'random' ? '' : 'none';
for (const b of document.querySelectorAll('#randRow button[data-s]')) {
  b.classList.toggle('on', b.dataset.s === randomSize);
  b.addEventListener('click', () => { if (b.dataset.s === randomSize) return; try { localStorage.setItem('mini-rts-rsize', b.dataset.s); } catch (err) {} location.reload(); });
}
$('randNew').addEventListener('click', () => { try { localStorage.setItem('mini-rts-seed', newMapNumber()); } catch (err) {} location.reload(); });
$('randNum').addEventListener('click', () => {
  const v = parseInt(prompt('Map number to play (1 to 999999):', mapNumber), 10);
  if (v >= 1 && v <= 999999 && v !== mapNumber) { try { localStorage.setItem('mini-rts-seed', v); } catch (err) {} location.reload(); }
});
$('randNum').textContent = 'Map #' + mapNumber;
$('mapInfo').textContent = {
  classic: 'Classic: the smaller map. A village with an Oil Derrick, high ground by the bridges and a small ruined base hidden in the jungle. Quicker games.',
  large: 'Large: a smaller Huge. Extra ore fields, high ground with river lookouts, one bridge each side, a village with an Oil Derrick and an old ruined base deep in the jungle. Longer games.',
  huge: 'Huge: lots of open ground between the bases, more ore fields, high ground and an old ruined base deep in the jungle. The longest games.',
  random: `Random (${MAPS[randomSize].label} size): a new layout each time, with the river and gold island in the middle and your base corner as usual. Tap the map number to play one again or share it.`,
}[mapChoice];

// ---------- Difficulty picker ----------
function showDifficulty() {
  for (const b of document.querySelectorAll('#diffRow button')) b.classList.toggle('on', b.dataset.d === difficulty);
  $('diffInfo').textContent = {
    easy: 'Easy: the enemy builds slowly, earns less and waits about 5 minutes before attacking.',
    normal: 'Normal: the enemy is a fair match and gives you about 3 minutes before attacking.',
    hard: 'Hard: the enemy builds at full speed and attacks as soon as it can.',
  }[difficulty];
}
for (const b of document.querySelectorAll('#diffRow button')) {
  b.addEventListener('click', () => {
    difficulty = b.dataset.d;
    try { localStorage.setItem('mini-rts-difficulty', difficulty); } catch (err) {}
    showDifficulty();
  });
}
showDifficulty();

ui.ovBtn.addEventListener('click', () => {
  if (game.over) newGame();
  $('ovReport').style.display = 'none';
  game.paused = false; ui.overlay.style.display = 'none'; ui.pause.textContent = '❚❚';
});

function extractorStatus(e) {
  const o = e.order, cap = STATS.extractor.capacity, load = `${Math.floor(e.cargo)}/${cap}`;
  if (!o) return e.outOfOre ? 'Extractor: ore ran out — Auto-harvest or tap ore' : 'Extractor: idle — tap some ore';
  if (o.type === 'move') return 'Extractor: moving';
  if (o.phase === 'toNode') return `Extractor: heading to ore (${load})`;
  if (o.phase === 'mining') return `Extractor: collecting ${load}`;
  if (o.phase === 'toBase') return !nearestRefinery(e) ? 'Extractor: needs a refinery!' : o.waiting ? 'Extractor: waiting for the unloading bay' : `Extractor: returning (${load})`;
  if (o.phase === 'docking') return 'Extractor: driving into the bay';
  if (o.phase === 'undocking') return 'Extractor: leaving the bay';
  return 'Extractor: unloading';
}

// "New construction options" (v5.67): whenever something you couldn't build or train before becomes available (a new
// building finished unlocks it), the words flicker in the middle of the screen for about 2 seconds. Checked twice a second.
var optsKnown = null, optsCheckAt = 0;   // (var: newGame resets them, and it can run before this line)
function checkNewOptions() {
  if (!game || game.over || game.time < optsCheckAt) return;
  optsCheckAt = game.time + 0.5;
  const now = new Set(Object.keys(REQUIRES).filter(t => (COST[t] !== undefined || PRODUCES_ANY(t)) && unlocked(0, t)));
  if (optsKnown && hqOf(0) && [...now].some(t => !optsKnown.has(t))) {
    const el = $('newOpts'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');   // (restart the flicker)
  }
  optsKnown = now;
}
const PRODUCES_ANY = t => Object.values(PRODUCES).some(l => l.includes(t));
function updateHUD() {
  checkNewOptions();
  ui.credits.textContent = '$' + Math.floor(game.credits[0]);
  const secs = Math.floor(game.time), hh = Math.floor(secs / 3600), mm = Math.floor(secs / 60) % 60, ss = secs % 60;
  const clock = (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
  if (ui.clock.textContent !== clock) ui.clock.textContent = clock;
  ui.box.classList.toggle('on', input.boxMode);
  ui.map.classList.toggle('on', !MM.hidden);

  const sel = [...game.selected].map(byId).filter(Boolean);
  const one = t => sel.find(e => e.type === t);
  const settler = one('settler'), hq = one('hq'), producer = sel.find(e => PRODUCES[e.type] && e.team === 0 && ruinWorks(e)), ruinSel = sel.length === 1 && sel[0].ruin && !ruinWorks(sel[0]) ? sel[0] : null;
  const extractors = sel.filter(e => e.type === 'extractor'), soldiers = sel.filter(e => e.type === 'soldier'), buggies = sel.filter(e => e.type === 'buggy');
  const placing = game.placing;

  show(ui.deploy, !!settler && !placing);
  show(ui.barracks, !!hq && !placing);
  show(ui.refinery, !!hq && !placing);
  show(ui.factory, !!hq && !placing && unlocked(0, 'factory'));   // hidden until you have what it needs (v5.53)
  show(ui.tech, !!hq && !placing && unlocked(0, 'tech'));   // hidden until you have what it needs (v5.53)
  show(ui.power, !!hq && !placing);
  show(ui.radar, !!hq && !placing && unlocked(0, 'radar'));   // hidden until you have what it needs (v5.53)
  show(ui.medbay, !!hq && !placing && unlocked(0, 'medbay'));   // hidden until you have what it needs (v5.53)
  show(ui.helipad, !!hq && !placing && unlocked(0, 'helipad'));   // hidden until you have what it needs (v5.53)
  show(ui.sam, !!hq && !placing && unlocked(0, 'sam'));   // hidden until you have what it needs (v5.53)
  show(ui.reactor, !!hq && !placing && unlocked(0, 'reactor'));   // (v5.67, needs a Tech Centre)
  show(ui.satellite, !!hq && !placing && unlocked(0, 'satellite'));   // (v5.67, needs a Nuclear Reactor)
  show(ui.napalm, hasSatellite(0) && !placing);
  if (hasSatellite(0)) { const w = Math.ceil(napalmWait(0)), lbl = w > 0 ? `Napalm ${Math.floor(w / 60)}:${String(w % 60).padStart(2, '0')}` : 'Napalm Strike'; if (ui.napalm.textContent !== lbl) ui.napalm.textContent = lbl; ui.napalm.disabled = w > 0; }
  show(ui.heliHome, sel.some(e => e.air && e.team === 0 && !e.landed) && !placing);
  show(ui.wall, !!hq && !placing);
  show(ui.gate, !!hq && !placing);
  syncProduceButtons(producer && !placing ? producer.type : null);
  show(ui.harvest, extractors.length > 0 && !placing);
  const engSel = sel.some(e => e.type === 'engineer' && e.team === 0);
  for (const k of TURRET_TYPES) { show(ui[k], engSel && !placing && unlocked(0, k)); ui[k].disabled = game.credits[0] < COST[k]; }   // an Engineer's turret buttons, each hidden until you have what it needs
  show(ui.place, !!(placing && (placing.ghost || (placing.type === 'wall' && placing.anchor))));
  show(ui.cancel, !!placing);
  show(ui.rotate, !!(placing && placing.type === 'gate'));
  show(ui.deselect, sel.length > 0 && !placing);
  const toSell = sel.length === 1 && sellable(sel[0]) && !placing && !game.paused && !game.over ? sel[0] : null;
  if ((toSell ? toSell.id : null) !== sellFor) { sellFor = toSell ? toSell.id : null; sellShownAt = performance.now(); }
  show(ui.sell, !!toSell);
  if (!toSell || sellArmed !== toSell.id) sellArmed = null;
  if (toSell) {
    const label = sellArmed ? 'Tap again to sell for $' + sellValue(toSell) : 'Sell $' + sellValue(toSell);
    if (ui.sell.textContent !== label) ui.sell.textContent = label;
    ui.sell.classList.toggle('danger', !!sellArmed);
  }

  ui.barracks.disabled = game.credits[0] < COST.barracks;
  ui.refinery.disabled = game.credits[0] < COST.refinery;
  ui.power.disabled = game.credits[0] < COST.power;
  const boost = powerBoost(0);
  ui.powerChip.style.display = boost > 1 ? '' : 'none';
  ui.powerChip.textContent = `⚡ +${Math.round((boost - 1) * 100)}%`;
  // locked buildings are hidden above until you have what they need (v5.53: finding them is part of the fun; they used to say what they needed)
  for (const [btn, type] of [[ui.factory, 'factory'], [ui.tech, 'tech'], [ui.radar, 'radar'], [ui.medbay, 'medbay'], [ui.helipad, 'helipad'], [ui.sam, 'sam'], [ui.reactor, 'reactor'], [ui.satellite, 'satellite']]) {
    const miss = missingFor(0, type);
    btn.textContent = `${NAMES[type]} $${COST[type]}`;
    btn.disabled = miss.length > 0 || game.credits[0] < COST[type];
  }
  ui.wall.disabled = game.credits[0] < COST.wall;
  ui.gate.disabled = game.credits[0] < COST.gate;
  const wallMode = placing && placing.type === 'wall';
  ui.cancel.textContent = wallMode ? 'Done' : 'Cancel';
  ui.place.textContent = wallMode ? 'Build wall' : placing && placing.turret ? 'Send Engineer' : placing && placing.strike ? 'Call strike' : 'Place here';
  if (placing && placing.ghost && placing.type === 'gate') ui.place.disabled = !canPlaceWallPiece(0, 'gate', placing.ghost.x, placing.ghost.y, placing.ghost.vertical) || game.credits[0] < COST.gate;
  else if (placing && placing.strike) ui.place.disabled = !placing.ghost || !visibleAt(placing.ghost.x, placing.ghost.y, 0);
  else if (placing && placing.ghost && placing.turret) ui.place.disabled = !turretSiteOk(0, placing.type, placing.ghost.x, placing.ghost.y) || game.credits[0] < COST[placing.type];
  else if (placing && placing.ghost) ui.place.disabled = !canPlace(0, placing.type, placing.ghost.x, placing.ghost.y) || game.credits[0] < COST[placing.type];
  else if (placing) ui.place.disabled = false;
  if (producer) {
    for (const btn of produceBox.children) {
      const unit = btn.dataset.unit;
      const miss = missingFor(0, unit);
      const docked = unit === 'heli' && padHeli(producer);
      const vis = miss.length ? 'none' : '';   // locked units stay hidden too (v5.53)
      if (btn.style.display !== vis) btn.style.display = vis;
      const label = docked ? 'Helicopter: this pad has one' : `${SHORT[unit] || NAMES[unit]} $${COST[unit]}`;
      if (btn.textContent !== label) btn.textContent = label;
      btn.disabled = miss.length > 0 || !!docked || !producer.built || producer.queue >= STATS[producer.type].maxQueue || game.credits[0] < COST[unit];
    }
  }

  let text;
  if (flash && performance.now() - flash.t < 2500) text = flash.text;
  else if (game.paused) text = 'Paused';
  else if (placing && placing.type === 'wall') text = !placing.anchor ? 'Tap where the wall starts' : placing.end ? 'Tap the end again to build (or Build wall)' : 'Tap where the wall ends (or tap the start again for one piece)';
  else if (placing && placing.strike) text = placing.ghost ? 'Tap the strip again (or Call strike) to send the plane' : 'Napalm Strike: tap ground you can see';
  else if (placing) text = placing.ghost ? 'Tap the square again (or Place here) to build' : `Tap inside the green area to place your ${NAMES[placing.type].toLowerCase()}`;
  else if (settler) text = 'Settler — move somewhere open, then Deploy';
  else if (hq) text = extraHqs(0) ? `Headquarters — ${extraHqs(0) + 1} HQs: +${Math.round(HQ_BONUS * extraHqs(0) * 100)}% build speed` : 'Headquarters';
  else if (ruinSel) text = ruinSel.team === NEUTRAL
    ? `Ruined ${NAMES[ruinSel.type]} — neutral. Send an Engineer to capture it, then repair it to half to bring it back into use`
    : ruinSel.team === 0 ? `Ruined ${NAMES[ruinSel.type]}: ${Math.floor(ruinSel.hp / ruinSel.maxHp * 100)}% — repair it to ${RUIN_WORKS * 100}% with Engineers to bring it back into use` : `Ruined ${NAMES[ruinSel.type]} (enemy)`;
  else if (sel.length === 1 && sel[0].type === 'gate') text = 'Gate — opens for your units, enemies must destroy it';
  else if (sel.length === 1 && sel[0].type === 'wall') text = 'Wall';
  else if (sel.length === 1 && sel[0].type === 'power') text = sel[0].built
    ? `Power Plant — you build ${Math.round((powerBoost(0) - 1) * 100)}% faster${plantBoost(0) >= POWER_MAX ? ' (Power Plants maxed)' : ''}`
    : `Power Plant: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && sel[0].type === 'derrick') text = sel[0].team === 0
    ? 'Oil Derrick — pays $' + STATS.derrick.pay + ' every ' + STATS.derrick.payEvery + 's (next in ' + Math.ceil(STATS.derrick.payEvery - (sel[0].payT || 0)) + 's)'
    : 'Oil Derrick — neutral. Send an Engineer to capture it: $' + STATS.derrick.pay + ' every ' + STATS.derrick.payEvery + 's';
  else if (sel.length === 1 && sel[0].type === 'house') text = 'Village house';
  else if (sel.length === 1 && sel[0].type === 'medbay') text = sel[0].built ? 'Medbay — heals up to 5 infantry or 1 vehicle standing on it' + (sel[0].healing ? ' (healing ' + sel[0].healing + ')' : '') + '. Select units, then tap it' : 'Medbay: building…';
  else if (sel.length === 1 && sel[0].type === 'reactor') text = sel[0].built ? `Nuclear Reactor — power worth ${REACTOR_PLANTS} Power Plants (you build ${Math.round((powerBoost(0) - 1) * 100)}% faster). Unlocks the Heavy Tank, the Laser Turret and the Satellite Radar` : `Nuclear Reactor: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && sel[0].type === 'satellite') text = sel[0].built ? 'Satellite Radar — you see everything on ground you have explored (not hidden infantry in forests). Unlocks the Missile Turret and the Napalm Strike' + (sel[0].team === 0 ? (napalmWait(0) > 0 ? ` (next strike in ${Math.ceil(napalmWait(0))} s)` : ' (Napalm Strike ready)') : '') : `Satellite Radar: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && sel[0].type === 'radar') text = sel[0].built ? 'Radar — reveals everything within ' + STATS.radar.sight + ', over rocks and cliffs (not hidden infantry in forests)' : 'Radar: ' + Math.floor(sel[0].progress * 100) + '% built';
  else if (sel.length === 1 && sel[0].type === 'refinery') text = sel[0].built ? 'Refinery — buy Extractors at the War Factory' : `Refinery: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && isTurretType(sel[0].type)) text = !sel[0].built ? `${NAMES[sel[0].type]}: ${Math.floor(sel[0].progress * 100)}% built` : NAMES[sel[0].type] + ' — ' + TURRET_INFO[sel[0].type];
  else if (sel.length === 1 && sel[0].type === 'sam') text = sel[0].built ? 'SAM Site — waits underground and comes up to shoot down enemy aircraft in range (nothing else)' : `SAM Site: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && sel[0].type === 'helipad' && sel[0].built && padHeli(sel[0])) { const h = padHeli(sel[0]); text = `Helipad — its helicopter is ${h.landed ? 'docked here (' + h.ammo + '/' + STATS.heli.ammo + ' missiles)' : 'out flying'}`; }
  else if (sel.length === 1 && sel[0].air) {
    const h = sel[0], o = h.order;
    text = `Attack Helicopter: ${h.ammo}/${STATS.heli.ammo} missiles — ` + (h.landed && !padOf(h) ? 'landed: no Helipad to go home to, build one to reload' : h.landed ? (h.ammo < STATS.heli.ammo ? 'reloading on its pad' : 'docked. Tap an enemy to attack, or ground to fly there')
      : o && o.type === 'return' ? 'flying home' : !padOf(h) ? 'no Helipad to land on: build one to reload' : o && o.type === 'attack' ? 'attacking' : o && o.arrived ? 'on watch: goes home if nothing turns up' : 'flying there');
  }
  else if (producer) text = producer.built ? `${NAMES[producer.type]}${producer.queue ? ' — making ×' + producer.queue : ''}` : `${NAMES[producer.type]}: ${Math.floor(producer.progress * 100)}% built`;
  else if (extractors.length === 1 && sel.length === 1) text = extractorStatus(extractors[0]);
  else if (sel.length === 1 && sel[0].type === 'engineer') {
    const o = sel[0].order;
    text = o && o.type === 'repair' ? 'Engineer: repairing' : o && o.type === 'capture' ? 'Engineer: going in to capture' : o && o.type === 'buildTurret' ? `Engineer: on the way to build a ${NAMES[o.kind]}` : 'Engineer — tap your damaged building to repair, an enemy building or Oil Derrick to capture, or pick a turret below and tap where it goes';
  } else if (sel.length) {
    const counts = {};
    for (const e of sel) counts[e.type] = (counts[e.type] || 0) + 1;
    const plural = { soldier: 'soldiers', buggy: 'buggies', extractor: 'extractors', grenadier: 'grenadiers', rocket: 'rocket soldiers', sniper: 'snipers', light: 'light tanks', heavy: 'heavy tanks', artillery: 'artillery', engineer: 'engineers', settler: 'settlers', civilian: 'civilians', heli: 'helicopters' };
    const parts = Object.entries(counts).map(([t, n]) => `${n} ${n > 1 ? plural[t] || t + 's' : (SHORT[t] || NAMES[t]).toLowerCase()}`);
    text = parts.join(', ') + ' — tap to move';
  } else text = hqOf(0) ? 'Drag to scroll, pinch to zoom' : game.landing && game.landing.phase !== 'leave' ? 'Your Settler is coming ashore…' : 'Tap your settler to begin';
  ui.info.textContent = text;
}

function endGame(won) {
  game.over = won ? 'win' : 'lose';
  game.selected.clear(); game.placing = null;
  ui.ovTitle.textContent = won ? 'You win!' : 'You Lose';
  const how = game.hqCaptured ? 'captured' : 'destroyed';
  ui.ovText.textContent = won ? 'You ' + how + ' the enemy Headquarters.' : 'Your Headquarters was ' + how + '.';
  showResults();
  ui.ovBtn.textContent = 'Play again';
  $('ovReport').style.display = '';   // the finished game's report can still be saved from here
  ui.overlay.style.display = 'flex';
}
// ---------- Game report: a file you can save or share, with the whole game's numbers ----------
function reportSnapshot() {   // where both sides stand right now
  const side = team => {
    const mine = game.ents.filter(e => e.team === team && e.hp > 0), army = {};
    for (const u of mine) if (isCombat(u) || u.type === 'engineer') army[u.type] = (army[u.type] || 0) + 1;
    const st = game.stats[team];
    return { money: Math.round(game.credits[team]), earned: Math.round(st.earned), spent: Math.round(st.spent),
      army: Object.values(army).reduce((a, b) => a + b, 0), armyByType: army,
      buildings: mine.filter(e => isBuilding(e) && !isWallType(e.type)).length, walls: mine.filter(e => isWallType(e.type)).length,
      extractors: mine.filter(e => e.type === 'extractor').length, derricks: mine.filter(e => e.type === 'derrick').length,
      ruinsWorking: mine.filter(e => e.ruin && ruinWorks(e)).length, ruinsBroken: mine.filter(e => e.ruin && !ruinWorks(e)).length,
      turrets: mine.filter(e => isTurretType(e.type)).length };
  };
  return { t: Math.round(game.time), you: side(0), enemy: side(1), enemyWavesSent: game.ai.wavesSent || 0 };
}
function reportHits(team) {
  const out = {};
  for (const [type, k] of Object.entries(game.track.hits[team])) out[type] = { kills: k.kills, killValue: Math.round(k.killValue), damageValue: Math.round(k.damageValue) };
  return out;
}
function buildReport() {
  return {
    game: 'Mini RTS', version: (typeof PATCH_NOTES !== 'undefined' && PATCH_NOTES[0].version) || '?', saved: new Date().toISOString(),
    map: mapChoice === 'random' ? `random-${randomSize} #${mapNumber}` : mapChoice, difficulty: difficulty, secondsPlayed: Math.round(game.time), result: game.over || 'in progress',
    stats: { you: game.stats[0], enemy: game.stats[1] },
    made: { you: game.track.made[0], enemy: game.track.made[1] }, lost: { you: game.track.lost[0], enemy: game.track.lost[1] },
    byUnit: { you: reportHits(0), enemy: reportHits(1) },
    whoKilled: { you: game.track.whoKilled[0], enemy: game.track.whoKilled[1] },   // killer type -> { victim type: count }, for each side's killers   // per unit type: kills, value of what it killed, value of the damage it did ($, from prices)
    now: reportSnapshot(),
    enemyAI: { wavesSent: game.ai.wavesSent || 0, nextWaveSize: game.ai.waveSize || 0, turretsBuilt: game.ai.turretsBuilt || 0 },
    timeline: game.track.timeline,
  };
}
async function saveReport() {
  const r = buildReport(), name = 'mini-rts-report-' + r.map + '-' + r.difficulty + '-' + r.saved.slice(0, 16).replace(/[:T]/g, '-') + '.json';
  const file = new File([JSON.stringify(r, null, 1)], name, { type: 'application/json' });
  try {   // on phones: the share sheet (save it to Files, or send it straight on)
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Mini RTS game report' }); return; }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;   // otherwise: download it
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// the results table: you and the enemy side by side
function showResults() {
  const box = document.getElementById('results'); if (!box) return;
  const s = game.stats, t = Math.floor(game.time), mins = Math.floor(t / 60), secs = String(t % 60).padStart(2, '0');
  const n = v => Math.round(v).toLocaleString('en-GB'), money = v => '$' + n(v);
  const rows = [
    ['Troops made', s[0].units, s[1].units, n], ['Buildings made', s[0].buildings, s[1].buildings, n], ['Walls and gates built', s[0].walls, s[1].walls, n],
    ['Enemy troops killed', s[0].kills, s[1].kills, n], ['Enemy buildings destroyed', s[0].destroyed, s[1].destroyed, n],
    ['Troops lost', s[0].unitsLost, s[1].unitsLost, n], ['Buildings lost', s[0].buildingsLost, s[1].buildingsLost, n],
    ['Buildings captured', s[0].captured, s[1].captured, n], ['Money earned', s[0].earned, s[1].earned, money], ['Money spent', s[0].spent, s[1].spent, money],
  ];
  box.innerHTML = '<div class="resTime">Time played <b>' + mins + ':' + secs + '</b></div><table><tr><th></th><th class="you">You</th><th class="foe">Enemy</th></tr>' +
    rows.map(([label, a, b, f]) => '<tr><td>' + label + '</td><td>' + f(a) + '</td><td>' + f(b) + '</td></tr>').join('') + '</table>';
  box.style.display = 'block';
}

// ---------- Main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  updateHUD();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
// the start screen: a fresh game waits behind it (also where the pause menu's Exit Game goes)
function showMenu() {
  newGame();
  game.paused = true;
  ui.ovTitle.textContent = 'Mini RTS';
  ui.ovText.innerHTML = 'Deploy your settler, build a <b>Refinery</b> for ore and a <b>Barracks</b> for soldiers, and fight for the big ore field in the middle.<br>Drag to scroll · pinch to zoom · best in landscape.';
  ui.ovBtn.textContent = 'Start';
  ui.overlay.style.display = 'flex';
}
showMenu();
requestAnimationFrame(frame);

window.gameLoaded = true;   // (index.html shows a map picker instead if loading ever fails)
