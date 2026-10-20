import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_4` "Sour Notes" (docs/product/SAGA.md section 3.8, C4; the Candy
 * campaign, `pulp_wars-hmyk.11`). Men in grey hoods have stolen the
 * Sugarcrest choir and locked it in the crypt of the Wick Chapel, up in the
 * wooded hills. Take the chapel before they stop arguing about what to do
 * with it. Step 4 of 6: a first fight against daemons. A Horror's Boo!
 * makes every unit beside it jump a tile away, which breaks a line, and
 * Imps swarm; keep a second rank behind the first, and go for the robed
 * men who hold the daemons.
 *
 * The board is the map generator's (Dry Land 14, seed 6): Woodland in the
 * north and west, a deep wood across the middle of the board, open plain
 * in the south-east. Sugarcrest and Gumdrop stand on the southern road;
 * the brethren hold the Wick Chapel in the north-east woods and a camp on
 * the hill to the west of it.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   .ff^f.ff..ff.^
 *    1   ^.f.Hf$ff.W.f.      W: the Wick Chapel; H: the Hill Camp
 *    2   ^fffffffffffff
 *    3   f^ffffffffffff
 *    4   f.....fff..f.^
 *    5   .^^^....fff.^f
 *    6   .^$.f.........      $: treasure chests
 *    7   f...v.v.f.G...      G: Gumdrop; v: villages
 *    8   ^^..^.^....f..
 *    9   f^.^.^f..f...f
 *   10   ^^f.^^.S......      S: Sugarcrest
 *   11   f^.^^^........
 *   12   .f^^^f........
 *   13   .^f^.f.......f
 * ```
 */
export const CANDY_4_V7: MissionDefinitionV7 = {
  id: "CANDY_4",
  revision: 1,
  seed: 20261804,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 6,
    // The chapel, the hill camp, Sugarcrest and Gumdrop stand on villages;
    // the villages in the north and the west would hand the brethren more
    // towns.
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 7 }, present: false },
    ],
  },
  terrain: [
    ".ff^f.ff..ff.^",
    "^.f..fffff.ff.",
    "^fffffffffffff",
    "f^ffffffffffff",
    "f.....fff..f.^",
    ".^^^....fff.^f",
    ".^f.f.........",
    "f....^..f.....",
    "^^..^.^....f..",
    "f^.^.^f..f...f",
    "^^f.^^........",
    "f^.^^^........",
    ".f^^^f........",
    ".^f^.f.......f",
  ],
  resources: [
    "rg....gg.r.g..",
    "o..e....gg.g.e",
    ".g..g.gg..g..g",
    "..g....ggg....",
    "g....e.gge..e.",
    ".ooo...e.g..o.",
    ".o...e.e..eree",
    "...r.o........",
    ".o..or.r.r....",
    "go.orog.eg..r.",
    "....oor..r..r.",
    "..roo....r.ee.",
    "....o..err..ee",
    "........r..re.",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWW",
    "HWWWWWWWWWWWWW",
    "HHWWWWWWWWWWWW",
    "HHHWWWWWWWWWWW",
    "HHHHWWWWWWWWWW",
    "HHHHHWWWWWPPPP",
    "HHHHHHPPPPPPPP",
    "HHHHHHPPPPPPPP",
    "HHHHHHPPPPPPPP",
    "HHHHHHPPPPPPPP",
    "HHHHHHPPPPPPPP",
    "HHHHHPPPPPPPPP",
    "HHHHPPPPPPPPPP",
  ],
  villages: [
    { x: 4, y: 7 },
    { x: 7, y: 7 },
  ],
  treasureChests: [
    { x: 7, y: 1 },
    { x: 2, y: 6 },
  ],
  // </map>
  // The chapel's wood-yard.
  improvements: [{ at: { x: 10, y: 0 }, improvement: "LUMBER_CAMP" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CANDY",
      coins: 6,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 7, y: 10 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Gumdrop",
          at: { x: 10, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Queen Praline, who means to fetch her choir herself.
        { role: "JUGGERNAUT", at: { x: 7, y: 9 }, tag: "PRALINE" },
        { role: "CAPTAIN", at: { x: 7, y: 10 } },
        { role: "FIGHTER", at: { x: 8, y: 9 } },
        { role: "MARKSMAN", at: { x: 6, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 6 }, home: 1 },
      ],
      // The trail of sugar up to the chapel.
      reveal: {
        radius: 2,
        rects: [
          { x0: 8, y0: 0, x1: 12, y1: 6 },
          { x0: 2, y0: 0, x1: 6, y1: 2 },
        ],
      },
    },
    {
      // The Candlewick brethren, who could not agree.
      faction: "CULT",
      coins: 0,
      favour: 4,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Wick Chapel",
          at: { x: 10, y: 1 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Hill Camp", at: { x: 4, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 10, y: 1 } },
        { role: "FIGHTER", at: { x: 9, y: 1 } },
        { role: "GUARD", at: { x: 10, y: 2 } },
        { role: "MARKSMAN", at: { x: 11, y: 2 } },
        { role: "FIGHTER", at: { x: 4, y: 1 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 1 }, home: 1 },
        { role: "CAPTAIN", at: { x: 5, y: 1 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 4, x1: 12, y1: 9 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
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
      // The chapel keeps its garrison; the rest of the brethren come down
      // the hill for Gumdrop.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 9, y0: 0, x1: 11, y1: 2 }],
        garrison: 4,
        others: { kind: "ASSAULT", target: { x: 10, y: 7 } },
      },
    },
  ],
  // More brethren come up from Candlewick: by the hill camp in round 8 and
  // to the chapel in round 12.
  reinforcements: [
    {
      seat: 1,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 2, y: 0 } },
        { role: "FIGHTER", at: { x: 5, y: 0 } },
        { role: "MARKSMAN", at: { x: 1, y: 2 } },
      ],
    },
    {
      seat: 1,
      round: 12,
      units: [
        { role: "CAPTAIN", at: { x: 12, y: 0 } },
        { role: "FIGHTER", at: { x: 13, y: 1 } },
        { role: "FIGHTER", at: { x: 8, y: 0 } },
      ],
    },
  ],
  landmarks: [{ tag: "WICK_CHAPEL", at: { x: 10, y: 1 } }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The chapel by round 16 (the saga's 20: the thoughtful win came in
  // round 10). The stars: by round 12, and Praline lives.
  objective: {
    kind: "CAPTURE",
    places: ["WICK_CHAPEL"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "PRALINE" },
    ],
  },
};
