# Writes the plan files for the big test: <games per strategy> games of each of 5 strategies, per map and difficulty,
# each with the high-ground / Sniper / Medbay tracking tweak (sim/tweak_highground.js).
# Usage: python3 sim/make_plans.py <out folder> [games per strategy, default 10] [maps, default large,huge] [difficulties, default normal,hard] [extra JS to run first]
# Then run one batch per CPU core, e.g.:
#   python3 sim/run.py .. 9211 out/res_large_normal.jsonl "$(cat out/plan_large_normal.json)" &
# and summarise with:  python3 sim/analyse_big.py out/res_*.jsonl
# Note: run.py serves the game files live, so don't edit game.js while a batch is running (work in a git worktree instead).
import json, sys, os
out = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
maps = (sys.argv[3] if len(sys.argv) > 3 else 'large,huge').split(','); diffs = (sys.argv[4] if len(sys.argv) > 4 else 'normal,hard').split(',')
pre = sys.argv[5] + '\n' if len(sys.argv) > 5 else ''   # e.g. "DIFFICULTY.hard.hill = 0;" for an A/B test
tw = pre + open(os.path.join(os.path.dirname(__file__), 'tweak_highground.js')).read()
os.makedirs(out, exist_ok=True)
for m in maps:
    for d in diffs:
        plan = [{"id": f"{m}-{d}-{s}-{k}-{['legion', 'ashen'][k % 2]}", "map": m, "diff": d, "strat": s, "mins": 40, "tweak": tw, "faction": ["legion", "ashen"][k % 2]} for k in range(n) for s in ['infantry', 'tanks', 'buggy', 'mixed', 'turtle']]
        json.dump(plan, open(f'{out}/plan_{m}_{d}.json', 'w'))
        print(f'{out}/plan_{m}_{d}.json', len(plan), 'games')
