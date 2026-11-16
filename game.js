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
      { x: 600, y: 1170, nodes: 7, amount: 500, spread: 90 },
      { x: 640, y: 380, nodes: 8, amount: 400, spread: 110 },
    ],
    island: { r: 280, nodes: 14, amount: 500, spread: 160 },
    ridges: [
      [[[110, 900], [300, 860], [470, 885]], 30],      // wall north of your base
      [[[880, 1050], [935, 1210], [905, 1385]], 30],   // wall east of your base (gap at the bottom)
      [[[620, 610], [770, 700]], 28],                  // outcrop by the flank field
    ],
    forests: [[430, 620, 115], [1010, 1270, 85], [150, 600, 95], [800, 230, 90]],
    river: { amp: 70, period: 230, half: 36 },
    bridges: [{ y: 230, hw: 62 }],                     // river bridges on your half (mirrored for theirs)
  },
  large: {
    label: 'Large', W: 3600, H: 2250, start: { x: 300, y: 1950 },
    fields: [
      { x: 720, y: 1800, nodes: 8, amount: 500, spread: 100 },    // home field
      { x: 330, y: 1150, nodes: 8, amount: 500, spread: 105 },    // expansion: north of your base
      { x: 1300, y: 2070, nodes: 8, amount: 500, spread: 100 },   // expansion: along the south edge
      { x: 950, y: 480, nodes: 10, amount: 600, spread: 130 },    // contested flank field
    ],
    island: { r: 380, nodes: 18, amount: 600, spread: 230 },
    ridges: [
      [[[200, 1640], [450, 1590], [720, 1630]], 32],     // wall north of your base (gaps at both ends)
      [[[980, 1580], [1050, 1800], [1010, 2020]], 32],   // wall east of your base (gap at the bottom)
      [[[700, 780], [900, 900]], 30],                    // outcrop by the flank field
      [[[1350, 600], [1420, 900]], 30],                  // ridge near the river
      [[[620, 1150], [760, 1300]], 28],                  // rocks by the north expansion
    ],
    forests: [[600, 950, 140], [1500, 1900, 120], [200, 600, 130], [1150, 330, 130], [1150, 1350, 120], [1600, 1300, 90]],
    river: { amp: 90, period: 320, half: 40 },
    bridges: [{ y: 300, hw: 70 }, { y: 620, hw: 70 }],
  },
};
let mapChoice = 'large';
try { if (MAPS[localStorage.getItem('mini-rts-map')]) mapChoice = localStorage.getItem('mini-rts-map'); } catch (err) {}
const MAP = MAPS[mapChoice];

// ---------- Settings (tweak these to balance the game) ----------
const W = MAP.W, H = MAP.H;           // map size in world units
const CELL = 50;                      // fog-of-war grid size
const COLS = W / CELL, ROWS = H / CELL;
const START_CREDITS = 1000;
const INCOME = 1;                     // small trickle per second so nobody gets stuck at $0
const BUILD_RADIUS = 300;             // how far from your HQ you can place buildings
const BUILD_RADIUS_OTHER = 200;       // every other finished building (not walls) extends your build area this far

const COST = { barracks: 300, refinery: 400, factory: 500, power: 200, tower: 500, wall: 20, gate: 150, soldier: 100, extractor: 150, buggy: 250, grenadier: 160, engineer: 75 };
const WALL_REACH = 150;              // walls & gates can go this much further out than other buildings

const STATS = {
  settler:   { hp: 200, speed: 38, r: 16, sight: 180 },
  soldier:   { hp: 60,  speed: 52, r: 9,  sight: 170, range: 90, dmg: 8, cooldown: 0.8 },
  extractor: { hp: 300, speed: 34, r: 15, sight: 150, capacity: 150, rate: 30, unloadTime: 1.5 },
  buggy:     { hp: 140, speed: 95, r: 13, sight: 220, range: 110, dmg: 5,  cooldown: 0.25 },   // fast, machine gun
  grenadier: { hp: 55,  speed: 48, r: 9,  sight: 170, range: 95,  dmg: 16, cooldown: 2.0, splash: 38, flight: 0.55, vsVehicle: 0.5 },   // lobbed grenades: area damage, half vs vehicles
  engineer:  { hp: 20,  speed: 48, r: 9,  sight: 150, repair: 30 },   // no weapon, very fragile: repairs (hp per second) and captures
  hq:        { hp: 900, size: 92, sight: 280 },
  barracks:  { hp: 500, size: 74, sight: 200, buildTime: 10, trainTime: 4, maxQueue: 5 },
  refinery:  { hp: 600, size: 84, sight: 200, buildTime: 12, trainTime: 6, maxQueue: 3 },
  factory:   { hp: 800, size: 90, sight: 200, buildTime: 14, trainTime: 7, maxQueue: 3 },
  power:     { hp: 400, size: 60, sight: 160, buildTime: 10 },
  tower:     { hp: 700, size: 46, sight: 230, buildTime: 12, range: 170, dmg: 14, cooldown: 0.9 },
  wall:      { hp: 400, size: 25, sight: 50 },
  gate:      { hp: 600, size: 50, sight: 60 },
};
const PRODUCES = { barracks: ['soldier', 'grenadier', 'buggy', 'engineer'], refinery: ['extractor'], factory: ['buggy'] };
const TRAIN_TIME = { soldier: 4, buggy: 6, extractor: 6, grenadier: 4.5, engineer: 5 };   // seconds to make each unit
const FACTORY_ENABLED = false;   // War Factory is shelved for now (set true to bring it back)
const isCombat = e => e.type === 'soldier' || e.type === 'buggy' || e.type === 'grenadier';
const isInfantry = e => e.type === 'soldier' || e.type === 'grenadier' || e.type === 'engineer';
const SHORT = { buggy: 'Buggy' };   // shorter names for buttons

// How the computer plays at each difficulty.
//  think: seconds between decisions   slow: build/train time multiplier   income: share of ore value it earns
//  attackAt: army size before it attacks   attackAfter: earliest attack (seconds)   barracks: max barracks
//  maxArmy: it stops training soldiers at this many   guard: units it keeps at home   maxWave: biggest attack wave
//  extractors / refineries: how big its economy gets   walls: whether it builds a wall line with a gate
const DIFFICULTY = {
  easy:   { label: 'Easy',   think: 2.5, slow: 1.5,  income: 0.7,  attackAt: 5, attackAfter: 300, barracks: 1, maxArmy: 6, towers: 0, buggies: false, plants: 0,
            guard: 1, maxWave: 6, extractors: 2, refineries: 1, walls: false, grenadiers: false, engineers: 0 },
  normal: { label: 'Normal', think: 1.5, slow: 1.18, income: 0.85, attackAt: 7, attackAfter: 180, barracks: 1, maxArmy: 20, towers: 2, buggies: true, plants: 1,
            guard: 3, maxWave: 14, extractors: 4, refineries: 2, walls: true, grenadiers: true, engineers: 1 },
  hard:   { label: 'Hard',   think: 1,   slow: 1,    income: 1,    attackAt: 6, attackAfter: 0,   barracks: 2, maxArmy: Infinity, towers: 3, buggies: true, plants: 2,
            guard: 4, maxWave: 22, extractors: 5, refineries: 2, walls: true, grenadiers: true, engineers: 1 },
};
let difficulty = 'normal';
try { if (DIFFICULTY[localStorage.getItem('mini-rts-difficulty')]) difficulty = localStorage.getItem('mini-rts-difficulty'); } catch (err) {}
const diff = () => DIFFICULTY[difficulty];
// Power Plants: each finished one makes building and training 25% faster, up to double speed
const POWER_BONUS = 0.25, POWER_MAX = 2;
const powerBoost = team => Math.min(POWER_MAX, 1 + POWER_BONUS * game.ents.filter(b => b.team === team && b.type === 'power' && b.built).length);
// how many times longer than normal this side takes to build things (difficulty slow-down ÷ power boost)
const slowOf = e => (e.team === 1 ? diff().slow : 1) / powerBoost(e.team);
const NAMES = { settler: 'Settler', soldier: 'Soldier', extractor: 'Extractor', hq: 'Headquarters', barracks: 'Barracks', refinery: 'Refinery', factory: 'War Factory', buggy: 'Scout Buggy', grenadier: 'Grenadier', engineer: 'Engineer', tower: 'Guard Tower', power: 'Power Plant', wall: 'Wall', gate: 'Gate' };

const TEAMS = [
  { name: 'You',   color: '#3b82f6', dark: '#1d3f8f', light: '#93c5fd' },
  { name: 'Enemy', color: '#ef4444', dark: '#8f1d1d', light: '#fca5a5' },
];
const START = [{ x: MAP.start.x, y: MAP.start.y }, { x: W - MAP.start.x, y: H - MAP.start.y }];

// ore fields: a small one by each base, a big rich one in the middle, two on the flanks
const ORE_FIELDS = [
  ...MAP.fields.flatMap(f => [f, { ...f, x: W - f.x, y: H - f.y }]),
  { x: W / 2, y: H / 2, nodes: MAP.island.nodes, amount: MAP.island.amount, spread: MAP.island.spread },
];

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
  MM.w = small ? 150 : 200; MM.h = MM.w * H / W;
  MM.x = scr.w - MM.w - 10; MM.y = 56;
  clampCam();
}
const scale = () => (scr.h / 640) * cam.zoom;

