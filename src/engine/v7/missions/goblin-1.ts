import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_1` "Grubnak Gets Bored" (docs/product/SAGA.md section 3.3, G1;
 * the Goblin campaign, `pulp_wars-hmyk.8`). You lead Grubnak the Loud's
 * goblins against the last of Baron Kessler's soldiers on the mainland, in
 * Fort Bullion, on an 11 x 11 board. Step 1 of 6: the Goblins from
 * scratch. Each goblin unit beside a target gives the next goblin's hit +1
 * Attack (an Ogre +2), up to +3; a Goblin may Kaboom (it dies and hits
 * everything around it for 6); the Warboss's Berserk sends the goblins
 * near him an extra tile through the enemy's lines.
 *
 * The board is the map generator's (Dry Land 11, seed 1): wooded hills in
 * the east, where the goblins camp, and plains in the west, where Fort
 * Bullion stands walled with its toll village to the south-east.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^.^f^^..f.f
 *    1   .^v.f.^.v..      v: villages
 *    2   ^.ff^$..f.f      $: treasure chests
 *    3   .f^fff..^ff
 *    4   ..^..vffR..      R: Rustgut Camp, yours
 *    5   ....fff^.$^
 *    6   ..B..f..ff.      B: Fort Bullion
 *    7   ..f..T...f.      T: Bullion Toll
 *    8   .......f^f^
 *    9   f......^fff
 *   10   .......f^ff
 * ```
 */
export const GOBLIN_1_V7: MissionDefinitionV7 = {
  id: "GOBLIN_1",
  revision: 1,
  seed: 20261501,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 1,
    // Bullion Toll stands on a village; the village behind the goblin camp
    // would be a free second town for the goblins.
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
    ],
  },
  terrain: [
    "^.^f^^..f.f",
    ".^..f.^....",
    "^.ff^...f.f",
    ".f^fff..^ff",
    "..^...ff...",
    "....fff^..^",
    ".....f..ff.",
    "..f...f..ff",
    ".......f^f^",
    "f......^fff",
    ".......f^ff",
  ],
  resources: [
    "o.o..o....g",
    ".o....o...e",
    "o...o..r...",
    "eg..gg.rogg",
    "..o.r..g...",
    "re.e...o...",
    ".e.rrger.g.",
    "er.er....g.",
    "..erer.g.g.",
    "greee..ogg.",
    ".rerre..o..",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHWWW",
    "HHHHHHHWWWW",
    "HHHHHHWWWWW",
    "HHHHHWWWWWW",
    "PHHHWWWWWWW",
    "PPPPWWWWWWW",
    "PPPPPWWWWWW",
    "PPPPPPWWWWW",
    "PPPPPPPWWWW",
    "PPPPPPPWWWW",
    "PPPPPPPWWWW",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 8, y: 1 },
    { x: 5, y: 4 },
    { x: 8, y: 7 },
  ],
  treasureChests: [
    { x: 5, y: 2 },
    { x: 9, y: 5 },
  ],
  // </map>
  // Fort Bullion's farm, on the fertile ground north of its walls.
  improvements: [{ at: { x: 1, y: 5 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 6,
      // Leadership gives the Warboss his Berserk; Land Grants a free slot
      // for the first new goblin.
      technologies: ["GATHERING", "ADMINISTRATION", "PLANNING"],
      cities: [
        {
          name: "Rustgut Camp",
          at: { x: 8, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Grubnak the Loud, an Orc Warboss, and Snikkit, who can read.
        { role: "CAPTAIN", at: { x: 8, y: 4 }, tag: "GRUBNAK" },
        { role: "FIGHTER", at: { x: 9, y: 3 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 4 } },
        { role: "FIGHTER", at: { x: 7, y: 3 } },
      ],
      // The fort and its toll, seen from the hills.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 5, x1: 6, y1: 8 }] },
    },
    {
      // Fort Bullion's garrison: a Guard on the walls, a rifle and two
      // Fighters; one Fighter at the toll.
      faction: "ORIGINAL",
      coins: 4,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Fort Bullion",
          at: { x: 2, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "Bullion Toll", at: { x: 5, y: 7 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
      ],
      reveal: { radius: 1 },
      // Step 1 keeps to the lesson: the garrison learns nothing more.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The fort and the toll keep their own; the rest play their game.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 1, y0: 5, x1: 3, y1: 7 },
          { x0: 5, y0: 7, x1: 5, y1: 7 },
        ],
        garrison: 2,
      },
    },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Take the fort and the toll. The stars: by round 12, and Snikkit lives.
  objective: {
    kind: "DOMINATION",
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
