# Summarises big-test results (made with sim/make_plans.py): win rates by map/difficulty and strategy, unit value per $1,
# fighting on high ground vs low ground, who held more high ground, stuck units, captures, Derricks, the computer's Medbay use.
# Usage: python3 sim/analyse_big.py out/res_*.jsonl
import json, sys, glob, collections as C, statistics as S
files = sys.argv[1:]
R = [json.loads(l) for f in files for l in open(f)]
MAPS = [m for m in ['classic', 'large', 'huge'] if any(r['map'] == m for r in R)]   # whatever maps and difficulties the results hold
DIFFS = [d for d in ['easy', 'normal', 'hard'] if any(r['difficulty'] == d for r in R)]
def pct(a, b): return f"{100*a/b:.0f}%" if b else '-'
print(f"games {len(R)}  errors {sum(1 for r in R if r['errors'] or r['pageErrors'])}")
# win rates per map/difficulty
print("\n== Results (player = scripted test player, ai = computer)")
for m in MAPS:
  for d in DIFFS:
    rs = [r for r in R if r['map'] == m and r['difficulty'] == d]
    if not rs: continue
    w = C.Counter(r['winner'] for r in rs); fin = [r['minutes'] for r in rs if r['winner'] != 'timeout']
    print(f"  {m:5} {d:6} n={len(rs):3}  computer wins {pct(w['ai'],len(rs)):>4}  player {pct(w['player'],len(rs)):>4}  timeout {pct(w['timeout'],len(rs)):>4}  median length {S.median(fin) if fin else 0:.1f} min")
print("\n== Computer win rate by player strategy (all maps)")
for s in sorted(set(r['strategy'] for r in R)):
  rs = [r for r in R if r['strategy'] == s]; w = C.Counter(r['winner'] for r in rs)
  print(f"  {s:9} n={len(rs):3}  computer {pct(w['ai'],len(rs)):>4}  player {pct(w['player'],len(rs)):>4}  timeout {pct(w['timeout'],len(rs)):>4}")
# unit value
print("\n== Units: value killed per $1 spent (both sides), and split by side")
units = ['soldier','grenadier','rocket','sniper','engineer','buggy','light','heavy','artillery','civilian']
for scope_name, scope in [('ALL', R)] + [(m.upper(), [r for r in R if r['map']==m]) for m in MAPS]:
  spent = C.Counter(); kv = C.Counter(); made = C.Counter(); died = C.Counter()
  for r in scope:
    for t in [0, 1]:
      for k, v in r['spent'][t].items(): spent[k] += v
      for k, v in r['produced'][t].items(): made[k] += v
      for k, v in r['died'][t].items(): died[k] += v
    for k, v in r['killValue'].items(): kv[k] += v
  print(f"  [{scope_name}]")
  rows = sorted([(kv[k]/spent[k], k) for k in units if spent[k]], reverse=True)
  for ratio, k in rows: print(f"    {k:10} made {made[k]:5}  died {died[k]:5}  spent ${spent[k]:8,}  killed ${kv[k]:8,.0f}  value per $1: {ratio:.2f}")
print("\n== High ground (fighting units, per side) [low ground, high ground]")
for m in MAPS:
  X = [r['extra'] for r in R if r['map'] == m and r.get('extra')]
  if not X: continue
  for t, name in [(0, 'player'), (1, 'computer')]:
    shots = [sum(x['shots'][t][h] for x in X) for h in (0, 1)]; lost = [sum(x['hpLost'][t][h] for x in X) for h in (0, 1)]
    secs = [sum(x['fightSecs'][t][h] for x in X) for h in (0, 1)]; deaths = [sum(x['deaths'][t][h] for x in X) for h in (0, 1)]
    def per(a, b): return a / b * 60 if b else 0
    print(f"  {m:5} {name:8} fighting-minutes low {secs[0]/60:8.0f} high {secs[1]/60:6.0f} ({pct(secs[1], sum(secs))} on high ground)"
          f" | shots/min low {per(shots[0],secs[0]):.1f} high {per(shots[1],secs[1]):.1f} | damage taken/min low {per(lost[0],secs[0]):.1f} high {per(lost[1],secs[1]):.1f}"
          f" | deaths per fighting-minute low {per(deaths[0],secs[0])/60*60:.3f} high {per(deaths[1],secs[1]):.3f}")
# does holding more high ground win games?
print("\n== Games where one side spent more unit-time on high ground: who won? (decided games only)")
for m in MAPS:
  rs = [r for r in R if r['map'] == m and r['winner'] != 'timeout']
  more_hi = C.Counter()
  for r in rs:
    a, b = r['highUnitSecs']
    if a == b: continue
    hi = 'player' if a > b else 'ai'
    more_hi['won' if hi == r['winner'] else 'lost'] += 1
  n = more_hi['won'] + more_hi['lost']
  print(f"  {m:5} side with more high-ground time won {pct(more_hi['won'], n)} of {n} games")
print("\n== Other")
for m in MAPS:
  for d in DIFFS:
    rs = [r for r in R if r['map'] == m and r['difficulty'] == d]
    if not rs: continue
    X = [r['extra'] for r in rs if r.get('extra')]
    med = [x['aiMedbayAt'] for x in X if x['aiMedbayAt'] is not None]
    print(f"  {m:5} {d:6} stuck/game {S.mean(r['stuckEvents'] for r in rs):.1f}  captures player {sum(r['captures'][0] for r in rs)} computer {sum(r['captures'][1] for r in rs)}"
          f"  derrick-min player {sum(r['derrickSecs'][0] for r in rs)/60/len(rs):.1f} computer {sum(r['derrickSecs'][1] for r in rs)/60/len(rs):.1f} per game"
          f"  | computer Medbay built in {len(med)}/{len(X)} (median {S.median(med)/60 if med else 0:.1f} min), units sent to heal {sum(x['aiHealUnits'] for x in X)}, HP healed {sum(x['aiHealHp'] for x in X):.0f}"
          f"  | AI waves {S.mean(r['aiWaves'] for r in rs):.1f}  AI cash avg {S.mean([c for r in rs for c in r['idleCashSamples']] or [0]):.0f}")
