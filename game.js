// Mini RTS — version 1
// One small map, you (blue) vs the computer (red).
// Settler -> deploys into a Headquarters -> HQ builds Barracks -> Barracks trains Soldiers. Destroy everything the enemy owns to win.

'use strict';

// ---------- Settings (tweak these to balance the game) ----------
const W = 1100, H = 550;              // map size in world units
const INCOME = 5;                     // credits per second for each side
const START_CREDITS = 600;

const COST = { barracks: 300, soldier: 100 };
const BUILD_RADIUS = 230;            // how far from your HQ you can place buildings

const STATS = {
  settler:  { hp: 200, speed: 38, r: 16 },
  soldier:  { hp: 60,  speed: 52, r: 9, range: 90, sight: 150, dmg: 8, cooldown: 0.8 },
  hq:       { hp: 900, size: 92 },
  barracks: { hp: 500, size: 74, buildTime: 10, trainTime: 4, maxQueue: 5 },
};

const TEAMS = [
  { name: 'You',   color: '#3b82f6', dark: '#1d3f8f', light: '#93c5fd' },
  { name: 'Enemy', color: '#ef4444', dark: '#8f1d1d', light: '#fca5a5' },
];

// ---------- Canvas & scaling ----------
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  // leave room for the top and bottom bars
  const top = 52, bottom = 58;
  const availH = Math.max(100, ch - top - bottom);
  const scale = Math.min(cw / W, availH / H);
  view = { scale, dpr, ox: (cw - W * scale) / 2, oy: top + (availH - H * scale) / 2 };
}
window.addEventListener('resize', resize);
resize();

const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale });

// ---------- Background (drawn once) ----------
const bg = document.createElement('canvas');
(function drawBackground() {
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');
  b.fillStyle = '#4a6b35'; b.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    b.fillStyle = rnd() < 0.5 ? 'rgba(30,50,20,0.18)' : 'rgba(120,150,80,0.15)';
    const s = 6 + rnd() * 26;
    b.beginPath(); b.arc(rnd() * W, rnd() * H, s, 0, Math.PI * 2); b.fill();
  }
  // a dirt road between the two bases
  b.strokeStyle = 'rgba(140,110,70,0.45)'; b.lineWidth = 34; b.lineCap = 'round';
  b.beginPath(); b.moveTo(110, H - 110); b.bezierCurveTo(400, H - 60, 700, 60, W - 110, 110); b.stroke();
  b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 4; b.strokeRect(2, 2, W - 4, H - 4);
})();

// ---------- Game state ----------
let game;

function newGame() {
  game = {
    ents: [], nextId: 1,
    credits: [START_CREDITS, START_CREDITS],
    selected: new Set(),
    placing: false,          // true while choosing where to put a barracks
    effects: [],
    over: null, paused: false,
    ai: { timer: 0, attacking: false },
  };
  spawn('settler', 0, 130, H - 110);
  spawn('settler', 1, W - 130, 110);
}

function spawn(type, team, x, y, extra = {}) {
  const s = STATS[type];
  const e = { id: game.nextId++, type, team, x, y, hp: s.hp, maxHp: s.hp, order: null,
              cooldown: 0, facing: team === 0 ? -0.6 : 2.5, ...extra };
  if (type === 'hq') {
    e.size = s.size; e.built = true; e.progress = 1;
  } else if (type === 'barracks') {
    e.size = s.size; e.built = false; e.progress = 0; e.hp = s.hp * 0.1;
    e.queue = 0; e.trainT = 0;
  } else {
    e.r = s.r;
  }
  game.ents.push(e);
  return e;
}

const isBuilding = e => e.type === 'barracks' || e.type === 'hq';
const isUnit = e => !isBuilding(e);
const byId = id => game.ents.find(e => e.id === id);

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

// ---------- Deploying & building ----------
function siteIsFree(x, y, size) {
  const h = size / 2;
  if (x - h < 8 || y - h < 8 || x + h > W - 8 || y + h > H - 8) return false;
  return !game.ents.some(o => isBuilding(o) &&
    Math.abs(o.x - x) < o.size / 2 + h + 12 && Math.abs(o.y - y) < o.size / 2 + h + 12);
}

const hqOf = team => game.ents.find(e => e.team === team && e.type === 'hq');

// the settler packs itself up and becomes a headquarters where it stands
function deploy(settler) {
  if (!siteIsFree(settler.x, settler.y, STATS.hq.size)) return false;
  settler.hp = 0; settler.deployed = true;
  const hq = spawn('hq', settler.team, settler.x, settler.y);
  if (game.selected.delete(settler.id) && settler.team === 0) game.selected.add(hq.id);
  return true;
}

