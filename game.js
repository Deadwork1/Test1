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

const COST = { barracks: 300, refinery: 400, tower: 500, wall: 20, gate: 150, soldier: 100, extractor: 150 };
const WALL_REACH = 150;              // walls & gates can go this much further out than other buildings

const STATS = {
  settler:   { hp: 200, speed: 38, r: 16, sight: 180 },
  soldier:   { hp: 60,  speed: 52, r: 9,  sight: 170, range: 90, dmg: 8, cooldown: 0.8 },
  extractor: { hp: 300, speed: 34, r: 15, sight: 150, capacity: 150, rate: 30, unloadTime: 1.5 },
  hq:        { hp: 900, size: 92, sight: 280 },
  barracks:  { hp: 500, size: 74, sight: 200, buildTime: 10, trainTime: 4, maxQueue: 5 },
  refinery:  { hp: 600, size: 84, sight: 200, buildTime: 12, trainTime: 6, maxQueue: 3 },
  tower:     { hp: 700, size: 46, sight: 230, buildTime: 12, range: 170, dmg: 14, cooldown: 0.9 },
  wall:      { hp: 400, size: 25, sight: 50 },
  gate:      { hp: 600, size: 50, sight: 60 },
};
const PRODUCES = { barracks: 'soldier', refinery: 'extractor' };

// How the computer plays at each difficulty.
//  think: seconds between decisions   slow: build/train time multiplier   income: share of ore value it earns
//  attackAt: army size before it attacks   attackAfter: earliest attack (seconds)   barracks: max barracks
//  maxArmy: it stops training soldiers at this many
const DIFFICULTY = {
  easy:   { label: 'Easy',   think: 2.5, slow: 1.5,  income: 0.7,  attackAt: 5, attackAfter: 300, barracks: 1, maxArmy: 6, towers: 0 },
  normal: { label: 'Normal', think: 1.5, slow: 1.18, income: 0.85, attackAt: 7, attackAfter: 180, barracks: 1, maxArmy: 20, towers: 1 },
  hard:   { label: 'Hard',   think: 1,   slow: 1,    income: 1,    attackAt: 6, attackAfter: 0,   barracks: 2, maxArmy: Infinity, towers: 2 },
};
let difficulty = 'normal';
try { if (DIFFICULTY[localStorage.getItem('mini-rts-difficulty')]) difficulty = localStorage.getItem('mini-rts-difficulty'); } catch (err) {}
const diff = () => DIFFICULTY[difficulty];
const slowOf = e => e.team === 1 ? diff().slow : 1;
const NAMES = { settler: 'Settler', soldier: 'Soldier', extractor: 'Extractor', hq: 'Headquarters', barracks: 'Barracks', refinery: 'Refinery', tower: 'Guard Tower', wall: 'Wall', gate: 'Gate' };

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
const bldGrid = new Uint8Array(TCOLS * TROWS);   // tiles covered by buildings (plus a clearance gap)
const CLEAR = 12;                                 // keep routes this far from building walls
let bldDirty = true;
const wallKind = new Uint8Array(TCOLS * TROWS);  // 0 none, 1 wall, 2 gate
const wallTeam = new Int8Array(TCOLS * TROWS);
const wallId = new Int32Array(TCOLS * TROWS);
// tiles a wall/gate covers
function wallTiles(b) {
  const out = [], h = b.size / 2;
  for (let r = Math.round((b.y - h) / TC); r < Math.round((b.y + h) / TC); r++)
    for (let c = Math.round((b.x - h) / TC); c < Math.round((b.x + h) / TC); c++) out.push([c, r]);
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
    if (!path && e.type === 'soldier') { path = findPath(e.x, e.y, tx, ty, false, e.team, true); breaking = !!path; }
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
    if (type === 'hq' || isWallType(type)) { e.built = true; e.progress = 1; }   // walls go up instantly
    else { e.built = false; e.progress = 0; e.hp = s.hp * 0.1; }
    e.queue = 0; e.trainT = 0;
  } else {
    e.r = s.r;
    if (type === 'extractor') e.cargo = 0;
  }
  game.ents.push(e);
  return e;
}

