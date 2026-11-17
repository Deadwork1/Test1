// Patch notes shown on the start screen. Newest first.
// To add a release: put a new entry at the top of this list.
const PATCH_NOTES = [
  {
    version: '5.6.2', date: '17 Nov 2026', title: 'Proper gap walls',
    changes: [
      'The computer\'s wall across its gap is now one unbroken line of tiles from rock to rock (stepping sideways and up/down, never leaving diagonal holes), and the gate always sits on a straight stretch of it, so it opens and closes properly even when the gap is at an angle.',
      'It only picks gaps it can fully wall (no trees or ore in the way), keeps the wall line clear of its other buildings, and puts its towers far enough back to leave room for the wall.',
    ],
  },
  {
    version: '5.6.1', date: '17 Nov 2026', title: 'Tougher Heavy Tank',
    changes: [
      'Heavy Tank: health 800 to 1000, speed 35 to 40. It can now push through a wall and Guard Tower on its own; rocket soldiers in numbers are still its counter.',
    ],
  },
  {
    version: '5.6', date: '17 Nov 2026', title: 'Walls in the gaps, tidy formations',
    changes: [
      'The computer now seals the gap in the rocks in front of its base with a wall running from one rock face to the other (gate in the middle), and puts its first two Guard Towers just behind it at each end.',
      'Guard Towers, like walls, can now be built out to the edge of your build area plus a bit, so you can put them up by the rocks.',
      'Formations are neater: every unit goes to its exact spot, turns to face the way the group was heading and holds its place (stepping aside to let others past, then slotting back in).',
      'Rocket Soldier vs Heavy Tank: 1.5x damage (was 1.25x).',
      'Movement: a unit swerving round another keeps going round the same side instead of dithering, and vehicles can ease parked friends aside.',
    ],
  },
  {
    version: '5.5', date: '17 Nov 2026', title: 'Defending the base',
    changes: [
      'When one of your buildings is attacked, every combat unit nearby drops what it\'s doing and rushes the attackers (units you\'ve just ordered somewhere keep going). The computer\'s units do the same.',
      'The computer now finds the gaps in the rocks where attackers come into its base: its home guard stands watch at each one, its army gathers just inside the main one, and its first Guard Tower goes there too.',
      'On Normal and Hard the computer builds its first Guard Tower earlier (once it has a barracks and 3 extractors) instead of waiting until after its first attack.',
      'Gates now only open while one of your units is actually walking through, not when a guard is just standing next to them.',
      'Extractors now drive into the refinery\'s bay: the front half disappears under the roof while unloading.',
      'Engineers can no longer capture Guard Towers (or walls and gates).',
      'Group moves now use a Command & Conquer style formation: infantry gather in squares of up to 5 (one in the middle, four round it), each vehicle gets a square of its own, vehicles lead at the front, and the block faces the way it is going.',
      'Heavy Tank: rockets now do 1.25x damage to it instead of 2x (its thick armour), so a few rocket soldiers can no longer delete it in seconds.',
      'Movement: units queue behind friends heading the same way, or busy fighting or breaking a wall, instead of all swerving about in a gap.',
    ],
  },
  {
    version: '5.4', date: '16 Nov 2026', title: 'Smoother movement, stronger Hard',
    changes: [
      'Units no longer bump into each other as much: a moving unit steers around anyone in its way, and friendly units standing still step aside to let it through.',
      'The enemy\'s attack waves spread out around their target instead of all queueing for the same spot.',
      'Hard: the computer now runs up to 8 extractors and 3 refineries, puts down its second refinery after a minute, and moves on to fresh ore sooner.',
    ],
  },
  {
    version: '5.3', date: '16 Nov 2026', title: 'Cheaper heavies',
    changes: [
      'Light Tank: price $450 to $400.',
      'Heavy Tank: price $800 to $700.',
      'Tech Centre: price $800 to $600.',
      'Easy: the enemy army limit is now 11 (was 14).',
    ],
  },
  {
    version: '5.2', date: '16 Nov 2026', title: 'Sniper & tank tweaks',
    changes: [
      'Sniper: damage 60 to 75, and fires a little faster (every 2.7s instead of 3s).',
      'Light Tank: price $500 to $450. Heavy Tank: price $900 to $800.',
      'New Heavy Tank look: wide boxy hull with side skirts and road wheels, a big angular turret set further back, twin long barrels with muzzle brakes, and fuel drums on the back.',
    ],
  },
  {
    version: '5.1', date: '16 Nov 2026', title: 'Smarter enemy, balance',
    changes: [
      'The computer now trains counters to what it has seen of your army: more grenadiers and tanks against big infantry armies, more buggies against snipers and grenadiers, rocket soldiers against vehicles.',
      'Enemy engineers: it only keeps one for repairs when a building is badly damaged. On Normal and Hard it now sends an engineer raider every few minutes, sneaking the long way round the edge of the map to steal one of your buildings (never your HQ). Keep a guard at home!',
      'Soldier: damage 8 to 7 and range 90 to 85 (price unchanged).',
      'Sniper: price $250 to $200.',
      'Easy: the enemy army limit is now 14 (was 6).',
    ],
  },
  {
    version: '5.0.1', date: '16 Nov 2026', title: 'Stuck units fix',
    changes: [
      'Fixed: units (especially new extractors leaving a refinery) could get stuck forever just short of where they were sent if someone was parked on the spot. They now count that as arrived and carry on, so extractors start harvesting properly.',
    ],
  },
  {
    version: '5.0', date: '16 Nov 2026', title: 'Tech tree & tanks',
    changes: [
      'Tech tree: some things now need other buildings first. Locked buttons say what is missing, and losing a building locks them again.',
      'Grenadier and Rocket Soldier need a Power Plant. Sniper needs a Guard Tower.',
      'The War Factory is back ($500, needs Barracks + Refinery). It builds the Scout Buggy (moved from the Barracks) and the new tanks.',
      'New unit: Light Tank ($500). 350 HP, 30 damage every 1.5s, range 130.',
      'New building: Tech Centre ($800, needs War Factory). Unlocks the Heavy Tank.',
      'New unit: Heavy Tank ($900). 800 HP, twin cannons for 60 damage every 2s, range 140, but slow.',
      'Armour: rifles (soldiers, buggies, guard towers) do half damage to tanks; tank shells do half damage to infantry but splash a little onto anyone next to the target. Rockets are the tank killer.',
      'Tanks run over enemy infantry they drive into, and can\'t go through forests.',
      'The computer builds a War Factory on Normal and Hard and adds buggies and light tanks to its army; on Hard it also builds a Tech Centre for heavy tanks.',
    ],
  },
  {
    version: '4.5.1', date: '16 Nov 2026', title: 'New engineer look',
    changes: [
      'Engineers now wear a white hard hat with a brim and a team-colour badge.',
      'The spanner is replaced by a red toolbox: carried at their side, and set down while they repair.',
    ],
  },
  {
    version: '4.5', date: '16 Nov 2026', title: 'Snipers',
    changes: [
      'New unit: Sniper ($250, Barracks). Longest range of any unit (160, still short of a Guard Tower) and one shot kills any infantry, but it only fires every 3 seconds.',
      'Snipers are almost useless against vehicles and buildings: buggies are their counter.',
      'Snipers pick infantry first, and in a forest they are only given away for a moment when they fire.',
      'Snipers wear a camouflage hood so you can spot them in a crowd.',
      'The computer keeps a sniper on Normal (two on Hard) from 4 minutes in.',
    ],
  },
  {
    version: '4.4', date: '16 Nov 2026', title: 'Rocket Soldiers',
    changes: [
      'New unit: Rocket Soldier ($200, Barracks). Fires a fast homing rocket every 2.5s with a long range (130), so it can hit buggies before they can shoot back.',
      'Rockets do double damage to vehicles and buildings, but less than half damage to infantry: soldiers and grenadiers are its counter.',
      'Rocket soldiers pick vehicles first, and switch to one if it comes into range while they are shooting infantry.',
      'Can hide in forests like other infantry.',
      'The computer (Normal and Hard) trains rocket soldiers once it has seen your buggies, about one for each buggy it spotted.',
    ],
  },
  {
    version: '4.3.1', date: '16 Nov 2026', title: 'Buggy balance',
    changes: [
      'Scout Buggy damage lowered from 6 to 5 per shot. One buggy now loses to three soldiers, but a group of buggies is still strong.',
    ],
  },
  {
    version: '4.3', date: '16 Nov 2026', title: 'Grenadiers & Engineers',
    changes: [
      'New unit: Grenadier ($160, Barracks). Lobs grenades that hit everything in a small area: great against groups of soldiers. Grenades take a moment to land, so fast units can dodge, and they do half damage to vehicles. Buggies are its counter.',
      'New unit: Engineer ($75, Barracks). No weapon and very fragile (20 HP), so escort it. Select it and tap one of your damaged buildings to repair it, or tap an enemy building to walk in and capture it (the engineer is used up). Walls and gates can\'t be captured.',
      'The Barracks now shows a button for each of its units.',
      'Grenadiers and engineers can hide in forests like soldiers.',
      'The computer trains grenadiers (about one per three soldiers) and keeps an engineer to repair its base on Normal and Hard.',
      'Fixed: units that lost sight of a target could get stuck trying to reach the exact spot it was last seen.',
    ],
  },
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
