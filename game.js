// Mini RTS — version 2
// You (blue) vs the computer (red) on a large map with fog of war.
// Settler -> deploys into a Headquarters.
// HQ builds Barracks (trains Soldiers) and Refinery (builds Extractors).
// Extractors collect Ore and bring it back to a Refinery for credits.
// Destroy everything the enemy owns to win.

'use strict';

// ---------- Settings (tweak these to balance the game) ----------
const W = 2400, H = 1500;             // map size in world units
const CELL = 50;                      // fog-of-war grid size
const COLS = W / CELL, ROWS = H / CELL;
const START_CREDITS = 1000;
const INCOME = 1;                     // small trickle per second so nobody gets stuck at $0
const BUILD_RADIUS = 300;             // how far from your HQ you can place buildings

const COST = { barracks: 300, refinery: 400, soldier: 100, extractor: 150 };

const STATS = {
  settler:   { hp: 200, speed: 38, r: 16, sight: 180 },
  soldier:   { hp: 60,  speed: 52, r: 9,  sight: 170, range: 90, dmg: 8, cooldown: 0.8 },
  extractor: { hp: 300, speed: 34, r: 15, sight: 150, capacity: 150, rate: 30, unloadTime: 1.5 },
  hq:        { hp: 900, size: 92, sight: 280 },
  barracks:  { hp: 500, size: 74, sight: 200, buildTime: 10, trainTime: 4, maxQueue: 5 },
  refinery:  { hp: 600, size: 84, sight: 200, buildTime: 12, trainTime: 6, maxQueue: 3 },
};
const PRODUCES = { barracks: 'soldier', refinery: 'extractor' };
const NAMES = { settler: 'Settler', soldier: 'Soldier', extractor: 'Extractor', hq: 'Headquarters', barracks: 'Barracks', refinery: 'Refinery' };

const TEAMS = [
  { name: 'You',   color: '#3b82f6', dark: '#1d3f8f', light: '#93c5fd' },
  { name: 'Enemy', color: '#ef4444', dark: '#8f1d1d', light: '#fca5a5' },
];
const START = [{ x: 230, y: H - 230 }, { x: W - 230, y: 230 }];

