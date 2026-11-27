# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version:** 1v1 against the computer with terrain and fog of war, on the Classic, Large or Huge map, or a **Random map** (Small, Large or Huge size; each has a number you can replay or share).

- Your **settler** arrives by boat at the start (it lands on the beach and drives to its start spot), then deploys into a **Headquarters (HQ)**: the truck turns, rolls forward and unfolds into the building (about 3 seconds; the HQ works straight away).
- The HQ builds a **Refinery** ($500), a **Barracks** ($300, trains Soldiers, Grenadiers, Rocket Soldiers, Snipers, Flamethrowers and Engineers), a **War Factory** ($500, Scout Buggy, Light Tank, Artillery, Heavy Tank, Flame Tank, Rocket Launcher, Extractor ($400, needs a Refinery), and a Settler once you have a Nuclear Reactor and a Satellite Radar), a **Tech Centre** ($600, unlocks the Flame Tank, Rocket Launcher and Nuclear Reactor), a **Power Plant** ($200, +25% build and training speed each, up to double; each extra HQ adds another 25%, up to triple in all), a **Radar** ($300, needs a Power Plant: reveals everything within 750, over rocks and cliffs), a **Medbay** ($400, needs a Barracks and a Power Plant: units standing on it heal, up to 5 infantry or 1 vehicle at a time), a **Helipad** ($500, needs a War Factory: home of one Attack Helicopter), a **Nuclear Reactor** ($1,000, needs a Tech Centre: power worth 3 Power Plants; unlocks the Heavy Tank and Laser Turret), a **Satellite Radar** ($1,500, needs a Reactor: everything on ground you've explored is in view; unlocks the Napalm Strike, once every 5 minutes: a strip of fire that kills infantry), a **SAM Site** ($600, needs a Radar: waits underground and pops up to shoot down aircraft in range 240; 3 hits bring down a helicopter), **Walls** ($20 each) and **Gates** ($150, need a Power Plant, 3 tiles wide). Both sides start with $1,500. Once your first HQ is up, two landing craft bring free reinforcements: 5 Soldiers, then a Scout Buggy (the computer gets the same at its base). The minimap only works while you have a Radar (or Satellite Radar). **Sandbox** (a switch on the start screen) gives you unlimited money and the whole map in view; the computer plays as usual. Only one building goes up at a time: you can't start another until it's finished (each extra HQ allows one more at once; Walls, Gates and turrets don't count), and the computer follows the same rule.
- **Forests burn:** Flamethrowers and Flame Tanks set trees alight (select them and tap trees to do it on purpose). Fire spreads a few tiles, hurts enemies in it, and burns out to open ground for good.
- Some things need other buildings first (tech tree): Grenadier, Rocket Soldier, Sniper and Artillery need a Power Plant, the War Factory needs a Barracks and a Refinery, the Tech Centre needs a War Factory. Anything you can't make yet stays hidden until you have the buildings it needs.
- Each Refinery comes with one free **Extractor**; buy more ($300) at the War Factory. They wait until you tap some **ore**, then run back and forth automatically. Each load is worth $500, and the money trickles in over 10 seconds while the Extractor sits in the Refinery. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The big ore field in the middle is the prize. Destroy or capture (with an Engineer) every enemy Headquarters (and Settler) to win; lose all of yours and you lose.
- **New Settlers** ($3,000, 40 s at the War Factory, the dearest thing in the game; need a Nuclear Reactor and a Satellite Radar) drive anywhere there's room and Deploy into another Headquarters with its own build area, for a forward base. Each extra HQ makes building and training 25% faster. The computer (Normal and Hard) buys one late in a game to reach far-off ore.
- The computer plays under the same fog of war: it has to scout to find ore and your base.
- On Normal and Hard the computer has a few tricks: its tanks run over infantry that come close and its infantry dodge your tanks; a beaten wave runs home; every 3 minutes a Buggy scouts a loop round the map, every 7 minutes a Sniper harasses the edge of your base (running off when approached), and every 4 minutes two infantry go after one of your Extractors.
- The first time a village's Derrick is captured, two **Civilians** (handguns, weaker than Soldiers, can't be trained) come out of each house and join that side.
- **Sell** any of your buildings (except the HQ) for half its price: select it, tap Sell, tap again to confirm.
- A **game clock** at the top shows how long the game has run.
- Each side has an old **ruined base** hidden deep in a jungle in the north-west (Large and Huge: a Barracks, Power Plant and Radar; Classic: a Barracks and a Radar). The ruins are neutral: capture each with an Engineer, then repair it to half health before it works. Knocked out, a ruin falls back to neutral instead of being destroyed. Ruins can't be sold. The computer goes for them too.
- On every map, two neutral **villages** each hold an **Oil Derrick** (Classic's are smaller, with two houses): one on each side's half of the river, the other across a bridge guarded by a plateau. Capture one with an Engineer and it pays $100 every 15 seconds. Neutral Derricks can't be damaged; an owned one knocked down to nothing goes back to neutral. The computer goes for them too (Normal and Hard).
- **Random maps** keep the gold island in the middle and mirror both halves; the rest is rolled from the map number: river style (narrow stream, river, wide river or a lake round the island), bridges, your start along the south, base size and its wall with 2 or 3 entrances, ore fields, the jungle with its ruined base, plateaus, ridges, woods, ponds and 1 or 2 villages. Each map is checked before you play it and rolled again if it fails.

## Terrain
- **Rocks & cliffs** block everything. Each base has a cliff wall with two entrances (2 or 3 on Random maps).
- **Sea**: every map ends in a sea along its south edge, below the playing area. Units can walk on the beach but not into the water (or across the river's mouth), and nothing can be built on the sand.
- **Ponds** (Random maps) block ground units like the river.
- **River** blocks all ground units; cross at the **bridges**. The rich ore field sits on an island in the middle, reached by two bridges.
- **Plateaus** are high ground with cliffs and ramps: units up there see 25% further and shoot 20% further, can't be seen from below, and take only half damage from units below (Grenadiers and Artillery lob their shots and do full damage). On the Large and Huge maps two of them are **river lookouts** jutting out over the river by the middle island, with one ramp each facing away from the middle.
- **Forests** stop tanks and extractors. Infantry walk through slowly and are hidden inside unless an enemy gets close or they open fire; the Scout Buggy can drive through slowly but can't hide. Anything standing in a forest only sees 70% as far.
- Units find their own way around obstacles and buildings.

- **Helicopters:** an Attack Helicopter ($800) starts docked on its Helipad, flies over everything, fires 8 missiles (strong against vehicles and buildings, weak against infantry), then flies home to reload. Tap an enemy to attack (an attack can take it into land you've never seen), the ground to fly there (it stops at the edge of land you've never seen), or its Helipad (or Return) to send it home. With nothing to shoot for 3 seconds a helicopter flies home and lands (with no Helipad it lands where it is, and takes off again only to fight). Only Rocket Soldiers (8 hits to bring one down), SAM Sites and Missile and Laser Turrets can shoot aircraft. On Normal and Hard the computer flies helicopters too (1 / 2): they raid the closest of your buildings they know of, defend its half of the map first, and if they keep getting shot down cheaply it tries one bigger wave and then gives up raiding. It builds SAM Sites once it has seen your aircraft.

- **Battle damage:** buildings and vehicles show scorch marks, cracks and smoke below 2/3 health, and burn below 1/3.

- **Crushing:** tanks and Extractors drive straight over enemy infantry and crush them.

## Controls (touch or mouse)
- Drag to scroll, pinch (or mouse wheel) to zoom, tap the minimap to jump.
- **Save game report** (pause menu or results screen) saves a file with the game's numbers for both sides, kills and value destroyed by each unit type, who killed whom, and a snapshot every 30 seconds, to keep or share.
- Your money is shown just above the bottom bar. The pause menu has Resume, Restart, **Exit Game** (both tap twice) and the patch notes.
- Tap a unit or building to select it. **Box select**, then drag, to select several units.
- **Turrets** are built by **Engineers** ($200): select one, pick a turret, tap where it goes (and again, or **Send Engineer**). It walks there, starts the turret and steps aside, ready to build another. Turrets can go anywhere you can see, but never within 300 of an enemy building you know about (red rings show where). They need no crew, can be sold, can't be captured and don't widen your build area.
  - **Machine Gun** ($300, needs a Barracks): fast fire, strong against infantry, weak against vehicles, can't hit aircraft.
  - **Cannon** ($500, needs a War Factory): heavy shells, strong against vehicles, weak against infantry, can't hit aircraft.
  - **Missile** ($600, needs a Radar and a War Factory): a tower with the longest range, salvos of two homing missiles at anything, aircraft hardest. Its lights turn red while an enemy is in sight.
  - **Laser** ($1,000, needs a Nuclear Reactor): one big beam at anything every 4.5 seconds. It only starts charging once it spots an enemy (its legs spin faster as it charges).
  The computer builds them with its Engineers too, at its entrances and by the river or its Oil Derricks.
- Tap ground to move (groups move in formation), your Medbay to send units onto it to heal, an enemy to attack, ore to harvest (extractors). With engineers selected, tap your damaged building to repair it or an enemy building or Oil Derrick to capture it.

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `patchnotes.js` – the patch notes shown on the start screen (add new releases at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
