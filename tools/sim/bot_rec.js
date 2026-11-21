// Scripted player for team 0 + stat collection. Loaded into the page; runSim(strategy, seedIdx) returns a result object.
(function(){
const U = window.update; window._realDraw = window.draw; window.update = () => {}; window.draw = () => {};   // stop the real-time loop; we drive the clock
const STRATS = {
  infantry: { order: ['barracks','factory','tower','wall','tower','power','refinery2'], bar: {soldier:5, grenadier:2.5, rocket:1.5, sniper:1}, fac: null, wave: 10 },
  tanks:    { order: ['barracks','factory','tower','wall','tower','power','tech','refinery2'], bar: {soldier:3, rocket:1}, fac: {light:6, heavy:4}, wave: 8 },
  buggy:    { order: ['barracks','factory','tower','wall','tower','refinery2'], bar: {soldier:1}, fac: {buggy:8, light:2}, wave: 8 },
  mixed:    { order: ['barracks','factory','tower','wall','tower','power','refinery2','tech'], bar: {soldier:4, grenadier:2, rocket:2, sniper:1, engineer:0.15}, fac: {buggy:2, light:3, heavy:2, artillery:1}, wave: 12 },
  heavy:    { order: ['barracks','factory','tower','wall','tower','tech','power','refinery2'], bar: {soldier:3, rocket:1}, fac: {heavy:8, light:2}, wave: 6 },
  heavyless:{ order: ['barracks','factory','tower','wall','tower','tech','power','refinery2'], bar: {soldier:3, rocket:1}, fac: {light:10}, wave: 6 },
  turtle:   { order: ['barracks','factory','tower','wall','tower','tower','power','tower','refinery2','tech'], bar: {soldier:3, rocket:2, grenadier:1}, fac: {light:3, heavy:3, artillery:2}, wave: 16 },
};
const pick = w => { const ks = Object.keys(w).filter(k => unlocked(0, k)); if (!ks.length) return null; let t = ks.reduce((s, k) => s + w[k], 0) * Math.random(); for (const k of ks) { t -= w[k]; if (t <= 0) return k; } return ks[0]; };
let allPlans = null;   // every gap wall it means to build (tiles and gates), kept clear of other buildings
function clearOfWall(type, x, y) { const sz = STATS[type].size || 25;
  if (!allPlans) allPlans = findEntrances(0).map(planGapWall).filter(Boolean);
  const spots = [...wallPlan, ...allPlans.flatMap(pl => [...pl.tiles, pl.gate])];
  return !spots.some(t => Math.abs(t.x - x) < sz / 2 + 22 && Math.abs(t.y - y) < sz / 2 + 22); }
function put(type) {
  const srcs = buildAreaSources(0);
  for (let tries = 0; tries < 80; tries++) {
    const src = tries < 30 ? hqOf(0) : srcs[Math.floor(Math.random() * srcs.length)].b; if (!src) return false;
    const a = Math.random() * Math.PI * 2, d = src.size / 2 + 50 + Math.random() * 180;
    const px = src.x + Math.cos(a) * d, py = src.y + Math.sin(a) * d;
    if (clearOfWall(type, px, py) && placeBuilding(0, type, px, py)) return true;
  }
  return false;
}
function putAtEntrance(type) {   // guard towers go just behind each gap in turn (main one first), near its rocky ends
  const ents = findEntrances(0); if (!ents.length) return put(type);
  const n = game.ents.filter(e => e.team === 0 && e.type === 'tower').length, ch = ents[n % ents.length], spot = gapTowerSpots(ch)[Math.floor(n / ents.length) % 2];
  for (let k = 0; k < 40; k++) { const x = spot.x + (Math.random() - 0.5) * k * 3, y = spot.y + (Math.random() - 0.5) * k * 3; if (clearOfWall(type, x, y) && placeBuilding(0, type, x, y)) return true; }
  return put(type);
}
let wallPlan = [], gatesLeft = null, retryGates = [], lastGateRetry = 0;
// like a careful player: seal every gap in the rocks with a wall from one end to the other, gate in the middle
// (one entrance at a time; returns true once all of them are done)
function wallOffEntrance() {
  if (!gatesLeft) gatesLeft = findEntrances(0).map(planGapWall).filter(Boolean);
  while (gatesLeft.length) {
    if (wallPlan.length) return false;   // finish the current wall first
    const plan = gatesLeft[0];
    if (game.credits[0] < COST.gate) return false;
    gatesLeft.shift();
    if (!placeBuilding(0, 'gate', plan.gate.x, plan.gate.y, plan.gate.vertical)) { retryGates.push(plan); continue; }   // can't fit a gate yet (out of reach?): try again later
    wallPlan = plan.tiles.slice();
    return gatesLeft.length === 0;
  }
  return true;
}
function putRefineryNearOre() {
  const hq = hqOf(0); if (!hq) return false;
  const ores = game.ore.filter(o => o.amount > 0).sort((a, b) => Math.hypot(a.x - hq.x, a.y - hq.y) - Math.hypot(b.x - hq.x, b.y - hq.y));
  for (const o of ores.slice(0, 6)) for (let k = 0; k < 25; k++) { const a = Math.random() * 6.28, d = 70 + Math.random() * 90;
    if (placeBuilding(0, 'refinery', o.x + Math.cos(a) * d, o.y + Math.sin(a) * d)) return true; }
  return put('refinery');
}
window.runSim = function (strategy, maxMinutes) {
  const S = STRATS[strategy]; newGame(); wallPlan = []; gatesLeft = null; allPlans = null; retryGates = []; lastGateRetry = 0; game.paused = false;
  const st = { strategy, difficulty, map: mapChoice, produced: [{}, {}], died: [{}, {}], kills: {}, killValue: {}, spent: [{}, {}], captures: [0, 0], stuckEvents: 0, stuckTypes: {},
               peakExtractors: [0, 0], idleCashSamples: [], crushes: 0, firstTank: [null, null], firstAttackOnPlayerBase: null, aiWaves: 0, errors: [] };
  const P0 = window.produce;
  window.produce = (b, u) => { const k = u || (PRODUCES[b.type] || [])[0]; const ok = P0(b, u); if (ok) { st.produced[b.team][k] = (st.produced[b.team][k] || 0) + 1; st.spent[b.team][k] = (st.spent[b.team][k] || 0) + COST[k]; } return ok; };
  let step = 0, botT = 0, orderIdx = 0, waveSize = S.wave, lastBuildTry = 0, waves = 0;
  const buildLog = []; const PB0 = window.placeBuilding; window.placeBuilding = (t, ty, x, y, v) => { const ok = PB0(t, ty, x, y, v); if (ok && t === 0) buildLog.push(ty + '@' + Math.round(game.time)); return ok; };
  const prevCd = new Map(), lastPos = new Map(), teamOf = new Map(), stuckSamples = [];
  const hq0 = game.ents.find(e => e.team === 0 && e.type === 'settler'); deploy(hq0);
  const end = (maxMinutes || 25) * 60;
  const tick = () => {
    // ---- bot brain every 1.5s ----
    botT -= 0.05;
    if (botT <= 0) { botT = 1.5;
      const mine = game.ents.filter(e => e.team === 0), of = t => mine.filter(e => e.type === t), hq = of('hq')[0];
      if (hq) {
        const refs = of('refinery'), xs = of('extractor');
        if (!refs.length) putRefineryNearOre();
        else if (orderIdx < S.order.length && game.time - lastBuildTry > 3 && (S.order[orderIdx] === 'barracks' || mine.filter(isCombat).length >= 5 || game.credits[0] > 900)) {
          const want = S.order[orderIdx]; lastBuildTry = game.time;
          const type = want === 'refinery2' ? 'refinery' : want === 'wall' ? 'gate' : want;
          const have = want === 'wall' ? (gatesLeft && !gatesLeft.length && !wallPlan.length) : want === 'refinery2' ? refs.length >= 2 : want === 'tower' ? of('tower').length >= S.order.slice(0, orderIdx + 1).filter(t => t === 'tower').length : of(type).length > 0;
          if (have) orderIdx++;
          else if (unlocked(0, type) && game.credits[0] >= COST[type] + 50) { if (want === 'refinery2' ? putRefineryNearOre() : want === 'wall' ? wallOffEntrance() : type === 'tower' ? putAtEntrance('tower') : put(type)) orderIdx++; }
          else if (!unlocked(0, type) && game.time > 600) orderIdx++;   // give up on it
        }
        const xCap = of('tower').some(t => t.built) ? Math.min(6, refs.length * 3) : 3;
        const xfs = of('factory').filter(f => f.built), xq = xfs.reduce((n, f) => n + f.qTypes.filter(q => q === 'extractor').length, 0);   // Extractors come from the War Factory since v5.55
        for (const f of xfs) if (xs.length + xq < xCap && !f.qTypes.includes('extractor')) { P0(f, 'extractor'); break; }
        // gates that didn't fit before (outside the build area, say): try again now and then
        if (!wallPlan.length && retryGates.length && game.credits[0] >= COST.gate + 100 && game.time - lastGateRetry > 30) {
          lastGateRetry = game.time; const plan = retryGates[0];
          if (placeBuilding(0, 'gate', plan.gate.x, plan.gate.y, plan.gate.vertical)) { retryGates.shift(); wallPlan = plan.tiles.slice(); } else retryGates.push(retryGates.shift());
        }
        // finish the wall a piece at a time as money allows
        const putWall = (x, y) => { if (!canPlaceWallPiece(0, 'wall', x, y)) return false; game.credits[0] -= COST.wall; spawn('wall', 0, x, y); bldDirty = true; return true; };
        wallPlan = wallPlan.filter(w => !(game.credits[0] >= COST.wall && putWall(w.x, w.y)) && !game.ents.some(q => q.team === 0 && q.type === 'wall' && Math.hypot(q.x - w.x, q.y - w.y) < 14));
        for (const x of xs) if (!x.order && !autoHarvest(x)) { const n = findOre(x.x, x.y, 1200, 0, false); if (n) startHarvest(x, n); }   // like a player tapping the nearest ore
        // production: keep queues short, spend down (but hold back while saving for the next building)
        const nextB = orderIdx < S.order.length ? (S.order[orderIdx] === 'refinery2' ? 'refinery' : S.order[orderIdx] === 'wall' ? 'gate' : S.order[orderIdx]) : null;
        // the factory picks its next vehicle and keeps it until it can afford it; the barracks hold back meanwhile
        for (const f of of('factory')) if (S.fac && f.built && !f.want) f.want = pick(S.fac);
        const facWait = !(nextB && unlocked(0, nextB)) && S.fac && of('factory').some(f => f.built && f.queue < 1 && f.want && game.credits[0] < COST[f.want]) && mine.filter(isCombat).length >= 5;
        const saving = wallPlan.length > 0 || (nextB && unlocked(0, nextB) && mine.filter(isCombat).length >= 5 && game.credits[0] < COST[nextB] + 50) || facWait;
        for (const b of of('barracks')) if (!saving && b.built && b.queue < 2) { let u = pick(S.bar); if (u === 'engineer' && of('engineer').length >= 2) u = 'soldier'; if (u && game.credits[0] >= COST[u]) window.produce(b, u); }
        if (S.fac) for (const f of of('factory')) if ((!saving || facWait) && f.built && f.queue < 1 && f.want) { if (!unlocked(0, f.want)) f.want = pick(S.fac); else if (game.credits[0] >= COST[f.want] && window.produce(f, f.want)) f.want = null; }
        // win back buildings an enemy engineer took: an engineer with a few escorts
        const retake = game.lost[0].map(byId).filter(b => b && b.team === 1 && canCapture(b));
        if (game.time > 120) for (const d of game.ents) if (d.type === 'derrick' && d.team !== 0 && !retake.includes(d)) retake.push(d);   // Oil Derricks too (a player knows where the villages are)
        if (retake.length) {
          let en = of('engineer').find(e => e.retake) || of('engineer').find(e => !e.order || e.order.type !== 'capture');
          if (!en) { const b = of('barracks').find(b => b.built && !b.qTypes.includes('engineer')); if (b && game.credits[0] >= COST.engineer) window.produce(b, 'engineer'); }
          else { const t = retake.sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y))[0]; en.retake = true;
            en.order = { type: 'capture', target: t.id };
            mine.filter(e => isCombat(e) && !e.inWave).sort((a, b) => Math.hypot(a.x - en.x, a.y - en.y) - Math.hypot(b.x - en.x, b.y - en.y)).slice(0, 4)
              .forEach(u => { if (!u.order || u.order.type === 'move') u.order = { type: 'attackmove', x: en.x + (t.x - en.x) * 0.5, y: en.y + (t.y - en.y) * 0.5 }; }); }
        }
        // engineers: repair damaged buildings
        for (const en of of('engineer')) if (!en.order && !en.retake) { const hurt = mine.find(b => isBuilding(b) && b.built && b.hp < b.maxHp * 0.7 && !isWallType(b.type)); if (hurt) en.order = { type: 'repair', target: hurt.id }; }
        // attack in waves at the nearest enemy building (the bot cheats on knowing where it is)
        const army = mine.filter(e => isCombat(e));
        for (const e of army) if (e.inWave && !e.order) e.inWave = false;   // a wave unit with nothing left to do is back in the pool (it used to stay flagged and never attack again)
        const idle = army.filter(e => !e.order || (e.order.type === 'move' && !e.inWave));   // waiting at home (including walking to a guard spot)
        const ents = findEntrances(0);
        if (ents.length && idle.length < waveSize) idle.filter(u => !u.order).sort((a, b) => a.id - b.id).forEach((u, k) => { const ch = ents[k % ents.length];
          const x = ch.x - ch.ux * 30 + ((k * 37) % 60 - 30), y = ch.y - ch.uy * 30 + ((k * 53) % 60 - 30);
          if (Math.hypot(u.x - x, u.y - y) > 70) u.order = { type: 'move', x, y }; });
        if (idle.length >= waveSize) {
          const cx = idle.reduce((s, e) => s + e.x, 0) / idle.length, cy = idle.reduce((s, e) => s + e.y, 0) / idle.length;
          const tgt = game.ents.filter(e => e.team === 1 && isBuilding(e) && !isWallType(e.type) && e.type !== 'derrick').sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
          if (tgt) { for (const u of idle) u.inWave = true; for (const u of idle) u.order = { type: 'attackmove', x: tgt.x + (Math.random() - .5) * 60, y: tgt.y + (Math.random() - .5) * 60 }; waves++; waveSize = Math.min(30, waveSize + 3); }
        }
      }
    }
    // ---- record who fires at what (for kill credit) ----
    for (const e of game.ents) {
      if (!(isCombat(e) || e.type === 'tower')) continue;
      const pc = prevCd.get(e.id); prevCd.set(e.id, e.cooldown);
      if (pc !== undefined && e.cooldown > pc + 0.01) { const t = byId(e.type === 'tower' ? e.target : e.order && e.order.target); if (t) t.lastHit = e.type; }
    }
    const before = new Map(game.ents.map(e => [e.id, e]));
    const teamsBefore = new Map(game.ents.filter(isBuilding).map(e => [e.id, e.team]));
    try { U(0.05); } catch (err) { st.errors.push(String(err)); game.over = 'error'; return; }
    step++;
    const nowIds = new Set(game.ents.map(e => e.id));
    for (const [id, e] of before) if (!nowIds.has(id) && !e.deployed) {
      st.died[e.team][e.type] = (st.died[e.team][e.type] || 0) + 1;
      let k = e.lastHit;
      if (!k && isInfantry(e) && game.ents.some(t => isTank(t) && t.team !== e.team && Math.hypot(t.x - e.x, t.y - e.y) < 30)) { k = 'crush'; st.crushes++; }
      k = k || 'unknown';
      st.kills[k] = (st.kills[k] || 0) + 1; st.killValue[k] = (st.killValue[k] || 0) + (COST[e.type] || (e.type === 'hq' ? 1000 : 0));
    }
    for (const e of game.ents) if (isBuilding(e) && teamsBefore.has(e.id) && teamsBefore.get(e.id) !== e.team) st.captures[e.team]++;
    // ---- stuck units: has a move-type order but hasn't moved 6px in 15s ----
    if (step % 20 === 0) {
      for (const e of game.ents) {
        if (!isUnit(e) || !e.order || !['move', 'attackmove'].includes(e.order.type) || (e.holdUntil || 0) > game.time) { lastPos.delete(e.id); continue; }
        const lp = lastPos.get(e.id);
        if (!lp) { lastPos.set(e.id, { x: e.x, y: e.y, t: game.time, flagged: false }); continue; }
        if (Math.hypot(e.x - lp.x, e.y - lp.y) > 6) { lastPos.set(e.id, { x: e.x, y: e.y, t: game.time, flagged: false }); }
        else if (game.time - lp.t > 15 && !lp.flagged) { lp.flagged = true; st.stuckEvents++; if (stuckSamples.length < 6) stuckSamples.push({ near: game.ents.filter(o => o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 70).map(o => o.team + ':' + o.type + (isUnit(o) ? (o.order ? '/' + o.order.type : '/idle') : '')).join(' '), tgtAt: game.ents.filter(o => Math.hypot(o.x - e.order.x, o.y - e.order.y) < 60).map(o => o.team + ':' + o.type).join(' '), nav: e.nav ? (e.nav.fail ? 'fail' : e.nav.i + '/' + e.nav.path.length + (e.nav.breaking ? ' breaking' : '')) : 'none',type: e.type, team: e.team, x: Math.round(e.x), y: Math.round(e.y), order: e.order.type, to: [Math.round(e.order.x), Math.round(e.order.y)], terrain: terrainAt(e.order.x, e.order.y), t: Math.round(game.time), path: e.path ? e.path.length : null}); const k = e.team + ':' + e.type; st.stuckTypes[k] = (st.stuckTypes[k] || 0) + 1; }
      }
      for (const t of [0, 1]) st.peakExtractors[t] = Math.max(st.peakExtractors[t], game.ents.filter(e => e.team === t && e.type === 'extractor').length);
      for (const t of [0, 1]) if (st.firstTank[t] === null && game.ents.some(e => e.team === t && isTank(e))) st.firstTank[t] = Math.round(game.time);
      if (step % 600 === 0) st.idleCashSamples.push(Math.round(game.credits[1]));
      if (st.firstAttackOnPlayerBase === null) { const h = hqOf(0); if (h && game.ents.some(e => e.team === 1 && isCombat(e) && Math.hypot(e.x - h.x, e.y - h.y) < 350)) st.firstAttackOnPlayerBase = Math.round(game.time); }
    }
  };
  window.simTick = tick; window.simEnd = end; window.simFinish = () => {
  window.produce = P0; window.placeBuilding = PB0;
  st.winner = game.over === 'win' ? 'player' : game.over === 'lose' ? 'ai' : 'timeout';
  st.minutes = +(game.time / 60).toFixed(1);
  st.aiWaves = game.ai.wavesSent || 0; st.playerWaves = waves;
  st.finalBuildings = [0, 1].map(t => game.ents.filter(e => e.team === t && isBuilding(e) && !isWallType(e.type)).length);
  st.finalArmy = [0, 1].map(t => game.ents.filter(e => e.team === t && isCombat(e)).length);
  st.finalCredits = game.credits.map(Math.round);
  st.playerBuilt = buildLog;
  st.aiLeft = game.ents.filter(e => e.team === 1).map(e => e.type + (isBuilding(e) ? '' : '@' + Math.round(e.x) + ',' + Math.round(e.y) + ':' + (e.order ? e.order.type + '/' + (e.order.phase || '') : 'idle')));
  st.stuckSamples = stuckSamples.slice(0, 6);
  return st; };
  return 'ready';
};
})();