function canPlaceBarracks(team, x, y) {
  const hq = hqOf(team);
  return !!hq && edgeDist(x, y, hq) <= BUILD_RADIUS && siteIsFree(x, y, STATS.barracks.size);
}

function placeBarracks(team, x, y) {
  if (game.credits[team] < COST.barracks || !canPlaceBarracks(team, x, y)) return false;
  game.credits[team] -= COST.barracks;
  spawn('barracks', team, x, y);
  return true;
}

// ---------- Update ----------
function update(dt) {
  if (game.over || game.paused) return;

  game.credits[0] += INCOME * dt;
  game.credits[1] += INCOME * dt;

  for (const e of game.ents) {
    if (e.type === 'settler') updateSettler(e, dt);
    else if (e.type === 'soldier') updateSoldier(e, dt);
    else if (e.type === 'barracks') updateBarracks(e, dt);
  }

  separate();

  // remove the dead
  for (const e of game.ents) {
    if (e.hp <= 0) {
      game.selected.delete(e.id);
      if (e.deployed) continue;
      game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: e.type !== 'soldier' });
    }
  }
  game.ents = game.ents.filter(e => e.hp > 0);

  for (const fx of game.effects) fx.t += dt;
  game.effects = game.effects.filter(fx => fx.t < (fx.kind === 'shot' ? 0.08 : 0.6));

  runAI(dt);

  const alive = [0, 1].map(t => game.ents.some(e => e.team === t));
  if (!alive[1]) endGame(true);
  else if (!alive[0]) endGame(false);
}

function updateSettler(e, dt) {
  const o = e.order;
  if (o && o.type === 'move' && moveToward(e, o.x, o.y, dt)) e.order = null;
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
    const d = edgeDist(e.x, e.y, t);
    if (d > s.range) {
      moveToward(e, t.x, t.y, dt);
    } else {
      e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
        t.hp -= s.dmg;
        game.effects.push({ kind: 'shot', x: e.x, y: e.y, x2: t.x + (Math.random() - .5) * 8,
                            y2: t.y + (Math.random() - .5) * 8, team: e.team, t: 0 });
        // a unit that gets shot while idle fights back
        if (t.type === 'soldier' && !t.order) t.order = { type: 'attack', target: e.id };
      }
    }
  }
}

function updateBarracks(e, dt) {
  if (!e.built) {   // construction happens on its own
    e.progress += dt / STATS.barracks.buildTime;
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.9 * dt / STATS.barracks.buildTime);
    if (e.progress >= 1) { e.progress = 1; e.built = true; }
    return;
  }
  if (e.queue <= 0) return;
  e.trainT += dt;
  if (e.trainT >= STATS.barracks.trainTime) {
    e.trainT = 0; e.queue--;
    const dir = e.team === 0 ? -1 : 1;
    const u = spawn('soldier', e.team, e.x, e.y + dir * (e.size / 2 + 12));
    u.order = { type: 'move', x: e.x + (Math.random() - .5) * 70, y: e.y + dir * (e.size / 2 + 40) };
  }
}

function train(b) {
  if (!b.built || b.queue >= STATS.barracks.maxQueue || game.credits[b.team] < COST.soldier) return false;
  game.credits[b.team] -= COST.soldier;
  b.queue++;
  return true;
}

