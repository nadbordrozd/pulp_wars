import type { MissionDefinitionV7 } from "./types";

/**
 * `TEST_GROUNDS` (docs/product/CAMPAIGN.md section 8.1): the hidden engine
 * fixture mission. It is registered for headless runs and tests and belongs
 * to no chapter. It exercises every layer of the definition format: a
 * faction choice on seat 0, two cities per seat (levels 1–4, `BOOM`, Walls),
 * a Farm and a Mine with their live records, a Road, Field Defenses,
 * villages, a treasure chest, a Grave (the AI seat is Undead), a Rift,
 * Shallow and Deep water with Fish and Pearls, a biome override row, a
 * starting technology set, a reveal rectangle, and the forbidden Naval
 * branch.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff~~
 *    1   ^f..v...^~~      v: a village
 *    2   f......Uf~~      U: the Undead capital
 *    3   f.h..x....~      h: the second human city; x: a Rift
 *    4   ..^^......~
 *    5   ...^.v....~
 *    6   f.........~
 *    7   f....+....~      +: a Grave
 *    8   f.H....u..~      H: the human capital; u: the second Undead city
 *    9   ^..ff....f~
 *   10   ^^f...ff^~~
 * ```
 */
export const TEST_GROUNDS_V7: MissionDefinitionV7 = {
  id: "TEST_GROUNDS",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261003,
  terrain: [
    "^^ff...ff~~",
    "^f......^~~",
    "f.......f~~",
    "f....x....~",
    "..^^......~",
    "...^......~",
    "f.........~",
    "f.........~",
    "f.........~",
    "^..ff....f~",
    "^^f...ff^~~",
  ],
  resources: [
    "...g......p",
    "........o..",
    "....r......",
    "...........",
    "...........",
    "..........s",
    "...........",
    "...........",
    "...........",
    ".e.........",
    "...........",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWWWWW",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
    "HHHHHHHHHHH",
    "HHHHHHHHHHH",
  ],
  villages: [
    { x: 4, y: 1 },
    { x: 5, y: 5 },
  ],
  // The Undead Road joins its two cities (it knows Roads): Road population.
  roads: [
    { x: 7, y: 3 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
  ],
  fieldDefenses: [
    { x: 6, y: 3 },
    { x: 8, y: 3 },
  ],
  improvements: [
    { at: { x: 1, y: 9 }, improvement: "FARM" },
    { at: { x: 8, y: 1 }, improvement: "MINE" },
  ],
  treasureChests: [{ x: 5, y: 9 }],
  graves: [{ x: 5, y: 7 }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: { choice: ["ORIGINAL", "GOBLIN"] },
      coins: 5,
      technologies: [],
      cities: [
        { at: { x: 2, y: 8 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 2, y: 3 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
        { role: "RAIDER", at: { x: 2, y: 3 }, home: 1 },
      ],
      reveal: { radius: 2 },
    },
    {
      faction: "UNDEAD",
      coins: 7,
      technologies: [
        "GATHERING",
        "SCOUTING",
        "ROADS",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          at: { x: 7, y: 2 },
          level: 4,
          rewards: ["SURVEY", "WALLS", "BOOM"],
        },
        { at: { x: 7, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "MARKSMAN", at: { x: 7, y: 8 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 7, x1: 3, y1: 9 }] },
    },
  ],
  forbiddenTechnologies: ["SHORECRAFT", "NAVIGATION", "NAVAL_ENGINEERING"],
  objective: { kind: "DOMINATION" },
};
