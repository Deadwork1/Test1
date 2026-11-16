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
  // dirt road between the bases
  b.strokeStyle = 'rgba(140,110,70,0.45)'; b.lineWidth = 40; b.lineCap = 'round';
  b.beginPath(); b.moveTo(START[0].x, START[0].y);
  b.bezierCurveTo(900, H - 150, 1500, 150, START[1].x, START[1].y); b.stroke();
  b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 6; b.strokeRect(3, 3, W - 6, H - 6);
})();

// ---------- Game state ----------
let game;

function newGame() {
  game = {
    ents: [], ore: [], nextId: 1,
    credits: [START_CREDITS, START_CREDITS],
    selected: new Set(),
    placing: null,           // { type, ghost:{x,y} } while choosing where to build
    effects: [],
    over: null, paused: false,
    ai: { timer: 0, attacking: false },
  };
  fog.vis.fill(0); fog.exp.fill(0);
  let seed = 99;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const f of ORE_FIELDS) {
    for (let i = 0; i < f.nodes; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * f.spread;
      game.ore.push({ id: game.nextId++, x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d,
                      amount: f.amount, max: f.amount, rot: rnd() * 6 });
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
  const step = STATS[e.type].speed * dt;
  if (d <= step || d < 0.5) { e.x = tx; e.y = ty; return true; }
  e.x += dx / d * step; e.y += dy / d * step;
  e.facing = Math.atan2(dy, dx);
  return false;
}

// ---------- Fog of war (only for you — the computer sees everything) ----------
const fog = { vis: new Uint8Array(COLS * ROWS), exp: new Uint8Array(COLS * ROWS) };
const fogCanvas = document.createElement('canvas');
fogCanvas.width = COLS; fogCanvas.height = ROWS;
const fogCtx = fogCanvas.getContext('2d');
const fogImg = fogCtx.createImageData(COLS, ROWS);

function cellIndex(x, y) {
  const c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)));
  const r = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL)));
  return r * COLS + c;
}
const visibleAt = (x, y) => fog.vis[cellIndex(x, y)] === 1;
const exploredAt = (x, y) => fog.exp[cellIndex(x, y)] === 1;

function updateFog() {
  fog.vis.fill(0);
  for (const e of game.ents) {
    if (e.team !== 0) continue;
    const r = STATS[e.type].sight * (isBuilding(e) && !e.built ? 0.6 : 1);
    const c0 = Math.max(0, Math.floor((e.x - r) / CELL)), c1 = Math.min(COLS - 1, Math.floor((e.x + r) / CELL));
    const r0 = Math.max(0, Math.floor((e.y - r) / CELL)), r1 = Math.min(ROWS - 1, Math.floor((e.y + r) / CELL));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cx = col * CELL + CELL / 2, cy = row * CELL + CELL / 2;
        if ((cx - e.x) ** 2 + (cy - e.y) ** 2 <= r * r) { const i = row * COLS + col; fog.vis[i] = 1; fog.exp[i] = 1; }
      }
    }
  }
  const d = fogImg.data;
  for (let i = 0; i < fog.vis.length; i++) {
    d[i * 4] = 4; d[i * 4 + 1] = 6; d[i * 4 + 2] = 4;
    d[i * 4 + 3] = fog.vis[i] ? 0 : fog.exp[i] ? 130 : 255;
  }
  fogCtx.putImageData(fogImg, 0, 0);
}

// can the human player see this thing?
function canSee(e) {
  if (e.team === 0) return true;
  return isBuilding(e) ? exploredAt(e.x, e.y) : visibleAt(e.x, e.y);
}

