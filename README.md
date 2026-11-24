# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version:** 1v1 against the computer with terrain and fog of war, on the Classic, Large or Huge map, or a **Random map** (Small, Large or Huge size; each has a number you can replay or share).

- Your **settler** arrives by boat at the start (it lands on the beach and drives to its start spot), then deploys into a **Headquarters (HQ)**: the truck turns, rolls forward and unfolds into the building (about 3 seconds; the HQ works straight away).
- The HQ builds a **Refinery** ($400), a **Barracks** ($300, trains Soldiers, Grenadiers, Rocket Soldiers, Snipers and Engineers), a **War Factory** ($500, Scout Buggy, Light Tank, Artillery, Heavy Tank, Extractor, Settler), a **Tech Centre** ($600, unlocks the Heavy Tank), a **Power Plant** ($200, +25% build and training speed each, up to double; each extra HQ adds another 25%, up to triple in all), a **Radar** ($300, needs a Power Plant: reveals everything within 750, over rocks and cliffs), a **Medbay** ($400, needs a Barracks: units standing on it heal, up to 5 infantry or 1 vehicle at a time), a **Helipad** ($500, needs a War Factory: home of one Attack Helicopter), a **SAM Site** ($600, needs a Power Plant: waits underground and pops up to shoot down aircraft in range 240), **Walls** ($20 each) and **Gates** ($150, 3 tiles wide).
- Some things need other buildings first (tech tree): Grenadier, Rocket Soldier, Sniper and Artillery need a Power Plant, the War Factory needs a Barracks and a Refinery, the Tech Centre needs a War Factory. Anything you can't make yet stays hidden until you have the buildings it needs.
- Each Refinery comes with one free **Extractor**; buy more ($300) at the War Factory. They wait until you tap some **ore**, then run back and forth automatically. Each load is worth $500, and the money trickles in over 10 seconds while the Extractor sits in the Refinery. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The big ore field in the middle is the prize. Destroy or capture (with an Engineer) every enemy Headquarters (and Settler) to win; lose all of yours and you lose.
- **New Settlers** ($2,000, 40 s at the War Factory, the dearest thing in the game) drive anywhere there's room and Deploy into another Headquarters with its own build area, for a forward base. Each extra HQ makes building and training 25% faster. The computer (Normal and Hard) buys one late in a game to reach far-off ore.
- The computer plays under the same fog of war: it has to scout to find ore and your base.
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
- **Turrets** are built by **Engineers** ($150): select one, pick a turret, tap where it goes (and again, or **Send Engineer**). He walks there and is used up building it. Turrets can go anywhere you can see, but never within 300 of an enemy building you know about (red rings show where). They need no crew, can be sold, can't be captured and don't widen your build area.
  - **Machine Gun** ($300, needs a Barracks): fast fire, strong against infantry, weak against vehicles, can't hit aircraft.
  - **Cannon** ($500, needs a War Factory): heavy shells, strong against vehicles, weak against infantry, can't hit aircraft.
  - **Missile** ($600, needs a Helipad): a tower with the longest range, salvos of two homing missiles at anything, aircraft hardest. Its lights turn red while an enemy is in sight.
  - **Laser** ($1,000, needs a Tech Centre): one big beam at anything every 4.5 seconds. It only starts charging once it spots an enemy (its legs spin faster as it charges).
  The computer builds them with its Engineers too, at its entrances and by the river or its Oil Derricks.
- Tap ground to move (groups move in formation), your Medbay to send units onto it to heal, an enemy to attack, ore to harvest (extractors). With engineers selected, tap your damaged building to repair it or an enemy building or Oil Derrick to capture it.

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `patchnotes.js` – the patch notes shown on the start screen (add new releases at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
