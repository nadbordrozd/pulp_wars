import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_3` "Green Tide" (docs/product/CAMPAIGN.md section 9, mission
 * 3). You lead the Goblins against the Undead on a dry 14 x 14 board.
 * Medium. The lesson is Goblin play (cheap Goblins, Kaboom, Gang Up) and
 * striking before a turtle matures: the Undead `HOLD` the northern plain
 * until round 16, then play `NORMAL`.
 *
 * Revision 3 (`pulp_wars-v642.1`): the board is the map generator's (Dry
 * Land, seed 24). Your capital is in the wooded south-east with a second
 * town below it; the Undead capital, the Barrow, lies on the open plain to
 * the north behind a ridge in the west and a belt of forest in the east.
 * Taking the Barrow wins the mission.
 *
 * ```text
 *      x 01234567890123
 * y  0   fff..f^.......
 *    1   .....+f.....f^      +: Graves
 *    2   .fv....U...uff      U: the Barrow; u: an Undead town
 *    3   .....+....fff.
 *    4   .........+f.^f
 *    5   ..v..v.fv.fvf^      v: villages
 *    6   .f...f.fffff^.
 *    7   .^^^^^^fffff..      the ridge, and the forest belt east of it
 *    8   .v^^^vffff.^.f
 *    9   ..f^^fffffG.^f      G: your capital
 *   10   .^.f^^fff^.^f^
 *   11   ^.^^fvfff.^ff^
 *   12   ^^^^..ffv.fgff      g: your town
 *   13   .^^$..^.$f...f
 * ```
 */
export const FRONTIER_3_V7: MissionDefinitionV7 = {
  id: "FRONTIER_3",
  revision: 3,
  seed: 20261103,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 24,
    edits: [
      { kind: "VILLAGE", at: { x: 11, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 12 }, present: false },
    ],
  },
  terrain: [
    "fff..f^.......",
    "......f.....f^",
    ".f..........ff",
    "..........fff.",
    ".........ff.^f",
    ".......f..f.f^",
    ".f...f.fffff^.",
    ".^^^^^^fffff..",
    "..^^^.ffff.^.f",
    "..f^^fffff..^f",
    ".^.f^^fff^.^f^",
    "^.^^f.fff.^ff^",
    "^^^^..ff..f.ff",
    ".^^...^..f...f",
  ],
  resources: [
    "....eg...r.rr.",
    ".er..e.eerrrg.",
    "e..re.e.re....",
    "r..rrrrrr.ggg.",
    "..r.r....gge.g",
    ".r.rr.r..eg...",
    "...r.gr..gg..r",
    "rooooooggggg..",
    "..ooo..ggge..g",
    "e..oo..g.g..og",
    "...goo........",
    "..o....ggeo.go",
    "...o.eg...g..g",
    "r.o......grrr.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPW",
    "PPPPPPPPPPPPWW",
    "PPPPPPPPPPPWWW",
    "PPPPPPPPPPWWWW",
    "PPPPPPPPPWWWWW",
    "PPPPPPPPWWWWWW",
    "PPPPPPPWWWWWWW",
    "HHHHHHWWWWWWWW",
    "HHHHHHWWWWWWWW",
    "HHHHHHWWWWWWWW",
    "HHHHHHWWWWWWWW",
    "HHHHHHWWWWWWWW",
    "HHHHHHHWWWWWWW",
    "HHHHHHHHWWWWWW",
  ],
  villages: [
    { x: 2, y: 2 },
    { x: 2, y: 5 },
    { x: 5, y: 5 },
    { x: 8, y: 5 },
    { x: 11, y: 5 },
    { x: 1, y: 8 },
    { x: 5, y: 8 },
    { x: 5, y: 11 },
    { x: 8, y: 12 },
  ],
  treasureChests: [
    { x: 3, y: 13 },
    { x: 8, y: 13 },
  ],
  // </map>
  // Your capital's Mine.
  improvements: [{ at: { x: 12, y: 9 }, improvement: "MINE" }],
  graves: [
    { x: 5, y: 1 },
    { x: 5, y: 3 },
    { x: 9, y: 4 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 12,
      // The horde is the lesson (hand play, CAMPAIGN.md section 11.3): with
      // six units and 5 Coins a turn the first Bomb Chucker came in round
      // 6, and a horde far over capacity could not replace its dead. You
      // start with Bomb Chuckers, the technologies behind them, and a
      // capital big enough to keep the Goblins coming.
      technologies: [
        "SCOUTING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Wolfden",
          at: { x: 10, y: 9 },
          level: 4,
          rewards: ["SURVEY", "WALLS", "BOOM"],
          // The hills leave little open ground: the capital has its grant.
          landGrant: true,
        },
        { name: "Mudpot", at: { x: 11, y: 12 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 10, y: 9 } },
        { role: "FIGHTER", at: { x: 10, y: 8 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 12, y: 8 } },
        { role: "RAIDER", at: { x: 12, y: 7 } },
        { role: "MARKSMAN", at: { x: 10, y: 7 } },
        { role: "MARKSMAN", at: { x: 11, y: 7 } },
        { role: "FIGHTER", at: { x: 11, y: 12 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 12 }, home: 1 },
      ],
      // The Barrow, and the ground on the way to it.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 1, x1: 8, y1: 3 },
          { x0: 9, y0: 5, x1: 13, y1: 7 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: ["GATHERING", "DRILL", "FORTIFICATION", "ADMINISTRATION"],
      cities: [
        {
          name: "The Barrow",
          at: { x: 7, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Gravesend", at: { x: 11, y: 2 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "CAPTAIN", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 11, y: 2 }, home: 1 },
        { role: "GUARD", at: { x: 11, y: 3 }, home: 1 },
      ],
      reveal: { radius: 2 },
      // The open plain around the Barrow; the villages of the forest belt
      // are yours to take while the Undead wait.
      directive: {
        kind: "HOLD",
        zone: [{ x0: 0, y0: 0, x1: 13, y1: 4 }],
        untilRound: 16,
      },
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "BARROW", at: { x: 7, y: 2 } }],
  // Take the Undead capital. The second star is for doing it before the
  // Undead march (round 16).
  objective: {
    kind: "CAPTURE",
    places: ["BARROW"],
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 15 }, { kind: "KEEP_CITIES" }],
  },
};
