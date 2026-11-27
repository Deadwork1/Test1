# Mini RTS — developer tools

These tools test and record the game. They are not part of the game and are not loaded by it.

They need Python 3 with Playwright, plus Google Chrome at `/usr/bin/google-chrome`. Run everything from inside this `tools/` folder. Pictures and other output go to `out/` (create it first: `mkdir -p out`).

## sim/ — the game simulator
- `bot.js` is a scripted player (Blue) that plays real games against the computer (Red). It has several strategies: infantry, tanks, buggy, mixed, turtle and more. Its Snipers sit on the high ground on its side of the map (since v5.41). Since v5.64 its 'tower' build steps send an Engineer to build a turret at an entrance (a Machine Gun, then a Cannon once it has a War Factory, alternately). Since v5.49 it also flies helicopters: the tanks and mixed plans build a Helipad (the new air plan builds two, and isn't in the standard test set), each helicopter raids an enemy Extractor it can see or an enemy Refinery, keeping clear of SAM Sites, and comes home to reload or when badly hurt. Once it sees enemy aircraft it builds up to 2 SAM Sites by its Refineries and trains more Rocket Soldiers.
- `run.py <game folder> <port> <results.jsonl> '<plan json>'` plays a batch of headless games at high speed and writes one JSON line per game. A game in the plan can carry a `tweak` (JavaScript run before it starts, e.g. to switch a feature off for an A/B test); anything the tweak puts in `window.__extra` is saved with that game's results. See `plan0.json`–`plan3.json` for example plans (map, difficulty, strategy, minutes). Each game stops at its minute limit (default 60 game minutes) and counts as a "timeout"; the real game has no time limit.
- Random maps: a game in a plan can use `"map": "random"` with `"rsize"` (classic, large or huge) and `"seed"` (the map number).
- `analyse.py` summarises a results file: win rates, game lengths, units built.
- **Big tests** (the 200-game runs): `make_plans.py <out folder> [games per strategy] [maps] [difficulties] [extra JS]` writes one plan per map and difficulty, each game carrying `tweak_highground.js` (it measures fighting on high vs low ground, Snipers on high ground and the computer's Medbay use). Run one batch per CPU core with `run.py`, then `analyse_big.py out/res_*.jsonl` prints win rates, unit value per $1, the high-ground figures and more. For an A/B test pass extra JS, e.g. `"DIFFICULTY.hard.hill = 0;"`.
- **Keep raw results outside the worktree** (e.g. write the res_*.jsonl files to a scratch folder): removing a worktree deletes everything inside it, and the raw per-game data is what you need to dig into odd games. `analyse_big.py` reports every map and difficulty found in the results.
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
- `test_extractor_runover.py` checks the computer's Extractors run down infantry that are attacking them (not into forests), stop as soon as the shooter walks away or switches target, then go back to work, and that yours don't chase.
- `test_extractor_crush.py` checks Extractors (and tanks) run over enemy infantry but not vehicles or their own side.
- `test_rock_fire.py` checks direct fire can't pass through rock (lobbed grenades can).
- `test_building_edges.py` checks an Extractor leaving its Refinery and a tank attacking past its own buildings don't snag on building edges.
- **Factions (v5.73) and the test tools.** The game remembers the faction picked on the start screen in `localStorage['mini-rts-faction']` (`legion`, `ashen` or `random`). A hidden fourth value, `all`, switches factions off (everything for both sides, the old look): only the test tools use it. Older tests that need every unit for one side set it (`test_flame`, `test_turrets`, `test_reactor_satellite`, `test_ai_heli_giveup`, `test_heli`); a test that doesn't set anything plays as The Legion. `sim/run.py` sets the test player's faction from the plan (`"faction"`, default `legion`); `sim/make_plans.py` alternates it by game (ids end `-legion` / `-ashen`; with 5 games per strategy that's 3 Legion, 2 Ashen per strategy). `analyse_big.py` doesn't split by faction yet: the 27 Nov report did it with a short script on the ids. The test player (`sim/bot.js`) was written before factions and plays the Ashen with fewer tools.
- Added 26-27 Nov (v5.70-v5.73), all `python3 tests/<name> <game folder> <port> [picture folder]`:
  - `test_one_build.py`: one building goes up at a time (per HQ), the greyed buttons, walls still allowed, the computer too. `pic_one_build.py`.
  - `test_reinforcements.py [map] [pictures]`: the boats with 5 Soldiers and a Buggy after the first HQ, the computer's at its base, none for a later HQ.
  - `test_minimap_radar.py`: no minimap without a finished Radar (Satellite Radar counts), gone when it's lost.
  - `test_sandbox.py`: the Sandbox switch (unlimited money, whole map, minimap), remembered, recorded in the report, off again.
  - `test_factions.py`: both factions' buttons, colours, Satellite power (Napalm / Orbital Barrage), and 8 minutes of the computer as each faction making none of the other's things. `pic_factions.py` (picker and each side's units), `pic_faction_buildings.py` (Barracks and War Factories), `pic_faction_vehicles.py` (Light Tanks and Buggies), `pic_crests.py` (crests on the buttons, HQs, banners, results).
  - `test_bike.py`: the Ashen Rocket Bike (buttons, two rockets, duels, speed, forests, no anti-air, the computer building them).
  - `test_barrage.py`: the Legion's Orbital Barrage (button, timer, damage, never your own side, the computer firing it).
  - `test_bulwark.py`: the Legion's Bulwark (loading 5 of 6, Unload, machine gun, crushing, bailing out, the computer building one).
  - `pic_mrl.py <out folder>`: the Rocket Launcher close up and mid-salvo. `pic_patrol.py <map> <out.png>`: the computer's Buggy loop.
  - `dbg_ore_map.py <map> [size] [number] [out.png]`: a map's ore fields with straight and walking distance from each HQ. `dbg_wallplans.py <map> [size] [number] [out.png]`: where the computer plans its walls and whether they seal its base. `pic_ai_base.py <map> <size> <number> <minutes> <out.png> [difficulty] [off]`: the computer's base after N minutes (tight gaps between its buildings, buildings outside its walls; `off` = build anywhere, as before v5.73).
  - Known: `test_flame.py`'s "Normal builds a Flame Tank" check fails (since about v5.70, not looked into). Behaviour tests use `handleTap(x, y)` with map coordinates.
- Added 22-26 Nov (v5.64-v5.69), all `python3 tests/<name> <game folder> <port>`:
  - `test_turrets.py`: turrets built by Engineers (unlocks, the 300 keep-out, damage, Engineers not used up, the computer's turrets).
  - `test_settler.py`: Settlers ($3,000 at the War Factory, need a Nuclear Reactor and a Satellite Radar), second HQs, the +25% speed per extra HQ, the computer buying one for far ore.
  - `test_ai_heli.py <..> <port> hard` (a 24-minute helicopter game), `test_ai_heli_giveup.py` (cheap losses, the bigger wave, giving up, defence) and `test_heli_turret_tweaks.py` (Laser charging, Missile Turret lights, Rocket Soldiers vs helicopters, helicopters landing).
  - `test_behaviours.py`: the computer's six behaviours (run over, dodge, retreat, Buggy loop, harassing Sniper, Extractor raids).
  - `test_reactor_satellite.py`: Nuclear Reactor, Satellite Radar vision, Napalm Strike, Hard building and using them.
  - `test_flame.py`: Flamethrower, Flame Tank, Rocket Launcher, forest fires and restart, Normal using them.
  - `test_ai_tanks.py` is broken (it made Extractors at the Refinery, before v5.55) and needs updating.
- `test_back_to_menu.py` checks the pause menu's Exit Game button (two taps, fresh game on the start screen, Start plays again).
- `test_heli.py` checks helicopters: Helipad builds one docked helicopter (one per pad), attack, flying home to land and reload, flying straight over rocks and river, only Rocket Soldiers and SAM Sites can hit it, SAM Sites shoot only aircraft, docking at a new Helipad after losing its own, and that a move order stops at the edge of land never seen while an attack carries on into it. `pic_heli.py <game folder> <port> <out prefix>` pictures the Helipad, a helicopter in action and a SAM Site.
- `test_ai_heli.py <game folder> <port> [difficulties] [map]` plays a long game against an unbreakable player base and logs, minute by minute, the computer's Helipads, helicopters (and how many are flying), SAM Sites and waves, plus the damage its helicopters did.
- `test_sam_heat.py <game folder> <port> [difficulty] [maps]` hovers one of your helicopters over one spot by the computer's base, then another, and checks each of its SAM Sites goes up close enough to cover the spot (its heat map of your aircraft).
- `test_tower_switch.py` checks Turrets and Guard Towers stop shooting a building once it's no longer an enemy (a captured Oil Derrick, a building that changes hands).
- `test_gate_attack.py` checks tanks told to attack an enemy gate shoot it from their own side instead of driving round through the base's other entrance (Huge and Large).
- `test_rocket_heavy.py <game folder> <port> [trials]` puts 12 enemy Rocket Soldiers (with the computer's brain running) against 3 of your Heavy Tanks and 4 Buggies, and reports what each side lost and when the first Heavy Tank fell.
- `test_random_map.py <game folder> <port> [maps per size] [out prefix]` rolls many random maps on each size and checks each loads and passes its own check (HQ fits, enemy, island, ore fields, village and ruins reachable), that the same number gives the same map, and saves pictures of a few.
- `pic_damage.py <game folder> <port> <out prefix>` pictures buildings and vehicles at full health, damaged and critical (battle damage, v5.51).
- `test_trickle.py <game folder> <port> [out prefix]` checks an Extractor's $500 load is paid in whole dollars over 10 s in the Refinery, that one called away early keeps the rest on board, and the computer's share (v5.52).
- `pic_hidden_tech.py <game folder> <port> <out prefix>` checks buttons for buildings and units appear only once their requirements are built, and hide again when they're lost (v5.53).
- `pic_extractor.py <game folder> <port> <out prefix>` pictures the Extractor (mining truck) empty, half full and mining, full, and in the computer's colours (v5.54).
- `test_extractor_factory.py <game folder> <port> [minutes]` checks Extractors are bought at the War Factory, each Refinery still gives one free, and the computer gets its Extractors on Easy, Normal and Hard (v5.55).
- `pic_dock_reverse.py <game folder> <port> <out prefix>` pictures an Extractor turning at the Refinery door, backing in, unloading and driving out (v5.55.1).
- `pic_sea_preview.py <game folder> <port> <map> <out prefix>` the picture-only sea preview made before the sea was built (v5.57).
- `test_sea.py <game folder> <port>` checks the sea on every map: water and beach where they should be, units stop on the sand, the river's mouth can't be crossed, nothing is built on the beach, both halves still mirror (v5.57-5.59).
- `pic_landing.py <game folder> <port> <out prefix> [map]` pictures the opening landing (boat in, ramp down, Settler ashore, boat out) and checks its timing, the computer's matching wait, and that deploying straight away skips it (v5.58).
- `pic_deploy.py <game folder> <port> <out prefix>` pictures the Settler truck, the boat and the deploy animation step by step (v5.59).
- `test_turrets.py <game folder> <port>` checks the v5.64 turrets: Engineer-only, buttons hidden until unlocked, building one (paid, Engineer used up, build time), the 300 keep-out and the can't-see rule, each turret's damage against a Soldier, a Light Tank and a helicopter, the underground SAM Site (range 240, about 1 s to come up), and the computer building at least 2 turrets on Normal and Hard by 9 minutes.
- `pic_turrets.py <game folder> <port> <out prefix>` pictures the four turrets in action, the SAM Site hidden and up, and placing a turret near an enemy base (green outside the red no-build ring, red inside).
- Older one-off scripts in `tests/` that spawn a `'tower'` or `'turret'` (Guard Tower or the old dig-in Turret) are from before v5.64 and won't run as they are; `test_tower_switch.py`, `test_heli.py` and `test_building_edges.py` have been updated to use the new turrets.
- `test_ruins.py` checks the ruined bases on every map: capture, repair, working only from half health, no selling, falling back to neutral when knocked out.
- `test_ai_ruins.py <game folder> <port> <maps> <difficulties>` logs when the computer captures and repairs each ruin.
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
