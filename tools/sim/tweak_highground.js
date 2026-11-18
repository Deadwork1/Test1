// Tweak for big tests (see sim/make_plans.py): measures, per side, shots, damage taken, fighting time and deaths on low vs high ground,
// Sniper time and shots on high ground, and the computer's Medbay use. Results land in each game's "extra" field.
(() => {
  // as tweak_hg, plus: sniper time on high ground vs low, per side
  const X = window.__extra = { shots: [[0, 0], [0, 0]], hpLost: [[0, 0], [0, 0]], fightSecs: [[0, 0], [0, 0]], deaths: [[0, 0], [0, 0]], sniperSecs: [[0, 0], [0, 0]], sniperShots: [[0, 0], [0, 0]], aiHealUnits: 0, aiHealHp: 0, aiMedbayAt: null };
  const inner = window.update, healSeen = new Set();
  window.update = function (dt) {
    const before = [];
    for (const e of game.ents) if (isCombat(e) && (e.team === 0 || e.team === 1)) before.push([e, e.hp, e.cooldown || 0]);
    inner(dt);
    for (const [e, hp, cd] of before) {
      const hi = elevAt(e.x, e.y) ? 1 : 0, t = e.team, fired = (e.cooldown || 0) > cd + 0.01;
      if (fired) { e.__fT = game.time; X.shots[t][hi]++; if (e.type === 'sniper') X.sniperShots[t][hi]++; }
      if (e.type === 'sniper' && e.hp > 0) X.sniperSecs[t][hi] += dt;
      const lost = Math.max(0, hp - Math.max(0, e.hp));
      if (game.time - (e.__fT || -99) < 3 || lost > 0) { X.fightSecs[t][hi] += dt; X.hpLost[t][hi] += lost; }
      if (hp > 0 && e.hp <= 0) X.deaths[t][hi]++;
      if (t === 1 && e.role === 'heal') { if (!healSeen.has(e.id)) { healSeen.add(e.id); X.aiHealUnits++; } if (e.hp > hp) X.aiHealHp += e.hp - hp; }
    }
    if (X.aiMedbayAt === null && game.ents.some(b => b.team === 1 && b.type === 'medbay' && b.built)) X.aiMedbayAt = Math.round(game.time);
  };
})();