// keep units from stacking on top of each other or walking through buildings
function separate() {
  const units = game.ents.filter(isUnit);
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
      const min = a.r + b.r;
      if (d < min) {
        const push = (min - d) / 2;
        a.x -= dx / d * push; a.y -= dy / d * push;
        b.x += dx / d * push; b.y += dy / d * push;
      }
    }
    for (const bld of game.ents) {
      if (!isBuilding(bld)) continue;
      const h = bld.size / 2 + a.r;
      const dx = a.x - bld.x, dy = a.y - bld.y;
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
function runAI(dt) {
  const ai = game.ai;
  ai.timer -= dt;
  if (ai.timer > 0) return;
  ai.timer = 1;

  const mine = game.ents.filter(e => e.team === 1);
  const settler = mine.find(e => e.type === 'settler');
  const barracks = mine.filter(e => e.type === 'barracks');
  const soldiers = mine.filter(e => e.type === 'soldier');

  const hq = mine.find(e => e.type === 'hq');

  // deploy the settler straight away
  if (settler && !hq) deploy(settler);

  // HQ builds a barracks (a second one once rich)
  if (hq) {
    const want = barracks.length === 0 || (barracks.length < 2 && game.credits[1] >= 700);
    if (want && game.credits[1] >= COST.barracks) {
      for (let tries = 0; tries < 20; tries++) {
        const a = Math.PI * (0.5 + Math.random() * 0.5), d = hq.size / 2 + 60 + Math.random() * 120;
        if (placeBarracks(1, hq.x + Math.cos(a) * d, hq.y + Math.sin(a) * d)) break;
      }
    }
  }

  for (const b of barracks) if (b.queue < 2) train(b);

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
  const { dpr, scale, ox, oy } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d130b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  ctx.drawImage(bg, 0, 0);

  const sel = game.selected;
  const ents = [...game.ents].sort((a, b) => (isBuilding(b) - isBuilding(a)) || a.y - b.y);

  for (const e of ents) {
    if (sel.has(e.id)) drawSelection(e);
    if (e.type === 'hq') drawHQ(e);
    else if (e.type === 'barracks') drawBarracks(e);
    else if (e.type === 'settler') drawSettler(e);
    else drawSoldier(e);
  }
  for (const e of ents) if (sel.has(e.id) || e.hp < e.maxHp) drawHealth(e);

  for (const fx of game.effects) {
    if (fx.kind === 'shot') {
      ctx.strokeStyle = fx.team === 0 ? '#dbeafe' : '#fee2e2'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
    } else if (fx.kind === 'boom') {
      const k = fx.t / 0.6, r = (fx.big ? 50 : 18) * (0.4 + k);
      ctx.fillStyle = `rgba(255,${160 - 100 * k | 0},40,${1 - k})`;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'marker') {
      const k = fx.t / 0.6;
      ctx.strokeStyle = `rgba(120,255,120,${1 - k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, 6 + 14 * k, 0, Math.PI * 2); ctx.stroke();
    }
  }

  if (game.placing) {
    const hq = hqOf(0);
    if (hq) {   // show where you're allowed to build
      ctx.fillStyle = 'rgba(125,255,125,0.08)'; ctx.strokeStyle = 'rgba(125,255,125,0.5)';
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hq.x, hq.y, hq.size / 2 + BUILD_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (game.placing && pointer.overX != null) {
    const ok = canPlaceBarracks(0, pointer.overX, pointer.overY) && game.credits[0] >= COST.barracks;
    const s = STATS.barracks.size;
    ctx.fillStyle = ok ? 'rgba(80,255,80,0.3)' : 'rgba(255,60,60,0.3)';
    ctx.strokeStyle = ok ? '#7dff7d' : '#ff6b6b'; ctx.lineWidth = 2;
    ctx.fillRect(pointer.overX - s / 2, pointer.overY - s / 2, s, s);
    ctx.strokeRect(pointer.overX - s / 2, pointer.overY - s / 2, s, s);
  }

  if (pointer.box) {
    const b = pointer.box;
    ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 1.5 / scale * 1.5;
    ctx.fillStyle = 'rgba(125,255,125,0.1)';
    ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
    ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
  }
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
}

function drawSettler(e) {
  const c = TEAMS[e.team];
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-15, -9, 32, 22);
  ctx.fillStyle = '#2b2b2b'; // wheels
  for (const [wx, wy] of [[-10, -11], [8, -11], [-10, 9], [8, 9]]) ctx.fillRect(wx, wy, 7, 4);
  ctx.fillStyle = c.color; ctx.fillRect(-16, -10, 24, 20);
  ctx.fillStyle = c.dark; ctx.fillRect(8, -8, 9, 16);
  ctx.fillStyle = '#cfe8ff'; ctx.fillRect(12, -6, 3, 12);
  ctx.fillStyle = c.light; ctx.fillRect(-12, -6, 14, 12);
  ctx.restore();
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

function drawHQ(e) {
  const c = TEAMS[e.team], h = e.size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 6, e.y - h + 7, e.size, e.size);
  ctx.fillStyle = '#8a8476'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.fillStyle = '#5f5a4f'; ctx.fillRect(e.x - h + 5, e.y - h + 5, e.size - 10, e.size - 10);
  ctx.fillStyle = c.dark; ctx.beginPath(); ctx.arc(e.x, e.y, h * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(e.x, e.y, h * 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('HQ', e.x, e.y + 6);
  // radar dish
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(e.x + h - 14, e.y - h + 14, 8, Math.PI * 0.8, Math.PI * 1.9); ctx.stroke();
  for (const [cx, cy] of [[-1, -1], [1, 1], [-1, 1]]) {
    ctx.fillStyle = c.color; ctx.fillRect(e.x + cx * (h - 10) - 4, e.y + cy * (h - 10) - 4, 8, 8);
  }
}

function drawBarracks(e) {
  const c = TEAMS[e.team], h = e.size / 2;
  if (!e.built) {
    ctx.fillStyle = 'rgba(120,95,60,0.85)'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = c.light; ctx.lineWidth = 2;
    ctx.strokeRect(e.x - h, e.y - h, e.size, e.size); ctx.setLineDash([]);
    // walls rising as it builds
    const k = e.progress;
    ctx.fillStyle = c.dark; ctx.fillRect(e.x - h + 6, e.y + h - 6 - (e.size - 12) * k, e.size - 12, (e.size - 12) * k);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(Math.floor(k * 100) + '%', e.x, e.y + 5);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(e.x - h + 5, e.y - h + 6, e.size, e.size);
  ctx.fillStyle = '#7a7466'; ctx.fillRect(e.x - h, e.y - h, e.size, e.size);
  ctx.fillStyle = c.dark; ctx.fillRect(e.x - h + 6, e.y - h + 6, e.size - 12, e.size - 12);
  ctx.fillStyle = c.color;
  for (let i = 0; i < 3; i++) ctx.fillRect(e.x - h + 10, e.y - h + 12 + i * 18, e.size - 20, 9);
  // door
  const dir = e.team === 0 ? -1 : 1;
  ctx.fillStyle = '#222'; ctx.fillRect(e.x - 9, dir < 0 ? e.y - h : e.y + h - 8, 18, 8);
  // flag
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(e.x + h - 8, e.y - h + 4); ctx.lineTo(e.x + h - 8, e.y - h - 18); ctx.stroke();
  ctx.fillStyle = c.color; ctx.fillRect(e.x + h - 8, e.y - h - 18, 14, 9);
  if (e.queue > 0) {
    const k = e.trainT / STATS.barracks.trainTime;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - h, e.y + h + 4, e.size, 6);
    ctx.fillStyle = '#ffd86b'; ctx.fillRect(e.x - h, e.y + h + 4, e.size * k, 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('×' + e.queue, e.x, e.y + h + 22);
  }
}

// ---------- Input (touch + mouse) ----------
const pointer = { down: false, sx: 0, sy: 0, box: null, overX: null, overY: null, dragging: false };

function hitTest(x, y) {
  const slop = 14 / view.scale;  // easier to tap small things on a phone
  let best = null, bestD = Infinity;
  for (const e of game.ents) {
    const d = edgeDist(x, y, e);
    const lim = isBuilding(e) ? 0.01 : slop;
    if (d <= lim) {
      const score = (isUnit(e) ? 0 : 1000) + d;   // prefer units over buildings
      if (score < bestD) { bestD = score; best = e; }
    }
  }
  return best;
}

canvas.addEventListener('pointerdown', ev => {
  if (game.over) return;
  canvas.setPointerCapture(ev.pointerId);
  pointer.down = true; pointer.dragging = false;
  pointer.sx = ev.clientX; pointer.sy = ev.clientY;
  const p = toWorld(ev.clientX, ev.clientY);
  pointer.overX = p.x; pointer.overY = p.y;
});

canvas.addEventListener('pointermove', ev => {
  const p = toWorld(ev.clientX, ev.clientY);
  pointer.overX = p.x; pointer.overY = p.y;
  if (!pointer.down || game.placing) return;
  if (!pointer.dragging && Math.hypot(ev.clientX - pointer.sx, ev.clientY - pointer.sy) > 14) pointer.dragging = true;
  if (pointer.dragging) {
    const a = toWorld(pointer.sx, pointer.sy);
    pointer.box = { x1: Math.min(a.x, p.x), y1: Math.min(a.y, p.y), x2: Math.max(a.x, p.x), y2: Math.max(a.y, p.y) };
  }
});

canvas.addEventListener('pointerup', ev => {
  if (!pointer.down) return;
  pointer.down = false;
  const p = toWorld(ev.clientX, ev.clientY);

  if (pointer.box) {   // drag-box selects your units
    const b = pointer.box; pointer.box = null;
    const inside = game.ents.filter(e => e.team === 0 && isUnit(e) && e.x >= b.x1 && e.x <= b.x2 && e.y >= b.y1 && e.y <= b.y2);
    if (inside.length) game.selected = new Set(inside.map(e => e.id));
    return;
  }
  handleTap(p.x, p.y);
});

canvas.addEventListener('pointercancel', () => { pointer.down = false; pointer.box = null; });

function handleTap(x, y) {
  if (game.paused) return;

  if (game.placing) {
    if (placeBarracks(0, x, y)) game.placing = false;
    return;
  }

  const hit = hitTest(x, y);
  const myUnits = [...game.selected].map(byId).filter(e => e && e.team === 0 && isUnit(e));

  if (hit && hit.team === 0) {
    game.selected = new Set([hit.id]);
    return;
  }
  if (hit && hit.team === 1) {
    const soldiers = myUnits.filter(e => e.type === 'soldier');
    if (soldiers.length) {
      for (const s of soldiers) s.order = { type: 'attack', target: hit.id };
      game.effects.push({ kind: 'marker', x: hit.x, y: hit.y, t: 0 });
    }
    return;
  }
  // tapped empty ground
  if (myUnits.length) {
    const cols = Math.ceil(Math.sqrt(myUnits.length));
    myUnits.forEach((u, i) => {
      const gx = (i % cols) - (cols - 1) / 2, gy = Math.floor(i / cols) - (Math.ceil(myUnits.length / cols) - 1) / 2;
      u.order = { type: 'move', x: x + gx * 22, y: y + gy * 22 };
    });
    game.effects.push({ kind: 'marker', x, y, t: 0 });
  } else {
    game.selected.clear();
  }
}

const selectedOfType = type => [...game.selected].map(byId).filter(e => e && e.team === 0 && e.type === type);

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const ui = {
  credits: $('credits'), enemy: $('enemyInfo'), info: $('info'),
  deploy: $('btnDeploy'), build: $('btnBuild'), train: $('btnTrain'), cancel: $('btnCancel'), deselect: $('btnDeselect'),
  all: $('btnAll'), pause: $('btnPause'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovBtn: $('ovBtn'),
};
const show = (el, on) => { el.style.display = on ? '' : 'none'; };

ui.deploy.addEventListener('click', () => {
  const st = selectedOfType('settler')[0];
  if (st && !deploy(st)) ui.info.textContent = 'Not enough room to deploy here — move the settler';
});
ui.build.addEventListener('click', () => { if (hqOf(0)) game.placing = true; });
ui.cancel.addEventListener('click', () => { game.placing = false; });
ui.train.addEventListener('click', () => { for (const b of selectedOfType('barracks')) train(b); });
ui.deselect.addEventListener('click', () => { game.selected.clear(); game.placing = false; });
ui.all.addEventListener('click', () => {
  game.placing = false;
  game.selected = new Set(game.ents.filter(e => e.team === 0 && e.type === 'soldier').map(e => e.id));
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

function updateHUD() {
  ui.credits.textContent = '$' + Math.floor(game.credits[0]);
  const enemy = game.ents.filter(e => e.team === 1);
  ui.enemy.textContent = `Enemy: ${enemy.filter(e => e.type === 'soldier').length} soldiers, ${enemy.filter(e => e.type === 'barracks').length} barracks`;

  const sel = [...game.selected].map(byId).filter(Boolean);
  const settler = sel.find(e => e.type === 'settler');
  const hq = sel.find(e => e.type === 'hq');
  const barracks = sel.find(e => e.type === 'barracks');
  const soldiers = sel.filter(e => e.type === 'soldier');

  show(ui.deploy, !!settler);
  show(ui.build, !!hq && !game.placing);
  show(ui.cancel, game.placing);
  show(ui.train, !!barracks);
  show(ui.deselect, sel.length > 0);
  ui.build.disabled = game.credits[0] < COST.barracks;
  ui.train.disabled = !barracks || !barracks.built || barracks.queue >= STATS.barracks.maxQueue || game.credits[0] < COST.soldier;

  let text;
  if (game.paused) text = 'Paused';
  else if (game.placing) text = 'Tap the map to place your barracks';
  else if (settler) text = 'Settler — move it somewhere open, then deploy';
  else if (hq) text = 'Headquarters';
  else if (barracks) text = barracks.built ? `Barracks${barracks.queue ? ' — training ×' + barracks.queue : ''}` : `Barracks: ${Math.floor(barracks.progress * 100)}% built`;
  else if (soldiers.length) text = `${soldiers.length} soldier${soldiers.length > 1 ? 's' : ''} — tap ground to move, tap enemy to attack`;
  else text = hqOf(0) ? 'Tap a unit or building' : 'Tap your settler to begin';
  ui.info.textContent = text;
}

function endGame(won) {
  game.over = won ? 'win' : 'lose';
  game.selected.clear(); game.placing = false;
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

newGame();
game.paused = true;
ui.ovTitle.textContent = 'Mini RTS';
ui.ovText.textContent = 'Tap your blue settler and deploy it into a headquarters. Use the HQ to build a barracks, train soldiers and destroy the red base. Drag across the map to select several units. Best played in landscape.';
ui.ovBtn.textContent = 'Start';
ui.overlay.style.display = 'flex';
requestAnimationFrame(frame);