function isBuildingType(t) { return t === 'hq' || t === 'barracks' || t === 'refinery' || t === 'tower' || t === 'wall' || t === 'gate'; }
const isWallType = t => t === 'wall' || t === 'gate';
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
  const hq = hqOf(team), size = STATS[type].size;
  if (!hq || edgeDist(x, y, hq) > BUILD_RADIUS || !siteIsFree(x, y, size)) return false;
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
const snapGate = (x, y) => ({ x: Math.round(x / TC) * TC, y: Math.round(y / TC) * TC });

function canPlaceWallPiece(team, type, x, y) {
  const hq = hqOf(team), h = STATS[type].size / 2;
  if (!hq || edgeDist(x, y, hq) > BUILD_RADIUS + WALL_REACH) return false;
  if (x - h < 0 || y - h < 0 || x + h > W || y + h > H) return false;
  for (let yy = y - h + TC / 2; yy < y + h; yy += TC)
    for (let xx = x - h + TC / 2; xx < x + h; xx += TC) if (terrainAt(xx, yy) !== T.GRASS) return false;
  if (game.ore.some(o => Math.abs(o.x - x) < h + 10 && Math.abs(o.y - y) < h + 10)) return false;
  for (const b of game.ents) {
    if (!isBuilding(b)) continue;
    const gap = isWallType(b.type) ? 0 : 6;   // walls can touch each other, but not other buildings
    if (Math.abs(b.x - x) < b.size / 2 + h + gap - 0.5 && Math.abs(b.y - y) < b.size / 2 + h + gap - 0.5) return false;
    if (PRODUCES[b.type]) {   // keep doorways clear
      const d = frontDoor(b);
      if (Math.abs(d.x - x) < h + 24 && Math.abs(d.y - y) < h + 22) return false;
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

function placeBuilding(team, type, x, y) {
  if (type === 'gate') {
    const g = snapGate(x, y);
    if (game.credits[team] < COST.gate || !canPlaceWallPiece(team, 'gate', g.x, g.y)) return false;
    game.credits[team] -= COST.gate; spawn('gate', team, g.x, g.y);
    return true;
  }
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
    else if (e.type === 'soldier') updateSoldier(e, dt);
    else if (e.type === 'extractor') updateExtractor(e, dt);
    else if (e.type === 'tower') updateTower(e, dt);
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

function updateSoldier(e, dt) {
  const s = STATS.soldier;
  e.cooldown -= dt;
  e.revealT = (e.revealT || 0) - dt;
  let o = e.order;

  // idle or attack-moving soldiers look for nearby enemies on their own
  if ((!o && !e.passive) || (o && o.type === 'attackmove')) {
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
  if (e.trainT >= s.trainTime * slowOf(e)) {
    e.trainT = 0; e.queue--;
    releaseUnit(e);
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
    if (t.type === 'soldier' && !t.order) t.order = { type: 'attack', target: e.id };   // soldiers charge the tower
  }
}

// a new unit rolls out of the building's door
// Every building's front door faces the bottom of the screen.
const frontDoor = b => ({ x: b.x, y: b.y + b.size / 2 + 30 });

function releaseUnit(b) {
  const d = frontDoor(b);
  const u = spawn(PRODUCES[b.type], b.team, d.x, d.y - 10);
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
    if (!walkable(terrainAt(u.x, u.y), isVehicle(u)) || wallBlocks(u.x, u.y, u.team)) { u.x = u.px; u.y = u.py; }
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
  ai.timer = diff().think;

  const mine = game.ents.filter(e => e.team === 1);
  const of = t => mine.filter(e => e.type === t);
  const settler = of('settler')[0], hq = of('hq')[0];
  const barracks = of('barracks'), refineries = of('refinery'), soldiers = of('soldier'), extractors = of('extractor');
  const cash = game.credits[1];

  // remember any of your buildings it has seen; forget ones it sees are gone
  for (const e of game.ents) if (e.team === 0 && isBuilding(e) && !isWallType(e.type) && visibleAt(e.x, e.y, 1)) ai.known.set(e.id, { x: e.x, y: e.y });
  for (const [id, k] of ai.known) if (!byId(id) && visibleAt(k.x, k.y, 1)) ai.known.delete(id);

  if (settler && !hq) deploy(settler);

  if (hq) {
    if (refineries.length === 0) aiPlace(hq, 'refinery');
    else if (barracks.length === 0) aiPlace(hq, 'barracks');
    else if (of('tower').length < diff().towers && cash >= COST.tower) aiPlace(hq, 'tower');
    else if (barracks.length < diff().barracks && cash >= 900) aiPlace(hq, 'barracks');
  }

  for (const r of refineries) if (extractors.length + r.queue < 2 * refineries.length && r.queue === 0) produce(r);
  // idle extractors go to ore it knows about, or drive off to look for some
  for (const x of extractors) {
    if (x.order || autoHarvest(x)) continue;
    const spot = aiExploreSpot(x.x, x.y, false);
    if (spot) x.order = { type: 'move', x: spot.x, y: spot.y };
  }

  let reserve = extractors.length < 2 && refineries.length ? COST.extractor : 0;
  if (of('tower').length < diff().towers && soldiers.length >= 3 && barracks.length) reserve += COST.tower;   // save up for a tower
  const queued = barracks.reduce((n, b) => n + b.queue, 0);
  for (const b of barracks) if (b.queue < 2 && soldiers.length + queued < diff().maxArmy && game.credits[1] >= COST.soldier + reserve) produce(b);

  // targets = your things it can see right now + buildings it remembers
  const targets = game.ents.filter(e => e.team === 0 && !isWallType(e.type) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1)).map(e => ({ x: e.x, y: e.y }));
  for (const k of ai.known.values()) targets.push(k);

  // send one soldier out to scout until it has found your base
  const scout = ai.scout && byId(ai.scout);
  if (!ai.known.size && soldiers.length && !ai.attacking) {
    const sc = scout || soldiers[0];
    ai.scout = sc.id; sc.passive = true;   // scouts look, they don't pick fights
    if (!sc.order) { const spot = aiExploreSpot(sc.x, sc.y, true); if (spot) sc.order = { type: 'move', x: spot.x, y: spot.y }; }
  } else if (scout && ai.known.size && !ai.attacking && hq) {
    // found you: the scout runs home to report instead of fighting alone
    scout.order = { type: 'move', x: hq.x - 120, y: hq.y + 120 };
    scout.passive = false; ai.scout = null;
  }

  if (soldiers.length >= diff().attackAt && game.time >= diff().attackAfter) { ai.attacking = true; for (const s of soldiers) s.passive = false; }
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
    else if (e.type === 'tower') drawTower(e);
    else if (e.type === 'wall') drawWall(e);
    else if (e.type === 'gate') drawGate(e);
    else if (e.type === 'settler') drawSettler(e);
    else if (e.type === 'extractor') drawExtractor(e);
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
  const reach = BUILD_RADIUS + (isWallType(type) ? WALL_REACH : 0);
  if (hq) {
    ctx.fillStyle = 'rgba(125,255,125,0.07)'; ctx.strokeStyle = 'rgba(125,255,125,0.55)';
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hq.x, hq.y, hq.size / 2 + reach, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
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
    const ok = canPlaceWallPiece(0, 'gate', g.x, g.y) && game.credits[0] >= COST.gate;
    ctx.fillStyle = ok ? 'rgba(80,255,80,0.35)' : 'rgba(255,60,60,0.35)';
    ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
    ctx.fillRect(g.x - 25, g.y - 25, 50, 50); ctx.strokeRect(g.x - 25, g.y - 25, 50, 50);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(ok ? 'Gate — tap again' : "Can't build here", g.x, g.y - 32);
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
  ctx.drawImage(bg, 0, 0, W, H, MM.x, MM.y, MM.w, MM.h);
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
  const moving = e.lx !== undefined && Math.hypot(e.x - e.lx, e.y - e.ly) > 0.05;
  e.lx = e.x; e.ly = e.y;
  if (hidden) ctx.globalAlpha = 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();

  // drawn from above, facing along +x, then rotated to where the soldier is looking
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing); ctx.scale(1.15, 1.15);
  // legs (step back and forth while walking)
  const step = moving ? Math.sin(performance.now() / 90 + e.id) * 4 : 0;
  ctx.fillStyle = '#2a2a24';
  ctx.beginPath(); ctx.ellipse(step, -3.5, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-step, 3.5, 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  // backpack
  ctx.fillStyle = '#4b4f30'; ctx.fillRect(-9, -4.5, 5, 9);
  // shoulders / uniform in team colour
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-0.5, 0, 5.5, 8.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // rifle held forward, with both hands on it
  ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-1, 4); ctx.lineTo(15, 2.5); ctx.stroke();
  ctx.fillStyle = '#e0b48a';
  ctx.beginPath(); ctx.arc(3, 4.6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8.5, 2.9, 2, 0, Math.PI * 2); ctx.fill();
  // helmet
  ctx.fillStyle = c.dark;
  ctx.beginPath(); ctx.arc(0.5, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(-0.5, -1.5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // muzzle flash right after firing
  if (e.cooldown > STATS.soldier.cooldown - 0.07) {
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath(); ctx.arc(e.x + Math.cos(e.facing) * 17, e.y + Math.sin(e.facing) * 17, 3, 0, Math.PI * 2); ctx.fill();
  }
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
  const h = e.size / 2, k = e.trainT / (STATS[e.type].trainTime * slowOf(e));
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
  const c = TEAMS[e.team], h = e.size / 2;
  // opens when one of its own units is close
  const near = game.ents.some(u => u.team === e.team && isUnit(u) && Math.abs(u.x - e.x) < 55 && Math.abs(u.y - e.y) < 55);
  e.openK = Math.max(0, Math.min(1, (e.openK || 0) + (near ? 0.08 : -0.05)));
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 3, e.y - h + 4, e.size, e.size);
  ctx.fillStyle = '#5a564c'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);   // gateway floor
  // posts
  ctx.fillStyle = '#9b968b';
  for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillRect(e.x + px * (h - 6) - 6, e.y + py * (h - 6) - 6, 12, 12);
  // two sliding steel doors (striped in team colour)
  const slide = (h - 6) * e.openK;
  for (const side of [-1, 1]) {
    const x = side < 0 ? e.x - h + 6 - slide : e.x + slide;
    ctx.save(); ctx.beginPath(); ctx.rect(e.x - h + 6, e.y - h, e.size - 12, e.size); ctx.clip();
    ctx.fillStyle = '#7d786c'; ctx.fillRect(x, e.y - 7, h - 6, 14);
    ctx.fillStyle = c.color;
    for (let k = 0; k < h - 6; k += 8) ctx.fillRect(x + k, e.y - 7, 4, 14);
    ctx.restore();
  }
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
  const w = ctx.measureText(txt).width + 12, y = e.y - e.size / 2 - 32;   // above the health bar, clear of the door
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(e.x - w / 2, y, w, 17);
  ctx.fillStyle = '#fff'; ctx.fillText(txt, e.x, y + 13);
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
    const w = toWorld(ev.clientX, ev.clientY);
    if (game.placing.type === 'wall') { if (game.placing.anchor) game.placing.end = snapWall(w.x, w.y); }
    else game.placing.ghost = game.placing.type === 'gate' ? snapGate(w.x, w.y) : w;
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
  if (p && p.ghost && placeBuilding(0, p.type, p.ghost.x, p.ghost.y)) game.placing = null;
}

function handleTap(x, y) {
  if (game.paused) return;

  if (game.placing && game.placing.type === 'wall') { wallTap(x, y); return; }
  if (game.placing) {
    const pt = game.placing.type === 'gate' ? snapGate(x, y) : { x, y };
    const g = game.placing.ghost, h = STATS[game.placing.type].size / 2;
    if (g && Math.abs(x - g.x) < h && Math.abs(y - g.y) < h) tryPlace();
    else game.placing.ghost = pt;
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
  deploy: $('btnDeploy'), barracks: $('btnBarracks'), refinery: $('btnRefinery'), tower: $('btnTower'), wall: $('btnWall'), gate: $('btnGate'), produce: $('btnProduce'),
  harvest: $('btnHarvest'), place: $('btnPlace'), cancel: $('btnCancel'), deselect: $('btnDeselect'),
  box: $('btnBox'), all: $('btnAll'), pause: $('btnPause'),
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
ui.wall.addEventListener('click', () => startPlacing('wall'));
ui.gate.addEventListener('click', () => startPlacing('gate'));
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

  const sel = [...game.selected].map(byId).filter(Boolean);
  const one = t => sel.find(e => e.type === t);
  const settler = one('settler'), hq = one('hq'), producer = sel.find(e => PRODUCES[e.type]);
  const extractors = sel.filter(e => e.type === 'extractor'), soldiers = sel.filter(e => e.type === 'soldier');
  const placing = game.placing;

  show(ui.deploy, !!settler && !placing);
  show(ui.barracks, !!hq && !placing);
  show(ui.refinery, !!hq && !placing);
  show(ui.tower, !!hq && !placing);
  show(ui.wall, !!hq && !placing);
  show(ui.gate, !!hq && !placing);
  show(ui.produce, !!producer && !placing);
  show(ui.harvest, extractors.length > 0 && !placing);
  show(ui.place, !!(placing && (placing.ghost || (placing.type === 'wall' && placing.anchor))));
  show(ui.cancel, !!placing);
  show(ui.deselect, sel.length > 0 && !placing);

  ui.barracks.disabled = game.credits[0] < COST.barracks;
  ui.refinery.disabled = game.credits[0] < COST.refinery;
  ui.tower.disabled = game.credits[0] < COST.tower;
  ui.wall.disabled = game.credits[0] < COST.wall;
  ui.gate.disabled = game.credits[0] < COST.gate;
  const wallMode = placing && placing.type === 'wall';
  ui.cancel.textContent = wallMode ? 'Done' : 'Cancel';
  ui.place.textContent = wallMode ? 'Build wall' : 'Place here';
  if (placing && placing.ghost && placing.type === 'gate') ui.place.disabled = !canPlaceWallPiece(0, 'gate', placing.ghost.x, placing.ghost.y) || game.credits[0] < COST.gate;
  else if (placing && placing.ghost) ui.place.disabled = !canPlace(0, placing.type, placing.ghost.x, placing.ghost.y) || game.credits[0] < COST[placing.type];
  else if (placing) ui.place.disabled = false;
  if (producer) {
    const unit = PRODUCES[producer.type];
    ui.produce.textContent = `${NAMES[unit]} $${COST[unit]}`;
    ui.produce.disabled = !producer.built || producer.queue >= STATS[producer.type].maxQueue || game.credits[0] < COST[unit];
  }

  let text;
  if (flash && performance.now() - flash.t < 2500) text = flash.text;
  else if (game.paused) text = 'Paused';
  else if (placing && placing.type === 'wall') text = !placing.anchor ? 'Tap where the wall starts' : placing.end ? 'Tap the end again to build (or Build wall)' : 'Tap where the wall ends (or tap the start again for one piece)';
  else if (placing) text = placing.ghost ? 'Tap the square again (or Place here) to build' : `Tap inside the circle to place your ${NAMES[placing.type].toLowerCase()}`;
  else if (settler) text = 'Settler — move somewhere open, then Deploy';
  else if (hq) text = 'Headquarters';
  else if (sel.length === 1 && sel[0].type === 'gate') text = 'Gate — opens for your units, enemies must destroy it';
  else if (sel.length === 1 && sel[0].type === 'wall') text = 'Wall';
  else if (sel.length === 1 && sel[0].type === 'tower') text = sel[0].built ? 'Guard Tower — fires at enemies in range' : `Guard Tower: ${Math.floor(sel[0].progress * 100)}% built`;
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
ui.ovText.innerHTML = 'Deploy your settler, build a <b>Refinery</b> for ore and a <b>Barracks</b> for soldiers, and fight for the big ore field in the middle.<br>Drag to scroll · pinch to zoom · best in landscape.';
ui.overlay.style.display = 'flex';
requestAnimationFrame(frame);
