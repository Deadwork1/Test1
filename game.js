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
    forests: [[520, 560, 240, 135, -0.15], [1010, 1270, 85], [800, 230, 90]],   // [x, y, r] or a jungle [x, y, rx, ry, tilt]
    plateaus: [{ x: 930, y: 470, rx: 175, ry: 130, tilt: 0.2, ramps: [3.0, 1.5] }],   // high ground: cliff all round except the ramps
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
    forests: [[1100, 950, 270, 200, 0.35], [200, 600, 130], [1500, 1900, 120], [1150, 330, 120]],   // the big jungle sits on the routes between the bases
    plateaus: [{ x: 1420, y: 1660, rx: 210, ry: 140, tilt: -0.25, ramps: [3.4, 0.2] }, { x: 560, y: 380, rx: 170, ry: 120, tilt: 0.3, ramps: [1.7] }],
    river: { amp: 90, period: 320, half: 40 },
    bridges: [{ y: 300, hw: 70 }, { y: 620, hw: 70 }],
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
      [[[930, 1040], [1200, 1200]], 30],                  // outcrop by the flank field
      [[[2000, 610], [2190, 640]], 30],                   // ridge across the road from the bridge plateau (the pinch onto the bridge)
      [[[780, 1520], [940, 1700]], 28],                   // rocks by the north expansion
      [[[600, 700], [640, 1000]], 28],                    // rocks shielding the far corner
      [[[1950, 2500], [2080, 2700]], 30],                 // rocks by the south bridge
    ],
    forests: [[1470, 1250, 360, 250, 0.35], [270, 820, 160], [1530, 420, 160], [980, 1950, 130], [1700, 1500, 110]],   // the big jungle sits on the routes between the bases
    plateaus: [
      { x: 1979, y: 1806, rx: 250, ry: 165, tilt: 0.94, ramps: [2.51], overhang: true },   // lookout over the island, close to its west bridge: juts out over the river   // lookout over the island: juts out over the river
      { x: 1450, y: 1690, rx: 190, ry: 130, tilt: -0.6, ramps: [2.3] },   // beside the main road to the island's west bridge: with the river lookout it squeezes the road into a pinch about 150 wide
      { x: 2060, y: 290, rx: 160, ry: 110, tilt: 0.1, ramps: [3.4] },     // overlooks the river bridge above the island; with the ridge below it, pinches the road onto the bridge
    ],
    river: { amp: 110, period: 420, half: 44 },
    bridges: [{ y: 480, hw: 74 }],   // one crossing above the island (and its mirror below), plus the two island bridges
    // neutral villages: an Oil Derrick and a few houses. This one (and its mirror) is about as far from both bases.
    villages: [{ x: 1880, y: 560, derrick: [0, 0], houses: [[-100, -62], [96, -58], [-84, 82]] }],
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

const COST = { barracks: 300, refinery: 400, factory: 500, power: 200, tower: 500, wall: 20, gate: 150, soldier: 100, extractor: 150, buggy: 250, grenadier: 160, engineer: 75, rocket: 200, sniper: 200, light: 400, heavy: 700, artillery: 450, tech: 600, radar: 300 };
const WALL_REACH = 150;              // walls, gates and guard towers can go this much further out than other buildings

const STATS = {
  settler:   { hp: 200, speed: 38, r: 16, sight: 180 },
  soldier:   { hp: 60,  speed: 52, r: 9,  sight: 170, range: 85, dmg: 7, cooldown: 0.8 },
  extractor: { hp: 300, speed: 34, r: 15, sight: 150, capacity: 150, rate: 30, unloadTime: 1.5 },
  buggy:     { hp: 140, speed: 95, r: 13, sight: 220, range: 110, dmg: 5,  cooldown: 0.25 },   // fast, machine gun
  light:     { hp: 350, speed: 60, r: 15, sight: 200, range: 130, dmg: 30, cooldown: 1.5, tank: true },   // light tank: all-rounder
  heavy:     { hp: 1000, speed: 40, r: 19, sight: 210, range: 140, dmg: 60, cooldown: 2.0, tank: true },   // heavy tank: slow, very tough
  // artillery: very slow and fragile, but its shells fly further than a guard tower can shoot and wreck buildings.
  // It can only fire at what your side can see (its own sight is short), can't hit anything too close, and the
  // shells take a while to land, so moving units can dodge them.
  artillery: { hp: 120, speed: 28, r: 13, sight: 150, range: 250, minRange: 80, dmg: 45, cooldown: 4, siege: true, splash: 40, flight: 1.3, spread: 14, vsBuilding: 3, vsVehicle: 0.6 },
  sniper:    { hp: 45,  speed: 46, r: 9,  sight: 220, range: 160, dmg: 75, cooldown: 2.7, vsVehicle: 0.15, vsBuilding: 0.1, reveal: 0.5 },   // one-shots infantry from far away; useless vs vehicles
  rocket:    { hp: 55,  speed: 45, r: 9,  sight: 170, range: 130, dmg: 40, cooldown: 2.5, rocket: true, vsVehicle: 2, vsHeavy: 1.5, vsBuilding: 2, vsInfantry: 0.4 },   // anti-vehicle: double vs vehicles & buildings, weak vs infantry
  grenadier: { hp: 55,  speed: 48, r: 9,  sight: 170, range: 95,  dmg: 16, cooldown: 2.0, splash: 38, flight: 0.55, vsVehicle: 0.5 },   // lobbed grenades: area damage, half vs vehicles
  engineer:  { hp: 20,  speed: 48, r: 9,  sight: 150, repair: 30 },
  civilian:  { hp: 40,  speed: 50, r: 8,  sight: 150, range: 75, dmg: 4, cooldown: 0.9 },   // villagers with handguns: weaker than a soldier, can't be bought   // no weapon, very fragile: repairs (hp per second) and captures
  hq:        { hp: 900, size: 92, sight: 280 },
  barracks:  { hp: 500, size: 74, sight: 200, buildTime: 10, trainTime: 4, maxQueue: 5 },
  refinery:  { hp: 600, size: 84, sight: 200, buildTime: 12, trainTime: 6, maxQueue: 3 },
  factory:   { hp: 800, size: 90, sight: 200, buildTime: 14, trainTime: 7, maxQueue: 3 },
  tech:      { hp: 600, size: 70, sight: 180, buildTime: 16 },
  power:     { hp: 400, size: 60, sight: 160, buildTime: 10 },
  tower:     { hp: 700, size: 46, sight: 230, buildTime: 12, range: 170, dmg: 14, cooldown: 0.9 },
  radar:     { hp: 400, size: 64, sight: 750, buildTime: 14, radar: true },   // sweeps a huge circle: sees over rocks and up onto plateaus (not into forests)
  wall:      { hp: 400, size: 25, sight: 50 },
  gate:      { hp: 600, size: 50, sight: 60 },
  // neutral buildings: they start out belonging to no one (team 2) and can't be hurt while neutral
  derrick:   { hp: 600, size: 64, sight: 160, pay: 100, payEvery: 15 },   // an Engineer captures it; then it pays its owner every 15s
  house:     { hp: 400, size: 42, sight: 0 },                             // village houses: scenery for now
};
const PRODUCES = { barracks: ['soldier', 'grenadier', 'rocket', 'sniper', 'engineer'], refinery: ['extractor'], factory: ['buggy', 'light', 'artillery', 'heavy'] };
// Tech tree: what else you need (finished, and still standing) before you can build or train something
const REQUIRES = { factory: ['barracks', 'refinery'], tech: ['factory'], grenadier: ['power'], rocket: ['power'], sniper: ['tower'], heavy: ['tech'], artillery: ['power'], radar: ['power'] };
const hasBuilt = (team, type) => game.ents.some(b => b.team === team && b.type === type && b.built);
const missingFor = (team, type) => (REQUIRES[type] || []).filter(t => !hasBuilt(team, t));
const unlocked = (team, type) => missingFor(team, type).length === 0;
const TRAIN_TIME = { soldier: 4, buggy: 6, extractor: 6, grenadier: 4.5, engineer: 5, rocket: 5, sniper: 6, light: 10, heavy: 16, artillery: 12 };   // seconds to make each unit
const isCombat = e => e.type === 'civilian' || e.type === 'soldier' || e.type === 'buggy' || e.type === 'grenadier' || e.type === 'rocket' || e.type === 'sniper' || e.type === 'light' || e.type === 'heavy' || e.type === 'artillery';
const isTank = e => e.type === 'light' || e.type === 'heavy';
const isInfantry = e => e.type === 'civilian' || e.type === 'soldier' || e.type === 'grenadier' || e.type === 'engineer' || e.type === 'rocket' || e.type === 'sniper';
const SHORT = { buggy: 'Buggy', rocket: 'Rocket', sniper: 'Sniper', light: 'Light Tank', heavy: 'Heavy Tank', artillery: 'Artillery', tech: 'Tech Centre' };   // shorter names for buttons

