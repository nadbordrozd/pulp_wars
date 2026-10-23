import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_1` "Strangers in a Strange Land" (docs/product/SAGA.md section
 * 3.6, M1; the Martian campaign, `pulp_wars-hmyk.7`). You lead Captain
 * Quaxx's stranded Martians from Saucer Field against goblin
 * scrap-raiders who strip crashed saucers for hats, on an 11 x 11 board of
 * lakes. Step 1 of 6: the Martians from scratch. Shields soak a hit and
 * refill every turn; a Saucer flies over water and the Rift and beams a
 * unit down beside itself; a heat ray hits hardest from a gun that has not
 * moved.
 *
 * The board is the map generator's (Lakes 11, seed 16) with a Rift cut
 * across the land bridge between the two lakes. Saucer Field stands on the
 * north-western shore; the goblins' two scrap camps lie across the water
 * and the Rift on the eastern strip, reachable on foot only the long way
 * round the southern lake.
 *
 * Retune 4 (`pulp_wars-hmyk.28`, hand-played; CAMPAIGN.md section 18.5):
 * you start with Saucer Field at level 2, Quaxx, a Grunt, a gun and a
 * Saucer, Scouting and Hunting and 5 Coins, the two villages within reach
 * are back (the chests stay gone), and the raiders are nine with Walls and
 * Drill: they dig in for two rounds, then all but three march the long way
 * round; no rafts land, and the clock is 20 (retune 3: a skirmish start
 * against eleven, two raft waves and a 15-round clock).
 *
 * ```text
 *      x 0123456789A
 * y  0   $..^ff$f.^.      $: treasure chests
 *    1   ....f^^^v^.      v: villages
 *    2   f..S~~~~~^^      S: Saucer Field
 *    3   f...~~~~~.^
 *    4   .f...xxxG^f      x: the Rift   G: Scrapheap
 *    5   ..v..v~~~f.
 *    6   .....~~~~f.
 *    7   ^...f~~~~Tf      T: Tinhat Camp
 *    8   ....f~~~~ff
 *    9   ...f.f.f.^f
 *   10   ...ff..^.f.
 * ```
 */
export const MARTIAN_1_V7: MissionDefinitionV7 = {
  id: "MARTIAN_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start, no village
  // or chest in reach, a rushing, richer raider camp, two announced waves
  // and a 15-round clock.
  // Revision 4 (`pulp_wars-hmyk.28`, retune 4): Saucer Field at level 2 with
  // a Saucer, the villages back, nine raiders, no waves and a 20-round
  // clock.
  revision: 4,
  seed: 20261601,
  // <map>
  size: 11,
  source: {
    mapType: "LAKES",
    size: 11,
    seats: 2,
    seed: 16,
    edits: [
      // The Rift across the land bridge between the two lakes.
      { kind: "TERRAIN", at: { x: 5, y: 4 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 6, y: 4 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 7, y: 4 }, terrain: "x" },
      // Tinhat Camp stands on the eastern village; the southern village
      // handed the raiders a third camp out of sight.
      { kind: "VILLAGE", at: { x: 9, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 9 }, present: false },
      // Retune 3: both chests within reach of Saucer Field (retune 4 gives
      // the two villages back).
      { kind: "CHEST", at: { x: 0, y: 0 }, present: false },
      { kind: "CHEST", at: { x: 6, y: 0 }, present: false },
    ],
  },
  terrain: [
    "...^ffff.^.",
    "....f^^^.^.",
    "f...~~~~~^^",
    "f...~~~~~.^",
    ".f...xxx.^f",
    "......~~~f.",
    ".....~~~~f.",
    "^...f~~~~.f",
    "....f~~~~ff",
    "...f.f.f.^f",
    "...ff..^.f.",
  ],
  resources: [
    "...o.....o.",
    ".ere.o.o.or",
    "..e.......o",
    "..erp.s..eo",
    "....r......",
    ".r.r..s..g.",
    ".rr.ep....r",
    ".ee..sp.s..",
    "r..e..ss...",
    "rr..e...rog",
    "......eo.g.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPHHHHHHHH",
    "PPPPHHHHHHH",
    "PPPPPPPPPHH",
    "PPPPPPPPPHH",
    "PPPPPPWWWWW",
    "PPPPPPPPPWW",
    "PPPPPPPPPWW",
    "PPPPWPPPPWW",
    "PPPPWPPPPWW",
    "PPPPWWWWWWW",
    "PPPPWWWWWWW",
  ],
  villages: [
    { x: 8, y: 1 },
    { x: 2, y: 5 },
    { x: 5, y: 5 },
  ],
  treasureChests: [],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      // Retune 4: Saucer Field at level 2, Scouting and Hunting, 5 Coins,
      // Quaxx, a Grunt, a gun and a Saucer (retune 3: level 1, nothing
      // researched, no Coins and no Saucer).
      coins: 5,
      technologies: ["SCOUTING", "HUNTING"],
      cities: [
        {
          name: "Saucer Field",
          at: { x: 3, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Captain Quaxx, a Brain.
        { role: "CAPTAIN", at: { x: 2, y: 2 }, tag: "QUAXX" },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 1 } },
        { role: "RAIDER", at: { x: 3, y: 1 } },
      ],
      reveal: { radius: 2 },
    },
    {
      // The scrap-raiders.
      faction: "GOBLIN",
      // Retune 3: Gathering, Hunting, Scouting, Drill and Walls, eleven
      // raiders instead of four (retune 4: nine, 5 Coins, were 6).
      coins: 5,
      technologies: [
        "GATHERING",
        "HUNTING",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Scrapheap",
          at: { x: 8, y: 4 },
          level: 1,
          rewards: [],
        },
        { name: "Tinhat Camp", at: { x: 9, y: 7 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "FIGHTER", at: { x: 9, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "MARKSMAN", at: { x: 10, y: 5 } },
        { role: "MARKSMAN", at: { x: 10, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 8, y: 9 }, home: 1 },
      ],
      // Saucer Field, from the scrap trail.
      reveal: { radius: 1, rects: [{ x0: 2, y0: 1, x1: 4, y1: 3 }] },
      // The raiders learn little more (Step 1 keeps to the lesson).
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The raiders dig in for two rounds, then each camp keeps two on
      // its centre and the rest go round the lake for Saucer Field.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 7, y0: 3, x1: 10, y1: 6 },
            { x0: 8, y0: 6, x1: 10, y1: 9 },
          ],
          garrison: 9,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 8, y0: 4, x1: 8, y1: 4 },
            { x0: 9, y0: 7, x1: 9, y1: 7 },
          ],
          garrison: 3,
          others: { kind: "RUSH" },
        },
      ],
    },
  ],
  // Lakes, but no fleets in the first lesson.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Run the raiders off: both camps, by round 20 (retune 3: 15; before it
  // there was no clock). The stars: by round 14, and Quaxx lives.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 14 },
      { kind: "UNIT_ALIVE", unit: "QUAXX" },
    ],
  },
};