function clampCam() {
  const s = scale(), hw = scr.w / 2 / s, hh = scr.h / 2 / s;
  const mx = 30 / s, top = 60 / s, bottom = 64 / s;
  cam.x = hw * 2 > W + mx * 2 ? W / 2 : Math.min(W - hw + mx, Math.max(hw - mx, cam.x));
  cam.y = hh * 2 > H + top + bottom ? H / 2 : Math.min(H - hh + bottom, Math.max(hh - top, cam.y));
}
function setZoom(z) { cam.zoom = Math.min(2.2, Math.max(0.45 * 2400 / W, z)); }   // can zoom out further on bigger maps

const toWorld = (sx, sy) => { const s = scale(); return { x: (sx - scr.w / 2) / s + cam.x, y: (sy - scr.h / 2) / s + cam.y }; };

// ---------- Terrain (rocks, river, bridges, forests) ----------
// The map is a grid of 25×25 tiles. Layout is mirrored so both sides are fair.
const TC = 25, TCOLS = W / TC, TROWS = H / TC;
const T = { GRASS: 0, ROCK: 1, WATER: 2, BRIDGE: 3, FOREST: 4 };
const terrain = new Uint8Array(TCOLS * TROWS);

const mirror = ([x, y]) => [W - x, H - y];
// cliff ridges ([points], thickness) and forests ([x, y, radius]) for your side; mirrored below
const RIDGES = MAP.ridges;
const FORESTS = MAP.forests;
const riverX = y => W / 2 + MAP.river.amp * Math.sin((y - H / 2) / MAP.river.period);
const ISLAND = { x: W / 2, y: H / 2, r: MAP.island.r };   // the middle ore field sits on an island
// bridges: centre x, centre y, half-width, half-height
const BRIDGES = [
  ...MAP.bridges.map(b => ({ x: riverX(b.y), y: b.y, hw: b.hw, hh: 24 })),
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
      if (Math.abs(dI - ISLAND.r) < 34 || (Math.abs(x - riverX(y)) < MAP.river.half && dI > ISLAND.r)) t = T.WATER;
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
const isVehicle = e => e.type === 'settler' || e.type === 'extractor';   // big vehicles: can't get through forests
// can this kind of unit stand on this terrain? (ignores buildings)
const walkable = (t, vehicle) => t === T.GRASS || t === T.BRIDGE || (t === T.FOREST && !vehicle);

// ---------- Pathfinding (A* on the tile grid) ----------
const bldGrid = new Uint8Array(TCOLS * TROWS);   // tiles covered by buildings (plus a clearance gap)
const CLEAR = 12;                                 // keep routes this far from building walls
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
function rebuildBuildingGrid() {
  bldGrid.fill(0); wallKind.fill(0);
  for (const b of game.ents) {
    if (isWallType(b.type)) {
      for (const [c, r] of wallTiles(b)) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const i = r * TCOLS + c; wallKind[i] = b.type === 'wall' ? 1 : 2; wallTeam[i] = b.team; wallId[i] = b.id;
      }
      continue;
    }
    if (!isBuilding(b)) continue;
    const h = b.size / 2;
    for (let r = Math.floor((b.y - h - CLEAR) / TC); r <= Math.floor((b.y + h + CLEAR) / TC); r++) {
      for (let c = Math.floor((b.x - h - CLEAR) / TC); c <= Math.floor((b.x + h + CLEAR) / TC); c++) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const cx = c * TC + TC / 2, cy = r * TC + TC / 2;
        if (Math.abs(cx - b.x) < h + CLEAR && Math.abs(cy - b.y) < h + CLEAR) bldGrid[r * TCOLS + c] = 1;
      }
    }
  }
  bldDirty = false;
  for (const e of game.ents) e.nav = null;   // routes may have changed
}

// who is the route for? (set by findPath) — own gates are open, enemy walls can be smashed through if `breakable`
const P = { team: -1, breakable: false };
function passable(c, r, vehicle) {
  if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) return false;
  const i = r * TCOLS + c;
  if (bldGrid[i] || !walkable(terrain[i], vehicle)) return false;
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
function lineClear(x0, y0, x1, y1, vehicle) {
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

function findPath(sx, sy, tx, ty, vehicle, team = -1, breakable = false) {
  if (bldDirty) rebuildBuildingGrid();
  P.team = team; P.breakable = breakable;
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
    for (let j = cells.length - 1; j > k; j--) if (lineClear(ax, ay, cells[j].x, cells[j].y, vehicle)) { far = j; break; }
    path.push(cells[far]); ax = cells[far].x; ay = cells[far].y; k = far + 1;
  }
  return path;
}

// move a unit toward (tx, ty) along a route. Returns true when it gets there, 'fail' if it can't.
function navigate(e, tx, ty, dt) {
  const n = e.nav;
  if (!n || Math.hypot(n.tx - tx, n.ty - ty) > 30 && game.time - n.t > 0.4 || (n.fail && game.time - n.t > 2)) {
    let path = findPath(e.x, e.y, tx, ty, isVehicle(e), e.team, false), breaking = false;
    if (!path && isCombat(e)) { path = findPath(e.x, e.y, tx, ty, isVehicle(e), e.team, true); breaking = !!path; }
    e.nav = { tx, ty, t: game.time, path: path || [], i: 0, fail: !path, breaking };
  }
  const nav = e.nav;
  if (nav.fail) return 'fail';
  if (nav.i >= nav.path.length) return true;
  if (!e.prog || Math.hypot(e.x - e.prog.x, e.y - e.prog.y) > 6) e.prog = { x: e.x, y: e.y, t: game.time };
  else if (game.time - e.prog.t > 1.2) {
    e.prog = { x: e.x, y: e.y, t: game.time };
    const a = Math.random() * Math.PI * 2, nx = e.x + Math.cos(a) * 6, ny = e.y + Math.sin(a) * 6;
    if (walkable(terrainAt(nx, ny), isVehicle(e))) { e.x = nx; e.y = ny; }
    e.nav = null;
    return false;
  }
  const p = nav.path[nav.i];
  if (nav.breaking) {   // an enemy wall or gate is in the way: shoot it down, then carry on
    const a = Math.atan2(p.y - e.y, p.x - e.x), ax = e.x + Math.cos(a) * (e.r + 10), ay = e.y + Math.sin(a) * (e.r + 10);
    if (wallBlocks(ax, ay, e.team)) {
      const i = Math.floor(ay / TC) * TCOLS + Math.floor(ax / TC), w = byId(wallId[i]);
      if (w && w.team !== e.team) { e.order = { type: 'attack', target: w.id, resume: e.order }; e.nav = null; return false; }
    }
  }
  if (moveToward(e, p.x, p.y, dt)) { nav.i++; if (nav.i >= nav.path.length) return true; }
  return false;
}

// ---------- Background (drawn once) ----------
const bg = document.createElement('canvas');
(function drawBackground() {
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');
  b.fillStyle = '#4a6b35'; b.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600 * (W * H) / (2400 * 1500); i++) {
    b.fillStyle = rnd() < 0.5 ? 'rgba(30,50,20,0.18)' : 'rgba(120,150,80,0.15)';
    b.beginPath(); b.arc(rnd() * W, rnd() * H, 6 + rnd() * 30, 0, Math.PI * 2); b.fill();
  }
  // a few rocky / dry patches for variety
  for (let i = 0; i < 14 * (W * H) / (2400 * 1500); i++) {
    b.fillStyle = 'rgba(110,95,60,0.25)';
    b.beginPath(); b.ellipse(rnd() * W, rnd() * H, 60 + rnd() * 120, 30 + rnd() * 60, rnd() * 3, 0, Math.PI * 2); b.fill();
  }
  const each = (type, fn) => {
    for (let r = 0; r < TROWS; r++) for (let c = 0; c < TCOLS; c++)
      if (terrain[r * TCOLS + c] === type) fn(c * TC + TC / 2, r * TC + TC / 2);
  };
  const dot = (x, y, rad, col) => { b.fillStyle = col; b.beginPath(); b.arc(x, y, rad, 0, Math.PI * 2); b.fill(); };
  // river: sandy banks, deep water, lighter middle
  each(T.WATER, (x, y) => dot(x, y, TC * 1.05, '#9c8a5c'));
  each(T.BRIDGE, (x, y) => dot(x, y, TC * 0.9, '#9c8a5c'));
  each(T.WATER, (x, y) => dot(x, y, TC * 0.8, '#2d5f8a'));
  each(T.BRIDGE, (x, y) => dot(x, y, TC * 0.75, '#2d5f8a'));
  each(T.WATER, (x, y) => dot(x + (rnd() - .5) * 6, y + (rnd() - .5) * 6, TC * 0.35, 'rgba(110,170,220,0.35)'));
  // bridges: wooden planks
  for (const br of BRIDGES) {
    b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(br.x - br.hw + 4, br.y - br.hh + 5, br.hw * 2, br.hh * 2);
    b.fillStyle = '#8b6a3e'; b.fillRect(br.x - br.hw, br.y - br.hh, br.hw * 2, br.hh * 2);
    b.strokeStyle = '#5e4526'; b.lineWidth = 2;
    for (let x = br.x - br.hw + 8; x < br.x + br.hw; x += 9) { b.beginPath(); b.moveTo(x, br.y - br.hh); b.lineTo(x, br.y + br.hh); b.stroke(); }
    b.fillStyle = '#4a3720'; b.fillRect(br.x - br.hw, br.y - br.hh, br.hw * 2, 4); b.fillRect(br.x - br.hw, br.y + br.hh - 4, br.hw * 2, 4);
  }
  // rocks and cliffs
  each(T.ROCK, (x, y) => dot(x + 4, y + 5, TC * 0.85, 'rgba(0,0,0,0.35)'));
  each(T.ROCK, (x, y) => dot(x, y, TC * 0.85, '#6f6a62'));
  each(T.ROCK, (x, y) => dot(x - 3 + (rnd() - .5) * 6, y - 3 + (rnd() - .5) * 6, TC * 0.5, '#8d877c'));
  each(T.ROCK, (x, y) => { if (rnd() < 0.4) dot(x + (rnd() - .5) * 14, y + (rnd() - .5) * 14, 3 + rnd() * 4, '#a8a295'); });
  // forests: ground then tree canopies
  each(T.FOREST, (x, y) => dot(x, y, TC * 0.85, '#2f4a24'));
  each(T.FOREST, (x, y) => {
    for (let i = 0; i < 2; i++) {
      const tx = x + (rnd() - .5) * TC, ty = y + (rnd() - .5) * TC, rad = 9 + rnd() * 7;
      dot(tx + 3, ty + 4, rad, 'rgba(0,0,0,0.3)');
      dot(tx, ty, rad, rnd() < 0.5 ? '#2c5a26' : '#356b2c');
      dot(tx - rad * 0.3, ty - rad * 0.3, rad * 0.45, 'rgba(140,190,90,0.35)');
    }
  });
  b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 6; b.strokeRect(3, 3, W - 6, H - 6);
})();

