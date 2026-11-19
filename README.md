# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version:** 1v1 against the computer with terrain and fog of war, on the Classic, Large or Huge map.

- Your **settler** deploys into a **Headquarters (HQ)**.
- The HQ builds a **Refinery** ($400), a **Barracks** ($300, trains Soldiers, Grenadiers, Rocket Soldiers, Snipers and Engineers), a **War Factory** ($500, Scout Buggy, Light Tank, Artillery, Heavy Tank), a **Tech Centre** ($600, unlocks the Heavy Tank), a **Power Plant** ($200, +25% build and training speed each, up to double), a **Guard Tower** ($500), a **Radar** ($300, needs a Power Plant: reveals everything within 750, over rocks and cliffs), a **Medbay** ($400, needs a Barracks: units standing on it heal, up to 5 infantry or 1 vehicle at a time), a **Helipad** ($500, needs a War Factory: home of one Attack Helicopter), a **SAM Site** ($600, needs a Power Plant: shoots only at aircraft), **Walls** ($20 each) and **Gates** ($150, 3 tiles wide).
- Some things need other buildings first (tech tree): Grenadier, Rocket Soldier and Artillery need a Power Plant, Sniper needs a Guard Tower, the War Factory needs a Barracks and a Refinery, the Tech Centre needs a War Factory.
- Each Refinery comes with one free **Extractor** and can build more ($150). They wait until you tap some **ore**, then run back and forth automatically. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The big ore field in the middle is the prize. Destroy or capture (with an Engineer) the enemy Headquarters to win; lose yours and you lose.
- The computer plays under the same fog of war: it has to scout to find ore and your base.
- The first time a village's Derrick is captured, two **Civilians** (handguns, weaker than Soldiers, can't be trained) come out of each house and join that side.
- **Sell** any of your buildings (except the HQ) for half its price: select it, tap Sell, tap again to confirm.
- A **game clock** at the top shows how long the game has run.
- Each side has an old **ruined base** hidden deep in a jungle in the north-west (Large and Huge: a Barracks, Power Plant and Radar; Classic: a Barracks and a Radar). The ruins are neutral: capture each with an Engineer, then repair it to half health before it works. Knocked out, a ruin falls back to neutral instead of being destroyed. Ruins can't be sold. The computer goes for them too.
- On every map, two neutral **villages** each hold an **Oil Derrick** (Classic's are smaller, with two houses): one on each side's half of the river, the other across a bridge guarded by a plateau. Capture one with an Engineer and it pays $100 every 15 seconds. Neutral Derricks can't be damaged; an owned one knocked down to nothing goes back to neutral. The computer goes for them too (Normal and Hard).

## Terrain
- **Rocks & cliffs** block everything. Each base has a cliff wall with a gap.
- **River** blocks all ground units; cross at the **bridges**. The rich ore field sits on an island in the middle, reached by two bridges.
- **Plateaus** are high ground with cliffs and ramps: units up there see 25% further and shoot 20% further, can't be seen from below, and take only half damage from units below (Grenadiers and Artillery lob their shots and do full damage). On the Large and Huge maps two of them are **river lookouts** jutting out over the river by the middle island, with one ramp each facing away from the middle.
- **Forests** stop tanks and extractors. Infantry walk through slowly and are hidden inside unless an enemy gets close or they open fire; the Scout Buggy can drive through slowly but can't hide. Anything standing in a forest only sees 70% as far.
- Units find their own way around obstacles and buildings.

- **Helicopters:** an Attack Helicopter ($800) starts docked on its Helipad, flies over everything, fires 6 missiles (strong against vehicles and buildings, weak against infantry), then flies home to reload. Tap an enemy to attack, the ground to hover there, or its Helipad (or Return) to send it home. Only Rocket Soldiers and SAM Sites can shoot aircraft. On Normal and Hard the computer flies helicopters too (1 / 2), raiding your Extractors and Refineries, and builds SAM Sites once it has seen yours.

- **Crushing:** tanks and Extractors drive straight over enemy infantry and crush them.

## Controls (touch or mouse)
- Drag to scroll, pinch (or mouse wheel) to zoom, tap the minimap to jump.
- **Save game report** (pause menu or results screen) saves a file with the game's numbers for both sides, kills and value destroyed by each unit type, who killed whom, and a snapshot every 30 seconds, to keep or share.
- Your money is shown just above the bottom bar. The pause menu has Resume, Restart, **Exit Game** (both tap twice) and the patch notes.
- Tap a unit or building to select it. **Box select**, then drag, to select several units.
- **Engineers** ($100) can **build a Turret** where they stand ($125, the Engineer is used up). A Turret is empty until infantry climb in to **man** it (select infantry, tap the Turret); then it's a machine gun (300 health, range 140, strong against infantry, half damage to tanks). **Unload** lets the gunner out; if a manned Turret is destroyed, the gunner dies. Anyone can man an empty Turret, the enemy too. Turrets can't be sold or captured.
- Tap ground to move (groups move in formation), your Medbay to send units onto it to heal, an enemy to attack, ore to harvest (extractors). With engineers selected, tap your damaged building to repair it or an enemy building or Oil Derrick to capture it.

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `patchnotes.js` – the patch notes shown on the start screen (add new releases at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
