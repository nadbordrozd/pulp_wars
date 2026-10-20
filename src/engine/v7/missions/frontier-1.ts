import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_1` "Goblins at the Gate" (docs/product/CAMPAIGN.md section 9,
 * mission 1). Humans against a Goblin `RUSH` on a dry 11 x 11 board. Easy.
 * The lesson: a rush breaks on Guards in a walled city; then counterattack.
 *
 * Revision 3 (`pulp_wars-v642.1`): the board is the map generator's (Dry
 * Land, seed 1) with three villages taken off the rush lane. Your fort stands
 * on the south-western plain with two Farms; the Goblin capital is in the
 * wooded hills to the north-east, level 1 with no Coins behind it, and its
 * war band starts in the field, in the woods halfway to your walls. The
 * Goblins start over capacity, so the first wave is their whole army and
 * reinforcements trickle in as it dies.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^.^f^^..f.f
 *    1   .^v.f.^....      v: a village
 *    2   ^.ff^$..f.f      $: a treasure chest
 *    3   .f^fff..^ff
 *    4   ..^...wfG..      G: the Goblin capital; w: the war band
 *    5   ....fww^.$^
 *    6   ..H..fww.ff.     H: your capital, Fort Hollow
 *    7   ..f...f..ff
 *    8   .......f^f^
 *    9   f......^fff
 *   10   .......f^ff
 * ```
 */
export const FRONTIER_1_V7: MissionDefinitionV7 = {
  id: "FRONTIER_1",
  // Revision 4 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 4,
  size: 11,
  seed: 20261101,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 1,
    // The three villages on and beside the rush lane (the war band took
    // them instead of rushing) and the middle one of the northern three
    // (hand play, CAMPAIGN.md section 11.1).
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 7 }, present: false },
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
  villages: [{ x: 2, y: 1 }],
  treasureChests: [
    { x: 5, y: 2 },
    { x: 9, y: 5 },
  ],
  improvements: [
    { at: { x: 1, y: 5 }, improvement: "FARM" },
    { at: { x: 1, y: 6 }, improvement: "FARM" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 8,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Fort Hollow",
          at: { x: 2, y: 6 },
          level: 3,
          rewards: ["SURVEY", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "GUARD", at: { x: 3, y: 6 } },
        { role: "FIGHTER", at: { x: 2, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
      ],
      // The lookouts see the war band coming.
      reveal: { radius: 2, rects: [{ x0: 3, y0: 3, x1: 8, y1: 7 }] },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      // One known technology: no free opening research for the Goblins.
      technologies: ["GATHERING"],
      cities: [
        { name: "Drum Camp", at: { x: 8, y: 4 }, level: 1, rewards: [] },
      ],
      // The war band is already out of the hills.
      units: [
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 6, y: 6 } },
        { role: "FIGHTER", at: { x: 7, y: 6 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
      ],
      // Your capital and the ground between: an explored rush route (kept
      // under half the board, which would unlock the Explorer's Monument).
      reveal: { radius: 2, rects: [{ x0: 1, y0: 4, x1: 7, y1: 7 }] },
      // Goblin infantry only (hand play, CAMPAIGN.md section 11.1): no Bomb
      // Chuckers (their splash from two tiles away took the fort's Guards
      // apart), no Wolf Riders (five of them ran the fort down), and no
      // Mines or Ogres; Goblins and Orc Brutes are the whole horde.
      forbiddenTechnologies: [
        "ENGINEERING",
        "METALLURGY",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
      ],
      directive: { kind: "RUSH" },
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  objective: {
    kind: "DOMINATION",
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
