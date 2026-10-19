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
  revision: 1,
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
  treasureChests: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      coins: 5,
      technologies: ["SCOUTING", "HUNTING", "MARKSMANSHIP"],
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
        { role: "FIGHTER", at: { x: 2, y: 3 } },
        { role: "MARKSMAN", at: { x: 2, y: 1 } },
        { role: "RAIDER", at: { x: 3, y: 1 } },
      ],
      // The water, the Rift and both camps.
      reveal: {
        radius: 2,
        rects: [{ x0: 4, y0: 2, x1: 10, y1: 8 }],
      },
    },
    {
      // The scrap-raiders.
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
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
      ],
      reveal: { radius: 1 },
      // Step 1 keeps to the lesson: the raiders learn nothing.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
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
  // Run the raiders off: both camps. The stars: by round 12, and Quaxx
  // lives.
  objective: {
    kind: "DOMINATION",
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "QUAXX" },
    ],
  },
};
