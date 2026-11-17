# Mini RTS — developer tools

These tools test and record the game. They are not part of the game and are not loaded by it.

They need Python 3 with Playwright, plus Google Chrome at `/usr/bin/google-chrome`. Run everything from inside this `tools/` folder. Pictures and other output go to `out/` (create it first: `mkdir -p out`).

## sim/ — the game simulator
- `bot.js` is a scripted player (Blue) that plays real games against the computer (Red). It has several strategies: rush, mixed, tech, turtle and more.
- `run.py <game folder> <port> <results.jsonl> '<plan json>'` plays a batch of headless games at high speed and writes one JSON line per game. See `plan0.json`–`plan3.json` for example plans (map, difficulty, strategy, minutes). Each game stops at its minute limit (default 60 game minutes) and counts as a "timeout"; the real game has no time limit.
- `analyse.py` summarises a results file: win rates, game lengths, units built.
- `dbg.py` and `dbgwave.py` debug one game or one AI attack wave.

Example: `python3 sim/run.py .. 8800 out/results.jsonl "$(cat sim/plan0.json)"`

## rec/ — the game recorder
- `record.py <game folder> <port> <map> <difficulty> <strategy> [minutes]` plays one game with `sim/bot_rec.js` and saves frames. Join them into a video with ffmpeg at 15 fps, so each second of video is 15 game seconds.

Example: `python3 rec/record.py .. 8801 large hard mixed 60`

## tests/ — checks and pictures
- `test_*.py` check one feature each, for example paths, walls, retaking buildings, artillery or Oil Derricks (`test_derrick.py`).
- `test_civ_sell.py` checks Civilians, the game clock and selling; `pic_civilians.py <game folder> <port> <out prefix>` pictures them.
- `pic_village.py <game folder> <port> <out prefix>` renders a village close up, neutral and owned.
- `pic_*.py` render close-up pictures of units, buildings and terrain. `pic_map.py <game folder> <port> <map> <out.jpg>` renders a whole map with the fog lifted.
- `test_canvas_memory.py <game folder> <port> [limit MB]` simulates a phone's canvas memory cap (iPhones: about 384 MB) and checks every map loads and the map buttons work.
- `test_lookout.py` checks the Huge map's river lookouts: shooting onto the island from the plateau edge without being seen. `test_plateau.py` now covers all three maps.
- `test_highground_all.py` checks every plateau on every map is an advantage point (a unit on the cliff edge sees and beats one below without being seen).
- `test_uphill.py` checks shooting uphill does half damage (Grenadiers and Artillery full).
- `test_radar.py` checks the Radar (tech lock, reveal over rocks, range, selling); `pic_radar.py <game folder> <port> <out prefix>` pictures it and the fog before/after.
- `dbg_*.py` are one-off debugging scripts. `dbg_inbuilding.py <game folder> <port> <map> <difficulty> <strategy> [minutes] [seed]` plays a seeded game and reports units stuck walking into buildings (total stuck-seconds), for comparing two versions of the game.
- `pic_forest_sight.py <game folder> <port> <out.png>` shows a soldier's view inside a forest next to one on grass.

Most take the game folder (`..`) and a port as their first two arguments.
