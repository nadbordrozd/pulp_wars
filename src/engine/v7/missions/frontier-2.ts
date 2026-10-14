import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_2` "The Warrens" (docs/product/CAMPAIGN.md section 9, mission
 * 2). Humans against Goblins on a dry 14 x 14 board, `NORMAL`. Medium. The
 * Goblins start with three cities; the lesson is to catch up by taking the
 * villages first, then the weak outpost on the way, and then the walled
 * capital, the Warrens: taking it wins the mission.
 *
 * Revision 3 (`pulp_wars-v642.1`): the board is the map generator's (Dry
 * Land, seed 9). Three of its villages are cities at the start: the Goblin
 * towns in the north-west and the east, and your own second town. You hold
 * the south-western plain; the Goblin capital, the Warrens, sits in the deep
 * woods of the north-east, and six villages lie between.
 *
 * ```text
 *      x 01234567890123
 * y  0   .ff....fff^.f.
 *    1   .$...f.fffff..
 *    2   .....g..vffGff      G: the Goblin capital; g: a Goblin town
 *    3   .......fff.fff
 *    4   ....$..fffffff
 *    5   ...f....vffvff      v: villages
 *    6   .vf.^....^f.^^
 *    7   ....v....f^.^f
 *    8   ^..f....v.fg.^      g: the Goblin outpost
 *    9   ^............f
 *   10   .v..H..f..f..^      H: your capital
 *   11   f...f^^fh.^v^f      h: your town
 *   12   .....^f^^^^^^.
 *   13   ....^.ff^^..f^
 * ```
 */
export const FRONTIER_2_V7: MissionDefinitionV7 = {
  id: "FRONTIER_2",
  revision: 3,
  seed: 20261102,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 9,
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 5 }, present: false },
    ],
  },
  terrain: [
    ".ff....fff^.f.",
    ".....f.fffff..",
    ".........ff.ff",
    ".......fff.fff",
    ".......fffffff",
    "...f.....ff.ff",
    "..f.^....^f.^^",
    ".........f^.^f",
    "^..f......f..^",
    "^............f",
    ".......f..f..^",
    "f...f^^f..^.^f",
    ".....^f^^^^^^.",
    "....^.ff^^..f^",
  ],
  resources: [
    "r..eeer..g.rge",
    "e.......g.g...",
    ".r.er..e.gg.gg",
    "...eeee...r.g.",
    ".r...rr.g..g.g",
    "rr..rr...gg.gg",
    "e..r.re.r..e..",
    "..re....r.o.og",
    "oe..re.e.....o",
    "orerree...r...",
    "..rr..rg.....o",
    "..rego.g..o.og",
    ".er.ro.ooooo..",
    "rr.e...goo.e..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPPWWWWWW",
    "PPPPPPPPPWWWWW",
    "PPPPPPPPPWWWWW",
    "PPPPPPPPPHHHWW",
    "PPPPPPPPHHHHHW",
    "PPPPPPPHHHHHHH",
    "PPPPPPHHHHHHHH",
    "PPPPPHHHHHHHHH",
    "PPPPHHHHHHHHHH",
  ],
  villages: [
    { x: 8, y: 2 },
    { x: 1, y: 6 },
    { x: 4, y: 7 },
    { x: 8, y: 8 },
    { x: 1, y: 10 },
    { x: 11, y: 11 },
  ],
  treasureChests: [
    { x: 1, y: 1 },
    { x: 4, y: 4 },
  ],
  // </map>
  // Your capital's Farm.
  improvements: [{ at: { x: 5, y: 9 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 12,
      // Hand play (CAMPAIGN.md section 11.2): with Gathering and Scouting
      // alone the Goblins' raids outran you; you start with Guards and
      // Marksmen and the technologies behind them.
      technologies: [
        "GATHERING",
        "SCOUTING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Ashby",
          at: { x: 4, y: 10 },
          level: 3,
          rewards: ["SURVEY", "WALLS"],
        },
        {
          name: "Millbrook",
          at: { x: 8, y: 11 },
          level: 2,
          rewards: ["SURVEY"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 4, y: 10 } },
        { role: "FIGHTER", at: { x: 4, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 10 } },
        { role: "RAIDER", at: { x: 5, y: 9 } },
        { role: "MARKSMAN", at: { x: 5, y: 10 } },
        { role: "GUARD", at: { x: 8, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 8, y: 10 }, home: 1 },
      ],
      // Your scouts have found the Warrens.
      reveal: { radius: 3, rects: [{ x0: 10, y0: 1, x1: 12, y1: 3 }] },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      // Neither Hunting nor Scouting (hand play, CAMPAIGN.md section
      // 11.2): the Bomb Chuckers and the Wolf Riders come later.
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        // A small capital (hand play, CAMPAIGN.md section 11.2): at level 3
        // with Lumber Camps it reached level 5 by round 10 and its two
        // Trolls held the Warrens against everything.
        {
          name: "The Warrens",
          at: { x: 11, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Stinkwell", at: { x: 5, y: 2 }, level: 1, rewards: [] },
        { name: "Muckgate", at: { x: 11, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 11, y: 2 } },
        { role: "FIGHTER", at: { x: 10, y: 3 } },
        { role: "FIGHTER", at: { x: 12, y: 1 } },
        { role: "FIGHTER", at: { x: 5, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 2 },
      ],
      reveal: { radius: 2 },
      // No Bomb Chuckers and no Ogres (hand play, CAMPAIGN.md section
      // 11.2): from the deep woods their bombs made the Warrens a fortress.
      forbiddenTechnologies: ["MARKSMANSHIP", "FIELDCRAFT", "METALLURGY"],
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "WARRENS", at: { x: 11, y: 2 } }],
  // Take the Goblin capital; the towns and villages are only the way there.
  objective: {
    kind: "CAPTURE",
    places: ["WARRENS"],
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
