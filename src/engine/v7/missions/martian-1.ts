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
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start like a skirmish (one
 * level 1 town, Quaxx, a Grunt and a gun, no technology, no Coins), the
 * villages and chests within reach are gone, and the raiders are eleven with
 * Walls and Drill: they dig in for two rounds, then all but three march the
 * long way round, with rafts landing on the south shore in rounds 6 and 10;
 * the clock is 15.
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
  revision: 3,
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
      // Retune 3: the two villages and both chests within reach of Saucer
      // Field.
      { kind: "VILLAGE", at: { x: 2, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 5 }, present: false },
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
  villages: [{ x: 8, y: 1 }],
  treasureChests: [],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      // Retune 3: a skirmish start. One town at level 1, no technology, no
      // Coins, Quaxx, one Grunt and the only gun you cannot raise another
      // of yet; nothing seen beyond the town.
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "Saucer Field",
          at: { x: 3, y: 2 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Captain Quaxx, a Brain.
        { role: "CAPTAIN", at: { x: 2, y: 2 }, tag: "QUAXX" },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 1 } },
      ],
      reveal: { radius: 1 },
    },
    {
      // The scrap-raiders.
      faction: "GOBLIN",
      // Retune 3: 6 Coins, Gathering, Hunting, Scouting, Drill and Walls,
      // eleven raiders instead of four.
      coins: 6,
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
        { role: "FIGHTER", at: { x: 10, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 10, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 6 }, home: 1 },
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
          garrison: 11,
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
  // Retune 3: rafts of scrap-raiders land on the southern shore in rounds
  // 6 and 10.
  reinforcements: [
    {
      seat: 1,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "MARKSMAN", at: { x: 1, y: 9 } },
      ],
      line: "Goblins on rafts, wearing the last saucer's hat.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "RAIDER", at: { x: 4, y: 9 } },
        { role: "MARKSMAN", at: { x: 1, y: 8 } },
      ],
      line: "Every scrap-raider on the lake comes for your Shield.",
      announce: true,
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
  // Run the raiders off: both camps, by round 15 (retune 3: there was no
  // clock). The stars: by round 11, and Quaxx lives.
  objective: {
    kind: "DOMINATION",
    byRound: 15,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 11 },
      { kind: "UNIT_ALIVE", unit: "QUAXX" },
    ],
  },
};
