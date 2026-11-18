# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version:** 1v1 against the computer with terrain and fog of war, on the Classic, Large or Huge map.

- Your **settler** deploys into a **Headquarters (HQ)**.
- The HQ builds a **Refinery** ($400), a **Barracks** ($300, trains Soldiers, Grenadiers, Rocket Soldiers, Snipers and Engineers), a **War Factory** ($500, Scout Buggy, Light Tank, Artillery, Heavy Tank), a **Tech Centre** ($600, unlocks the Heavy Tank), a **Power Plant** ($200, +25% build and training speed each, up to double), a **Guard Tower** ($500), a **Radar** ($300, needs a Power Plant: reveals everything within 750, over rocks and cliffs), **Walls** ($20 each) and **Gates** ($150).
- Some things need other buildings first (tech tree): Grenadier, Rocket Soldier and Artillery need a Power Plant, Sniper needs a Guard Tower, the War Factory needs a Barracks and a Refinery, the Tech Centre needs a War Factory.
- Each Refinery comes with one free **Extractor** and can build more ($150). They wait until you tap some **ore**, then run back and forth automatically. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The big ore field in the middle is the prize. Destroy the enemy Headquarters to win; lose yours and you lose. Headquarters can't be captured.
- The computer plays under the same fog of war: it has to scout to find ore and your base.
- The first time a village's Derrick is captured, two **Civilians** (handguns, weaker than Soldiers, can't be trained) come out of each house and join that side.
- **Sell** any of your buildings (except the HQ) for half its price: select it, tap Sell, tap again to confirm.
- A **game clock** at the top shows how long the game has run.
- On the Large and Huge maps, two neutral **villages** each hold an **Oil Derrick**: one on each side's half of the river, the other across a bridge guarded by a plateau. Capture one with an Engineer and it pays $100 every 15 seconds. Neutral Derricks can't be damaged; an owned one knocked down to nothing goes back to neutral. The computer goes for them too (Normal and Hard).

## Terrain
- **Rocks & cliffs** block everything. Each base has a cliff wall with a gap.
- **River** blocks all ground units; cross at the **bridges**. The rich ore field sits on an island in the middle, reached by two bridges.
- **Plateaus** are high ground with cliffs and ramps: units up there see 25% further and shoot 20% further, can't be seen from below, and take only half damage from units below (Grenadiers and Artillery lob their shots and do full damage). On the Large and Huge maps two of them are **river lookouts** jutting out over the river by the middle island, with one ramp each facing away from the middle.
- **Forests** stop tanks and extractors. Infantry walk through slowly and are hidden inside unless an enemy gets close or they open fire; the Scout Buggy can drive through slowly but can't hide. Anything standing in a forest only sees 70% as far.
- Units find their own way around obstacles and buildings.

- **Crushing:** tanks and Extractors drive straight over enemy infantry and crush them.

## Controls (touch or mouse)
- Drag to scroll, pinch (or mouse wheel) to zoom, tap the minimap to jump.
- Your money is shown just above the bottom bar. The pause menu has Resume, Restart, **Exit Game** (both tap twice) and the patch notes.
- Tap a unit or building to select it. **Box select**, then drag, to select several units.
- Tap ground to move (groups move in formation), an enemy to attack, ore to harvest (extractors). With engineers selected, tap your damaged building to repair it or an enemy building or Oil Derrick to capture it.

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `patchnotes.js` – the patch notes shown on the start screen (add new releases at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