// ---------- Deploying & building ----------
function siteIsFree(x, y, size) {
  const h = size / 2;
  if (x - h < 10 || y - h < 10 || x + h > W - 10 || y + h > H - 10) return false;
  if (game.ore.some(o => Math.abs(o.x - x) < h + 14 && Math.abs(o.y - y) < h + 14)) return false;
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
    if (mustBeExplored && team === 0 && !exploredAt(o.x, o.y)) continue;
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
  if (o.type === 'move') { if (moveToward(e, o.x, o.y, dt)) e.order = null; return; }

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
      if (Math.hypot(node.x - e.x, node.y - e.y) > e.r + 10) moveToward(e, node.x, node.y, dt);
      else o.phase = 'mining';
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
    if (edgeDist(e.x, e.y, ref) > e.r + 6) moveToward(e, ref.x, ref.y, dt);
    else { o.phase = 'unloading'; o.t = 0; }
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

  game.credits[0] += INCOME * dt;
  game.credits[1] += INCOME * dt;

  for (const e of game.ents) {
    if (e.type === 'settler') { if (e.order && moveToward(e, e.order.x, e.order.y, dt)) e.order = null; }
    else if (e.type === 'soldier') updateSoldier(e, dt);
    else if (e.type === 'extractor') updateExtractor(e, dt);
    else if (isBuilding(e)) updateBuilding(e, dt);
  }

  separate();

  for (const e of game.ents) {
    if (e.hp <= 0) {
      game.selected.delete(e.id);
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
    if (o.team === e.team) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function updateSoldier(e, dt) {
  const s = STATS.soldier;
  e.cooldown -= dt;
  let o = e.order;

  // idle or attack-moving soldiers look for nearby enemies on their own
  if (!o || o.type === 'attackmove') {
    const foe = findEnemyNear(e, s.sight);
    if (foe) { e.order = { type: 'attack', target: foe.id, resume: o }; o = e.order; }
  }
  if (!o) return;

  if (o.type === 'move' || o.type === 'attackmove') {
    if (moveToward(e, o.x, o.y, dt)) e.order = null;
  } else if (o.type === 'attack') {
    const t = byId(o.target);
    if (!t) { e.order = o.resume || null; return; }
    if (edgeDist(e.x, e.y, t) > s.range) {
      moveToward(e, t.x, t.y, dt);
    } else {
      e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
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
    if (e.progress >= 1) { e.progress = 1; e.built = true; }
    return;
  }
  if (!PRODUCES[e.type] || e.queue <= 0) return;
  e.trainT += dt;
  if (e.trainT >= s.trainTime) {
    e.trainT = 0; e.queue--;
    const dir = e.team === 0 ? -1 : 1;
    const u = spawn(PRODUCES[e.type], e.team, e.x, e.y + dir * (e.size / 2 + 16));
    u.order = { type: 'move', x: e.x + (Math.random() - .5) * 80, y: e.y + dir * (e.size / 2 + 45) };
  }
}

// keep units from stacking on top of each other or driving through buildings
function separate() {
  const units = game.ents.filter(isUnit);
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

  if (settler && !hq) deploy(settler);

  if (hq) {
    if (refineries.length === 0) aiPlace(hq, 'refinery');
    else if (barracks.length === 0) aiPlace(hq, 'barracks');
    else if (barracks.length < 2 && cash >= 900) aiPlace(hq, 'barracks');
  }

  for (const r of refineries) if (extractors.length + r.queue < 2 * refineries.length && r.queue === 0) produce(r);
  for (const x of extractors) if (!x.order) autoHarvest(x);

  const reserve = extractors.length < 2 && refineries.length ? COST.extractor : 0;
  for (const b of barracks) if (b.queue < 2 && game.credits[1] >= COST.soldier + reserve) produce(b);

  if (soldiers.length >= 6) ai.attacking = true;
  if (soldiers.length < 2) ai.attacking = false;

  if (ai.attacking) {
    const targets = game.ents.filter(e => e.team === 0);
    for (const s of soldiers) {
      if (s.order) continue;
      let best = null, bestD = Infinity;
      for (const t of targets) { const d = Math.hypot(t.x - s.x, t.y - s.y); if (d < bestD) { bestD = d; best = t; } }
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
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 4, e.r, e.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + Math.cos(e.facing) * (e.r + 7), e.y + Math.sin(e.facing) * (e.r + 7)); ctx.stroke();
  ctx.fillStyle = c.color; ctx.strokeStyle = c.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.light;
  ctx.beginPath(); ctx.arc(e.x - 2, e.y - 2, e.r * 0.4, 0, Math.PI * 2); ctx.fill();
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