// How the computer plays at each difficulty.
//  think: seconds between decisions   slow: build/train time multiplier   income: share of ore value it earns
//  attackAt: army size before it attacks   attackAfter: earliest attack (seconds)   barracks: max barracks
//  maxArmy: it stops training soldiers at this many   guard: units it keeps at home   maxWave: biggest attack wave
//  extractors / refineries: how big its economy gets   walls: whether it builds a wall line with a gate
const DIFFICULTY = {
  easy:   { label: 'Easy',   think: 2.5, slow: 1.5,  income: 0.7,  attackAt: 5, attackAfter: 300, barracks: 1, maxArmy: 11, towers: 0, buggies: false, plants: 0,
            guard: 1, maxWave: 6, extractors: 2, refineries: 1, walls: false, grenadiers: false, engineers: 0, rockets: false, snipers: 0, factory: false, tanks: 0, heavyTanks: false, artillery: 0, raidEvery: 0, waveEvery: 240, minWave: 3, focus: 'nearest',
            derricks: true, derrickAfter: 480, escort: 2, garrison: 1, hill: 0, hillSize: 0, hillAfter: 0 },
  normal: { label: 'Normal', think: 1.5, slow: 1.18, income: 0.85, attackAt: 7, attackAfter: 180, barracks: 1, maxArmy: 20, towers: 2, buggies: true, plants: 1,
            guard: 3, maxWave: 14, extractors: 4, refineries: 2, walls: true, grenadiers: true, engineers: 1, rockets: true, snipers: 1, factory: true, tanks: 0.25, heavyTanks: false, artillery: 1, raidEvery: 240, waveEvery: 180, minWave: 4, focus: 'economy',
            derricks: true, derrickAfter: 360, escort: 3, garrison: 2, hill: 1, hillSize: 3, hillAfter: 420 },
  hard:   { label: 'Hard',   think: 1,   slow: 1,    income: 1,    attackAt: 6, attackAfter: 0,   barracks: 2, maxArmy: Infinity, towers: 3, buggies: true, plants: 2,
            guard: 4, maxWave: 30, extractors: 8, refineries: 3, walls: true, grenadiers: true, engineers: 1, rockets: true, snipers: 2, factory: true, tanks: 0.35, heavyTanks: true, artillery: 2, raidEvery: 180, earlyRefinery: true, expandAt: 1500, waveEvery: 120, minWave: 5, focus: 'defences',
            derricks: true, derrickAfter: 300, escort: 3, garrison: 3, hill: 2, hillSize: 3, hillAfter: 360 },
};
let difficulty = 'normal';
try { if (DIFFICULTY[localStorage.getItem('mini-rts-difficulty')]) difficulty = localStorage.getItem('mini-rts-difficulty'); } catch (err) {}
const diff = () => DIFFICULTY[difficulty];
// Power Plants: each finished one makes building and training 25% faster, up to double speed
const POWER_BONUS = 0.25, POWER_MAX = 2;
const powerBoost = team => Math.min(POWER_MAX, 1 + POWER_BONUS * game.ents.filter(b => b.team === team && b.type === 'power' && b.built).length);
// how many times longer than normal this side takes to build things (difficulty slow-down ÷ power boost)
const slowOf = e => (e.team === 1 ? diff().slow : 1) / powerBoost(e.team);
const NAMES = { settler: 'Settler', soldier: 'Soldier', extractor: 'Extractor', hq: 'Headquarters', barracks: 'Barracks', refinery: 'Refinery', factory: 'War Factory', buggy: 'Scout Buggy', grenadier: 'Grenadier', engineer: 'Engineer', rocket: 'Rocket Soldier', sniper: 'Sniper', light: 'Light Tank', heavy: 'Heavy Tank', artillery: 'Artillery', tech: 'Tech Centre', tower: 'Guard Tower', power: 'Power Plant', radar: 'Radar', wall: 'Wall', gate: 'Gate', derrick: 'Oil Derrick', house: 'House', civilian: 'Civilian' };

const TEAMS = [
  { name: 'You',   color: '#3b82f6', dark: '#1d3f8f', light: '#93c5fd' },
  { name: 'Enemy', color: '#ef4444', dark: '#8f1d1d', light: '#fca5a5' },
  { name: 'Neutral', color: '#b8b2a6', dark: '#5f5a52', light: '#e7e5e4' },
];
const NEUTRAL = 2;
const isNeutralType = t => t === 'derrick' || t === 'house';
const START = [{ x: MAP.start.x, y: MAP.start.y }, { x: W - MAP.start.x, y: H - MAP.start.y }];

// ore fields: a small one by each base, a big rich one in the middle, two on the flanks
const ORE_FIELDS = [
  ...MAP.fields.flatMap(f => [f, { ...f, x: W - f.x, y: H - f.y }]),
  { x: W / 2, y: H / 2, nodes: MAP.island.nodes, amount: MAP.island.amount, spread: MAP.island.spread, ring: MAP.island.ring, inner: MAP.island.inner },
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
const T = { GRASS: 0, ROCK: 1, WATER: 2, BRIDGE: 3, FOREST: 4, CLIFF: 5 };
const terrain = new Uint8Array(TCOLS * TROWS);
const elev = new Uint8Array(TCOLS * TROWS);   // 1 = high ground (plateau tops and their ramps)

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
  const plateaus = [];
  for (const pl of MAP.plateaus || []) { plateaus.push(pl); const [x, y] = mirror([pl.x, pl.y]); plateaus.push({ ...pl, x, y, ramps: pl.ramps.map(a => a + Math.PI) }); }
  const overhung = (x, y) => plateaus.some(pl => pl.overhang && Math.hypot(x - pl.x, y - pl.y) < Math.max(pl.rx, pl.ry) + 10);
  const forests = [];
  for (const f of FORESTS) {   // a circle [x, y, r] or an oval jungle [x, y, rx, ry, tilt]
    const g = f.length === 3 ? [f[0], f[1], f[2], f[2], 0] : f;
    forests.push(g); const [x, y] = mirror(g); forests.push([x, y, g[2], g[3], g[4]]);
  }
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
      // high ground: inside the oval is raised; its rim is a sheer cliff except where a ramp leads up
      for (const pl of plateaus) {
        const dx = x - pl.x, dy = y - pl.y, co = Math.cos(pl.tilt), si = Math.sin(pl.tilt);
        const u = (dx * co + dy * si) / pl.rx, v = (-dx * si + dy * co) / pl.ry, a = Math.atan2(v, u);
        const edge = 1 + 0.07 * Math.sin(a * 4 + pl.x) + 0.04 * Math.sin(a * 9 + pl.y), d = Math.hypot(u, v) / edge;
        const rimW = 42 / Math.min(pl.rx, pl.ry);   // thick enough that the cliff never has holes
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
      if (Math.abs(dI - ISLAND.r) < 34 || (Math.abs(x - riverX(y)) < MAP.river.half && dI > ISLAND.r)) {
        if (!(elev[r * TCOLS + c] && overhung(x, y))) t = T.WATER;   // a lookout plateau's rock juts out over the river here
      }
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
})();

const elevAt = (x, y) => { const c = Math.floor(x / TC), r = Math.floor(y / TC); return c < 0 || r < 0 || c >= TCOLS || r >= TROWS ? 0 : elev[r * TCOLS + c]; };
const HIGH_SIGHT = 1.25, HIGH_RANGE = 1.2;   // seeing and shooting from high ground
const UPHILL = 0.5;   // shooting up at high ground from below only does half damage (grenades and artillery shells are lobbed, so they don't lose any)
const uphill = (x, y, t) => !elevAt(x, y) && elevAt(t.x, t.y) ? UPHILL : 1;
const FOREST_SIGHT = 0.7;   // units standing in a forest can't see as far through the trees
const rangeOf = e => STATS[e.type].range * (elevAt(e.x, e.y) ? HIGH_RANGE : 1);
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
  bldList = game.ents.filter(isBuilding);
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
    for (let r = Math.floor((b.y - h - CLEAR_V) / TC); r <= Math.floor((b.y + h + CLEAR_V) / TC); r++) {
      for (let c = Math.floor((b.x - h - CLEAR_V) / TC); c <= Math.floor((b.x + h + CLEAR_V) / TC); c++) {
        if (c < 0 || r < 0 || c >= TCOLS || r >= TROWS) continue;
        const cx = c * TC + TC / 2, cy = r * TC + TC / 2;
        if (Math.abs(cx - b.x) < h + CLEAR && Math.abs(cy - b.y) < h + CLEAR) bldGrid[r * TCOLS + c] = 1;
        if (Math.abs(cx - b.x) < h + CLEAR_V && Math.abs(cy - b.y) < h + CLEAR_V) bldGridV[r * TCOLS + c] = 1;
      }
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
  if (moveToward(e, p.x, p.y, dt)) { nav.i++; if (nav.i >= nav.path.length) return true; }
  return false;
}

