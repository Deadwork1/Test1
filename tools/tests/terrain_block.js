// ---------- Terrain (rocks, river, bridges, forests) ----------
// The map is a grid of 25×25 tiles. Layout is mirrored so both sides are fair.
const TC = 25, TCOLS = W / TC, TROWS = H / TC;
const T = { GRASS: 0, ROCK: 1, WATER: 2, BRIDGE: 3, FOREST: 4 };
const terrain = new Uint8Array(TCOLS * TROWS);

const mirror = ([x, y]) => [W - x, H - y];
// cliff ridges: lines of rock [points], thickness
const RIDGES = [
  [[[110, 900], [300, 860], [470, 885]], 30],      // wall north of your base
  [[[880, 1050], [935, 1210], [905, 1385]], 30],   // wall east of your base (gap at the bottom)
  [[[620, 610], [770, 700]], 28],                  // outcrop by the west ore field
];
// forests: [x, y, radius]
const FORESTS = [[430, 620, 115], [1010, 1270, 85], [150, 600, 95], [800, 230, 90]];
const riverX = y => W / 2 + 70 * Math.sin((y - H / 2) / 230);
const ISLAND = { x: W / 2, y: H / 2, r: 280 };         // the middle ore field sits on an island
// bridges: centre x, centre y, half-width, half-height
const BRIDGES = [
  { x: riverX(230), y: 230, hw: 62, hh: 24 },
  { x: ISLAND.x - ISLAND.r, y: H / 2, hw: 58, hh: 24 },
];
for (const b of [...BRIDGES]) { const [x, y] = mirror([b.x, b.y]); BRIDGES.push({ ...b, x, y }); }

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

(function buildTerrain() {
  const ridges = [];
  for (const [pts, th] of RIDGES) { ridges.push([pts, th]); ridges.push([pts.map(mirror), th]); }
  const forests = [];
  for (const f of FORESTS) { forests.push(f); const [x, y] = mirror(f); forests.push([x, y, f[2]]); }
  for (let r = 0; r < TROWS; r++) {
    for (let c = 0; c < TCOLS; c++) {
      const x = c * TC + TC / 2, y = r * TC + TC / 2;
      const dI = Math.hypot(x - ISLAND.x, y - ISLAND.y);
      let t = T.GRASS;
      for (const [x0, y0, rad] of forests) {
        const a = Math.atan2(y - y0, x - x0);
        if (Math.hypot(x - x0, y - y0) < rad * (0.85 + 0.15 * Math.sin(a * 5 + x0))) t = T.FOREST;
      }
      for (const [pts, th] of ridges) {
        for (let i = 0; i < pts.length - 1; i++) {
          if (segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < th) t = T.ROCK;
        }
      }
      if (Math.abs(dI - ISLAND.r) < 34 || (Math.abs(x - riverX(y)) < 36 && dI > ISLAND.r)) t = T.WATER;
      for (const b of BRIDGES) if (Math.abs(x - b.x) < b.hw && Math.abs(y - b.y) < b.hh) t = T.BRIDGE;
      terrain[r * TCOLS + c] = t;
    }
  }
})();

const terrainAt = (x, y) => {
  const c = Math.floor(x / TC), r = Math.floor(y / TC);
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return T.ROCK;
  return terrain[r * TCOLS + c];
};
const isVehicle = e => e.type === 'settler' || e.type === 'extractor';
// can this kind of unit stand on this terrain? (ignores buildings)
const walkable = (t, vehicle) => t === T.GRASS || t === T.BRIDGE || (t === T.FOREST && !vehicle);

// ---------- Pathfinding (A* on the tile grid) ----------
const bldGrid = new Uint8Array(TCOLS * TROWS);   // tiles covered by buildings
let bldDirty = true;
function rebuildBuildingGrid() {
  bldGrid.fill(0);
  for (const b of game.ents) {
    if (!isBuilding(b)) continue;
    const h = b.size / 2;
    for (let r = Math.floor((b.y - h) / TC); r <= Math.floor((b.y + h) / TC); r++) {
      for (let c = Math.floor((b.x - h) / TC); c <= Math.floor((b.x + h) / TC); c++) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const cx = c * TC + TC / 2, cy = r * TC + TC / 2;
        if (Math.abs(cx - b.x) < h && Math.abs(cy - b.y) < h) bldGrid[r * TCOLS + c] = 1;
      }
    }
  }
  bldDirty = false;
  for (const e of game.ents) e.nav = null;   // routes may have changed
}

function passable(c, r, vehicle) {
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return false;
  const i = r * TCOLS + c;
  return !bldGrid[i] && walkable(terrain[i], vehicle);
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
function lineClear(x0, y0, x1, y1, vehicle) {
  const d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / (TC / 3));
  for (let i = 1; i <= steps; i++) {
    const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
    if (!passable(Math.floor(x / TC), Math.floor(y / TC), vehicle)) return false;
  }
  return true;
}

const N = TCOLS * TROWS;
const gScore = new Float32Array(N), cameFrom = new Int32Array(N), stamp = new Uint32Array(N), closed = new Uint32Array(N);
let searchId = 0;
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

function findPath(sx, sy, tx, ty, vehicle) {
  if (bldDirty) rebuildBuildingGrid();
  let start = nearestPassable(Math.floor(sx / TC), Math.floor(sy / TC), vehicle);
  const goal = nearestPassable(Math.floor(tx / TC), Math.floor(ty / TC), vehicle);
  if (!start || !goal) return null;
  const goalExact = passable(Math.floor(tx / TC), Math.floor(ty / TC), vehicle);
  const end = goalExact ? { x: tx, y: ty } : { x: goal[0] * TC + TC / 2, y: goal[1] * TC + TC / 2 };
  if (lineClear(sx, sy, end.x, end.y, vehicle)) return [end];

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
      const ng = gScore[cur] + cost * (terrain[ni] === T.FOREST ? 1.8 : 1);
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
    for (let j = cells.length - 1; j > k; j--) if (lineClear(ax, ay, cells[j].x, cells[j].y, vehicle)) { far = j; break; }
    path.push(cells[far]); ax = cells[far].x; ay = cells[far].y; k = far + 1;
  }
  return path;
}

// move a unit toward (tx, ty) along a route. Returns true when it gets there, 'fail' if it can't.
function navigate(e, tx, ty, dt) {
  const n = e.nav;
  if (!n || Math.hypot(n.tx - tx, n.ty - ty) > 30 && game.time - n.t > 0.4 || (n.fail && game.time - n.t > 2)) {
    const path = findPath(e.x, e.y, tx, ty, isVehicle(e));
    e.nav = { tx, ty, t: game.time, path: path || [], i: 0, fail: !path };
  }
  const nav = e.nav;
  if (nav.fail) return 'fail';
  if (nav.i >= nav.path.length) return true;
  const p = nav.path[nav.i];
  if (moveToward(e, p.x, p.y, dt)) { nav.i++; if (nav.i >= nav.path.length) return true; }
  return false;
}