// a small copy of the background for the minimap (much cheaper to draw every frame)
const mmBg = document.createElement('canvas');
mmBg.width = 400; mmBg.height = Math.round(400 * H / W);
mmBg.getContext('2d').drawImage(bg, 0, 0, mmBg.width, mmBg.height);

// ---------- Game state ----------
let game;

function newGame() {
  game = {
    ents: [], ore: [], nextId: 1, time: 0, grenades: [],
    credits: [START_CREDITS, START_CREDITS],
    selected: new Set(),
    placing: null,           // { type, ghost:{x,y} } while choosing where to build
    effects: [],
    over: null, paused: false,
    ai: { timer: 0, attacking: false, known: new Map(), scout: null, exploreTarget: null },
  };
  for (const f of fog) { f.vis.fill(0); f.exp.fill(0); }
  bldDirty = true;
  let seed = 99;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const f of ORE_FIELDS) {
    for (let i = 0; i < f.nodes; i++) {
      let x, y, tries = 0;
      do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * f.spread; x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d; }
      while (terrainAt(x, y) !== T.GRASS && ++tries < 30);
      game.ore.push({ id: game.nextId++, x, y, amount: f.amount, max: f.amount, rot: rnd() * 6 });
    }
  }
  spawn('settler', 0, START[0].x, START[0].y);
  spawn('settler', 1, START[1].x, START[1].y);
  cam.x = START[0].x; cam.y = START[0].y; setZoom(1); clampCam();
  updateFog();
}

function spawn(type, team, x, y) {
  const s = STATS[type];
  const e = { id: game.nextId++, type, team, x, y, hp: s.hp, maxHp: s.hp, order: null,
              cooldown: 0, facing: team === 0 ? -0.6 : 2.5 };
  if (isBuildingType(type)) {
    bldDirty = true;
    e.size = s.size;
    if (type === 'hq' || isWallType(type)) { e.built = true; e.progress = 1; }   // walls go up instantly
    else { e.built = false; e.progress = 0; e.hp = s.hp * 0.1; }
    e.queue = 0; e.trainT = 0; e.qTypes = [];
  } else {
    e.r = s.r;
    if (type === 'extractor') e.cargo = 0;
  }
  game.ents.push(e);
  return e;
}

function isBuildingType(t) { return t === 'hq' || t === 'barracks' || t === 'refinery' || t === 'factory' || t === 'power' || t === 'tower' || t === 'wall' || t === 'gate'; }
const isWallType = t => t === 'wall' || t === 'gate';
const gateHalf = vertical => vertical ? { hx: TC / 2, hy: TC } : { hx: TC, hy: TC / 2 };
const halfX = e => e.type === 'gate' ? gateHalf(e.vertical).hx : e.size / 2;
const halfY = e => e.type === 'gate' ? gateHalf(e.vertical).hy : e.size / 2;
const isBuilding = e => isBuildingType(e.type);
const isUnit = e => !isBuilding(e);
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
  if (d <= step || d < 0.5) { e.x = tx; e.y = ty; return true; }
  e.x += dx / d * step; e.y += dy / d * step;
  e.facing = Math.atan2(dy, dx);
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

function updateFog() {
  for (const f of fog) f.vis.fill(0);
  for (const e of game.ents) {
    const f = fog[e.team];
    const r = STATS[e.type].sight * (isBuilding(e) && !e.built ? 0.6 : 1);
    const c0 = Math.max(0, Math.floor((e.x - r) / CELL)), c1 = Math.min(COLS - 1, Math.floor((e.x + r) / CELL));
    const r0 = Math.max(0, Math.floor((e.y - r) / CELL)), r1 = Math.min(ROWS - 1, Math.floor((e.y + r) / CELL));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2;
        if ((cx - e.x) ** 2 + (cy - e.y) ** 2 <= r * r) { const i = row * COLS + col; f.vis[i] = 1; f.exp[i] = 1; }
      }
    }
  }
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
  if (!siteIsFree(settler.x, settler.y, STATS.hq.size)) return false;
  settler.hp = 0; settler.deployed = true;
  const hq = spawn('hq', settler.team, settler.x, settler.y);
  if (game.selected.delete(settler.id) && settler.team === 0) game.selected.add(hq.id);
  return true;
}

// Your build area: a circle round the HQ plus one round every other finished building (walls and gates don't count),
// so it grows as your base spreads out.
function buildAreaSources(team) {
  return game.ents.filter(b => b.team === team && isBuilding(b) && b.built && !isWallType(b.type))
    .map(b => ({ x: b.x, y: b.y, r: b.size / 2 + (b.type === 'hq' ? BUILD_RADIUS : BUILD_RADIUS_OTHER), b }));
}
function inBuildArea(team, x, y, extra = 0) {
  if (!hqOf(team)) return false;   // the HQ does the building
  return buildAreaSources(team).some(s => edgeDist(x, y, s.b) <= s.r - s.b.size / 2 + extra);
}

