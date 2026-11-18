// Patch notes shown on the start screen. Newest first.
// To add a release: put a new entry at the top of this list.
const PATCH_NOTES = [
  {
    version: '5.45.1', date: '18 Nov 2026', title: 'Man the guns',
    changes: [
      'Turrets now need a crew. An Engineer builds an empty Turret (he\'s used up), and it does nothing until someone climbs in: select any infantry and tap the Turret to man it.',
      'Unload lets the gunner back out. If a manned Turret is destroyed, the gunner goes down with it.',
      'Anyone can man an empty Turret, the enemy too: leave one empty and enemy infantry can climb in and turn it on you.',
      'The computer sends its own infantry to crew the Turrets it builds.',
    ],
  },
  {
    version: '5.45', date: '18 Nov 2026', title: 'Dig in',
    changes: [
      'New: Engineers can dig in. Select one and tap "Dig in: Turret" and he builds a Turret where he stands (25, 3 seconds). He mans it from then on: he leaves your army, and if the Turret is destroyed, he goes with it.',
      'Turret: a machine gun behind sandbags. 300 health, range 140 (more on high ground), 10 damage a second, half damage to tanks like rifles. Needs open grass clear of buildings and ore. It can\'t be sold or captured, and you can\'t build around it.',
      'Engineers now cost $125 (was $75).',
      'The computer digs in Turrets too: just inside its entrances, then by its Oil Derricks. Up to 1 / 2 / 3 on Easy / Normal / Hard, from 5 minutes in.',
      'Fixed: a captured ruined base let you build out past the jungle. Its build area now only covers its own clearing.',
    ],
  },
  {
    version: '5.44', date: '18 Nov 2026', title: 'Taken by nature',
    changes: [
      'New: old ruined bases. Each side has one, hidden in a clearing deep in a big jungle in the north-west (the computer\'s is the mirror). On Large and Huge it is a ruined Barracks, Power Plant and Radar; on Classic a Barracks and a Radar.',
      'The ruins are neutral and battered. Send an Engineer to capture each building, then repair it: it only starts working once it is back to half health. Ruins are slow to fix, so bring a few Engineers.',
      'Once working, a ruin is a normal building: the Barracks trains troops near the front, the Power Plant speeds you up, the Radar sees far, and they count for the tech tree. Only infantry can get in through the trees, and you can\'t build anything else there.',
      'A ruin knocked down to nothing isn\'t destroyed: it falls back into a neutral ruin, ready to be taken again. Ruins can\'t be sold.',
      'The computer goes after the ruins too, from 9 / 7 / 6 minutes on Easy / Normal / Hard, and sends Engineers to repair them.',
      'Large and Huge: the big jungles are much bigger, reaching toward the map edge and filling the north-west, with wide gaps at both ends so tanks can get round. A few rock lines in and beside the jungles, and a small wood by the island bridge on Huge, are gone.',
      'Classic: rebuilt like the bigger maps. Each base is smaller with two ways in, the cliff above it running to the map edge. New: a village with an Oil Derrick and two houses by your river bridge, a river lookout beside the island bridge with a road plateau making a pinch, and a small plateau by the river bridge.',
    ],
  },
  {
    version: '5.43.1', date: '18 Nov 2026', title: 'Only when provoked',
    changes: [
      'The computer\'s Extractors only go after infantry that are attacking them. If the shooter stops (walks away or picks another target), the Extractor gives up at once and goes back to work.',
    ],
  },
  {
    version: '5.43', date: '18 Nov 2026', title: 'Watch your feet',
    changes: [
      'The computer\'s Extractors fight back: shot by infantry they can reach, they drive straight at the shooter to run them over, then go back to work.',
      'They give up when the shooter dies, hides in a forest, slips out of sight, or after 8 seconds of chasing, and never stray far from where they were. Yours still only crush infantry that get in their way.',
    ],
  },
  {
    version: '5.42.2', date: '18 Nov 2026', title: 'After you',
    changes: [
      'Extractors take turns at your gates: one leaving the base goes first, and one coming back waits just outside until it is through, then drives in.',
      'A waiting Extractor gives up after 8 seconds and goes anyway, so two can never lock each other out. The computer\'s Extractors follow the same rule.',
    ],
  },
  {
    version: '5.42.1', date: '18 Nov 2026', title: 'Clear the gate',
    changes: [
      'Fixed Extractors getting stuck at your gate and not getting back into the base. They drove through the gate\'s outer edge, too close to the wall, and two meeting head-on never made way for each other.',
      'Vehicles now drive through the middle of a gate, and units passing each other in a gateway can swerve round each other again.',
    ],
  },
  {
    version: '5.42', date: '18 Nov 2026', title: 'A sharper Normal',
    changes: [
      'Normal is a little tougher. The computer earns more from each ore load (94% instead of 85%), runs up to 6 Extractors (was 4) and builds 8% slower than Hard instead of 18%.',
      'On Normal the computer keeps training until it has 26 units (was 20), and its attack waves can be up to 16 strong (was 14).',
      'Easy and Hard are unchanged. Normal still has one Barracks, no Heavy Tanks and gives you about 3 minutes before its first attack.',
    ],
  },
  {
    version: '5.41.1', date: '18 Nov 2026', title: 'Seamless walls',
    changes: ['Wall sections no longer show a thin seam where they join.'],
  },
  {
    version: '5.41', date: '18 Nov 2026', title: 'A tougher opponent',
    changes: [
      'Gates are wider: 3 tiles long instead of 2, so two units fit through side by side and Extractors stop jamming in the doorway.',
      'Scout Buggy damage 5 to 4 (16 damage a second instead of 20). It was the best value unit in the game by a distance.',
      'The computer sends Engineer raids half as often (every 8 minutes on Normal, 6 on Hard) and spends the money on troops instead.',
      'The computer now keeps a guard right by its Headquarters (2 on Normal, 3 on Hard) as well as at its entrances, and if its HQ is attacked, attack waves nearby turn back to defend it.',
      'The computer\'s wounded troops, left idle after a fight, now go to its Medbay to heal. (Yours only go when you send them.)',
      'The computer sends its Snipers up to the plateaus first and keeps them off attack waves.',
    ],
  },
  {
    version: '5.40', date: '18 Nov 2026', title: 'Medbay',
    changes: [
      'New building: the Medbay ($400, needs a Barracks). A round pad your units walk onto to heal: up to 5 infantry at once (8 HP a second each) or 1 vehicle on its own (15 HP a second). First come, first served.',
      'Select units and tap your Medbay to send them onto it. Anyone who doesn\'t fit waits beside it.',
      'It glows green, pulsing on and off, while it is healing someone.',
      'The computer builds one too on Normal and Hard and sends its wounded troops to it.',
    ],
  },
  {
    version: '5.39', date: '18 Nov 2026', title: 'Headquarters of operations',
    changes: [
      'The Headquarters is now the biggest building in the game (140 across, was 92) and has a whole new look: a command centre with angled corners and a two-tier command tower.',
      'It comes alive: a helicopter takes off from its helipad every so often, circles the base and lands again; the radar sweeps with a green scan; the helipad lights chase round; steam rises from a vent; floodlights sweep the entrance; windows flicker and the satellite dish turns.',
    ],
  },
  {
    version: '5.38.1', date: '18 Nov 2026', title: 'No HQ raids',
    changes: ['The computer\'s Engineer raids no longer set out to steal your Headquarters. Any Engineer can still capture an HQ, which wins the game.'],
  },
  {
    version: '5.38', date: '18 Nov 2026', title: 'Steal the Headquarters',
    changes: [
      'Engineers can capture a Headquarters again. Take the enemy HQ with an Engineer and you win, the same as destroying it. Lose yours to an enemy Engineer and you lose.',
      'The computer\'s Engineer raids (Normal and Hard) may now go for your HQ too, so keep a guard near it.',
      'The results screen says whether the Headquarters was destroyed or captured.',
    ],
  },
  {
    version: '5.37.2', date: '18 Nov 2026', title: 'Room to breathe',
    changes: ['Large map: each village and its Oil Derrick have moved up a little, away from the cliff of the plateau beside them.'],
  },
  {
    version: '5.37.1', date: '18 Nov 2026', title: 'Village nudge',
    changes: ['Large map: the ridge beside each village has moved up a little, and each village and its Oil Derrick have moved a little closer to their side\'s base.'],
  },
  {
    version: '5.37', date: '18 Nov 2026', title: 'Large map, Huge style',
    changes: [
      'The Large map now has the Huge map\'s terrain, scaled down to fit.',
      'The cliff above each base runs all the way to the map edge, so each base has two ways in instead of three.',
      'One bridge across each river arm instead of two, plus the two island bridges.',
      'New high ground, three plateaus a side: a river lookout that juts out over the water by the island\'s bridge (shoot onto the island from up there), a plateau beside the road to that bridge that squeezes it into a pinch, and a plateau overlooking your river bridge, with a ridge across the road from it.',
      'Your village and Oil Derrick now sit by your river bridge, guarded by that plateau. The old corner plateau is gone.',
    ],
  },
  {
    version: '5.36', date: '18 Nov 2026', title: 'Villages on the Large map',
    changes: [
      'The Large map now has a village with an Oil Derrick on each side, by the outer river bridge, just below the plateau that guards the crossing (they replace the small woods that stood there). Capture one with an Engineer for $100 every 15 seconds, and the villagers join you.',
      'The other side\'s village is across its bridge, so taking it means a push over the river. The computer goes for them too.',
    ],
  },
  {
    version: '5.35.1', date: '18 Nov 2026', title: 'Exit Game',
    changes: ['The pause menu\'s Back to Menu button is now called Exit Game (still tap it twice).'],
  },
  {
    version: '5.35', date: '18 Nov 2026', title: 'Villages across the river',
    changes: [
      'Huge map: each village, with its Oil Derrick, has moved across the river, along with the plateau and rocks that guard its bridge. Each side now has a village on its own side of the river, and the other one sits beyond a bridge watched from high ground.',
      'Your money now sits in its own box just above the bottom bar, so it stays in view when you slide the buttons along.',
      'New Back to Menu button in the pause menu (tap it twice). It ends the game and takes you back to the start screen, where you can pick another map or difficulty.',
    ],
  },
  {
    version: '5.34', date: '18 Nov 2026', title: 'Hold the high ground',
    changes: [
      'Snipers, and any unit standing on high ground, now hold their ground when idle: they shoot enemies that come within range but no longer run off after them. The base alarm doesn\'t pull them away either unless the fight is right next to them.',
      'If you order one to attack something, it still goes after it.',
    ],
  },
  {
    version: '5.33', date: '18 Nov 2026', title: 'Sharp-eyed Snipers',
    changes: ['Snipers now see as far as a Scout Buggy: 220 (was 200). In a forest that is 154, on high ground 275.'],
  },
  {
    version: '5.32.1', date: '18 Nov 2026', title: 'You Lose',
    changes: ['The results screen now says "You Lose" when you are beaten.'],
  },
  {
    version: '5.32', date: '18 Nov 2026', title: 'Lose your HQ, lose the game',
    changes: [
      'New win rule: you lose when your Headquarters is destroyed (before you deploy, when you lose your Settler), and you win by destroying the enemy Headquarters.',
      'Headquarters can no longer be captured by Engineers.',
      'New results screen at the end of every game: You win! or You Lose, how long you played, and you against the enemy for troops made, buildings made, walls built, enemy troops killed, enemy buildings destroyed, troops and buildings lost, buildings captured, money earned and money spent.',
      'The start and results screen now scrolls from the top on small phones instead of cutting off its title.',
    ],
  },
  {
    version: '5.31', date: '18 Nov 2026', title: 'Fewer snags on buildings, tighter base alarm',
    changes: [
      'Fixed: an Extractor sent to ore behind its own Refinery could drive into the Refinery\'s corner and get stuck. It now goes round its own Refinery like any other building (it only drives into the bay to unload).',
      'Fixed: units could cut a corner on their way round a building and snag on its edge.',
      'Tanks and other big vehicles now plan routes with more room round buildings, so they don\'t try to squeeze through gaps only a soldier fits through.',
      'The base alarm reaches less far: when your base is attacked, idle units come from up to 500 away (was 1,000) and busy units from up to 300 (was 450). The same goes for the computer.',
    ],
  },
  {
    version: '5.30', date: '18 Nov 2026', title: 'Bridge pinches, no shooting through rock',
    changes: [
      'Huge map: the river bridges now have high ground over them too. A plateau stands beside the bridge above the island, its cliff overlooking the bridge, and a rock ridge across the road from it squeezes the way onto the bridge. The bridge below the island gets the same on the enemy\'s side.',
      'Fixed: units could shoot straight through rock (for example a Sniper behind the rock wall at a base, firing at an enemy a friend could see on the other side). Direct fire (rifles, rockets, sniper rounds, tank shells, Guard Towers) now needs a clear line; units walk round to get one or pick another target. Grenadiers and Artillery still lob their shots over rock.',
      'Your money is now shown at the bottom left of the screen, at the start of the bottom bar.',
    ],
  },
  {
    version: '5.29', date: '18 Nov 2026', title: 'The pinch',
    changes: [
      'Huge map: the plateau beside the road to the island has moved closer to the river lookout. The road to the island bridge now squeezes through a gap about 150 wide between the two cliffs, overlooked from both sides. Armies still fit through, and the route is no longer than before.',
    ],
  },
  {
    version: '5.28', date: '18 Nov 2026', title: 'Lookouts by the bridges, longer Radar',
    changes: [
      'Huge map: the river lookouts have slid round the river towards the island bridge on their side, as close as they can go without getting in the way of the bridge. The gold band on the island moved with them.',
      'Radar now reveals everything within 750 (was 650).',
      'Hard: attack waves can now grow to 30 units (was 22).',
    ],
  },
  {
    version: '5.27', date: '18 Nov 2026', title: 'Computer holds the map',
    changes: [
      'When the computer has more units at home than its next attack needs, it no longer lets them crowd its base. It sends the extras out, one at a time, to hold useful ground: bigger squads on its plateaus (up to 6), bigger guards at its Oil Derricks (up to 5), a group among the gold on its side of the middle island and another in the middle of it, and a few at its end of each river crossing.',
      'Its attack waves still go out as before; this only uses the extra units.',
    ],
  },
  {
    version: '5.26', date: '18 Nov 2026', title: 'Bridges halfway',
    changes: [
      'Huge map: the river bridge above the island and the one below now sit halfway along their stretch of river, between the island and the map edge.',
    ],
  },
  {
    version: '5.25', date: '18 Nov 2026', title: 'Fewer bridges',
    changes: [
      'Huge map: one river bridge removed above the island and one below (the ones nearest the map edges). Each half of the river now has a single crossing, plus the two bridges onto the island.',
    ],
  },
  {
    version: '5.24', date: '18 Nov 2026', title: 'Rich island, two ways in',
    changes: [
      'Huge map: much more gold on the middle island: 40 patches instead of 22. A band still runs along the shore by the river lookouts, and the rest is spread across the whole island. Still mirrored, so both sides get exactly the same.',
      'Huge map: the rock wall north of each base now runs right to the edge of the map, closing the far-left gap. Each base has two ways in: the gap between its two rock walls, and the gap at the bottom.',
    ],
  },
  {
    version: '5.23', date: '17 Nov 2026', title: 'Contested high ground',
    changes: [
      'Huge map: the plateaus that sat in quiet corners have moved onto the busy routes. One stands beside the main road from each base to the island, the other north of the big jungle over the road to the village. Each has one ramp facing back towards its own base.',
      'The forward ore field moved over a little to sit beside the new plateau.',
      'The gold on the middle island is now scattered round its edge, near the river, with a band of it on the shore opposite each river lookout, so the lookouts can shoot at anyone mining there. It is laid out in mirrored pairs, so both sides get exactly the same.',
    ],
  },
  {
    version: '5.22', date: '17 Nov 2026', title: 'Run them over',
    changes: [
      'Extractors now run over enemy infantry in their way, just like tanks.',
      'Tanks and Extractors no longer politely swerve around enemy infantry: they drive straight through and crush them. (Before, tanks only crushed soldiers who wandered into them.) They still steer round their own units and enemy vehicles.',
    ],
  },
  {
    version: '5.21.1', date: '17 Nov 2026', title: 'Computer takes its time',
    changes: [
      'The computer no longer rushes for Oil Derricks: it goes for them from 5 minutes in on Hard, 6 on Normal and 8 on Easy, with a small escort.',
      'Its high-ground squads start from 6 minutes (Hard) or 7 minutes (Normal) and wander up one unit at a time; the second plateau only once the first is held.',
      'Its scout looks for your base first instead of running to the villages.',
      'Reminder: Civilians only come out the first time a village\'s Derrick is captured, for whoever takes it, so get there first.',
    ],
  },
  {
    version: '5.21', date: '17 Nov 2026', title: 'Computer takes the high ground',
    changes: [
      'The computer now holds plateaus: on Normal it sends a squad of its longest-range units (Snipers, Rocket Soldiers, Grenadiers first) up its best plateau, on Hard up two. On the Huge map it goes for its river lookout first. It tops the squad up when units are lost, and they stay put instead of wandering home.',
      'The computer now guards the Oil Derricks it takes, with a small garrison (1 on Easy, 2 on Normal, 3 on Hard).',
      'Easy now goes for Oil Derricks too (from 5 minutes in, with a smaller escort).',
    ],
  },
  {
    version: '5.20.1', date: '17 Nov 2026', title: 'Cheaper, rounder Radar',
    changes: [
      'Radar now costs $300 (was $500), so it sells for $150.',
      'New round look: a circular pad, a round control building with a band in your colour, and a wide dish sweeping round on top.',
    ],
  },
  {
    version: '5.20', date: '17 Nov 2026', title: 'Radar',
    changes: [
      'New building: Radar ($300 since 5.20.1, built from the HQ, needs a Power Plant). Once finished it reveals everything within 650 of it, more than twice as far as the HQ sees.',
      'It is a radar, not eyes: it sees over rocks and up onto plateaus. Infantry hiding in forests still stay hidden.',
      'It has no weapon and only 400 HP, so keep it safe. Like any building it can be sold for half its price.',
      'The computer builds one too on Normal and Hard once it has a Power Plant.',
    ],
  },
  {
    version: '5.19', date: '17 Nov 2026', title: 'Shooting uphill',
    changes: [
      'Units on low ground only do half damage to anything up on a plateau (when they can see it at all: from right at the foot of the cliff, or with a spotter up top). This goes for rifles, rockets, sniper shots, tank shells and Guard Towers.',
      'Grenadiers and Artillery lob their shots, so they still do full damage uphill: bring them to crack a dug-in plateau.',
      'High ground now gives: 25% more sight, 20% more range, can\'t be seen from below, and half damage taken from below.',
    ],
  },
  {
    version: '5.18', date: '17 Nov 2026', title: 'River lookouts',
    changes: [
      'Huge map: two plateaus have moved to the middle, one on each side, right against the river ring around the island. Their rock juts out over the river, with a sheer cliff down to the water.',
      'Each has just one ramp, on the side facing away from the middle, so it is easy to hold.',
      'From the edge you can shoot onto the island: Rocket Soldiers and tanks reach well onto it, Snipers further still, Soldiers just onto the shore. Units on the island can\'t see up there, so they can\'t shoot back without a spotter.',
      'Fixed: low ground could see up onto high ground from across the river, and a unit standing right at a cliff edge could sometimes be seen from below.',
    ],
  },
  {
    version: '5.17.1', date: '17 Nov 2026', title: 'Map switching fixed on phones',
    changes: [
      'Fixed: on some phones (iPhones especially) the Large and Huge maps could fail to load, which also left the map buttons dead so you couldn\'t switch map again. Drawing the map now uses far less memory (Huge needs about 200 MB instead of going past the phone\'s limit).',
      'If a map ever does fail to load, the start screen now says so and the map buttons still work, so you can always pick another map.',
    ],
  },
  {
    version: '5.17', date: '17 Nov 2026', title: 'Smarter routes, darker forests',
    changes: [
      'Units no longer push into buildings and walls. Big vehicles were aiming for route points too close to a building for their size and got stuck there; now they pass those points and carry on. Units that brush a building or wall slide along it, and route shortcuts leave room for the unit\'s whole body.',
      'Units standing in a forest only see 70% as far as normal: the trees block the view. (Infantry are still hidden in there, so forests are for ambushes, not for spotting.)',
      'The computer\'s attack waves no longer crowd onto the spot where a building used to be (for example a Derrick they just knocked back to neutral); they move on to the next target.',
    ],
  },
  {
    version: '5.16.1', date: '17 Nov 2026', title: 'Pause button always reachable',
    changes: [
      'The Pause button now sits at the far left of the top bar, so it never gets pushed off a narrow screen.',
      'Both the top and bottom bars scroll sideways when their buttons don\'t fit: swipe them left or right.',
    ],
  },
  {
    version: '5.16', date: '17 Nov 2026', title: 'Civilians, game clock, selling',
    changes: [
      'Civilians: the first time a village\'s Oil Derrick is captured, two Civilians come out of each house and join whoever took it (six per village). They carry handguns and are weaker than Soldiers (40 HP, 4 damage, range 75). You can\'t train them.',
      'A game clock now sits next to your money at the top, showing how long the game has run (it stops while paused).',
      'Sell buildings: select one of your buildings and tap Sell, then tap again to confirm. You get half its price back, plus the full price of anything still queued in it. The HQ can\'t be sold.',
    ],
  },
  {
    version: '5.15', date: '17 Nov 2026', title: 'Villages and Oil Derricks',
    changes: [
      'The Huge map now has two small neutral villages, one north of the middle and one south, each about as far from both bases. Each has three houses and an Oil Derrick, joined by dirt paths.',
      'Oil Derricks start out neutral: nobody can damage them. Send an Engineer in to capture one (the Engineer is used up). Once it is yours it pumps $100 every 15 seconds, about as much as one Extractor, and it never runs out.',
      'An owned Derrick can be shot. Knocked down to nothing it doesn\'t blow up: it goes back to neutral, ready for anyone to capture. An enemy Engineer can also steal it.',
      'Derricks don\'t count towards winning or losing and don\'t extend your build area. Tap one to see what it pays.',
      'The computer goes for Derricks too on Normal and Hard: once it has found one, it sends an Engineer with an escort.',
      'Houses are neutral scenery for now: they block movement and can\'t be harmed.',
    ],
  },
  {
    version: '5.14', date: '17 Nov 2026', title: 'Huge map',
    changes: [
      'New Huge map (4800 x 3000, a third bigger each way than Large). Pick it on the start screen.',
      'Your base corner is laid out like on Large, but there is far more open ground between the bases: six ore fields per side (including a forward field and a far-corner field), a bigger middle island, three plateaus per side and more rocks and woods.',
      'It is built to make room for what comes next: neutral buildings and neutral characters in the middle ground.',
    ],
  },
  {
    version: '5.13', date: '17 Nov 2026', title: 'Defend every side',
    changes: [
      'The computer now finds every way into its base, including side gaps between rocks and the map edge, and walls each one with its own gate. Its Guard Towers and guards are spread across all of them.',
      'Base alarm: when enemy fighters walk into a base, idle units from anywhere in that base come to help (up to 1,000 away), not just the ones close by. This works for your units too.',
      'Taking buildings back: if an enemy Engineer steals a building, the computer sends an Engineer with an escort to win it back. For the first minute everyone holds fire on a stolen building so it can be retaken rather than destroyed. Your units hold fire too.',
    ],
  },
  {
    version: '5.12', date: '17 Nov 2026', title: 'Artillery',
    changes: [
      'New War Factory unit: Artillery ($450, needs a Power Plant). Very slow and fragile, but its shells fly 250 (a Guard Tower reaches 170) and do triple damage to buildings, splashing anything nearby.',
      'It can only fire at what your side can see, so bring a spotter, or shell buildings you have already scouted. Shells take a moment to land, so moving units can dodge them, and it can\'t hit anything right next to it.',
      'Artillery picks Guard Towers first, then other buildings, then units. It sits at the back of group formations, and its range shows when you select it.',
      'The computer brings Artillery on Normal (1) and Hard (2) once it has made a couple of attacks.',
    ],
  },
  {
    version: '5.11.1', date: '17 Nov 2026', title: 'Softer slopes',
    changes: [
      'The way up onto each plateau now looks like the ground gently rising and falling, shaded and blended into the grass, instead of a flat dirt patch. No more dark cliff-face lines cutting across the slopes.',
    ],
  },
  {
    version: '5.11', date: '17 Nov 2026', title: 'High ground',
    changes: [
      'New: raised plateaus with sheer, craggy cliff faces (2 per side on Large, 1 per side on Classic). The cliffs can\'t be climbed; dirt ramps lead up.',
      'Holding the high ground pays: units and buildings up there see 25% further and shoot 20% further.',
      'From below you can\'t see up onto a plateau (except right at the foot of a ramp), so you can\'t shoot back until you climb up or bring a spotter.',
    ],
  },
  {
    version: '5.10', date: '17 Nov 2026', title: 'New look for the land',
    changes: [
      'Cliffs and rocks are now drawn as solid, continuous rock with a shadow, a sunlit edge, a weathered top and cracks, instead of a pile of circles.',
      'The river is one flowing body of water with sandy banks, a deeper channel down the middle and ripples.',
      'Fewer, bigger forests: each map now has a large jungle on the routes between the bases (mirrored for both sides), plus a few smaller woods. Vehicles still go round them; infantry can hide inside.',
    ],
  },
  {
    version: '5.9', date: '17 Nov 2026', title: 'Line of sight',
    changes: [
      'Rocks now block vision: you can\'t see what\'s behind a ridge until you go round it or over the top of a gap. The same goes for the computer.',
      'Units and towers only pick targets they can actually see.',
    ],
  },
  {
    version: '5.8', date: '17 Nov 2026', title: 'Relentless enemy',
    changes: [
      'The computer now keeps attacking until the game is over: a new wave every 4 minutes on Easy, 3 on Normal and 2 on Hard. When a wave is due it goes with what it has (as long as it has a handful), and puts training troops ahead of saving up.',
      'What waves go for: Easy hits the nearest building, Normal goes after your economy (refineries and extractors), Hard goes for your Guard Towers first.',
      'When you are down to your last few buildings and it clearly has the bigger army, it goes all in, home guard included, to finish the job.',
      'Fixed: the computer could wall itself in if its gate didn\'t fit, trapping its own extractors. It now only builds wall pieces once its gate is up.',
    ],
  },
  {
    version: '5.7', date: '17 Nov 2026', title: 'New win rule',
    changes: [
      'You win once every enemy building is destroyed (walls and gates don\'t count) and they have no Settler left to start again. Leftover units no longer keep a beaten side in the game.',
    ],
  },
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
