# Mini RTS — developer tools

These tools test and record the game. They are not part of the game and are not loaded by it.

They need Python 3 with Playwright, plus Google Chrome at `/usr/bin/google-chrome`. Run everything from inside this `tools/` folder. Pictures and other output go to `out/` (create it first: `mkdir -p out`).

## sim/ — the game simulator
- `bot.js` is a scripted player (Blue) that plays real games against the computer (Red). It has several strategies: infantry, tanks, buggy, mixed, turtle and more. Its Snipers sit on the high ground on its side of the map (since v5.41).
- `run.py <game folder> <port> <results.jsonl> '<plan json>'` plays a batch of headless games at high speed and writes one JSON line per game. A game in the plan can carry a `tweak` (JavaScript run before it starts, e.g. to switch a feature off for an A/B test); anything the tweak puts in `window.__extra` is saved with that game's results. See `plan0.json`–`plan3.json` for example plans (map, difficulty, strategy, minutes). Each game stops at its minute limit (default 60 game minutes) and counts as a "timeout"; the real game has no time limit.
- `analyse.py` summarises a results file: win rates, game lengths, units built.
- **Big tests** (the 200-game runs): `make_plans.py <out folder> [games per strategy] [maps] [difficulties] [extra JS]` writes one plan per map and difficulty, each game carrying `tweak_highground.js` (it measures fighting on high vs low ground, Snipers on high ground and the computer's Medbay use). Run one batch per CPU core with `run.py`, then `analyse_big.py out/res_*.jsonl` prints win rates, unit value per $1, the high-ground figures and more. For an A/B test pass extra JS, e.g. `"DIFFICULTY.hard.hill = 0;"`.
- `run.py` serves the game files live, so **don't edit game.js while a batch is running**: make changes in a git worktree (`git worktree add ../Test1-dev`) and run tests from there.
- **Test sizes (your rule):** don't run simulations unless asked. When a test would help, suggest a tier and wait for a yes. Counts are games per mode (one map at one difficulty, e.g. Large Normal): **Small** 10, **Medium** 25, **Large** 50. `make_plans.py` takes games per strategy (5 strategies), so pass 2, 5 or 10.
- Past results are written up in `results/` (for example `results/2026-11-18_big_tests.txt`).
- `dbg.py` and `dbgwave.py` debug one game or one AI attack wave.

Example: `python3 sim/run.py .. 8800 out/results.jsonl "$(cat sim/plan0.json)"`

## rec/ — the game recorder
- `record.py <game folder> <port> <map> <difficulty> <strategy> [minutes]` plays one game with `sim/bot_rec.js` and saves frames. Join them into a video with ffmpeg at 15 fps, so each second of video is 15 game seconds.

Example: `python3 rec/record.py .. 8801 large hard mixed 60`

## tests/ — checks and pictures
- `test_*.py` check one feature each, for example paths, walls, retaking buildings, artillery or Oil Derricks (`test_derrick.py`, add `large` to test the Large map).
- `test_civ_sell.py` checks Civilians, the game clock and selling; `pic_civilians.py <game folder> <port> <out prefix>` pictures them.
- `pic_village.py <game folder> <port> <out prefix>` renders a village close up, neutral and owned.
- `pic_*.py` render close-up pictures of units, buildings and terrain. `pic_map.py <game folder> <port> <map> <out.jpg>` renders a whole map with the fog lifted.
- `test_canvas_memory.py <game folder> <port> [limit MB]` simulates a phone's canvas memory cap (iPhones: about 384 MB) and checks every map loads and the map buttons work.
- `test_lookout.py` checks the river lookouts (add `large` for the Large map, Huge by default): shooting onto the island from the plateau edge without being seen. `test_plateau.py` now covers all three maps.
- `test_highground_all.py` checks every plateau on every map is an advantage point (a unit on the cliff edge sees and beats one below without being seen).
- `test_uphill.py` checks shooting uphill does half damage (Grenadiers and Artillery full).
- `test_radar.py` checks the Radar (tech lock, reveal over rocks, range, selling); `pic_radar.py <game folder> <port> <out prefix>` pictures it and the fog before/after.
- `dbg_traffic.py <game folder> <port> <map> <out.png> [games]` plays a few seeded games and draws a heat map of where units walk (with the plateaus circled), to see which ground is contested.
- `test_extractor_runover.py` checks the computer's Extractors run down infantry that shoot them (not into forests), then go back to mining, and that yours don't chase.
- `test_extractor_crush.py` checks Extractors (and tanks) run over enemy infantry but not vehicles or their own side.
- `test_rock_fire.py` checks direct fire can't pass through rock (lobbed grenades can).
- `test_building_edges.py` checks an Extractor leaving its Refinery and a tank attacking past its own buildings don't snag on building edges.
- `test_back_to_menu.py` checks the pause menu's Exit Game button (two taps, fresh game on the start screen, Start plays again).
- `test_gate_harvest.py` walls off your base entrances with gates, puts the Refinery inside and checks Extractors mining outside get back in without jamming (money earned and longest stuck time, all three maps).
- `test_gate_yield.py` checks right of way at a gate: an Extractor leaving the base goes first, one coming in waits outside, then follows.
- `test_gatefit.py` checks every unit type gets through a gate (3 tiles wide) both ways.
- `test_medbay.py` checks the Medbay: tech lock, healing up to 5 infantry or 1 vehicle (first come, first served), units walking across it, tap-to-send and the computer healing its wounded.
- `test_autoheal.py` checks the computer's wounded idle units go to its Medbay (yours don't go by themselves) and that it keeps an HQ guard.
- `test_hq_fits.py` checks the Headquarters (140 across) fits where each side's Settler starts, on every map.
- `test_hq_capture.py` checks an Engineer capturing a Headquarters wins (or loses) the game and that the computer's raids don't target your HQ.
- `test_hold_ground.py` checks idle Snipers and units on high ground shoot what comes in range but don't chase it off.
- `dbg_*.py` are one-off debugging scripts. `dbg_inbuilding.py <game folder> <port> <map> <difficulty> <strategy> [minutes] [seed]` plays a seeded game and reports units stuck walking into buildings (total stuck-seconds), for comparing two versions of the game.
- `pic_forest_sight.py <game folder> <port> <out.png>` shows a soldier's view inside a forest next to one on grass.

Most take the game folder (`..`) and a port as their first two arguments.