// ---------- Background (drawn once) ----------
const bg = document.createElement('canvas');
(function drawBackground() {
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');
  try { paintAll(); } catch (err) { console.warn('background art failed, using a plain one', err); }   // the game still runs
  function paintAll() {
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
  // Smooth shapes: the tile grid is blurred and cut at a level, so rocks, water and forest come out as one
  // continuous shape with soft natural edges instead of a pile of circles. Level < 0.5 grows the shape, > 0.5 shrinks it.
  const HS = 2;   // masks are made at half size (edges are smooth anyway)
  const small = document.createElement('canvas'); small.width = TCOLS; small.height = TROWS;
  const allMasks = [], keep = m => { m.keep = true; return m; };
  const free = c => { c.width = c.height = 0; };   // hand the memory back straight away
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;   // one scratch canvas reused for every layer
  function mask(types, blur, level) {
    const sc = small.getContext('2d'), img = sc.createImageData(TCOLS, TROWS);
    const pick = typeof types === 'function' ? types : i => types.includes(terrain[i]);
    for (let i = 0; i < terrain.length; i++) if (pick(i)) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = img.data[i * 4 + 3] = 255; }
    sc.putImageData(img, 0, 0);
    const m = document.createElement('canvas'); m.width = W / HS; m.height = H / HS; allMasks.push(m);
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
    tc.save(); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H);
    if (typeof fill === 'string') { tc.fillStyle = fill; tc.fillRect(0, 0, W, H); } else fill(tc);
    tc.globalCompositeOperation = 'destination-in'; tc.imageSmoothingEnabled = true;
    tc.drawImage(m, 0, 0, W, H);
    tc.restore();
    b.drawImage(t, dx, dy);
    if (!m.keep) free(m);
  }
  const speckle = (base, cols, n, rMin, rMax) => tc => {
    tc.fillStyle = base; tc.fillRect(0, 0, W, H);
    for (let i = 0; i < n * (W * H) / (2400 * 1500); i++) {
      tc.fillStyle = cols[Math.floor(rnd() * cols.length)];
      tc.beginPath(); tc.ellipse(rnd() * W, rnd() * H, rMin + rnd() * (rMax - rMin), (rMin + rnd() * (rMax - rMin)) * 0.6, rnd() * 3, 0, Math.PI * 2); tc.fill();
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
    for (let i = 0; i < 900 * (W * H) / (2400 * 1500); i++) {
      const x = rnd() * W, y = rnd() * H, l = 6 + rnd() * 14;
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
    for (let i = 0; i < 4000 * (W * H) / (2400 * 1500); i++) { const x = rnd() * W, y = rnd() * H; tc.beginPath(); tc.moveTo(x, y); tc.lineTo(x + (rnd() - .5) * 4, y + 6 + rnd() * 8); tc.stroke(); }
  };
  for (let k = 22; k > 0; k -= 6) paint(face, crag, 0, k);                                       // cliff face, seen from the south (several layers = height)
  paint(face, tc => { tc.fillStyle = 'rgba(0,0,0,0.3)'; tc.fillRect(0, 0, W, H); }, 0, 22);
  paint(top, speckle('#577a3c', ['#5f8442', '#4e6f35', '#668a48'], 1500, 6, 26));              // the raised top
  paint(mask([T.CLIFF], 8, 0.5), crag);                                                        // rough rim
  paint(mask([T.CLIFF], 8, 0.62), tc => { tc.fillStyle = 'rgba(190,175,150,0.35)'; tc.fillRect(0, 0, W, H); }, -2, -3);   // sunlit lip
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
  const body = keep(mask(rockTypes, 16, 0.5));
  paint(mask(rockTypes, 16, 0.44), 'rgba(0,0,0,0.42)', 8, 11);  // shadow on the ground
  paint(body, '#4c4741', 0, 4);                                // dark lower face
  paint(body, '#a49e91', -2, -3);                              // light upper rim
  paint(body, speckle('#6e685f', ['#77716a', '#625d55', '#7c766c'], 900, 4, 14));
  paint(mask(rockTypes, 24, 0.66), speckle('#878175', ['#918b7f', '#7d776c', '#9a9487'], 700, 3, 10), -2, -3);   // weathered top
  paint(body, tc => {                                          // cracks
    tc.strokeStyle = 'rgba(40,36,32,0.45)'; tc.lineWidth = 1.5;
    for (let i = 0; i < 1600 * (W * H) / (2400 * 1500); i++) {
      let x = rnd() * W, y = rnd() * H; tc.beginPath(); tc.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += (rnd() - .5) * 14; y += 4 + rnd() * 6; tc.lineTo(x, y); }
      tc.stroke();
    }
  });
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
    track(dx0, dy0, dx0 + 40 * k, dy0 + 230 * k, 12);
  }
  b.strokeStyle = 'rgba(0,0,0,0.5)'; b.lineWidth = 6; b.strokeRect(3, 3, W - 6, H - 6);
  for (const m of allMasks) free(m);
  free(tmp);
  }
})();

// a small copy of the background for the minimap (much cheaper to draw every frame)
const mmBg = document.createElement('canvas');
mmBg.width = 400; mmBg.height = Math.round(400 * H / W);
mmBg.getContext('2d').drawImage(bg, 0, 0, mmBg.width, mmBg.height);

// ---------- Game state ----------
let game;

function newGame() {
  game = {
    ents: [], ore: [], nextId: 1, time: 0, grenades: [], rockets: [],
    lost: [[], []],          // ids of each side's buildings that enemy engineers have taken (to win back)
    stats: [0, 1].map(() => ({ units: 0, buildings: 0, walls: 0, kills: 0, destroyed: 0, unitsLost: 0, buildingsLost: 0, earned: 0, spent: 0, captured: 0 })),
    credits: [START_CREDITS, START_CREDITS],
    selected: new Set(),
    placing: null,           // { type, ghost:{x,y} } while choosing where to build
    effects: [],
    over: null, paused: false,
    ai: { timer: 0, attacking: false, known: new Map(), scout: null, exploreTarget: null },
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
        game.ore.push({ id: game.nextId++, x, y, amount: f.amount, max: f.amount, rot });
        game.ore.push({ id: game.nextId++, x: W - x, y: H - y, amount: f.amount, max: f.amount, rot: rot + 3 });
      }
      for (let i = 0; i < (f.inner || 0) / 2; i++) {   // and more scattered across the middle, also in mirrored pairs
        let x, y, tries = 0;
        do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (f.ring[0] - 10); x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d; }
        while ((terrainAt(x, y) !== T.GRASS || Math.hypot(x - f.x, y - f.y) < 30 || game.ore.some(o => Math.hypot(o.x - x, o.y - y) < 50)) && ++tries < 40);
        const rot = rnd() * 6;
        game.ore.push({ id: game.nextId++, x, y, amount: f.amount, max: f.amount, rot });
        game.ore.push({ id: game.nextId++, x: W - x, y: H - y, amount: f.amount, max: f.amount, rot: rot + 3 });
      }
      continue;
    }
    for (let i = 0; i < f.nodes; i++) {
      let x, y, tries = 0;
      do { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * f.spread; x = f.x + Math.cos(a) * d; y = f.y + Math.sin(a) * d; }
      while (terrainAt(x, y) !== T.GRASS && ++tries < 30);
      game.ore.push({ id: game.nextId++, x, y, amount: f.amount, max: f.amount, rot: rnd() * 6 });
    }
  }
  for (const v of MAP.villages || []) for (const [vx, vy] of [[v.x, v.y], mirror([v.x, v.y])]) {
    const k = vx === v.x ? 1 : -1;   // the mirrored village is turned round too
    spawn('derrick', NEUTRAL, vx + v.derrick[0] * k, vy + v.derrick[1] * k);
    v.houses.forEach(([dx, dy], i) => { spawn('house', NEUTRAL, vx + dx * k, vy + dy * k).look = i % 3; });
  }
  spawn('settler', 0, START[0].x, START[0].y);
  spawn('settler', 1, START[1].x, START[1].y);
  cam.x = START[0].x; cam.y = START[0].y; setZoom(1); clampCam();
  updateFog();
}

