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
- `test_*.py` check one feature each, for example paths, walls, retaking buildings or artillery.
- `pic_*.py` render close-up pictures of units, buildings and terrain. `pic_map.py <game folder> <port> <map> <out.jpg>` renders a whole map with the fog lifted.
- `dbg_*.py` are one-off debugging scripts.

Most take the game folder (`..`) and a port as their first two arguments.