function canPlace(team, type, x, y) {
  const size = STATS[type].size;
  if (!inBuildArea(team, x, y) || !siteIsFree(x, y, size)) return false;
  for (const b of game.ents) {   // never sit on the doorstep of a building that makes units
    if (!isBuilding(b) || !PRODUCES[b.type]) continue;
    const od = frontDoor(b);
    if (Math.abs(od.x - x) < size / 2 + 14 && Math.abs(od.y - y) < size / 2 + 14) return false;
  }
  if (!PRODUCES[type]) return true;   // towers etc. don't need a door
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

// walls snap to tiles; gates (2×2 tiles) snap to tile corners
const snapWall = (x, y) => ({ x: Math.floor(x / TC) * TC + TC / 2, y: Math.floor(y / TC) * TC + TC / 2 });
// a gate lines up with the tiles; it turns to match the wall it's dropped into unless you've rotated it yourself
function snapGate(x, y, vertical) {
  return vertical ? { x: Math.floor(x / TC) * TC + TC / 2, y: Math.round(y / TC) * TC, vertical }
                  : { x: Math.round(x / TC) * TC, y: Math.floor(y / TC) * TC + TC / 2, vertical };
}
function fitGate(x, y, team, forced) {
  if (forced !== undefined) return snapGate(x, y, forced);
  const isWall = (c, r) => c >= 0 && r >= 0 && c < TCOLS && r < TROWS && wallKind[r * TCOLS + c] && wallTeam[r * TCOLS + c] === team;
  const h = snapGate(x, y, false), v = snapGate(x, y, true);
  const hc = h.x / TC, hr = Math.floor(h.y / TC), vc = Math.floor(v.x / TC), vr = v.y / TC;
  const hs = isWall(hc - 2, hr) + isWall(hc + 1, hr), vs = isWall(vc, vr - 2) + isWall(vc, vr + 1);
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
    if (PRODUCES[b.type]) {   // keep doorways clear
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
    game.credits[team] -= COST.wall; spawn('wall', team, t.x, t.y); built++;
  }
  return built;
}

function placeBuilding(team, type, x, y, vertical) {
  if (type === 'gate') {
    const g = snapGate(x, y, !!vertical);
    if (game.credits[team] < COST.gate || !canPlaceWallPiece(team, 'gate', g.x, g.y, g.vertical)) return false;
    game.credits[team] -= COST.gate;
    const e = spawn('gate', team, g.x, g.y); e.vertical = g.vertical; bldDirty = true;
    return true;
  }
  if (game.credits[team] < COST[type] || !canPlace(team, type, x, y)) return false;
  game.credits[team] -= COST[type];
  spawn(type, team, x, y);
  return true;
}

function produce(b, unit) {
  unit = unit || (PRODUCES[b.type] || [])[0];
  if (!unit || !PRODUCES[b.type].includes(unit) || !b.built || b.queue >= STATS[b.type].maxQueue || game.credits[b.team] < COST[unit]) return false;
  game.credits[b.team] -= COST[unit];
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

function updateExtractor(e, dt) {
  const s = STATS.extractor, o = e.order;
  e.mining = false;
  if (e.docked && (!o || o.type !== 'harvest' || !['docking', 'unloading', 'undocking'].includes(o.phase))) e.docked = false;
  if (!o) return;
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
    if (moveToward(e, d.pad.x, d.pad.y, dt)) { o.phase = 'unloading'; o.t = 0; o.aligned = false; }
    e.facing = -Math.PI / 2;   // then drive straight in, nose-first
    return;
  }

  if (o.phase === 'unloading') {
    o.t += dt;
    if (o.t >= s.unloadTime) {
      const amount = Math.round(e.cargo);
      game.credits[e.team] += e.team === 1 ? Math.round(amount * diff().income) : amount; e.cargo = 0;
      if (e.team === 0) game.effects.push({ kind: 'text', x: e.x, y: e.y - 20, text: '+$' + amount, t: 0 });
      o.phase = 'undocking';
    }
    return;
  }

  if (o.phase === 'undocking') {
    const done = moveToward(e, d.out.x, d.out.y, dt);
    e.facing = -Math.PI / 2;   // reverse back out
    if (done || edgeDist(e.x, e.y, ref) > e.r) {
      e.docked = false; if (ref.dockedBy === e.id) ref.dockedBy = null;
      if (o.finish) {   // nothing left to collect: park beside the door, not on it
        const w = waitSpot(ref, e);
        e.order = { type: 'move', x: w.x, y: w.y }; e.outOfOre = true;
      } else { o.phase = 'toNode'; o.ref = null; }
    }
  }
}

// ---------- Update ----------
function update(dt) {
  if (game.over || game.paused) return;

  game.time += dt;
  game.credits[0] += INCOME * dt;
  game.credits[1] += INCOME * dt;
  if (bldDirty) rebuildBuildingGrid();

  for (const e of game.ents) {
    if (e.type === 'settler') { if (e.order && navigate(e, e.order.x, e.order.y, dt)) e.order = null; }
    else if (isCombat(e)) updateSoldier(e, dt);
    else if (e.type === 'engineer') updateEngineer(e, dt);
    else if (e.type === 'extractor') updateExtractor(e, dt);
    else if (e.type === 'tower') updateTower(e, dt);
    else if (isBuilding(e)) updateBuilding(e, dt);
  }

  separate();

  for (const e of game.ents) {
    if (e.hp <= 0) {
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
      if (o.team === g.team || o.hp <= 0) continue;
      const d = edgeDist(g.x, g.y, o);
      const vehicle = o.type === 'buggy' || o.type === 'extractor' || o.type === 'settler';
      if (d <= g.r) o.hp -= g.dmg * (1 - 0.5 * d / g.r) * (vehicle ? STATS.grenadier.vsVehicle : 1);
    }
    game.effects.push({ kind: 'blast', x: g.x, y: g.y, r: g.r, t: 0 });
  }
  game.grenades = game.grenades.filter(g => !g.done);
  for (const fx of game.effects) fx.t += dt;
  game.effects = game.effects.filter(fx => fx.t < (fx.kind === 'shot' ? 0.08 : fx.kind === 'text' ? 1.2 : fx.kind === 'spark' ? 0.3 : fx.kind === 'blast' ? 0.45 : 0.6));

  runAI(dt);
  updateFog();

  const alive = [0, 1].map(t => game.ents.some(e => e.team === t && !isWallType(e.type)));
  if (!alive[1]) endGame(true);
  else if (!alive[0]) endGame(false);
}

function findEnemyNear(e, radius) {
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || hiddenFrom(o, e.team) || isWallType(o.type)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateSoldier(e, dt) {   // soldiers and buggies
  const s = STATS[e.type];
  e.cooldown -= dt;
  e.revealT = (e.revealT || 0) - dt;
  let o = e.order;

  // idle or attack-moving soldiers look for nearby enemies on their own
  if ((!o && !e.passive) || (o && o.type === 'attackmove')) {
    const foe = findEnemyNear(e, s.sight);
    if (foe) { e.order = { type: 'attack', target: foe.id, resume: o }; o = e.order; }
  }
  if (!o) return;

  if (o.type === 'attackmove' && e.holdUntil > game.time) return;   // waiting for the rest of its wave
  if (o.type === 'move' || o.type === 'attackmove') {
    if (Math.hypot(o.x - e.x, o.y - e.y) < e.r + 6) { e.order = null; return; }   // close enough (someone may be standing on the exact spot)
    if (navigate(e, o.x, o.y, dt)) e.order = null;   // arrived (true) or can't get there ('fail')
  } else if (o.type === 'attack') {
    const t = byId(o.target);
    if (!t || hiddenFrom(t, e.team)) { e.order = o.resume || null; return; }
    // a unit that slips into the fog is lost: go to where it was last seen, then stop (no tracking it through the fog)
    if (isUnit(t) && !visibleAt(t.x, t.y, e.team) && Math.hypot(t.x - e.x, t.y - e.y) > s.sight) {
      // head for the last spot it was seen, ready to fight anything met on the way
      e.order = o.resume || { type: 'attackmove', x: o.seenX !== undefined ? o.seenX : t.x, y: o.seenY !== undefined ? o.seenY : t.y };
      return;
    }
    o.seenX = t.x; o.seenY = t.y;
    if (edgeDist(e.x, e.y, t) > s.range) {
      if (navigate(e, t.x, t.y, dt) === 'fail') e.order = o.resume || null;
    } else {
      e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
        e.revealT = 1.5;   // firing gives away your position
        if (s.splash) {   // grenade: flies for a moment, so fast targets can dodge it
          game.grenades.push({ x0: e.x, y0: e.y, x: t.x + (Math.random() - .5) * 10, y: t.y + (Math.random() - .5) * 10,
                               t: 0, dur: s.flight, team: e.team, dmg: s.dmg, r: s.splash });
          e.throwT = 0.25;
        } else {
          t.hp -= s.dmg;
          game.effects.push({ kind: 'shot', x: e.x, y: e.y, x2: t.x + (Math.random() - .5) * 8,
                              y2: t.y + (Math.random() - .5) * 8, team: e.team, t: 0 });
        }
        if (isCombat(t) && !t.order) t.order = { type: 'attack', target: e.id };
      }
    }
  }
}

// Engineers: walk to a building, then either repair it (yours) or capture it (theirs). They're very fragile, so escort them.
const canCapture = b => isBuilding(b) && !isWallType(b.type) && b.built;   // any finished building except walls & gates
function updateEngineer(e, dt) {
  const o = e.order;
  e.working = false;
  if (!o) return;
  if (o.type === 'move') { if (navigate(e, o.x, o.y, dt)) e.order = null; return; }
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
    b.hp = Math.min(b.maxHp, b.hp + STATS.engineer.repair * dt);
    e.working = true;
    if (Math.random() < dt * 8) game.effects.push({ kind: 'spark', x: b.x + (Math.random() - .5) * halfX(b) * 1.6, y: b.y + (Math.random() - .5) * halfY(b) * 1.6, t: 0 });
    if (b.hp >= b.maxHp) e.order = null;
  } else if (o.type === 'capture') {
    if (!canCapture(b)) { e.order = null; return; }
    captureBuilding(b, e.team);
    e.hp = 0; e.deployed = true;   // the engineer goes inside and takes it over
  }
}

function captureBuilding(b, team) {
  const was = b.team;
  b.team = team;
  b.queue = 0; b.qTypes = []; b.trainT = 0; b.dockedBy = null; b.target = null;
  if (game.selected.has(b.id) && team !== 0) game.selected.delete(b.id);
  game.ai.known.delete(b.id);
  game.effects.push({ kind: 'text', x: b.x, y: b.y - 30, text: team === 0 ? 'Captured!' : 'Lost!', t: 0, color: team === 0 ? '#7dff7d' : '#ff6b6b' });
  bldDirty = true;
  if (team === 0 && was === 1) game.selected = new Set([b.id]);
}

function updateBuilding(e, dt) {
  const s = STATS[e.type];
  if (!e.built) {   // construction happens on its own
    e.progress += dt / (s.buildTime * slowOf(e));
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.9 * dt / (s.buildTime * slowOf(e)));
    if (e.progress >= 1) {
      e.progress = 1; e.built = true;
      if (e.type === 'refinery') releaseUnit(e);   // every refinery comes with one free extractor
    }
    return;
  }
  if (!PRODUCES[e.type] || e.queue <= 0) return;
  e.trainT += dt;
  if (e.trainT >= TRAIN_TIME[e.qTypes[0]] * slowOf(e)) {
    e.trainT = 0; e.queue--;
    releaseUnit(e, e.qTypes.shift());
  }
}

