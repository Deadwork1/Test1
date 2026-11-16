# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version:** 1v1 against the computer with terrain and fog of war, on the Classic or Large map.

- Your **settler** deploys into a **Headquarters (HQ)**.
- The HQ builds a **Refinery** ($400), a **Barracks** ($300, trains Soldiers and Scout Buggies), a **Guard Tower** ($500), **Walls** ($20 each) and **Gates** ($150).
- Each Refinery comes with one free **Extractor** and can build more ($150). They wait until you tap some **ore**, then run back and forth automatically. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The Barracks trains **Soldiers** ($100).
- The big ore field in the middle is the prize. Destroy everything the enemy owns to win.
- The computer plays under the same fog of war: it has to scout to find ore and your base.

## Terrain
- **Rocks & cliffs** block everything. Each base has a cliff wall with a gap.
- **River** blocks all ground units; cross at the **bridges**. The rich ore field sits on an island in the middle, reached by two bridges.
- **Forests** stop vehicles. Soldiers can walk through slowly and are hidden inside unless an enemy gets close or they open fire.
- Units find their own way around obstacles and buildings.

## Controls (touch or mouse)
- Drag to scroll, pinch (or mouse wheel) to zoom, tap the minimap to jump.
- Tap a unit or building to select it. **Box select**, then drag, to select several units.
- Tap ground to move, an enemy to attack, ore to harvest (extractors).

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `patchnotes.js` – the patch notes shown on the start screen (add new releases at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
