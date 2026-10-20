import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_1` "Resurrection Men" (docs/product/SAGA.md section 3.2, U1; the
 * Undead campaign, `pulp_wars-hmyk.5`). You lead the Ashen Marquis's dead
 * against Kessler's Resurrection Company, grave-robbers digging up the
 * Barrowlands, on a dry 11 x 11 board. Step 1 of 6: the Undead from the
 * other side. Every robber who falls leaves a Grave, and a Necromancer
 * raises a Skeleton from every free Grave within two tiles of it; a fight
 * on the barrow fields feeds your army, a fight in the robbers' camps does
 * not.
 *
 * The board is the map generator's (Dry Land 11, seed 13). The Ashen Tower
 * stands on the north-western plain; the barrow fields, with seven old
 * Graves, lie across the middle; the robbers dig from two camps, one on
 * the eastern hills and one in the southern wood. The Company plays its
 * ordinary game but learns nothing: hand play (CAMPAIGN.md section 16)
 * found the camps growing a Fighter a turn each with any technology, and
 * Marksmen shooting every half-raised Skeleton on the fields.
 *
 * Retune 2 (`pulp_wars-hmyk.20`) made it a skirmish start: the Tower at
 * level 1 with no technology, five coins, a Skeleton, the Marquis and a
 * Necromancer, and one village; the camps are level 2 with Hunting, keep
 * all five Fighters home until round 4 (`GUARD`) and then send all but
 * two at the Tower (`RUSH`). The clock is 20 rounds, the star 15.
 *
 * ```text
 *      x 0123456789A
 * y  0   ..f....ff^.
 *    1   ..f..v...^^      v: villages
 *    2   ..A.f..f.^f      A: the Ashen Tower
 *    3   .....^f^^f^
 *    4   ....+++^+.^      +: old Graves
 *    5   ...v++.f.G.      G: Grimsditch Camp
 *    6   .ff^^^$+f.^      $: a treasure chest
 *    7   f..^^f^.f.^
 *    8   ^fffffSf...      S: Sexton's Dig
 *    9   fffff.f^..f
 *   10   .^ff..f.^f.
 * ```
 */
export const UNDEAD_1_V7: MissionDefinitionV7 = {
  id: "UNDEAD_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.20`, retune 2): a skirmish start.
  revision: 3,
  seed: 20261301,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 13,
    // The two camps stand on villages; the village in the middle of the
    // fields and the one by the southern camp would hand the robbers a
    // third town.
    edits: [
      { kind: "VILLAGE", at: { x: 9, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 8 }, present: false },
      // The chest beside Grimsditch Camp handed the robbers a Raider.
      { kind: "CHEST", at: { x: 8, y: 5 }, present: false },
      // Retune 2 (`pulp_wars-hmyk.20`): the village above the Tower would
      // be a free second town.
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
    ],
  },
  terrain: [
    "..f....ff^.",
    "..f......^^",
    "....f..f.^f",
    ".....^f^^f^",
    ".....f.^..^",
    ".......f...",
    ".ff^^^f.f.^",
    "f..^^f^.f.^",
    "^fffff.f...",
    "fffff.f^..f",
    ".^ff..f.^f.",
  ],
  resources: [
    "ee...er..o.",
    ".e..e.ereoo",
    ".e.r..eg.o.",
    "ee.re....g.",
    "eee...ro..o",
    "eer.e..g...",
    "eg...o...eo",
    ".rro...eg.o",
    "...g...g..r",
    "gg..g.g....",
    "r.gg..g....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPHH",
    "PPPPPPPPHHH",
    "PPPPPPPHHHH",
    "PPPPPPHHHHH",
    "PPPPPPHHHHH",
    "PPPPPWWWHHH",
    "PPPPWWWWWHH",
    "WWWWWWWWWWH",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
  ],
  villages: [{ x: 3, y: 5 }],
  treasureChests: [{ x: 6, y: 6 }],
  // </map>
  // The old Graves of the barrow fields.
  graves: [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 6, y: 4 },
    { x: 8, y: 4 },
    { x: 5, y: 5 },
    { x: 7, y: 6 },
  ],
  // The Dig's lumber camp (it feeds the camp's second level).
  improvements: [{ at: { x: 5, y: 8 }, improvement: "LUMBER_CAMP" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: [],
      cities: [
        { name: "The Ashen Tower", at: { x: 2, y: 2 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 2 } },
        // The Ashen Marquis.
        { role: "KNIGHT", at: { x: 3, y: 2 }, tag: "MARQUIS" },
        { role: "CAPTAIN", at: { x: 2, y: 3 } },
      ],
      reveal: { radius: 1 },
    },
    {
      // Kessler's Resurrection Company, foreman Grimsditch.
      faction: "ORIGINAL",
      coins: 4,
      technologies: ["HUNTING"],
      cities: [
        {
          name: "Grimsditch Camp",
          at: { x: 9, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Sexton's Dig",
          at: { x: 6, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 6, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 5, y: 7 }, home: 1 },
      ],
      reveal: { radius: 1, rects: [{ x0: 0, y0: 0, x1: 4, y1: 4 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
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
      // The robbers dig for three rounds; then each camp keeps a man on
      // its centre and every other robber goes for the Tower.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 8, y0: 4, x1: 10, y1: 6 },
            { x0: 5, y0: 7, x1: 7, y1: 9 },
          ],
          garrison: 10,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 9, y0: 5, x1: 9, y1: 5 },
            { x0: 6, y0: 8, x1: 6, y1: 8 },
          ],
          garrison: 2,
          others: { kind: "RUSH" },
        },
      ],
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
  // Run the robbers off by round 20: every camp. The stars: by round 15,
  // and the Marquis lives.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 15 },
      { kind: "UNIT_ALIVE", unit: "MARQUIS" },
    ],
  },
};