// ore fields: a small one by each base, a big rich one in the middle, two on the flanks
const ORE_FIELDS = [
  { x: 600, y: H - 330, nodes: 7, amount: 300, spread: 90 },
  { x: W - 600, y: 330, nodes: 7, amount: 300, spread: 90 },
  { x: W / 2, y: H / 2, nodes: 14, amount: 500, spread: 160 },
  { x: 640, y: 380, nodes: 8, amount: 400, spread: 110 },
  { x: W - 640, y: H - 380, nodes: 8, amount: 400, spread: 110 },
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
function setZoom(z) { cam.zoom = Math.min(2.2, Math.max(0.45, z)); }

const toWorld = (sx, sy) => { const s = scale(); return { x: (sx - scr.w / 2) / s + cam.x, y: (sy - scr.h / 2) / s + cam.y }; };

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

// ---------- Background (drawn once) ----------
const bg = document.createElement('canvas');
(function drawBackground() {
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');
  b.fillStyle = '#4a6b35'; b.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) {
    b.fillStyle = rnd() < 0.5 ? 'rgba(30,50,20,0.18)' : 'rgba(120,150,80,0.15)';
    b.beginPath(); b.arc(rnd() * W, rnd() * H, 6 + rnd() * 30, 0, Math.PI * 2); b.fill();
  }
  // a few rocky / dry patches for variety
  for (let i = 0; i < 14; i++) {
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

// ---------- Game state ----------
let game;

function newGame() {
  game = {
    ents: [], ore: [], nextId: 1, time: 0,
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
    if (type === 'hq') { e.built = true; e.progress = 1; }
    else { e.built = false; e.progress = 0; e.hp = s.hp * 0.1; }
    e.queue = 0; e.trainT = 0;
  } else {
    e.r = s.r;
    if (type === 'extractor') e.cargo = 0;
  }
  game.ents.push(e);
  return e;
}

function isBuildingType(t) { return t === 'hq' || t === 'barracks' || t === 'refinery'; }
const isBuilding = e => isBuildingType(e.type);
const isUnit = e => !isBuilding(e);
const byId = id => game.ents.find(e => e.id === id);
const oreById = id => game.ore.find(o => o.id === id);
const hqOf = team => game.ents.find(e => e.team === team && e.type === 'hq');

// distance from a point to the edge of an entity
function edgeDist(x, y, t) {
  if (isBuilding(t)) {
    const h = t.size / 2;
    const dx = Math.max(Math.abs(x - t.x) - h, 0), dy = Math.max(Math.abs(y - t.y) - h, 0);
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
  if (e.type !== 'soldier' || e.revealT > 0 || terrainAt(e.x, e.y) !== T.FOREST) return false;
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

function canPlace(team, type, x, y) {
  const hq = hqOf(team);
  return !!hq && edgeDist(x, y, hq) <= BUILD_RADIUS && siteIsFree(x, y, STATS[type].size);
}

function placeBuilding(team, type, x, y) {
  if (game.credits[team] < COST[type] || !canPlace(team, type, x, y)) return false;
  game.credits[team] -= COST[type];
  spawn(type, team, x, y);
  return true;
}

function produce(b) {
  const unit = PRODUCES[b.type];
  if (!unit || !b.built || b.queue >= STATS[b.type].maxQueue || game.credits[b.team] < COST[unit]) return false;
  game.credits[b.team] -= COST[unit];
  b.queue++;
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
  if (!o) return;
  if (o.type === 'move') { if (navigate(e, o.x, o.y, dt)) e.order = null; return; }

  if (o.phase === 'toNode' || o.phase === 'mining') {
    let node = oreById(o.node);
    if (!node || node.amount <= 0) {
      // this patch is used up: look for more ore in the same field
      node = findOre(o.lastX, o.lastY, 260, e.team, false);
      if (!node) {
        if (e.cargo > 0) { o.phase = 'toBase'; o.finish = true; }
        else { e.order = null; e.outOfOre = true; }
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

  if (o.phase === 'toBase') {
    const ref = nearestRefinery(e);
    if (!ref) return;                       // no refinery: wait with the load
    const near = edgeDist(e.x, e.y, ref) <= e.r + 6;
    const arrived = near || navigate(e, ref.x, ref.y, dt);
    if (arrived === true && (near || edgeDist(e.x, e.y, ref) < 40)) { o.phase = 'unloading'; o.t = 0; }
    return;
  }

  if (o.phase === 'unloading') {
    o.t += dt;
    if (o.t >= s.unloadTime) {
      const amount = Math.round(e.cargo);
      game.credits[e.team] += amount; e.cargo = 0;
      if (e.team === 0) game.effects.push({ kind: 'text', x: e.x, y: e.y - 20, text: '+$' + amount, t: 0 });
      if (o.finish) { e.order = null; e.outOfOre = true; } else o.phase = 'toNode';
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
    else if (e.type === 'soldier') updateSoldier(e, dt);
    else if (e.type === 'extractor') updateExtractor(e, dt);
    else if (isBuilding(e)) updateBuilding(e, dt);
  }

  separate();

  for (const e of game.ents) {
    if (e.hp <= 0) {
      game.selected.delete(e.id);
      if (isBuilding(e)) bldDirty = true;
      if (!e.deployed) game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: e.type !== 'soldier' });
    }
  }
  game.ents = game.ents.filter(e => e.hp > 0);
  game.ore = game.ore.filter(o => o.amount > 0);

  for (const fx of game.effects) fx.t += dt;
  game.effects = game.effects.filter(fx => fx.t < (fx.kind === 'shot' ? 0.08 : fx.kind === 'text' ? 1.2 : 0.6));

  runAI(dt);
  updateFog();

  const alive = [0, 1].map(t => game.ents.some(e => e.team === t));
  if (!alive[1]) endGame(true);
  else if (!alive[0]) endGame(false);
}

function findEnemyNear(e, radius) {
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || hiddenFrom(o, e.team)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateSoldier(e, dt) {
  const s = STATS.soldier;
  e.cooldown -= dt;
  e.revealT = (e.revealT || 0) - dt;
  let o = e.order;

  // idle or attack-moving soldiers look for nearby enemies on their own
  if (!o || o.type === 'attackmove') {
    const foe = findEnemyNear(e, s.sight);
    if (foe) { e.order = { type: 'attack', target: foe.id, resume: o }; o = e.order; }
  }
  if (!o) return;

  if (o.type === 'move' || o.type === 'attackmove') {
    if (navigate(e, o.x, o.y, dt)) e.order = null;   // arrived (true) or can't get there ('fail')
  } else if (o.type === 'attack') {
    const t = byId(o.target);
    if (!t || hiddenFrom(t, e.team)) { e.order = o.resume || null; return; }
    if (edgeDist(e.x, e.y, t) > s.range) {
      if (navigate(e, t.x, t.y, dt) === 'fail') e.order = o.resume || null;
    } else {
      e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
        e.revealT = 1.5;   // firing gives away your position
        t.hp -= s.dmg;
        game.effects.push({ kind: 'shot', x: e.x, y: e.y, x2: t.x + (Math.random() - .5) * 8,
                            y2: t.y + (Math.random() - .5) * 8, team: e.team, t: 0 });
        if (t.type === 'soldier' && !t.order) t.order = { type: 'attack', target: e.id };
      }
    }
  }
}

function updateBuilding(e, dt) {
  const s = STATS[e.type];
  if (!e.built) {   // construction happens on its own
    e.progress += dt / s.buildTime;
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.9 * dt / s.buildTime);
    if (e.progress >= 1) {
      e.progress = 1; e.built = true;
      if (e.type === 'refinery') releaseUnit(e);   // every refinery comes with one free extractor
    }
    return;
  }
  if (!PRODUCES[e.type] || e.queue <= 0) return;
  e.trainT += dt;
  if (e.trainT >= s.trainTime) {
    e.trainT = 0; e.queue--;
    releaseUnit(e);
  }
}

// a new unit rolls out of the building's door
function releaseUnit(b) {
  const dir = b.team === 0 ? -1 : 1;
  const u = spawn(PRODUCES[b.type], b.team, b.x, b.y + dir * (b.size / 2 + 16));
  u.order = { type: 'move', x: b.x + (Math.random() - .5) * 80, y: b.y + dir * (b.size / 2 + 45) };
  return u;
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
        a.x -= dx / d * push; a.y -= dy / d * push;
        b.x += dx / d * push; b.y += dy / d * push;
      }
    }
    for (const bld of game.ents) {
      if (!isBuilding(bld)) continue;
      const h = bld.size / 2 + a.r, dx = a.x - bld.x, dy = a.y - bld.y;
      if (Math.abs(dx) < h && Math.abs(dy) < h) {
        if (h - Math.abs(dx) < h - Math.abs(dy)) a.x = bld.x + Math.sign(dx || 1) * h;
        else a.y = bld.y + Math.sign(dy || 1) * h;
      }
    }
    a.x = Math.min(W - a.r, Math.max(a.r, a.x));
    a.y = Math.min(H - a.r, Math.max(a.r, a.y));
  }
  for (const u of units) {
    if (!walkable(terrainAt(u.x, u.y), isVehicle(u))) { u.x = u.px; u.y = u.py; }
  }
}

// ---------- Computer opponent ----------
function aiPlace(hq, type) {
  const toward = Math.atan2(H / 2 - hq.y, W / 2 - hq.x);
  for (let tries = 0; tries < 30; tries++) {
    const a = toward + (Math.random() - 0.5) * 2.6, d = hq.size / 2 + 70 + Math.random() * 170;
    if (placeBuilding(1, type, hq.x + Math.cos(a) * d, hq.y + Math.sin(a) * d)) return true;
  }
  return false;
}

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

function runAI(dt) {
  const ai = game.ai;
  ai.timer -= dt;
  if (ai.timer > 0) return;
  ai.timer = 1;

  const mine = game.ents.filter(e => e.team === 1);
  const of = t => mine.filter(e => e.type === t);
  const settler = of('settler')[0], hq = of('hq')[0];
  const barracks = of('barracks'), refineries = of('refinery'), soldiers = of('soldier'), extractors = of('extractor');
  const cash = game.credits[1];

  // remember any of your buildings it has seen; forget ones it sees are gone
  for (const e of game.ents) if (e.team === 0 && isBuilding(e) && visibleAt(e.x, e.y, 1)) ai.known.set(e.id, { x: e.x, y: e.y });
  for (const [id, k] of ai.known) if (!byId(id) && visibleAt(k.x, k.y, 1)) ai.known.delete(id);

  if (settler && !hq) deploy(settler);

  if (hq) {
    if (refineries.length === 0) aiPlace(hq, 'refinery');
    else if (barracks.length === 0) aiPlace(hq, 'barracks');
    else if (barracks.length < 2 && cash >= 900) aiPlace(hq, 'barracks');
  }

  for (const r of refineries) if (extractors.length + r.queue < 2 * refineries.length && r.queue === 0) produce(r);
  // idle extractors go to ore it knows about, or drive off to look for some
  for (const x of extractors) {
    if (x.order || autoHarvest(x)) continue;
    const spot = aiExploreSpot(x.x, x.y, false);
    if (spot) x.order = { type: 'move', x: spot.x, y: spot.y };
  }

  const reserve = extractors.length < 2 && refineries.length ? COST.extractor : 0;
  for (const b of barracks) if (b.queue < 2 && game.credits[1] >= COST.soldier + reserve) produce(b);

  // targets = your things it can see right now + buildings it remembers
  const targets = game.ents.filter(e => e.team === 0 && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1)).map(e => ({ x: e.x, y: e.y }));
  for (const k of ai.known.values()) targets.push(k);

  // send one soldier out to scout until it has found your base
  const scout = ai.scout && byId(ai.scout);
  if (!ai.known.size && soldiers.length && !ai.attacking) {
    const sc = scout || soldiers[0];
    ai.scout = sc.id;
    if (!sc.order) { const spot = aiExploreSpot(sc.x, sc.y, true); if (spot) sc.order = { type: 'move', x: spot.x, y: spot.y }; }
  } else if (scout && ai.known.size && !ai.attacking && hq) {
    // found you: the scout runs home to report instead of fighting alone
    scout.order = { type: 'move', x: hq.x - 120, y: hq.y + 120 };
    ai.scout = null;
  }

  if (soldiers.length >= 6) ai.attacking = true;
  if (soldiers.length < 2) ai.attacking = false;

  if (ai.attacking) {
    if (!targets.length && (!ai.exploreTarget || exploredAt(ai.exploreTarget.x, ai.exploreTarget.y, 1))) {
      ai.exploreTarget = hq ? aiExploreSpot(hq.x, hq.y, true) : null;
    }
    for (const s of soldiers) {
      if (s.order) continue;
      let best = null, bestD = Infinity;
      for (const t of targets) { const d = Math.hypot(t.x - s.x, t.y - s.y); if (d < bestD) { bestD = d; best = t; } }
      best = best || ai.exploreTarget;
      if (best) s.order = { type: 'attackmove', x: best.x, y: best.y };
    }
  }
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
    else if (e.type === 'settler') drawSettler(e);
    else if (e.type === 'extractor') drawExtractor(e);
    else drawSoldier(e);
  }
  for (const e of ents) if (sel.has(e.id) || e.hp < e.maxHp) drawHealth(e);

  for (const fx of game.effects) {
    if (fx.kind !== 'marker' && fx.kind !== 'text' && !visibleAt(fx.x, fx.y)) continue;
    if (fx.kind === 'shot') {
      ctx.strokeStyle = fx.team === 0 ? '#dbeafe' : '#fee2e2'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    } else if (fx.kind === 'boom') {
      const k = fx.t / 0.6, r = (fx.big ? 50 : 18) * (0.4 + k);
      ctx.fillStyle = `rgba(255,${160 - 100 * k | 0},40,${1 - k})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'marker') {
      const k = fx.t / 0.6;
      ctx.strokeStyle = fx.color || `rgba(120,255,120,${1 - k})`; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 6 + 14 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (fx.kind === 'text') {
      const k = fx.t / 1.2;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(fx.text, fx.x, fx.y - 25 * k); ctx.globalAlpha = 1;
    }
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

  drawMinimap();
}

function drawPlacement() {
  const hq = hqOf(0), type = game.placing.type, size = STATS[type].size;
  if (hq) {
    ctx.fillStyle = 'rgba(125,255,125,0.07)'; ctx.strokeStyle = 'rgba(125,255,125,0.55)';
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hq.x, hq.y, hq.size / 2 + BUILD_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
  }
  const g = game.placing.ghost;
  if (!g) return;
  const ok = canPlace(0, type, g.x, g.y) && game.credits[0] >= COST[type];
  ctx.fillStyle = ok ? 'rgba(80,255,80,0.3)' : 'rgba(255,60,60,0.3)';
  ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
  ctx.fillRect(g.x - size / 2, g.y - size / 2, size, size);
  ctx.strokeRect(g.x - size / 2, g.y - size / 2, size, size);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(ok ? 'Tap again to build' : "Can't build here", g.x, g.y + 5);
}

function drawMinimap() {
  const { dpr } = scr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = MM.w / W;
  ctx.fillStyle = '#000'; ctx.fillRect(MM.x - 2, MM.y - 2, MM.w + 4, MM.h + 4);
  ctx.drawImage(bg, 0, 0, W, H, MM.x, MM.y, MM.w, MM.h);
  ctx.fillStyle = '#e6c34a';
  for (const o of game.ore) if (exploredAt(o.x, o.y)) ctx.fillRect(MM.x + o.x * k - 1.5, MM.y + o.y * k - 1.5, 3, 3);
  for (const e of game.ents) {
    if (!canSee(e)) continue;
    ctx.fillStyle = TEAMS[e.team].color;
    const sz = isBuilding(e) ? 6 : 3;
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
    const h = e.size / 2 + 5;
    ctx.strokeRect(e.x - h, e.y - h, h * 2, h * 2);
  } else {
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.5, e.r + 5, (e.r + 5) * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawHealth(e) {
  const w = isBuilding(e) ? e.size : e.r * 2.6;
  const top = isBuilding(e) ? e.y - e.size / 2 - 10 : e.y - e.r - 9;
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

function drawSoldier(e) {
  const c = TEAMS[e.team];
  const hidden = e.team === 0 && hiddenFrom(e, 1);   // your soldier is hidden in a forest
  if (hidden) ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 4, e.r, e.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + Math.cos(e.facing) * (e.r + 7), e.y + Math.sin(e.facing) * (e.r + 7)); ctx.stroke();
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.light;
  ctx.beginPath(); ctx.arc(e.x - 2, e.y - 2, e.r * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
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
  const h = e.size / 2, k = e.trainT / STATS[e.type].trainTime;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - h, e.y + h + 4, e.size, 6);
  ctx.fillStyle = '#ffd86b'; ctx.fillRect(e.x - h, e.y + h + 4, e.size * k, 6);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('×' + e.queue, e.x, e.y + h + 22);
}

function drawHQ(e) {
  const c = TEAMS[e.team], h = e.size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 6, e.y - h + 7, e.size, e.size);
  ctx.fillStyle = '#8a8476'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.fillStyle = '#5f5a4f'; ctx.fillRect(e.x - h + 5, e.y - h + 5, e.size - 10, e.size - 10);
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(e.x, e.y, h * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(e.x, e.y, h * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('HQ', e.x, e.y + 6);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(e.x + h - 14, e.y - h + 14, 8, Math.PI * 0.8, Math.PI * 1.9); ctx.stroke();
  for (const [cx, cy] of [[-1, -1], [1, 1], [-1, 1]]) {
    ctx.fillStyle = c.color; ctx.fillRect(e.x + cx * (h - 10) - 4, e.y + cy * (h - 10) - 4, 8, 8);
  }
}

function drawBarracks(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 5, e.y - h + 6, e.size, e.size);
  ctx.fillStyle = '#7a7466'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.fillStyle = c.dark; ctx.fillRect(e.x - h + 6, e.y - h + 6, e.size - 12, e.size - 12);
  ctx.fillStyle = c.color;
  for (let i = 0; i < 3; i++) ctx.fillRect(e.x - h + 10, e.y - h + 12 + i * 18, e.size - 20, 9);
  const dir = e.team === 0 ? -1 : 1;
  ctx.fillStyle = '#222'; ctx.fillRect(e.x - 9, dir < 0 ? e.y - h : e.y + h - 8, 18, 8);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(e.x + h - 8, e.y - h + 4); ctx.lineTo(e.x + h - 8, e.y - h - 18); ctx.stroke();
  ctx.fillStyle = c.color; ctx.fillRect(e.x + h - 8, e.y - h - 18, 14, 9);
  drawQueue(e);
}

function drawRefinery(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], h = e.size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 5, e.y - h + 6, e.size, e.size);
  ctx.fillStyle = '#7f7a6c'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  // unloading pad
  ctx.fillStyle = '#5a5548'; ctx.fillRect(e.x - h + 6, e.y + 4, e.size - 12, h - 10);
  ctx.strokeStyle = '#e6c34a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  ctx.strokeRect(e.x - h + 9, e.y + 7, e.size - 18, h - 16); ctx.setLineDash([]);
  // silos
  for (const sx of [-h * 0.45, h * 0.45]) {
    ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(e.x + sx, e.y - h * 0.4, h * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(e.x + sx, e.y - h * 0.4, h * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6c34a'; ctx.beginPath(); ctx.arc(e.x + sx, e.y - h * 0.4, h * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  drawQueue(e);
}

// ---------- Input: drag to scroll, pinch to zoom, tap to select / command ----------
const input = { pointers: new Map(), mode: null, sx: 0, sy: 0, camX: 0, camY: 0, pinch: null, box: null, boxMode: false };

const inMinimap = (x, y) => x >= MM.x && x <= MM.x + MM.w && y >= MM.y && y <= MM.y + MM.h;
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
    game.placing.ghost = toWorld(ev.clientX, ev.clientY);
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

function tryPlace() {
  const p = game.placing;
  if (p && p.ghost && placeBuilding(0, p.type, p.ghost.x, p.ghost.y)) game.placing = null;
}

function handleTap(x, y) {
  if (game.paused) return;

  if (game.placing) {
    const g = game.placing.ghost, h = STATS[game.placing.type].size / 2;
    if (g && Math.abs(x - g.x) < h && Math.abs(y - g.y) < h) tryPlace();
    else game.placing.ghost = { x, y };
    return;
  }

  const hit = hitTest(x, y);
  const myUnits = [...game.selected].map(byId).filter(e => e && e.team === 0 && isUnit(e));

  if (hit && hit.team === 0) { game.selected = new Set([hit.id]); return; }

  if (hit && hit.team === 1) {
    const soldiers = myUnits.filter(e => e.type === 'soldier');
    if (soldiers.length) {
      for (const s of soldiers) s.order = { type: 'attack', target: hit.id };
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0, color: '#ff6b6b' });
    }
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
  credits: $('credits'), info: $('info'),
  deploy: $('btnDeploy'), barracks: $('btnBarracks'), refinery: $('btnRefinery'), produce: $('btnProduce'),
  harvest: $('btnHarvest'), place: $('btnPlace'), cancel: $('btnCancel'), deselect: $('btnDeselect'),
  box: $('btnBox'), all: $('btnAll'), pause: $('btnPause'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovBtn: $('ovBtn'),
};
const show = (el, on) => { el.style.display = on ? '' : 'none'; };
let flash = null;   // temporary message in the info box

function startPlacing(type) {
  const hq = hqOf(0);
  if (!hq) return;
  game.placing = { type, ghost: null };
  cam.x = hq.x; cam.y = hq.y; clampCam();
}

ui.deploy.addEventListener('click', () => {
  const st = selectedOfType('settler')[0];
  if (st && !deploy(st)) flash = { text: 'No room here — move the settler first', t: performance.now() };
});
ui.barracks.addEventListener('click', () => startPlacing('barracks'));
ui.refinery.addEventListener('click', () => startPlacing('refinery'));
ui.place.addEventListener('click', tryPlace);
ui.cancel.addEventListener('click', () => { game.placing = null; });
ui.produce.addEventListener('click', () => {
  for (const b of [...game.selected].map(byId)) if (b && b.team === 0 && PRODUCES[b.type]) produce(b);
});
ui.harvest.addEventListener('click', () => {
  let any = false;
  for (const e of selectedOfType('extractor')) any = autoHarvest(e) || any;
  if (!any) flash = { text: 'No known ore — explore to find more', t: performance.now() };
});
ui.deselect.addEventListener('click', () => { game.selected.clear(); game.placing = null; });
ui.box.addEventListener('click', () => { input.boxMode = !input.boxMode; });
ui.all.addEventListener('click', () => {
  game.placing = null;
  const soldiers = game.ents.filter(e => e.team === 0 && e.type === 'soldier');
  game.selected = new Set(soldiers.map(e => e.id));
});
ui.pause.addEventListener('click', () => {
  if (game.over) return;
  game.paused = !game.paused;
  ui.pause.textContent = game.paused ? '▶' : '❚❚';
});
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
  if (o.phase === 'toBase') return nearestRefinery(e) ? `Extractor: returning (${load})` : 'Extractor: needs a refinery!';
  return 'Extractor: unloading';
}

function updateHUD() {
  ui.credits.textContent = '$' + Math.floor(game.credits[0]);
  ui.box.classList.toggle('on', input.boxMode);

  const sel = [...game.selected].map(byId).filter(Boolean);
  const one = t => sel.find(e => e.type === t);
  const settler = one('settler'), hq = one('hq'), producer = sel.find(e => PRODUCES[e.type]);
  const extractors = sel.filter(e => e.type === 'extractor'), soldiers = sel.filter(e => e.type === 'soldier');
  const placing = game.placing;

  show(ui.deploy, !!settler && !placing);
  show(ui.barracks, !!hq && !placing);
  show(ui.refinery, !!hq && !placing);
  show(ui.produce, !!producer && !placing);
  show(ui.harvest, extractors.length > 0 && !placing);
  show(ui.place, !!(placing && placing.ghost));
  show(ui.cancel, !!placing);
  show(ui.deselect, sel.length > 0 && !placing);

  ui.barracks.disabled = game.credits[0] < COST.barracks;
  ui.refinery.disabled = game.credits[0] < COST.refinery;
  if (placing && placing.ghost) ui.place.disabled = !canPlace(0, placing.type, placing.ghost.x, placing.ghost.y) || game.credits[0] < COST[placing.type];
  if (producer) {
    const unit = PRODUCES[producer.type];
    ui.produce.textContent = `${NAMES[unit]} $${COST[unit]}`;
    ui.produce.disabled = !producer.built || producer.queue >= STATS[producer.type].maxQueue || game.credits[0] < COST[unit];
  }

  let text;
  if (flash && performance.now() - flash.t < 2500) text = flash.text;
  else if (game.paused) text = 'Paused';
  else if (placing) text = placing.ghost ? 'Tap the square again (or Place here) to build' : `Tap inside the circle to place your ${NAMES[placing.type].toLowerCase()}`;
  else if (settler) text = 'Settler — move somewhere open, then Deploy';
  else if (hq) text = 'Headquarters — build a Refinery for income';
  else if (producer) text = producer.built ? `${NAMES[producer.type]}${producer.queue ? ' — making ×' + producer.queue : ''}` : `${NAMES[producer.type]}: ${Math.floor(producer.progress * 100)}% built`;
  else if (extractors.length === 1 && !soldiers.length) text = extractorStatus(extractors[0]);
  else if (sel.length) {
    const parts = [];
    if (soldiers.length) parts.push(`${soldiers.length} soldier${soldiers.length > 1 ? 's' : ''}`);
    if (extractors.length) parts.push(`${extractors.length} extractor${extractors.length > 1 ? 's' : ''}`);
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
ui.ovText.innerHTML = 'Deploy your settler into a Headquarters. Build a <b>Refinery</b> and send <b>Extractors</b> to collect ore, then a <b>Barracks</b> for soldiers. The big ore field in the middle is worth fighting for.<br><br>Drag to scroll · pinch to zoom · tap the minimap to jump · best in landscape.';
ui.overlay.style.display = 'flex';
requestAnimationFrame(frame);
