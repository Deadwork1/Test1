// Patch notes shown on the start screen. Newest first.
// To add a release: put a new entry at the top of this list.
const PATCH_NOTES = [
  {
    version: '3.4', date: '16 Nov 2026', title: 'Pause menu',
    changes: [
      'Pausing now opens a menu with Resume, Restart and Patch notes.',
      'Restart asks you to tap twice so you can\'t wipe your game by accident.',
    ],
  },
  {
    version: '3.3', date: '16 Nov 2026', title: 'Pathfinding fixes',
    changes: [
      'Fixed extractors getting stuck on the corners of the Refinery and other buildings.',
      'Units now keep a gap from building walls and drive all the way round to the front door.',
      'Extractors line up with the bay door before driving straight in.',
      'If a unit stops moving along its route it re-plans automatically.',
      'A truck that can\'t reach the bay no longer blocks it for everyone else.',
    ],
  },
  {
    version: '3.2', date: '16 Nov 2026', title: 'Building makeover',
    changes: [
      'Headquarters: command building with a star emblem, spinning radar dish and blinking antenna.',
      'Barracks: two army huts with sergeant-stripes emblem and sandbags by the door.',
      'Refinery: storage tanks, smoking chimney, ore emblem and a striped unloading pad.',
      'Selected buildings show their name, and the placement preview shows what you are building.',
      'Every building now has a front door facing the bottom of the screen. Units leave through it.',
      'Extractors drive into the Refinery through its front unloading bay, one at a time, then reverse back out. Others queue at the door.',
      'Buildings need open ground in front of their door, and can\'t be built on another building\'s doorstep.',
    ],
  },
  {
    version: '3.1', date: '16 Nov 2026', title: 'Soldier makeover',
    changes: [
      'Soldiers now look like soldiers: helmet, backpack and a rifle pointing where they aim.',
      'Legs step while they walk, and a small muzzle flash shows when they fire.',
    ],
  },
  {
    version: '3.0', date: '16 Nov 2026', title: 'Terrain',
    changes: [
      'New map layout with a river, bridges, cliffs and forests (mirrored so both sides are fair).',
      'The rich ore field now sits on an island in the middle, reached by two bridges.',
      'Cliff walls with gaps create choke points near each base.',
      'Forests block vehicles. Soldiers can pass through slowly and are hidden inside unless an enemy is close or they fire.',
      'Units now find their own way around obstacles and buildings.',
      'Buildings can only be placed on open grass.',
    ],
  },
  {
    version: '2.2', date: '16 Nov 2026', title: 'Fair fight',
    changes: [
      'The computer now plays under fog of war too.',
      'It has to scout to find ore and your base, and only attacks what it has seen.',
      'Its scout runs home to report instead of attacking alone.',
    ],
  },
  {
    version: '2.1', date: '16 Nov 2026', title: 'Free extractor',
    changes: ['Every Refinery comes with one free Extractor when it finishes building.'],
  },
  {
    version: '2.0', date: '16 Nov 2026', title: 'Ore & fog of war',
    changes: [
      'Much bigger map: drag to scroll, pinch to zoom, minimap to jump around.',
      'Ore fields to collect, including a big contested field in the middle.',
      'New building: Refinery ($400), built from the HQ.',
      'New unit: Extractor ($150). Waits until you send it to ore, then harvests automatically. Goes idle when the ore runs out; Auto-harvest sends it to the nearest known ore.',
      'Fog of war: explore to reveal the map.',
      'Money now comes mainly from ore.',
      'Box select button for picking several units.',
    ],
  },
  {
    version: '1.0', date: '16 Nov 2026', title: 'First playable',
    changes: [
      '1v1 against the computer.',
      'Settler deploys into a Headquarters.',
      'HQ builds a Barracks, which trains Soldiers.',
      'Destroy everything the enemy owns to win.',
    ],
  },
];