// guard towers shoot the nearest enemy in range on their own
function updateTower(e, dt) {
  if (!e.built) return updateBuilding(e, dt);
  const s = STATS.tower;
  e.cooldown -= dt;
  let t = e.target && byId(e.target);
  if (!t || hiddenFrom(t, e.team) || edgeDist(e.x, e.y, t) > s.range) { t = findEnemyNear(e, s.range); e.target = t ? t.id : null; }
  if (!t) return;
  e.aim = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.cooldown <= 0) {
    e.cooldown = s.cooldown;
    t.hp -= s.dmg;
    game.effects.push({ kind: 'shot', x: e.x + Math.cos(e.aim) * 20, y: e.y + Math.sin(e.aim) * 20 - 6,
                        x2: t.x, y2: t.y, team: e.team, t: 0, heavy: true });
    if (isCombat(t) && !t.order) t.order = { type: 'attack', target: e.id };   // units charge the tower
  }
}

// a new unit rolls out of the building's door
// Every building's front door faces the bottom of the screen.
const frontDoor = b => ({ x: b.x, y: b.y + b.size / 2 + 30 });

function releaseUnit(b, type) {
  const d = frontDoor(b);
  const u = spawn(type || PRODUCES[b.type][0], b.team, d.x, d.y - 10);
  u.facing = Math.PI / 2;
  u.order = { type: 'move', x: d.x + (Math.random() - .5) * 70, y: d.y + 28 };
  return u;
}

// Refinery unloading bay: extractors line up at the front door, drive onto the pad, unload, back out.
const dockOf = r => ({ out: frontDoor(r), pad: { x: r.x, y: r.y + r.size / 2 - 15 } });
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
    if (walkable(terrainAt(x, y), true) && !game.ents.some(b => isBuilding(b) && edgeDist(x, y, b) < 28)) return { x, y };
  }
  return { x: d.x, y: d.y + 40 };
}

// keep units from stacking on top of each other or driving through buildings
function separate() {
  const units = game.ents.filter(isUnit);
  for (const u of units) { u.px = u.x; u.py = u.y; }
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > 40 || Math.abs(dy) > 40) continue;
      const d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
      if (d < min) {
        const push = (min - d) / 2;
        const wa = a.docked ? 0 : b.docked ? 2 : 1, wb = b.docked ? 0 : a.docked ? 2 : 1;
        a.x -= dx / d * push * wa; a.y -= dy / d * push * wa;
        b.x += dx / d * push * wb; b.y += dy / d * push * wb;
      }
    }
    for (const bld of game.ents) {
      if (!isBuilding(bld)) continue;
      if (a.docked && a.order && a.order.ref === bld.id) continue;
      if (bld.type === 'gate' && bld.team === a.team) continue;
      const hx = halfX(bld) + a.r, hy = halfY(bld) + a.r, dx = a.x - bld.x, dy = a.y - bld.y;
      if (Math.abs(dx) < hx && Math.abs(dy) < hy) {
        if (hx - Math.abs(dx) < hy - Math.abs(dy)) a.x = bld.x + Math.sign(dx || 1) * hx;
        else a.y = bld.y + Math.sign(dy || 1) * hy;
      }
    }
    a.x = Math.min(W - a.r, Math.max(a.r, a.x));
    a.y = Math.min(H - a.r, Math.max(a.r, a.y));
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
    const score = preferFar && hq ? Math.hypot(x - hq.x, y - hq.y) : -Math.hypot(x - fromX, y - fromY);
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best;
}

// where its army gathers: a little way out from the HQ toward the middle of the map
function aiRally(hq) {
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
  const tiles = [], gateAt = vertical ? { x: Math.floor(cx / TC) * TC + TC / 2, y: Math.round(cy / TC) * TC }
                                      : { x: Math.round(cx / TC) * TC, y: Math.floor(cy / TC) * TC + TC / 2 };
  for (let k = -7; k <= 6; k++) {
    if (k === -1 || k === 0) continue;   // the gate's two tiles
    const x = vertical ? gateAt.x : gateAt.x + k * TC + TC / 2, y = vertical ? gateAt.y + k * TC + TC / 2 : gateAt.y;
    tiles.push({ x, y });
  }
  return { tiles, gate: { ...gateAt, vertical } };
}

function runAI(dt) {
  const ai = game.ai;
  ai.timer -= dt;
  if (ai.timer > 0) return;
  ai.timer = diff().think;
  const D = diff();

  const mine = game.ents.filter(e => e.team === 1);
  const of = t => mine.filter(e => e.type === t);
  const settler = of('settler')[0], hq = of('hq')[0];
  const barracks = of('barracks'), refineries = of('refinery'), extractors = of('extractor');
  const army = mine.filter(isCombat);   // soldiers and buggies
  const cash = game.credits[1];

  // remember any of your buildings it has seen; forget ones it sees are gone
  for (const e of game.ents) if (e.team === 0 && isBuilding(e) && !isWallType(e.type) && visibleAt(e.x, e.y, 1)) ai.known.set(e.id, { x: e.x, y: e.y });
  for (const [id, k] of ai.known) if (!byId(id) && visibleAt(k.x, k.y, 1)) ai.known.delete(id);

  if (settler && !hq) deploy(settler);
  if (!hq) return;

  // ---- base building (army comes first: extras only once it has a decent force) ----
  ai.waveSize = ai.waveSize || D.attackAt;
  // After each wave goes out it spends ~45s investing (refinery, towers, walls) before saving for the next wave.
  const sent = ai.wavesSent || 0;
  const wantTowers = sent === 0 ? 0 : sent === 1 ? Math.min(1, D.towers) : D.towers;
  const reqRefineries = extractors.length >= 3 && sent >= 1 ? D.refineries : 1;
  // the build phase lasts until this stage's extras are built (or 90s, so it never stalls)
  const extrasDone = (refineries.length >= reqRefineries || aiBlocked('refinery')) && (of('tower').length >= wantTowers || aiBlocked('tower'));
  const building = game.time < (ai.buildUntil || 0) && !extrasDone;
  if (refineries.length === 0) aiPlaceRefinery(hq);
  else if (barracks.length === 0) aiPlace(hq, 'barracks');
  else if (of('power').length < D.plants && cash >= COST.power) aiPlace(hq, 'power');
  else if (refineries.length < reqRefineries && cash >= COST.refinery && !aiBlocked('refinery')) aiPlaceRefinery(hq);
  else if (of('tower').length < wantTowers && cash >= COST.tower && !aiBlocked('tower')) aiPlaceTower(hq);
  else if (barracks.length < D.barracks && cash >= 900) aiPlace(hq, 'barracks');

  // expand toward fresh ore once the ore by its refineries is running out
  const expanding = aiExpand(hq, refineries, sent);

  // wall line + gate across the approach, a few pieces at a time
  if (D.walls && sent >= 1 && game.credits[1] >= 200) {
    const plan = ai.wallPlan || (ai.wallPlan = aiWallPlan(hq));
    if (!of('gate').length && !ai.gateTried) {
      ai.gateTried = true;
      placeBuilding(1, 'gate', plan.gate.x, plan.gate.y, plan.gate.vertical);
    }
    let n = 0;
    for (const t of plan.tiles) {
      if (n >= 3 || game.credits[1] < COST.wall + 150) break;
      if (game.ents.some(w => w.type === 'wall' && w.team === 1 && Math.abs(w.x - t.x) < 1 && Math.abs(w.y - t.y) < 1)) continue;
      if (canPlaceWallPiece(1, 'wall', t.x, t.y)) { game.credits[1] -= COST.wall; spawn('wall', 1, t.x, t.y); n++; }
    }
  }

  // ---- economy ----
  const wantExtractors = Math.min(D.extractors, refineries.filter(r => r.built).length * 3);
  const qx = refineries.reduce((n, r) => n + r.queue, 0);
  for (const r of refineries) if (extractors.length + qx < wantExtractors && r.queue === 0) produce(r);
  for (const x of extractors) {   // idle extractors go to ore it knows about, or drive off to look for some
    if (x.order || autoHarvest(x)) continue;
    const spot = aiExploreSpot(x.x, x.y, false);
    if (spot) x.order = { type: 'move', x: spot.x, y: spot.y };
  }

  // ---- training ----
  let reserve = extractors.length + qx < wantExtractors ? COST.extractor : 0;
  const defended = army.length >= D.guard + 2;   // never stops training while its home is thin
  if (expanding && defended) reserve += expanding;   // saving for a stepping stone or a new refinery
  if (building && defended) {   // in a build phase: save for the next thing it wants, not for units
    if (refineries.length < reqRefineries && !aiBlocked('refinery')) reserve += COST.refinery;
    else if (of('tower').length < wantTowers && !aiBlocked('tower')) reserve += COST.tower;
  }
  const queued = barracks.reduce((n, b) => n + b.queue, 0);
  const qBuggies = barracks.reduce((n, b) => n + b.qTypes.filter(t => t === 'buggy').length, 0);
  const wantBuggy = D.buggies && of('buggy').length + qBuggies < (of('soldier').length + 2) / 2;   // ~1 buggy per 2 soldiers
  const qOf = t => barracks.reduce((n, b) => n + b.qTypes.filter(q => q === t).length, 0);
  const wantGren = D.grenadiers && of('grenadier').length + qOf('grenadier') < (of('soldier').length + 1) / 3;   // ~1 grenadier per 3 soldiers
  const wantEngineer = of('engineer').length + qOf('engineer') < D.engineers && game.time > 120;
  for (const b of barracks) {
    if (b.queue >= 2) continue;
    if (wantEngineer && game.credits[1] >= COST.engineer) { produce(b, 'engineer'); continue; }
    if (army.length + queued >= D.maxArmy) continue;
    if (wantBuggy) { if (game.credits[1] >= COST.buggy + reserve) produce(b, 'buggy'); }
    else if (wantGren) { if (game.credits[1] >= COST.grenadier + reserve) produce(b, 'grenadier'); }
    else if (game.credits[1] >= COST.soldier + reserve) produce(b, 'soldier');
  }
  // engineers fix its most damaged building, and otherwise wait safely by the HQ
  for (const en of of('engineer')) {
    if (en.order) continue;
    const hurt = mine.filter(b => isBuilding(b) && !isWallType(b.type) && b.built && b.hp < b.maxHp * 0.75).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) en.order = { type: 'repair', target: hurt.id };
    else if (Math.hypot(en.x - hq.x, en.y - hq.y) > 140) en.order = { type: 'move', x: hq.x + (Math.random() - .5) * 80, y: hq.y + hq.size / 2 + 50 };
  }

  // ---- army ----
  const rally = aiRally(hq);
  const targets = game.ents.filter(e => e.team === 0 && !isWallType(e.type) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1)).map(e => ({ x: e.x, y: e.y }));
  for (const k of ai.known.values()) targets.push(k);
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

  // defend: if your units come near its base, the guards and everyone gathering (and any wave close to home) fight back
  const base = mine.filter(e => isBuilding(e) && !isWallType(e.type));
  const intruders = game.ents.filter(e => e.team === 0 && isUnit(e) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1) &&
    base.some(b => Math.hypot(b.x - e.x, b.y - e.y) < 450));
  if (intruders.length) {
    for (const u of army) {
      if (u.role === 'scout') continue;
      if (u.role === 'wave' && Math.hypot(u.x - hq.x, u.y - hq.y) > 700) continue;
      if (u.order && u.order.type === 'attack' && byId(u.order.target)) continue;
      const t = nearest(u, intruders);
      u.order = { type: 'attack', target: t.id }; u.passive = false;
    }
  } else {
    // guards and new units wait at the rally point
    for (const u of army) {
      if (u.role === 'wave' || u.role === 'scout' || u.order) continue;
      if (Math.hypot(u.x - rally.x, u.y - rally.y) > 90) u.order = { type: 'move', x: rally.x + (Math.random() - .5) * 60, y: rally.y + (Math.random() - .5) * 60 };
    }
  }

  // waves: once enough units have gathered (and it's late enough), they march out together
  const gathered = army.filter(u => !u.role && Math.hypot(u.x - rally.x, u.y - rally.y) < 160);
  const lost = !ai.known.size && game.time > D.attackAfter + 90;   // still hasn't found you: go looking in force
  if (!intruders.length && gathered.length >= ai.waveSize && game.time >= D.attackAfter && (ai.known.size || lost)) {
    const target = nearest(rally, targets) || aiExploreSpot(hq.x, hq.y, true);
    if (target) {
      for (const u of gathered) { u.role = 'wave'; u.passive = false; u.order = { type: 'attackmove', x: target.x, y: target.y }; }
      ai.waveSize = Math.min(D.maxWave, ai.waveSize + 2);   // each wave a little bigger
      ai.wavesSent = (ai.wavesSent || 0) + 1;
      ai.buildUntil = game.time + 90;
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
    for (const u of wave) {
      if (u.order) continue;
      const t = nearest(u, targets) || ai.exploreTarget;
      if (t) { u.order = { type: 'attackmove', x: t.x, y: t.y }; ai.waveTarget = t; }
    }
  }
}

