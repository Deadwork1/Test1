// Patch notes shown on the start screen. Newest first.
// To add a release: put a new entry at the top of this list.
const PATCH_NOTES = [
  {
    version: '4.2', date: '16 Nov 2026', title: 'Large map',
    changes: [
      'New Large map (1.5× bigger each way), now the default. Pick Classic or Large on the start screen.',
      'Each side has its home field plus two expansion fields (north of your base and along the south edge) and a contested flank field. The island in the middle is bigger and richer.',
      'Extra cliffs, forests and two more river bridges. Still mirrored, so both sides are fair.',
      'You can zoom out further on the Large map to see the whole battlefield.',
      'The computer expands only on its own side of the river, and keeps training while it expands so its base is never left empty.',
    ],
  },
  {
    version: '4.1.1', date: '16 Nov 2026', title: 'No chasing through the fog',
    changes: [
      'Units no longer chase an enemy that escapes into the fog of war. They go to where they last saw it and stop there.',
      'Attacking a building you have already discovered still works, since buildings don\'t move.',
      'The same goes for the computer: its units lose track of yours in the fog too.',
    ],
  },
  {
    version: '4.1', date: '16 Nov 2026', title: 'Hide the minimap',
    changes: [
      'New Map button in the top bar: tap it to hide the minimap so it doesn\'t cover that corner of the battlefield, and tap again to bring it back.',
      'The game remembers whether you like it shown or hidden.',
      'Fixed: the Power Plant button still said $300 even though it costs $200. Build buttons now always show the real price.',
    ],
  },
  {
    version: '4.0', date: '16 Nov 2026', title: 'A smarter enemy',
    changes: [
      'The computer now attacks in proper waves: its army gathers outside its base, then marches together. Units that run ahead wait for the rest. Each wave is a bit bigger than the last.',
      'It keeps a home guard (1 on Easy, 3 on Normal, 4 on Hard), and when you attack its base, its guards and everything nearby fight back.',
      'Bigger economy: up to 4 extractors on Normal (5 on Hard). It builds its refinery right by its ore, and when that runs low it expands toward fresh ore with Power Plant stepping stones and new refineries.',
      'After each wave it takes a short break to invest: a second refinery, more towers (2 on Normal, 3 on Hard), and a wall with a gate across the approach to its base (Normal and Hard).',
      'Power Plants now cost $200 (was $300).',
      'Home ore fields are bigger: 500 ore per patch (was 300) for both sides, so they don\'t run dry so early.',
    ],
  },
  {
    version: '3.11.1', date: '16 Nov 2026', title: 'Power Plant makeover',
    changes: [
      'Fixed: the game could freeze once a Power Plant was built (introduced in 3.11).',
      'Power Plants are more detailed: shaded cooling towers with rising steam, pipes into a generator hall with roof vents and glowing windows, and a transformer that sparks now and then.',
      'War Factory (still shelved) redesigned: a tank emblem instead of the gear, and a vehicle ramp leading down from its garage door.',
    ],
  },
  {
    version: '3.11', date: '16 Nov 2026', title: 'New gate design',
    changes: [
      'Gates are now slim: two wall sections wide and one deep, so they sit in line with your walls.',
      'They turn automatically to match the wall you put them in. A Rotate button lets you turn them yourself.',
      'More detail: heavy posts with signal lamps (red when shut, green when opening), cross-braced steel doors with hazard stripes that slide into the posts along a track.',
    ],
  },
  {
    version: '3.10', date: '16 Nov 2026', title: 'Power Plant',
    changes: [
      'New building: Power Plant ($300), built from the HQ.',
      'Each finished Power Plant makes all your construction and unit training 25% faster, up to double speed with 4 plants.',
      'Your current bonus shows next to your money, e.g. ⚡ +50%.',
      'The computer builds one on Normal and two on Hard.',
    ],
  },
  {
    version: '3.9', date: '16 Nov 2026', title: 'Growing build area',
    changes: [
      'Your build area now grows as your base spreads out. Every finished building (not walls or gates) adds a circle 200 wide around it, on top of the HQ\'s 300.',
      'Build outward step by step to claim ground toward the middle of the map.',
      'Walls and gates can still reach a little further than other buildings.',
      'The computer expands the same way.',
    ],
  },
  {
    version: '3.8', date: '16 Nov 2026', title: 'Buggy moves to the Barracks',
    changes: [
      'The Scout Buggy is now trained at the Barracks ($250) next to Soldiers. Small and cheap, so no factory needed.',
      'Buggies can now drive through forests (slowly), though unlike soldiers they can\'t hide in them.',
      'The War Factory is shelved for now. It will come back later for heavier vehicles.',
      'The computer trains buggies from its Barracks on Normal and Hard.',
    ],
  },
  {
    version: '3.7', date: '16 Nov 2026', title: 'Scout Buggy',
    changes: [
      'New building: War Factory ($500), built from the HQ. Vehicles roll out of its big garage door.',
      'New unit: Scout Buggy ($250). Very fast with a rapid-fire machine gun. Great for scouting and hunting soldiers and extractors, but lightly armoured, so towers chew it up.',
      'Buggies are vehicles: they can\'t drive through forests.',
      'The "Soldiers" button is now "Army" and selects buggies too.',
      'The computer builds a War Factory and buggies on Normal and Hard, and uses a buggy to scout.',
    ],
  },
  {
    version: '3.6', date: '16 Nov 2026', title: 'Towers, walls & gates',
    changes: [
      'New building: Guard Tower ($500), built from the HQ.',
      'It fires automatically at the nearest enemy in range, and outranges soldiers.',
      'Soldiers that get shot by a tower charge it.',
      'Tap a tower to see its range. The range also shows while placing one.',
      'Towers don\'t need a front door, so they fit in tight spots.',
      'The computer builds towers too: none on Easy, one on Normal, two on Hard.',
      'New: Walls ($20 a section). Tap where a wall starts, tap where it ends, then tap the end again to build a straight run. Keep tapping to carry on from there; tap Done when finished. Sections join up automatically.',
      'New: Gate ($150). Opens for your own units; enemies have to destroy it (or a wall) to get through.',
      'Enemy soldiers that find their way blocked will now shoot through walls and gates.',
    ],
  },
  {
    version: '3.5.1', date: '16 Nov 2026', title: 'Difficulty tuning',
    changes: [
      'Normal is a little tougher: the enemy now builds 18% slower than you (was 25%).',
      'Easy is a little tougher too: the enemy now builds 50% slower than you (was 60%).',
      'On Normal the enemy can now keep up to 20 soldiers (was 10).',
    ],
  },
  {
    version: '3.5', date: '16 Nov 2026', title: 'Difficulty levels',
    changes: [
      'Choose Easy, Normal or Hard on the start screen. Your choice is remembered.',
      'Easy: the enemy builds 60% slower, earns 30% less from ore, keeps at most 6 soldiers and waits about 5 minutes before attacking.',
      'Normal (new default): the enemy builds 25% slower, earns 15% less, keeps at most 10 soldiers and waits about 3 minutes.',
      'Hard: the previous behaviour, full speed with two barracks and an early attack.',
    ],
  },
  {
    version: '3.4', date: '16 Nov 2026', title: 'Pause menu',
    changes: [
      'Pausing now opens a menu with Resume, Restart and Patch notes.',
      'Restart asks you to tap twice so you can\'t wipe your game by accident.',
      'Updates now show up as soon as you open the game, instead of one launch later.',
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