const spend = (team, n) => { game.credits[team] -= n; if (game.stats[team]) game.stats[team].spent += n; };
const earn = (team, n) => { game.credits[team] += n; if (game.stats[team]) game.stats[team].earned += n; };

function spawn(type, team, x, y) {
  const s = STATS[type];
  const e = { id: game.nextId++, type, team, x, y, hp: s.hp, maxHp: s.hp, order: null,
              cooldown: 0, facing: team === 0 ? -0.6 : 2.5 };
  if (isBuildingType(type)) {
    bldDirty = true;
    e.size = s.size;
    if (type === 'hq' || isWallType(type) || isNeutralType(type)) { e.built = true; e.progress = 1; }   // walls go up instantly
    else { e.built = false; e.progress = 0; e.hp = s.hp * 0.1; }
    e.queue = 0; e.trainT = 0; e.qTypes = [];
  } else {
    e.r = s.r;
    if (type === 'extractor') e.cargo = 0;
  }
  game.ents.push(e);
  return e;
}

function isBuildingType(t) { return t === 'derrick' || t === 'house' || t === 'hq' || t === 'barracks' || t === 'refinery' || t === 'factory' || t === 'tech' || t === 'power' || t === 'tower' || t === 'radar' || t === 'wall' || t === 'gate'; }
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
      if (o === e || !isUnit(o) || o.docked || o.hp <= 0) continue;
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
        const sx = ux + -uy * side * k, sy = uy + ux * side * k, sl = Math.hypot(sx, sy);
        const nx = e.x + sx / sl * step, ny = e.y + sy / sl * step;
        if (walkable(terrainAt(nx, ny), isVehicle(e)) && !wallBlocks(nx, ny, e.team) && !game.ents.some(b => isBuilding(b) && edgeDist(nx, ny, b) < e.r)) { ux = sx / sl; uy = sy / sl; }
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
  for (const f of fog) f.vis.fill(0);
  for (const e of game.ents) {
    if (e.team === NEUTRAL) continue;
    const f = fog[e.team];
    if (STATS[e.type].radar && e.built) { for (const i of radarCells(e.x, e.y, STATS[e.type].sight)) { f.vis[i] = 1; f.exp[i] = 1; } continue; }
    const r = STATS[e.type].sight * (isBuilding(e) && !e.built ? 0.6 : 1) * (elevAt(e.x, e.y) ? HIGH_SIGHT : 1) * (isUnit(e) && terrainAt(e.x, e.y) === T.FOREST ? FOREST_SIGHT : 1);
    for (const i of visibleCells(e.x, e.y, r)) { f.vis[i] = 1; f.exp[i] = 1; }
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
  return game.ents.filter(b => b.team === team && isBuilding(b) && b.built && !isWallType(b.type) && !isNeutralType(b.type))
    .map(b => ({ x: b.x, y: b.y, r: b.size / 2 + (b.type === 'hq' ? BUILD_RADIUS : BUILD_RADIUS_OTHER), b }));
}
function inBuildArea(team, x, y, extra = 0) {
  if (!hqOf(team)) return false;   // the HQ does the building
  return buildAreaSources(team).some(s => edgeDist(x, y, s.b) <= s.r - s.b.size / 2 + extra);
}

function canPlace(team, type, x, y) {
  const size = STATS[type].size;
  if (!unlocked(team, type)) return false;
  if (!inBuildArea(team, x, y, type === 'tower' ? WALL_REACH : 0) || !siteIsFree(x, y, size)) return false;
  if (team === 1 && diff().walls && hqOf(1)) {   // the computer keeps its planned wall lines and gates clear
    if (!game.ai.wallPlans) { const pl = findEntrances(1).map(planGapWall).filter(Boolean); game.ai.wallPlans = pl.length ? pl : [aiWallPlan(hqOf(1))]; game.ai.gateTried = []; }
    if (game.ai.wallPlans.some(pl => [...pl.tiles, pl.gate].some(t => Math.abs(t.x - x) < size / 2 + 22 && Math.abs(t.y - y) < size / 2 + 22))) return false;
  }
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
  if (!unit || !PRODUCES[b.type].includes(unit) || !unlocked(b.team, unit) || !b.built || b.queue >= STATS[b.type].maxQueue || game.credits[b.team] < COST[unit]) return false;
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
  crush(e);   // like tanks, a moving extractor runs over enemy infantry in its way
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
      earn(e.team, e.team === 1 ? Math.round(amount * diff().income) : amount); e.cargo = 0;
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
    else if (e.type === 'derrick') updateDerrick(e, dt);
    else if (isBuilding(e)) updateBuilding(e, dt);
  }

  separate();

  for (const e of game.ents) {
    if (e.team === NEUTRAL) { e.hp = e.maxHp; continue; }
    if (e.type === 'derrick' && e.hp <= 0) {
      game.effects.push({ kind: 'boom', x: e.x, y: e.y, t: 0, big: true });
      game.effects.push({ kind: 'text', x: e.x, y: e.y - 34, text: 'Derrick knocked out', t: 0, color: '#e7e5e4' });
      e.team = NEUTRAL; e.hp = e.maxHp; e.payT = 0; e.takenAt = undefined; e.target = null;
      game.ai.known.delete(e.id); bldDirty = true;
      continue;
    }
    if (e.hp <= 0) {
      if (!e.deployed && !e.sold && (e.team === 0 || e.team === 1) && !isWallType(e.type)) {
        const mine = game.stats[e.team], theirs = game.stats[1 - e.team];
        if (isBuilding(e)) { mine.buildingsLost++; theirs.destroyed++; } else { mine.unitsLost++; theirs.kills++; }
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
      if (o.team === g.team || o.hp <= 0) continue;
      const d = edgeDist(g.x, g.y, o);
      const vehicle = isUnit(o) && !isInfantry(o);
      const mult = isBuilding(o) ? (g.vsBuilding || 1) : vehicle ? (g.vsVehicle || STATS.grenadier.vsVehicle) : 1;
      if (d <= g.r) o.hp -= g.dmg * (1 - 0.5 * d / g.r) * mult;
    }
    game.effects.push({ kind: 'blast', x: g.x, y: g.y, r: g.r, t: 0, big: !!g.shell });
  }
  game.grenades = game.grenades.filter(g => !g.done);
  // rockets in flight: home in on the target and hit hard (double vs vehicles & buildings, weak vs infantry)
  for (const r of game.rockets) {
    const t = byId(r.target);
    if (t && t.hp > 0) { r.tx = t.x; r.ty = t.y; }
    const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy), step = 480 * dt;
    r.ang = Math.atan2(dy, dx); r.life -= dt;
    if (Math.random() < 0.6) game.effects.push({ kind: 'dust', x: r.x, y: r.y, t: 0.2 });
    if (d <= step + (t ? t.r || 0 : 0) * 0.5 || r.life <= 0) {
      r.done = true;
      if (t && t.hp > 0 && d <= step + 30) {
        const S = STATS.rocket;
        t.hp -= r.dmg * (isInfantry(t) ? S.vsInfantry : isBuilding(t) ? S.vsBuilding : t.type === 'heavy' ? S.vsHeavy : S.vsVehicle) * uphill(r.fromX, r.fromY, t);   // the heavy tank's thick armour shrugs off some of it
      }
      game.effects.push({ kind: 'blast', x: r.tx, y: r.ty, r: 16, t: 0 });
    } else { r.x += dx / d * step; r.y += dy / d * step; }
  }
  game.rockets = game.rockets.filter(r => !r.done);
  for (const fx of game.effects) fx.t += dt;
  game.effects = game.effects.filter(fx => fx.t < (fx.kind === 'shot' ? 0.08 : fx.kind === 'text' ? 1.2 : fx.kind === 'spark' ? 0.3 : fx.kind === 'blast' ? 0.45 : 0.6));

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
const canShoot = (e, t) => lobs(e) || clearShot(e.x, e.y, t.x, t.y);