// When the ore near its refineries is nearly gone, it heads for the nearest field it knows about:
// cheap Power Plants as stepping stones to stretch its build area, then a refinery right by the ore.
// Returns how much money it wants to keep for that (0 if it isn't expanding).
function aiExpand(hq, refineries, sent) {
  if (refineries.length >= 4 || (!sent && game.time < 200) || aiBlocked('expand')) return 0;
  const oreNear = (x, y, r) => game.ore.reduce((s, o) => s + (o.amount > 0 && Math.hypot(o.x - x, o.y - y) < r ? o.amount : 0), 0);
  if (refineries.some(r => !r.built || oreNear(r.x, r.y, 450) > 600)) return 0;   // still plenty to mine
  // never more than a few stepping stones
  if (game.ents.filter(e => e.team === 1 && e.type === 'power').length >= diff().plants + 4) return 0;
  // the nearest known ore on its own side of the river (it can't build across water) that isn't already by a refinery
  const mySide = Math.sign(hq.x - riverX(hq.y));
  let target = null, td = Infinity;
  for (const o of game.ore) {
    if (o.amount < 100 || !exploredAt(o.x, o.y, 1) || refineries.some(r => Math.hypot(r.x - o.x, r.y - o.y) < 450)) continue;
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

// a new refinery goes as close as it can get to ore it knows about that still has plenty left
function aiPlaceRefinery(hq) {
  const ore = game.ore.filter(o => o.amount > 100 && (exploredAt(o.x, o.y, 1) || Math.hypot(o.x - hq.x, o.y - hq.y) < 600));
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

// towers go near its gate (if it has one) or toward the middle from the HQ
function aiPlaceTower(hq) {
  const gate = game.ents.find(e => e.type === 'gate' && e.team === 1);
  if (gate) {
    for (let tries = 0; tries < 30; tries++) {
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
      const x = gate.x + Math.cos(a) * d, y = gate.y + Math.sin(a) * d;
      if (Math.hypot(x - hq.x, y - hq.y) > Math.hypot(gate.x - hq.x, gate.y - hq.y)) continue;   // stay on the inside of the wall
      if (placeBuilding(1, 'tower', x, y)) return true;
    }
  }
  return aiPlace(hq, 'tower');
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
  const vw = Math.min(W - vx, scr.w / s + 2), vh = Math.min(H - vy, scr.h / s + 2);
  if (vw > 0 && vh > 0) ctx.drawImage(bg, vx, vy, vw, vh, vx, vy, vw, vh);

  for (const o of game.ore) if (exploredAt(o.x, o.y)) drawOre(o);

  const sel = game.selected;
  const ents = game.ents.filter(canSee).sort((a, b) => (isBuilding(b) - isBuilding(a)) || a.y - b.y);
  for (const e of ents) {
    if (sel.has(e.id)) drawSelection(e);
    if (e.type === 'hq') drawHQ(e);
    else if (e.type === 'barracks') drawBarracks(e);
    else if (e.type === 'refinery') drawRefinery(e);
    else if (e.type === 'tower') drawTower(e);
    else if (e.type === 'power') drawPower(e);
    else if (e.type === 'wall') drawWall(e);
    else if (e.type === 'gate') drawGate(e);
    else if (e.type === 'settler') drawSettler(e);
    else if (e.type === 'extractor') drawExtractor(e);
    else if (e.type === 'buggy') drawBuggy(e);
    else if (e.type === 'grenadier' || e.type === 'engineer') drawSoldier(e);
    else if (e.type === 'factory') drawFactory(e);
    else drawSoldier(e);
  }
  for (const e of ents) if (sel.has(e.id) || e.hp < e.maxHp) drawHealth(e);
  for (const e of ents) if (sel.has(e.id) && isBuilding(e)) drawNameTag(e);
  for (const e of ents) if (sel.has(e.id) && e.type === 'tower') drawRange(e.x, e.y, STATS.tower.range);

  for (const fx of game.effects) {
    if (fx.kind !== 'marker' && fx.kind !== 'text' && !visibleAt(fx.x, fx.y)) continue;
    if (fx.kind === 'shot') {
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

  // grenades in flight: a little ball on an arc
  for (const g of game.grenades) {
    const k = g.t / g.dur, x = g.x0 + (g.x - g.x0) * k, y = g.y0 + (g.y - g.y0) * k - Math.sin(k * Math.PI) * 28;
    if (!visibleAt(x, y + Math.sin(k * Math.PI) * 28)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(g.x0 + (g.x - g.x0) * k, g.y0 + (g.y - g.y0) * k, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d4a2a'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
  }

  // fog on top of the world
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(fogCanvas, 0, 0, COLS, ROWS, 0, 0, W, H);

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
  const type = game.placing.type, size = STATS[type].size;
  const extra = isWallType(type) ? WALL_REACH : 0;
  const areas = buildAreaSources(0);
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
  if (type === 'tower') drawRange(g.x, g.y, STATS.tower.range);
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

function drawHealth(e) {
  const w = isBuilding(e) ? halfX(e) * 2 : e.r * 2.6;
  const top = isBuilding(e) ? e.y - halfY(e) - 10 : e.y - e.r - 9;
  const k = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, top - 1, w + 2, 6);
  ctx.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillRect(e.x - w / 2, top, w * k, 4);
  if (e.type === 'extractor' && e.cargo > 0) {
    const c = e.cargo / STATS.extractor.capacity;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, top + 5, w + 2, 5);
    ctx.fillStyle = '#ffd86b'; ctx.fillRect(e.x - w / 2, top + 6, w * c, 3);
  }
}

function drawSettler(e) {
  const c = TEAMS[e.team];
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-15, -9, 32, 22);
  ctx.fillStyle = '#2b2b2b';
  for (const [wx, wy] of [[-10, -11], [8, -11], [-10, 9], [8, 9]]) ctx.fillRect(wx, wy, 7, 4);
  ctx.fillStyle = c.color; ctx.fillRect(-16, -10, 24, 20);
  ctx.fillStyle = c.dark; ctx.fillRect(8, -8, 9, 16);
  ctx.fillStyle = '#cfe8ff'; ctx.fillRect(12, -6, 3, 12);
  ctx.fillStyle = c.light; ctx.fillRect(-12, -6, 14, 12);
  ctx.restore();
}

function drawExtractor(e) {
  const c = TEAMS[e.team];
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-14, -9, 32, 22);
  ctx.fillStyle = '#2b2b2b';
  for (const [wx, wy] of [[-12, -12], [-2, -12], [8, -12], [-12, 9], [-2, 9], [8, 9]]) ctx.fillRect(wx, wy, 7, 4);
  ctx.fillStyle = '#b8902a'; ctx.fillRect(-16, -10, 22, 20);           // ore hopper
  const fill = e.cargo / STATS.extractor.capacity;
  ctx.fillStyle = '#f5dc72'; ctx.fillRect(-14, 8 - 16 * fill, 18, 16 * fill);
  ctx.fillStyle = c.color; ctx.fillRect(6, -9, 11, 18);                // cab
  ctx.fillStyle = '#cfe8ff'; ctx.fillRect(12, -6, 3, 12);
  ctx.fillStyle = c.dark; ctx.fillRect(-16, -10, 22, 3); ctx.fillRect(-16, 7, 22, 3);
  if (e.mining) {   // spinning drill
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
    const a = performance.now() / 60;
    ctx.beginPath(); ctx.moveTo(18 + Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(18 - Math.cos(a) * 5, -Math.sin(a) * 5); ctx.stroke();
  }
  ctx.restore();
  if (e.team === 0 && !e.order) {   // "!" when idle so you notice it
    ctx.fillStyle = e.outOfOre ? '#ff9b3d' : '#ffd86b'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x, e.y - e.r - 14);
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
  ctx.fillStyle = kind === 'engineer' ? '#7a5a32' : kind === 'grenadier' ? '#3f4a2c' : '#4b4f30';
  ctx.fillRect(-9, -4.5, 5, 9);
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
  } else if (kind === 'engineer') {
    // spanner in hand (it bobs while repairing)
    const wob = e.working ? Math.sin(performance.now() / 70) * 0.5 : 0;
    ctx.save(); ctx.translate(4, 4.5); ctx.rotate(wob);
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, -1); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, -1, 2.2, -2.2, 2.2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#e0b48a'; ctx.beginPath(); ctx.arc(4, 4.6, 2, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(0.5, 0, 5.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b8901c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(5.5, 0); ctx.stroke();
    ctx.fillStyle = c.color; ctx.fillRect(-1, -4.6, 3, 9.2);
  } else {
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.arc(0.5, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (kind === 'grenadier') { ctx.fillStyle = '#f2c230'; ctx.fillRect(-0.6, -4.8, 2.2, 9.6); }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(-0.5, -1.5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // muzzle flash right after a rifle shot
  if (kind === 'soldier' && e.cooldown > STATS.soldier.cooldown - 0.07) {
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.arc(e.x + Math.cos(e.facing) * 17, e.y + Math.sin(e.facing) * 17, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
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

function drawHQ(e) {
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = performance.now() / 1000;
  // concrete pad
  ctx.fillStyle = '#9a958a'; ctx.fillRect(x0 - 4, y0 - 4, e.size + 8, e.size + 8);
  // main command building
  block(x0 + 6, y0 + 10, e.size - 12, e.size - 18, '#7d786c', '#4e4a42', 16);
  ctx.fillStyle = c.color; ctx.fillRect(x0 + 6, y0 + 10, e.size - 12, 7);             // team roof trim
  // windows along the front wall
  ctx.fillStyle = '#a9d4ff';
  for (const i of [0, 1, 3, 4]) ctx.fillRect(x0 + 14 + i * 14, y0 + e.size - 20, 8, 5);
  frontApron(e, 30);
  ctx.fillStyle = '#2a2824'; ctx.fillRect(e.x - 8, y0 + e.size - 22, 16, 14);
  ctx.fillStyle = c.color; ctx.fillRect(e.x - 10, y0 + e.size - 24, 20, 2);
  // dome with a star
  emblemPlate(e.x - 6, e.y - 4, 17, e.team);
  star(e.x - 6, e.y - 4, 11, '#fff');
  // rotating radar dish
  const rx = x0 + e.size - 20, ry = y0 + 24;
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(rx, ry); ctx.rotate(t * 1.5);
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 10, -0.9, 0.9); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.restore();
  // antenna with blinking light
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0 + e.size - 20, y0 + 52); ctx.lineTo(x0 + e.size - 20, y0 + 38); ctx.stroke();
  if (Math.floor(t * 2) % 2) { ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(x0 + e.size - 20, y0 + 37, 2.5, 0, Math.PI * 2); ctx.fill(); }
  flag(x0 + 4, y0 + 4, e.team);
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

function drawTower(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2;
  // sandbagged base
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(e.x + 4, e.y + 5, h, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c2ad7c'; ctx.strokeStyle = '#7d6c45'; ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(e.x + Math.cos(a) * (h - 5), e.y + Math.sin(a) * (h - 5), 6, 4, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#6f6a5e'; ctx.beginPath(); ctx.arc(e.x, e.y, h - 10, 0, Math.PI * 2); ctx.fill();
  // turret that turns toward its target
  const a = e.aim !== undefined ? e.aim : -Math.PI / 2;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(4, -3, 22, 6);                       // barrel
  if (e.cooldown > STATS.tower.cooldown - 0.08) { ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(28, 0, 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
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
      ctx.beginPath(); ctx.moveTo(e.x + ox, e.y + oy); ctx.lineTo(e.x + ox + dc * TC / 2, e.y + oy + dr * TC / 2); ctx.stroke();
    }
    ctx.fillStyle = pass ? '#b3aea2' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(e.x - 8 + ox, e.y - 8 + oy, 16, 16);
  }
  ctx.strokeStyle = '#6f6a60'; ctx.lineWidth = 1; ctx.strokeRect(e.x - 8, e.y - 8, 16, 16);
  ctx.fillStyle = TEAMS[e.team].color; ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
}

function drawGate(e) {
  const c = TEAMS[e.team];
  // opens when one of its own units is close
  const near = game.ents.some(u => u.team === e.team && isUnit(u) && Math.abs(u.x - e.x) < 55 && Math.abs(u.y - e.y) < 55);
  e.openK = Math.max(0, Math.min(1, (e.openK || 0) + (near ? 0.08 : -0.05)));
  const k = e.openK, L = TC, T = TC / 2;   // half-length along the wall, half-thickness
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

function drawPower(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2, x0 = e.x - h, y0 = e.y - h, t = performance.now() / 1000;
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

function drawRange(x, y, r) {
  ctx.strokeStyle = 'rgba(255,233,160,0.55)'; ctx.fillStyle = 'rgba(255,233,160,0.06)';
  ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
}

// name tag under a selected building
function drawNameTag(e) {
  const txt = NAMES[e.type];
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  const w = ctx.measureText(txt).width + 12, y = e.y - halfY(e) - 32;   // above the health bar, clear of the door
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - w / 2, y, w, 17);
  ctx.fillStyle = '#fff'; ctx.fillText(txt, e.x, y + 13);
}

// ---------- Input: drag to scroll, pinch to zoom, tap to select / command ----------
const input = { pointers: new Map(), mode: null, sx: 0, sy: 0, camX: 0, camY: 0, pinch: null, box: null, boxMode: false };

const inMinimap = (x, y) => !MM.hidden && x >= MM.x && x <= MM.x + MM.w && y >= MM.y && y <= MM.y + MM.h;
function minimapJump(x, y) {
  cam.x = (x - MM.x) / MM.w * W; cam.y = (y - MM.y) / MM.h * H; clampCam();
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
    if (!canSee(e)) continue;
    const d = edgeDist(x, y, e);
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
  if (p && p.ghost && placeBuilding(0, p.type, p.ghost.x, p.ghost.y, p.ghost.vertical)) game.placing = null;
}

function handleTap(x, y) {
  if (game.paused) return;

  if (game.placing && game.placing.type === 'wall') { wallTap(x, y); return; }
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
  if (hit && hit.team === 0) {
    // engineers selected + one of your damaged buildings tapped = repair it
    if (engineers.length && isBuilding(hit) && !isWallType(hit.type) && hit.hp < hit.maxHp) {
      for (const en of engineers) en.order = { type: 'repair', target: hit.id };
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#7dff7d' });
      return;
    }
    game.selected = new Set([hit.id]);
    return;
  }

  if (hit && hit.team === 1) {
    const soldiers = myUnits.filter(isCombat);
    for (const s of soldiers) s.order = { type: 'attack', target: hit.id };
    if (engineers.length && canCapture(hit)) {
      // send the nearest engineer in to capture it; any others follow along as backups
      engineers.sort((a, b) => Math.hypot(a.x - hit.x, a.y - hit.y) - Math.hypot(b.x - hit.x, b.y - hit.y));
      for (const en of engineers) en.order = { type: 'capture', target: hit.id };
    }
    if (soldiers.length || engineers.length) game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#ff6b6b' });
    return;
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

function groupMove(units, x, y) {
  const cols = Math.ceil(Math.sqrt(units.length)), rows = Math.ceil(units.length / cols);
  units.forEach((u, i) => {
    const gx = (i % cols) - (cols - 1) / 2, gy = Math.floor(i / cols) - (rows - 1) / 2;
    u.order = { type: 'move', x: x + gx * 26, y: y + gy * 26 };
    if (u.type === 'extractor') u.outOfOre = false;
  });
  game.effects.push({ kind: 'marker', x, y, t: 0 });
}

const selectedOfType = type => [...game.selected].map(byId).filter(e => e && e.team === 0 && e.type === type);

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const ui = {
  credits: $('credits'), info: $('info'), powerChip: $('powerChip'),
  deploy: $('btnDeploy'), barracks: $('btnBarracks'), refinery: $('btnRefinery'), tower: $('btnTower'), power: $('btnPower'), factory: $('btnFactory'), wall: $('btnWall'), gate: $('btnGate'), rotate: $('btnRotate'), 
  harvest: $('btnHarvest'), place: $('btnPlace'), cancel: $('btnCancel'), deselect: $('btnDeselect'),
  box: $('btnBox'), all: $('btnAll'), pause: $('btnPause'), map: $('btnMap'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovBtn: $('ovBtn'),
};
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
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
ui.tower.addEventListener('click', () => startPlacing('tower'));
ui.power.addEventListener('click', () => startPlacing('power'));
ui.factory.addEventListener('click', () => startPlacing('factory'));
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
// build buttons show the real price from COST, so labels can never drift from what you're charged
for (const [btn, type, label] of [[ui.barracks, 'barracks', 'Barracks'], [ui.refinery, 'refinery', 'Refinery'], [ui.factory, 'factory', 'War Factory'],
  [ui.power, 'power', 'Power Plant'], [ui.tower, 'tower', 'Tower'], [ui.wall, 'wall', 'Wall'], [ui.gate, 'gate', 'Gate']]) btn.textContent = `${label} $${COST[type]}`;
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
const pm = { menu: $('pauseMenu'), resume: $('pmResume'), restart: $('pmRestart'), notes: $('pmNotes') };
let restartArmed = false;
function setPaused(on) {
  game.paused = on;
  ui.pause.textContent = on ? '▶' : '❚❚';
  pm.menu.style.display = on ? 'flex' : 'none';
  restartArmed = false; pm.restart.textContent = 'Restart'; pm.restart.classList.remove('danger');
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
$('mapInfo').textContent = mapChoice === 'large'
  ? 'Large: room to expand, extra ore fields on each side. Longer games.'
  : 'Classic: the original smaller map. Quicker games.';

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

function updateHUD() {
  ui.credits.textContent = '$' + Math.floor(game.credits[0]);
  ui.box.classList.toggle('on', input.boxMode);
  ui.map.classList.toggle('on', !MM.hidden);

  const sel = [...game.selected].map(byId).filter(Boolean);
  const one = t => sel.find(e => e.type === t);
  const settler = one('settler'), hq = one('hq'), producer = sel.find(e => PRODUCES[e.type]);
  const extractors = sel.filter(e => e.type === 'extractor'), soldiers = sel.filter(e => e.type === 'soldier'), buggies = sel.filter(e => e.type === 'buggy');
  const placing = game.placing;

  show(ui.deploy, !!settler && !placing);
  show(ui.barracks, !!hq && !placing);
  show(ui.refinery, !!hq && !placing);
  show(ui.factory, FACTORY_ENABLED && !!hq && !placing);
  show(ui.tower, !!hq && !placing);
  show(ui.power, !!hq && !placing);
  show(ui.wall, !!hq && !placing);
  show(ui.gate, !!hq && !placing);
  syncProduceButtons(producer && !placing ? producer.type : null);
  show(ui.harvest, extractors.length > 0 && !placing);
  show(ui.place, !!(placing && (placing.ghost || (placing.type === 'wall' && placing.anchor))));
  show(ui.cancel, !!placing);
  show(ui.rotate, !!(placing && placing.type === 'gate'));
  show(ui.deselect, sel.length > 0 && !placing);

  ui.barracks.disabled = game.credits[0] < COST.barracks;
  ui.refinery.disabled = game.credits[0] < COST.refinery;
  ui.tower.disabled = game.credits[0] < COST.tower;
  ui.power.disabled = game.credits[0] < COST.power;
  const boost = powerBoost(0);
  ui.powerChip.style.display = boost > 1 ? '' : 'none';
  ui.powerChip.textContent = `⚡ +${Math.round((boost - 1) * 100)}%`;
  ui.factory.disabled = game.credits[0] < COST.factory;
  ui.wall.disabled = game.credits[0] < COST.wall;
  ui.gate.disabled = game.credits[0] < COST.gate;
  const wallMode = placing && placing.type === 'wall';
  ui.cancel.textContent = wallMode ? 'Done' : 'Cancel';
  ui.place.textContent = wallMode ? 'Build wall' : 'Place here';
  if (placing && placing.ghost && placing.type === 'gate') ui.place.disabled = !canPlaceWallPiece(0, 'gate', placing.ghost.x, placing.ghost.y, placing.ghost.vertical) || game.credits[0] < COST.gate;
  else if (placing && placing.ghost) ui.place.disabled = !canPlace(0, placing.type, placing.ghost.x, placing.ghost.y) || game.credits[0] < COST[placing.type];
  else if (placing) ui.place.disabled = false;
  if (producer) {
    for (const btn of produceBox.children) {
      const unit = btn.dataset.unit;
      btn.disabled = !producer.built || producer.queue >= STATS[producer.type].maxQueue || game.credits[0] < COST[unit];
    }
  }

  let text;
  if (flash && performance.now() - flash.t < 2500) text = flash.text;
  else if (game.paused) text = 'Paused';
  else if (placing && placing.type === 'wall') text = !placing.anchor ? 'Tap where the wall starts' : placing.end ? 'Tap the end again to build (or Build wall)' : 'Tap where the wall ends (or tap the start again for one piece)';
  else if (placing) text = placing.ghost ? 'Tap the square again (or Place here) to build' : `Tap inside the green area to place your ${NAMES[placing.type].toLowerCase()}`;
  else if (settler) text = 'Settler — move somewhere open, then Deploy';
  else if (hq) text = 'Headquarters';
  else if (sel.length === 1 && sel[0].type === 'gate') text = 'Gate — opens for your units, enemies must destroy it';
  else if (sel.length === 1 && sel[0].type === 'wall') text = 'Wall';
  else if (sel.length === 1 && sel[0].type === 'power') text = sel[0].built
    ? `Power Plant — you build ${Math.round((powerBoost(0) - 1) * 100)}% faster${powerBoost(0) >= POWER_MAX ? ' (max)' : ''}`
    : `Power Plant: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (sel.length === 1 && sel[0].type === 'tower') text = sel[0].built ? 'Guard Tower — fires at enemies in range' : `Guard Tower: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (producer) text = producer.built ? `${NAMES[producer.type]}${producer.queue ? ' — making ×' + producer.queue : ''}` : `${NAMES[producer.type]}: ${Math.floor(producer.progress * 100)}% built`;
  else if (extractors.length === 1 && sel.length === 1) text = extractorStatus(extractors[0]);
  else if (sel.length === 1 && sel[0].type === 'engineer') {
    const o = sel[0].order;
    text = o && o.type === 'repair' ? 'Engineer: repairing' : o && o.type === 'capture' ? 'Engineer: going in to capture' : 'Engineer — tap your damaged building to repair, or an enemy building to capture';
  } else if (sel.length) {
    const counts = {};
    for (const e of sel) counts[e.type] = (counts[e.type] || 0) + 1;
    const plural = { soldier: 'soldiers', buggy: 'buggies', extractor: 'extractors', grenadier: 'grenadiers', engineer: 'engineers', settler: 'settlers' };
    const parts = Object.entries(counts).map(([t, n]) => `${n} ${n > 1 ? plural[t] || t + 's' : (SHORT[t] || NAMES[t]).toLowerCase()}`);
    text = parts.join(', ') + ' — tap to move';
  } else text = hqOf(0) ? 'Drag to scroll, pinch to zoom' : 'Tap your settler to begin';
  ui.info.textContent = text;
}

function endGame(won) {
  game.over = won ? 'win' : 'lose';
  game.selected.clear(); game.placing = null;
  ui.ovTitle.textContent = won ? 'Victory!' : 'Defeat';
  ui.ovText.textContent = won ? 'You wiped out the enemy base.' : 'Your forces have been destroyed.';
  ui.ovBtn.textContent = 'Play again';
  ui.overlay.style.display = 'flex';
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
newGame();
game.paused = true;
ui.ovText.innerHTML = 'Deploy your settler, build a <b>Refinery</b> for ore and a <b>Barracks</b> for soldiers, and fight for the big ore field in the middle.<br>Drag to scroll · pinch to zoom · best in landscape.';
ui.overlay.style.display = 'flex';
requestAnimationFrame(frame);
