# Mini RTS

A small real-time strategy game inspired by classic 90s RTS games, built step by step.

**Current version (v2):** 1v1 against the computer on a large map with fog of war.

- Your **settler** deploys into a **Headquarters (HQ)**.
- The HQ builds a **Refinery** ($400) and a **Barracks** ($300).
- Each Refinery comes with one free **Extractor** and can build more ($150). They wait until you tap some **ore**, then run back and forth automatically. When a patch runs out they go idle; **Auto-harvest** sends them to the nearest ore you've discovered.
- The Barracks trains **Soldiers** ($100).
- The big ore field in the middle is the prize. Destroy everything the enemy owns to win.
- The computer plays under the same fog of war: it has to scout to find ore and your base.

## Controls (touch or mouse)
- Drag to scroll, pinch (or mouse wheel) to zoom, tap the minimap to jump.
- Tap a unit or building to select it. **Box select**, then drag, to select several units.
- Tap ground to move, an enemy to attack, ore to harvest (extractors).

## Files
- `index.html` – page layout and buttons
- `game.js` – all game logic (balance numbers are at the top)
- `manifest.webmanifest`, `sw.js`, `icons/` – make it installable as a phone app