function findEnemyNear(e, radius) {
  let best = null, bestD = radius;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || hiddenFrom(o, e.team) || isWallType(o.type) || beingRetaken(o, e.team)) continue;
    if (!visibleAt(o.x, o.y, e.team)) continue;   // can't pick a target it can't see (behind rocks or in the fog)
    if (!canShoot(e, o)) continue;   // no clear line of fire (rock in the way)
    const d = edgeDist(e.x, e.y, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// Armour: rifles (soldiers, buggy machine gun, guard towers) only do half damage to tanks;
// tank shells do half damage to infantry (but splash a little onto anyone standing next to the target). Rockets, grenades and snipers have their own rules.
const RIFLES = { soldier: 1, buggy: 1, tower: 1, civilian: 1 };   // (handguns count as rifles: half damage to tanks)
const armour = (attacker, t) => (isTank(t) && RIFLES[attacker] ? 0.5 : 1) * ((attacker === 'light' || attacker === 'heavy') && isInfantry(t) ? 0.5 : 1);
// tanks run over enemy infantry they drive into
function crush(e) {
  e.rolling = e.cx !== undefined && Math.hypot(e.x - e.cx, e.y - e.cy) > 0.2;
  if (e.rolling) {
    for (const o of game.ents) {
      if (o.team === e.team || !isInfantry(o) || o.hp <= 0) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < e.r * 0.75 + o.r * 0.5) {
        o.hp = 0;
        game.effects.push({ kind: 'text', x: o.x, y: o.y - 10, text: 'Crushed!', t: 0, color: '#ffb0a0' });
      }
    }
  }
  e.cx = e.x; e.cy = e.y;
}

// artillery picks its own targets by what it's for: guard towers first, then other buildings, then units
function findSiegeTarget(e, radius) {
  let best = null, bestScore = Infinity;
  const min = STATS[e.type].minRange || 0;
  for (const o of game.ents) {
    if (o.team === e.team || o.team === NEUTRAL || hiddenFrom(o, e.team) || (isWallType(o.type) && o.type !== 'gate') || beingRetaken(o, e.team)) continue;
    if (!visibleAt(o.x, o.y, e.team)) continue;
    const d = edgeDist(e.x, e.y, o);
    if (d > radius || (isUnit(o) && d < min)) continue;
    const score = d + (o.type === 'tower' ? 0 : isBuilding(o) ? 300 : 600);
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
    if (o.team === e.team || o.team === NEUTRAL || !isUnit(o) || isInfantry(o) || !visibleAt(o.x, o.y, e.team) || !canShoot(e, o)) continue;
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
    if (!t || t.team === e.team || t.team === NEUTRAL || hiddenFrom(t, e.team)) { e.order = o.resume || null; return; }   // gone, captured or knocked back to neutral
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
      if (navigate(e, t.x, t.y, dt) === 'fail') e.order = o.resume || null;
    } else {
      if (s.tank || s.siege) e.turret = Math.atan2(t.y - e.y, t.x - e.x);   // tanks swing the turret, not the hull
      else e.facing = Math.atan2(t.y - e.y, t.x - e.x);
      if (e.cooldown <= 0) {
        e.cooldown = s.cooldown;
        e.revealT = s.reveal || 1.5;   // firing gives away your position (snipers only briefly)
        if (isBuilding(t)) { t.hitBy = e.id; t.hitAt = game.time; }   // so the owner's units nearby can come and deal with it
        if (s.rocket) {   // rocket: flies fast and homes in, so it's hard to dodge
          game.rockets.push({ x: e.x + Math.cos(e.facing) * 12, y: e.y + Math.sin(e.facing) * 12, target: t.id, tx: t.x, ty: t.y, team: e.team, dmg: s.dmg, life: 1.5, fromX: e.x, fromY: e.y });
          e.throwT = 0.2;
        } else if (s.siege) {   // artillery shell: a long, high arc that lands near (not exactly on) the target
          const sp = isBuilding(t) ? 0 : s.spread;
          game.grenades.push({ x0: e.x + Math.cos(e.turret) * 26, y0: e.y + Math.sin(e.turret) * 26, x: t.x + (Math.random() - .5) * 2 * sp, y: t.y + (Math.random() - .5) * 2 * sp,
                               t: 0, dur: s.flight, team: e.team, dmg: s.dmg, r: s.splash, vsBuilding: s.vsBuilding, vsVehicle: s.vsVehicle, shell: true });
          game.effects.push({ kind: 'blast', x: e.x + Math.cos(e.turret) * 52, y: e.y + Math.sin(e.turret) * 52, r: 9, t: 0 });   // muzzle blast
        } else if (s.splash) {   // grenade: flies for a moment, so fast targets can dodge it
          game.grenades.push({ x0: e.x, y0: e.y, x: t.x + (Math.random() - .5) * 10, y: t.y + (Math.random() - .5) * 10,
                               t: 0, dur: s.flight, team: e.team, dmg: s.dmg, r: s.splash });
          e.throwT = 0.25;
        } else {
          t.hp -= s.dmg * (isInfantry(t) ? 1 : isBuilding(t) ? (s.vsBuilding || 1) : (s.vsVehicle || 1)) * armour(e.type, t) * uphill(e.x, e.y, t);
          if (s.tank) {   // shell burst: also nicks enemy infantry right next to the target (quarter damage)
            game.effects.push({ kind: 'blast', x: t.x, y: t.y, r: e.type === 'heavy' ? 18 : 13, t: 0 });
            for (const o of game.ents) if (o !== t && o.team !== e.team && isInfantry(o) && Math.hypot(o.x - t.x, o.y - t.y) < 22) o.hp -= s.dmg * 0.25 * armour(e.type, o) * uphill(e.x, e.y, o);
          }
          game.effects.push({ kind: 'shot', heavy: e.type === 'sniper' || !!s.tank, x: e.x, y: e.y, x2: t.x + (Math.random() - .5) * 8,
                              y2: t.y + (Math.random() - .5) * 8, team: e.team, t: 0 });
        }
        if (isCombat(t) && !t.order) t.order = { type: 'attack', target: e.id };
      }
    }
  }
}

// Engineers: walk to a building, then either repair it (yours) or capture it (theirs). They're very fragile, so escort them.
const canCapture = b => isBuilding(b) && !isWallType(b.type) && b.type !== 'tower' && b.type !== 'house' && b.type !== 'hq' && b.built;   // HQs can't be captured: losing it loses the game   // any finished building except walls, gates and guard towers
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
  b.takenAt = game.time;
  if (game.lost && was !== NEUTRAL) { game.lost[team] = game.lost[team].filter(id => id !== b.id); if (!game.lost[was].includes(b.id)) game.lost[was].push(b.id); }
  if (team === 0 || team === 1) game.stats[team].captured++;
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
  if (!t || hiddenFrom(t, e.team) || !visibleAt(t.x, t.y, e.team) || edgeDist(e.x, e.y, t) > rangeOf(e) || !canShoot(e, t)) { t = findEnemyNear(e, rangeOf(e)); e.target = t ? t.id : null; }
  if (!t) return;
  e.aim = Math.atan2(t.y - e.y, t.x - e.x);
  if (e.cooldown <= 0) {
    e.cooldown = s.cooldown;
    t.hp -= s.dmg * armour('tower', t) * uphill(e.x, e.y, t);
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
  if (game.stats[b.team]) game.stats[b.team].units++;
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
// staircase of tiles (nothing slips through diagonally) and the gate always sits on a straight 2-tile stretch,
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
  const g1 = horiz ? [m[0] - 1, m[1]] : [m[0], m[1] - 1], g2 = m;   // the gate's two tiles, side by side along the wall
  const cells = [...line4(a[0], a[1], g1[0], g1[1]), ...line4(g2[0], g2[1], b[0], b[1])];
  const blockedT = ([c, r]) => { const t = terrainAt(c * TC + TC / 2, r * TC + TC / 2); return t === T.ROCK || t === T.WATER || t === T.CLIFF; };
  const isGate = ([c, r]) => (c === g1[0] && r === g1[1]) || (c === g2[0] && r === g2[1]);
  const wallCells = cells.filter(t => !blockedT(t) && !isGate(t));
  // every piece must be buildable: open grass (no trees) and clear of ore
  const okCell = ([c, r]) => { const x = c * TC + TC / 2, y = r * TC + TC / 2;
    return terrainAt(x, y) === T.GRASS && !game.ore.some(o => Math.abs(o.x - x) < TC / 2 + 10 && Math.abs(o.y - y) < TC / 2 + 10); };
  if (!wallCells.every(okCell) || !okCell(g1) || !okCell(g2) || wallCells.length < 2) return null;
  const gate = horiz ? { x: g2[0] * TC, y: g2[1] * TC + TC / 2, vertical: false } : { x: g2[0] * TC + TC / 2, y: g2[1] * TC, vertical: true };
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
  const tiles = [], gateAt = vertical ? { x: Math.floor(cx / TC) * TC + TC / 2, y: Math.round(cy / TC) * TC }
                                      : { x: Math.round(cx / TC) * TC, y: Math.floor(cy / TC) * TC + TC / 2 };
  for (let k = -7; k <= 6; k++) {
    if (k === -1 || k === 0) continue;   // the gate's two tiles
    const x = vertical ? gateAt.x : gateAt.x + k * TC + TC / 2, y = vertical ? gateAt.y + k * TC + TC / 2 : gateAt.y;
    tiles.push({ x, y });
  }
  return { tiles, gate: { ...gateAt, vertical } };
}

// Engineer raid: pick one of your buildings it knows about (not the HQ), then sneak round the edge of the map to it and capture it
// what an attack wave heads for
function aiWaveTarget(from, targets, focus) {
  const pref = focus === 'defences' ? ['tower', 'gate', 'refinery', 'extractor'] : focus === 'economy' ? ['refinery', 'extractor', 'power'] : [];
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
  const prize = { refinery: 5, factory: 5, tech: 6, power: 3, barracks: 4, tower: 2 };
  let best = null, bestS = -1;
  for (const [id] of game.ai.known) {
    const b = byId(id);
    if (!b || b.team !== 0 || !canCapture(b) || b.type === 'hq') continue;
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
      if (u.team !== b.team || !isCombat(u) || d > (u.order || u.role === 'wave' ? 300 : 500)) continue;   // (was 450 / 1000: units ran too far to help)
      if ((u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost') && d > 300) continue;
      if (!u.order && holdsGround(u) && d > rangeOf(u) + 60) continue;   // snipers and units on high ground stay put unless the fight is right there   // they hold their post unless the fight is right there
      const o = u.order;
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
  const of = t => mine.filter(e => e.type === t);
  const settler = of('settler')[0], hq = of('hq')[0];
  const barracks = of('barracks'), refineries = of('refinery'), extractors = of('extractor');
  const army = mine.filter(isCombat);   // soldiers and buggies
  const cash = game.credits[1];

  // remember any of your buildings it has seen; forget ones it sees are gone
  for (const e of game.ents) if (e.team === 0 && isBuilding(e) && !isWallType(e.type) && visibleAt(e.x, e.y, 1)) ai.known.set(e.id, { x: e.x, y: e.y, type: e.type });
  for (const [id, k] of ai.known) if (!byId(id) && visibleAt(k.x, k.y, 1)) ai.known.delete(id);

  if (settler && !hq) deploy(settler);
  if (!hq) return;

  // ---- base building (army comes first: extras only once it has a decent force) ----
  ai.waveSize = ai.waveSize || D.attackAt;
  // After each wave goes out it spends ~45s investing (refinery, towers, walls) before saving for the next wave.
  const sent = ai.wavesSent || 0;
  const wantTowers = sent === 0 ? (D.towers && barracks.some(b => b.built) && extractors.length >= 3 && game.time > 150 ? 1 : 0) : sent === 1 ? Math.min(1, D.towers) : D.towers;   // first tower early, at the choke point
  // Hard puts down a second refinery straight away (after a minute); everyone builds the rest once its economy and first wave are going
  const reqRefineries = extractors.length >= 3 && sent >= 1 ? D.refineries : D.earlyRefinery && game.time > 60 ? 2 : 1;
  // the build phase lasts until this stage's extras are built (or 90s, so it never stalls)
  const wantFactory = D.factory && sent >= 1 && !of('factory').length && unlocked(1, 'factory') && !aiBlocked('factory');
  const wantTech = D.heavyTanks && sent >= 2 && of('factory').some(f => f.built) && !of('tech').length && unlocked(1, 'tech') && !aiBlocked('tech');
  const wantRadar = D.walls && sent >= 1 && !of('radar').length && unlocked(1, 'radar') && !aiBlocked('radar');   // Normal and Hard
  const extrasDone = (refineries.length >= reqRefineries || aiBlocked('refinery')) && (of('tower').length >= wantTowers || aiBlocked('tower')) && !wantFactory && !wantTech;
  const building = game.time < (ai.buildUntil || 0) && !extrasDone;
  if (refineries.length === 0) aiPlaceRefinery(hq);
  else if (barracks.length === 0) aiPlace(hq, 'barracks');
  else if (of('power').length < D.plants && cash >= COST.power) aiPlace(hq, 'power');
  else if (refineries.length < reqRefineries && cash >= COST.refinery && !aiBlocked('refinery')) aiPlaceRefinery(hq);
  else if (of('tower').length < wantTowers && cash >= COST.tower && !aiBlocked('tower')) aiPlaceTower(hq);
  else if (barracks.length < D.barracks && cash >= 900) aiPlace(hq, 'barracks');
  else if (wantFactory && cash >= COST.factory) aiPlace(hq, 'factory');
  else if (wantTech && cash >= COST.tech) aiPlace(hq, 'tech');
  else if (wantRadar && cash >= COST.radar + 150) aiPlace(hq, 'radar');

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
  const vReserve = reserve;   // vehicles don't wait for the Tech Centre savings
  // the War Factory (and later the Tech Centre) are worth saving for whenever home is safe
  const otherExtrasDone = (refineries.length >= reqRefineries || aiBlocked('refinery')) && (of('tower').length >= wantTowers || aiBlocked('tower'));
  if (defended && (!building || otherExtrasDone)) reserve += wantFactory ? COST.factory : wantTech ? COST.tech : 0;
  // an attack is due but there aren't enough troops yet: troops come first, savings wait (it never stops attacking)
  const waveDue = game.time >= D.attackAfter && game.time >= (ai.nextWave || 0);
  if (waveDue && army.filter(u => !u.role).length < D.minWave + 4) reserve = Math.min(reserve, extractors.length + qx < wantExtractors ? COST.extractor : 0);
  const queued = barracks.reduce((n, b) => n + b.queue, 0) + of('factory').reduce((n, f) => n + f.queue, 0);
  const qBuggies = of('factory').reduce((n, b) => n + b.qTypes.filter(t => t === 'buggy').length, 0);
  const wantBuggy = D.buggies && unlocked(1, 'buggy') && of('buggy').length + qBuggies < (of('soldier').length + 2) / ((game.ai.seen && game.ai.seen.snipers >= 3) ? 1.3 : 2);   // ~1 per 2 soldiers, more if you field snipers/grenadiers
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
  ai.seenBuggies = Math.max(ai.seenBuggies || 0, game.ents.filter(v => v.team === 0 && (v.type === 'buggy' || isTank(v)) && visibleAt(v.x, v.y, 1)).length);
  const wantRocket = D.rockets && unlocked(1, 'rocket') && (ai.seenBuggies || 0) > 0 && of('rocket').length + qOf('rocket') < Math.min(6, ai.seenBuggies);
  const wantSniper = unlocked(1, 'sniper') && of('sniper').length + qOf('sniper') < D.snipers && game.time > 240;
  // engineers: a repairer only when something is badly damaged, and now and then a raider sent the long way round to steal a building
  const repairers = of('engineer').filter(en => !en.raid).length + qOf('engineer') - (ai.raidPending ? 1 : 0);
  const needsFix = mine.some(b => isBuilding(b) && !isWallType(b.type) && b.built && b.hp < b.maxHp * 0.6);
  const raidDue = D.raidEvery && game.time > 360 && game.time - (ai.lastRaid || 0) > D.raidEvery && !ai.raidPending && [...ai.known.keys()].some(id => { const b = byId(id); return b && b.team === 0 && b.type !== 'hq' && canCapture(b); });
  // win back buildings your engineers took: send an engineer with an escort (try again if it's killed)
  const retake = D.engineers > 0 ? game.lost[1].map(byId).filter(b => b && b.team === 0 && canCapture(b)) : [];
  if (D.derricks && game.time > D.derrickAfter) for (const d of game.ents) if (d.type === 'derrick' && d.team !== 1 && !retake.includes(d)) retake.push(d);   // it knows where the villages are, like a player who knows the map   // and Oil Derricks it has found
  const retaking = of('engineer').some(en => en.retake) || ai.retakePending;
  const retakeDue = (D.engineers > 0 || D.derricks) && retake.length && !retaking && game.time - (ai.lastRetake || -99) > 25;
  const wantEngineer = (D.engineers > 0 && needsFix && repairers < D.engineers) || raidDue || retakeDue;
  // War Factory first: buggies (about one per two soldiers) and tanks (a share of its army; heavies once it has a Tech Centre).
  // While it wants a vehicle, the barracks hold back so the money can build up.
  const qF = t => of('factory').reduce((n, f) => n + f.qTypes.filter(q => q === t).length, 0);
  const lights = of('light').length + qF('light'), heavies = of('heavy').length + qF('heavy');
  const wantTank = D.tanks > 0 && lights + heavies < Math.max(1, Math.floor(army.length * D.tanks * ((ai.seen && ai.seen.infantry >= 10) ? 1.5 : 1)));   // more tanks against infantry-heavy armies
  // artillery once it has attacked a couple of times, to crack towers and walls from beyond their reach
  const guns = of('artillery').length + qF('artillery');
  const wantArty = D.artillery > 0 && sent >= 2 && unlocked(1, 'artillery') && guns < D.artillery;
  const vehicle = !of('factory').some(f => f.built) ? null
    : wantArty && (!wantTank || lights + heavies >= 1) ? 'artillery'
    : wantTank ? (unlocked(1, 'heavy') && D.heavyTanks && heavies <= lights ? 'heavy' : 'light')
    : wantBuggy ? 'buggy' : null;
  for (const f of of('factory')) {
    if (!vehicle || !f.built || f.queue >= 1 || army.length + queued >= D.maxArmy) continue;
    if (game.credits[1] >= COST[vehicle] + vReserve) produce(f, vehicle);
  }
  if (vehicle && defended && !of('factory').some(f => f.queue > 0)) reserve += COST[vehicle];
  for (const b of barracks) {
    if (b.queue >= 2) continue;
    if (wantEngineer && game.credits[1] >= COST.engineer && produce(b, 'engineer')) {
      if (retakeDue) { ai.retakePending = true; ai.lastRetake = game.time; } else if (raidDue) { ai.raidPending = true; ai.lastRaid = game.time; }
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
    const spare = of('engineer').find(en => !en.raid && (!en.order || en.order.type === 'move'));
    if (spare) { spare.retake = true; spare.order = null; ai.retakePending = false; }
  }
  for (const en of of('engineer')) {
    if (ai.retakePending && !en.raid && !en.retake && !en.order && retake.length) { en.retake = true; ai.retakePending = false; }
    if (en.retake) {
      const t = retake.sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y))[0];
      if (!t) { en.retake = false; continue; }
      if (!en.order || en.order.target !== t.id) en.order = { type: 'capture', target: t.id };
      for (const u of army) if (u.order && u.order.type === 'attack' && u.order.target === t.id) u.order = null;   // stop shooting what it's taking back
      // escort: up to four home units clear the way just ahead of it
      const escort = army.filter(u => u.role === 'guard' || !u.role).sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y)).slice(0, D.escort || 4);
      for (const u of escort) if (!u.order || u.order.type === 'move') { u.order = { type: 'attackmove', x: en.x + (t.x - en.x) * 0.5, y: en.y + (t.y - en.y) * 0.5 }; u.passive = false; }
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

  // defend: if your units come near its base, the guards and everyone gathering (and any wave close to home) fight back
  const base = mine.filter(e => isBuilding(e) && !isWallType(e.type));
  const intruders = game.ents.filter(e => e.team === 0 && isUnit(e) && visibleAt(e.x, e.y, 1) && !hiddenFrom(e, 1) &&
    base.some(b => Math.hypot(b.x - e.x, b.y - e.y) < 450));
  if (intruders.length) {
    for (const u of army) {
      if (u.role === 'scout') continue;
      if ((u.role === 'wave' || u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost') && Math.hypot(u.x - hq.x, u.y - hq.y) > 700) continue;
      if (u.order && u.order.type === 'attack' && byId(u.order.target)) continue;
      const t = nearest(u, intruders);
      u.order = { type: 'attack', target: t.id }; u.passive = false;
    }
  } else {
    // guards stand watch at the ways into the base (spread over all of them); new units wait at the rally point
    const ents = findEntrances(1);
    guards.forEach((u, k) => {
      if (u.order || !ents.length) return;
      const ch = ents[k % ents.length], x = ch.x - ch.ux * 35 + (Math.random() - 0.5) * 40, y = ch.y - ch.uy * 35 + (Math.random() - 0.5) * 40;
      if (Math.hypot(u.x - x, u.y - y) > 60) u.order = { type: 'move', x, y };
    });
    for (const u of army) {
      if (u.role === 'wave' || u.role === 'scout' || u.role === 'hill' || u.role === 'garrison' || u.role === 'outpost' || u.role === 'guard' && ents.length || u.order) continue;
      if (Math.hypot(u.x - rally.x, u.y - rally.y) > 90) u.order = { type: 'move', x: rally.x + (Math.random() - .5) * 60, y: rally.y + (Math.random() - .5) * 60 };
    }
  }

  // waves: it keeps attacking until the game is over, one wave every few minutes (4 on Easy, 3 on Normal, 2 on Hard).
  // When a wave is due it sends whatever has gathered (as long as there's a minimum), and each wave aims a little bigger.
  // Easy goes for the nearest building, Normal for your economy, Hard for your towers and walls first.
  // when you're nearly beaten (only a few buildings left that it knows of, and it clearly has the bigger army) it goes all in, guards too
  const yourArmy = game.ents.filter(e => e.team === 0 && isCombat(e) && visibleAt(e.x, e.y, 1)).length;
  const allIn = ai.known.size > 0 && ai.known.size <= 3 && army.length >= Math.max(6, yourArmy * 2);
  const gathered = army.filter(u => (allIn ? u.role !== 'scout' && u.role !== 'wave' && u.role !== 'hill' && u.role !== 'garrison' && u.role !== 'outpost' : !u.role) && (allIn || Math.hypot(u.x - rally.x, u.y - rally.y) < 160));
  const lost = !ai.known.size && game.time > D.attackAfter + 90;   // still hasn't found you: go looking in force
  const due = game.time >= D.attackAfter && game.time >= (ai.nextWave || 0);
  const enough = gathered.length >= D.minWave;   // when it's due it goes with what it has, as long as there's a handful
  if (!intruders.length && due && enough && (ai.known.size || lost)) {
    const target = aiWaveTarget(rally, targets, D.focus) || aiExploreSpot(hq.x, hq.y, true);
    if (target) {
      gathered.forEach((u, k) => { const a = k * 2.4, rr = 14 * Math.sqrt(k); u.role = 'wave'; u.passive = false; u.order = { type: 'attackmove', x: target.x + Math.cos(a) * rr, y: target.y + Math.sin(a) * rr }; });   // spread out so they don't queue nose to tail
      ai.waveSize = Math.min(D.maxWave, (D.maxArmy === Infinity ? 99 : D.maxArmy - D.guard), ai.waveSize + 2);   // each wave a little bigger
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
}

// The plateaus worth holding, best first: on its own half of the map, the river lookouts first, then the ones
// nearest the middle. Each comes with a few spots along its top edge, facing the middle (where enemies come from).
function aiHillSpots() {
  const hq = hqOf(1); if (!hq) return [];
  const foe = START[0], mid = { x: W / 2, y: H / 2 }, out = [];
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
    squad.forEach((u, j) => {
      const s = h.spots[j % h.spots.length], k2 = Math.floor(j / h.spots.length), x = s.x + k2 * 12, y = s.y - k2 * 10;   // a second lot stands just beside the first
      if (!u.order && Math.hypot(u.x - x, u.y - y) > 30) u.order = { type: 'move', x, y };
    });
  });
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
  if (refineries.length >= 4 || (!sent && game.time < 200) || aiBlocked('expand')) return 0;
  const oreNear = (x, y, r) => game.ore.reduce((s, o) => s + (o.amount > 0 && Math.hypot(o.x - x, o.y - y) < r ? o.amount : 0), 0);
  if (refineries.some(r => !r.built || oreNear(r.x, r.y, 450) > (diff().expandAt || 600))) return 0;   // still plenty to mine (Hard moves on sooner)
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
  // first choice: just inside the choke point, so it covers where attackers come in
  const ents = findEntrances(1), have = game.ents.filter(e => e.team === 1 && e.type === 'tower').length;
  if (ents.length && have < ents.length * 2) {   // one per entrance in turn (main one first), then a second at each from the other rocky end
    const ch = ents[have % ents.length], spot = gapTowerSpots(ch)[Math.floor(have / ents.length) % 2];
    for (let tries = 0; tries < 25; tries++) {
      const x = spot.x + (Math.random() - 0.5) * tries * 3, y = spot.y + (Math.random() - 0.5) * tries * 3;
      if (placeBuilding(1, 'tower', x, y)) return true;
    }
  }
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
    else if (e.type === 'radar') drawRadar(e);
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
    else drawSoldier(e);
  }
  for (const e of ents) if ((sel.has(e.id) || e.hp < e.maxHp) && e.type !== 'house') drawHealth(e);
  for (const e of ents) if (sel.has(e.id) && isBuilding(e)) drawNameTag(e);
  for (const e of ents) if (sel.has(e.id) && e.type === 'tower') drawRange(e.x, e.y, STATS.tower.range);
  for (const e of ents) if (sel.has(e.id) && e.type === 'artillery' && e.team === 0) drawRange(e.x, e.y, rangeOf(e));

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
  const extra = isWallType(type) || type === 'tower' ? WALL_REACH : 0;
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

function drawExtractorBody(e) {
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
  // opens only while one of its own units is on the move right by it (going through), not for guards standing next to it
  const near = game.ents.some(u => u.team === e.team && isUnit(u) && game.time - (u.movedAt || -9) < 0.3 &&
    Math.abs(u.x - e.x) < (e.vertical ? 40 : 45) && Math.abs(u.y - e.y) < (e.vertical ? 45 : 40));
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

// Radar: everything round. A circular concrete pad, a round control building with a band in the team colour,
// and on top a pedestal carrying a wide dish that sweeps slowly round
function drawRadar(e) {
  if (!e.built) return drawConstruction(e);
  const c = TEAMS[e.team], R = e.size / 2, t = performance.now() / 1000, x = e.x, y = e.y;
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
  deploy: $('btnDeploy'), radar: $('btnRadar'), barracks: $('btnBarracks'), refinery: $('btnRefinery'), tower: $('btnTower'), power: $('btnPower'), factory: $('btnFactory'), tech: $('btnTech'), wall: $('btnWall'), gate: $('btnGate'), rotate: $('btnRotate'), 
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
ui.radar.addEventListener('click', () => startPlacing('radar'));
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
const sellable = b => b && b.team === 0 && isBuilding(b) && COST[b.type] > 0;
const sellValue = b => Math.floor(COST[b.type] / 2) + (b.qTypes || []).reduce((s, t) => s + COST[t], 0);
let sellArmed = null;
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
  if (!sellable(b)) return;
  if (sellArmed !== b.id) { sellArmed = b.id; return; }
  sellBuilding(b); sellArmed = null;
});
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
$('mapInfo').textContent = {
  classic: 'Classic: the original smaller map. Quicker games.',
  large: 'Large: room to expand, extra ore fields on each side. Longer games.',
  huge: 'Huge: lots of open ground between the bases, more ore fields and high ground. The longest games.',
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
  const secs = Math.floor(game.time), hh = Math.floor(secs / 3600), mm = Math.floor(secs / 60) % 60, ss = secs % 60;
  const clock = (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
  if (ui.clock.textContent !== clock) ui.clock.textContent = clock;
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
  show(ui.factory, !!hq && !placing);
  show(ui.tech, !!hq && !placing);
  show(ui.tower, !!hq && !placing);
  show(ui.power, !!hq && !placing);
  show(ui.radar, !!hq && !placing);
  show(ui.wall, !!hq && !placing);
  show(ui.gate, !!hq && !placing);
  syncProduceButtons(producer && !placing ? producer.type : null);
  show(ui.harvest, extractors.length > 0 && !placing);
  show(ui.place, !!(placing && (placing.ghost || (placing.type === 'wall' && placing.anchor))));
  show(ui.cancel, !!placing);
  show(ui.rotate, !!(placing && placing.type === 'gate'));
  show(ui.deselect, sel.length > 0 && !placing);
  const toSell = sel.length === 1 && sellable(sel[0]) && !placing ? sel[0] : null;
  show(ui.sell, !!toSell);
  if (!toSell || sellArmed !== toSell.id) sellArmed = null;
  if (toSell) {
    const label = sellArmed ? 'Tap again to sell for $' + sellValue(toSell) : 'Sell $' + sellValue(toSell);
    if (ui.sell.textContent !== label) ui.sell.textContent = label;
    ui.sell.classList.toggle('danger', !!sellArmed);
  }

  ui.barracks.disabled = game.credits[0] < COST.barracks;
  ui.refinery.disabled = game.credits[0] < COST.refinery;
  ui.tower.disabled = game.credits[0] < COST.tower;
  ui.power.disabled = game.credits[0] < COST.power;
  const boost = powerBoost(0);
  ui.powerChip.style.display = boost > 1 ? '' : 'none';
  ui.powerChip.textContent = `⚡ +${Math.round((boost - 1) * 100)}%`;
  // locked buildings say what they still need
  for (const [btn, type] of [[ui.factory, 'factory'], [ui.tech, 'tech'], [ui.radar, 'radar']]) {
    const miss = missingFor(0, type);
    btn.textContent = miss.length ? `${NAMES[type]}: needs ${miss.map(t => NAMES[t]).join(' + ')}` : `${NAMES[type]} $${COST[type]}`;
    btn.disabled = miss.length > 0 || game.credits[0] < COST[type];
  }
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
      const miss = missingFor(0, unit);
      const label = miss.length ? `${SHORT[unit] || NAMES[unit]}: needs ${miss.map(t => NAMES[t]).join(' + ')}` : `${SHORT[unit] || NAMES[unit]} $${COST[unit]}`;
      if (btn.textContent !== label) btn.textContent = label;
      btn.disabled = miss.length > 0 || !producer.built || producer.queue >= STATS[producer.type].maxQueue || game.credits[0] < COST[unit];
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
  else if (sel.length === 1 && sel[0].type === 'derrick') text = sel[0].team === 0
    ? 'Oil Derrick — pays $' + STATS.derrick.pay + ' every ' + STATS.derrick.payEvery + 's (next in ' + Math.ceil(STATS.derrick.payEvery - (sel[0].payT || 0)) + 's)'
    : 'Oil Derrick — neutral. Send an Engineer to capture it: $' + STATS.derrick.pay + ' every ' + STATS.derrick.payEvery + 's';
  else if (sel.length === 1 && sel[0].type === 'house') text = 'Village house';
  else if (sel.length === 1 && sel[0].type === 'radar') text = sel[0].built ? 'Radar — reveals everything within ' + STATS.radar.sight + ', over rocks and cliffs (not hidden infantry in forests)' : 'Radar: ' + Math.floor(sel[0].progress * 100) + '% built';
  else if (sel.length === 1 && sel[0].type === 'tower') text = sel[0].built ? 'Guard Tower — fires at enemies in range' : `Guard Tower: ${Math.floor(sel[0].progress * 100)}% built`;
  else if (producer) text = producer.built ? `${NAMES[producer.type]}${producer.queue ? ' — making ×' + producer.queue : ''}` : `${NAMES[producer.type]}: ${Math.floor(producer.progress * 100)}% built`;
  else if (extractors.length === 1 && sel.length === 1) text = extractorStatus(extractors[0]);
  else if (sel.length === 1 && sel[0].type === 'engineer') {
    const o = sel[0].order;
    text = o && o.type === 'repair' ? 'Engineer: repairing' : o && o.type === 'capture' ? 'Engineer: going in to capture' : 'Engineer — tap your damaged building to repair, or an enemy building or Oil Derrick to capture';
  } else if (sel.length) {
    const counts = {};
    for (const e of sel) counts[e.type] = (counts[e.type] || 0) + 1;
    const plural = { soldier: 'soldiers', buggy: 'buggies', extractor: 'extractors', grenadier: 'grenadiers', rocket: 'rocket soldiers', sniper: 'snipers', light: 'light tanks', heavy: 'heavy tanks', artillery: 'artillery', engineer: 'engineers', settler: 'settlers', civilian: 'civilians' };
    const parts = Object.entries(counts).map(([t, n]) => `${n} ${n > 1 ? plural[t] || t + 's' : (SHORT[t] || NAMES[t]).toLowerCase()}`);
    text = parts.join(', ') + ' — tap to move';
  } else text = hqOf(0) ? 'Drag to scroll, pinch to zoom' : 'Tap your settler to begin';
  ui.info.textContent = text;
}

function endGame(won) {
  game.over = won ? 'win' : 'lose';
  game.selected.clear(); game.placing = null;
  ui.ovTitle.textContent = won ? 'You win!' : 'You Lose';
  ui.ovText.textContent = won ? 'You destroyed the enemy Headquarters.' : 'Your Headquarters was destroyed.';
  showResults();
  ui.ovBtn.textContent = 'Play again';
  ui.overlay.style.display = 'flex';
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
newGame();
game.paused = true;
ui.ovText.innerHTML = 'Deploy your settler, build a <b>Refinery</b> for ore and a <b>Barracks</b> for soldiers, and fight for the big ore field in the middle.<br>Drag to scroll · pinch to zoom · best in landscape.';
ui.overlay.style.display = 'flex';
requestAnimationFrame(frame);

window.gameLoaded = true;   // (index.html shows a map picker instead if loading ever fails)
