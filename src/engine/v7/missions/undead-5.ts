import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_5` "Bedtime Reading" (docs/product/SAGA.md section 3.2, U5; the
 * Undead campaign, `pulp_wars-hmyk.5`). Brother Mallory, Hierophant of the
 * Grey Lodge (a tagged Summoner), is reading the Marquis's diary aloud at
 * Greyhood; you must kill him by round 16. Step 5 of 6: a hunt for a target
 * behind a shield wall. A unit beside a raised idol may attack only an
 * Idol Bearer, and shots at cultists beside it do half; break the Bearers
 * first, then send the Vampire in: its kill heals it and lets it strike
 * again. A Wail is no shot: it hurts every living enemy near the Banshee.
 *
 * The board is the map generator's (Lakes 16, seed 9): two lakes in the
 * north-west and north-east, and between them a strip of reed-beds where
 * Greyhood stands, ringed by its Idol Bearers (`GUARD`). The causeway to
 * it from the south is held by Kessler's Toll, a fort of the Baron's
 * toll-men (`GUARD`, the rest of them `RUSH` at your towns); the long way
 * round the western lake reaches the strip from the north. Between the
 * fort and the strip stands a peak that only Engineering climbs (the
 * Lodge has none, so its ring stays on the strip); Blast Mountain makes it
 * grass. Lantern Hill and Gallows Cross, the Marquis's towns, stand in the
 * south-west.
 *
 * Hand play (CAMPAIGN.md section 16) set the numbers: with a level 1
 * chapel, two Initiates and a smaller ring, the autopilot won by round 18,
 * so Greyhood is level 2, the ring holds ten and the Lodge has Favour for
 * Horrors. Killing a daemon's channellers turns it loose on the Lodge.
 *
 * Retune 4 (`pulp_wars-hmyk.26`) makes the start stronger than your
 * column: the ring has six Idol Bearers (two more close the strip's
 * southern end), the Lodge five coins and 14 Favour; the toll-men have six
 * coins, two Champions, a second Marksman and a Knight. A hunt keeps a
 * meaningful clock: 16 rounds (good wins took 13 and 14), the star 13.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ..ff....f.fffff^
 *    1   ..v...f.....ffff      v: villages
 *    2   ......f.f..f^f..
 *    3   ..f~~~~~ff~~f.ff
 *    4   ..v~~~~~.f~~~fff
 *    5   ^..~~~~~fG~~~fff      G: Greyhood (Mallory in the chapel)
 *    6   ..f~~~~~~.~~~.ff
 *    7   ..v~~~~^.f~~~...
 *    8   ...~~~~~^~~~~...
 *    9   ...^.^~~K~~f...f      K: Kessler's Toll
 *   10   ..L.f^..........      L: Lantern Hill
 *   11   .f^^f..f........
 *   12   ^^^....^^.$..f..      $: treasure chests
 *   13   .^v^fX^^.f......      X: Gallows Cross
 *   14   ^f^^^f.^^f^f...$
 *   15   .^..^..^ff^...ff
 * ```
 */
export const UNDEAD_5_V7: MissionDefinitionV7 = {
  id: "UNDEAD_5",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.20`, retune 2): fewer units and
  // technologies, a second Summoner and more Favour.
  // Revision 4 (`pulp_wars-hmyk.26`, retune 4): a stronger ring and toll,
  // 16 rounds.
  revision: 4,
  seed: 20261305,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 3,
    seed: 9,
    // Lantern Hill stands on a village; the villages east and north of the
    // lakes would hand the Lodge and the toll-men more towns.
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 13 }, present: false },
      // Retune 2 (`pulp_wars-hmyk.20`): two of the four villages by the
      // Marquis's towns.
      { kind: "VILLAGE", at: { x: 2, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 13 }, present: false },
    ],
  },
  terrain: [
    "..ff....f.fffff^",
    "......f.....ffff",
    "......f.f..f^f..",
    "..f~~~~~ff~~f.ff",
    "...~~~~~.f~~~fff",
    "^..~~~~~f.~~~fff",
    "..f~~~~~~.~~~.ff",
    "...~~~~^.f~~~...",
    "...~~~~~^~~~~...",
    "...^.^~~.~~f...f",
    "....f^..........",
    ".f^^f..f........",
    "^^^....^^....f..",
    ".^.^f.^^.f......",
    "^f^^^f.^^f^f....",
    ".^..^..^ff^...ff",
  ],
  resources: [
    "e.......g.g.g.go",
    ".e..e.ge....g.gg",
    ".e..r.grgre.o..r",
    "e......s.g.s....",
    "rr.s........sgg.",
    "..es..pp..p.sgg.",
    ".r...p...rpp.rg.",
    ".e........s.s.r.",
    "r.eps..s...pp.r.",
    "ereo.o.s.p..ee..",
    "re..go.eeer.rr..",
    "...o..........ee",
    "o.o.e.rooe..e.re",
    "ro....o..ge.....",
    "o.ooo.r.og.grr..",
    "r........go.rrg.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPWWWWWWWWWW",
    "PPPPPPPWWWWWWWWW",
    "PPPPPPPPWWWWWWWW",
    "PPPPPPPPPWPPWWWW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPPPWWP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPHHHPPPPPPPPPP",
    "PPHHHHHPPPPPPPPP",
    "PHHHHHHHPPPPPPPP",
    "HHHHHHHHHPPPPPPP",
    "HHHHHHHHHHPPPPPP",
    "HHHHHHHHHHHPPPPP",
    "HHHHHHHHHHHHPPPP",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 2, y: 7 },
  ],
  treasureChests: [
    { x: 10, y: 12 },
    { x: 15, y: 14 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 5,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Lantern Hill",
          at: { x: 2, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Gallows Cross",
          at: { x: 5, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Ashen Marquis.
        { role: "KNIGHT", at: { x: 3, y: 10 }, tag: "MARQUIS" },
        { role: "CAPTAIN", at: { x: 2, y: 10 } },
        { role: "MARKSMAN", at: { x: 2, y: 9 } },
        { role: "GUARD", at: { x: 5, y: 13 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 12 }, home: 1 },
      ],
      // The causeway, the fort and the strip of reeds round Greyhood.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 2, x1: 10, y1: 11 },
          { x0: 2, y0: 0, x1: 9, y1: 2 },
        ],
      },
    },
    {
      // The Grey Lodge at Greyhood, Brother Mallory presiding.
      faction: "CULT",
      coins: 5,
      favour: 14,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "DRILL",
        "FORTIFICATION",
        "HUNTING",
      ],
      cities: [
        {
          name: "Greyhood",
          at: { x: 9, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Brother Mallory, Hierophant of the Grey Lodge.
        { role: "CAPTAIN", at: { x: 9, y: 5 }, tag: "MALLORY" },
        // The ring of idols round the chapel.
        { role: "GUARD", at: { x: 8, y: 4 } },
        { role: "GUARD", at: { x: 9, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 5 } },
        { role: "GUARD", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 3 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        // Retune 4 (`pulp_wars-hmyk.26`): two more Idol Bearers close the
        // strip's southern end.
        { role: "GUARD", at: { x: 8, y: 7 } },
        { role: "GUARD", at: { x: 9, y: 7 } },
        { role: "CAPTAIN", at: { x: 9, y: 2 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 9, x1: 6, y1: 14 }] },
      // Step 5: Initiates, Idol Bearers and a Summoner's Horrors; no
      // Familiars, Hexers, Stargazers, Tentacles or Gibbering Masses.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The ring holds the strip round the chapel.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 8, y0: 2, x1: 9, y1: 7 }],
        garrison: 10,
      },
    },
    {
      // Kessler's toll-men, paid to hold the causeway.
      faction: "ORIGINAL",
      coins: 6,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Kessler's Toll",
          at: { x: 8, y: 9 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 8, y: 9 } },
        // Kessler's sergeants at the toll.
        { role: "SWORDSMAN", at: { x: 8, y: 10 } },
        { role: "SWORDSMAN", at: { x: 10, y: 11 } },
        { role: "MARKSMAN", at: { x: 9, y: 10 } },
        { role: "MARKSMAN", at: { x: 13, y: 10 } },
        { role: "FIGHTER", at: { x: 7, y: 10 } },
        { role: "FIGHTER", at: { x: 10, y: 10 } },
        { role: "RAIDER", at: { x: 11, y: 11 } },
        // Kessler's hired rider.
        { role: "KNIGHT", at: { x: 12, y: 11 } },
        { role: "FIGHTER", at: { x: 12, y: 10 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 9, x1: 6, y1: 14 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "FORESTRY",
        "SAWMILLING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The fort's garrison holds the causeway; the rest march on your
      // towns.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 7, y0: 8, x1: 9, y1: 10 }],
        garrison: 3,
        others: { kind: "RUSH" },
      },
    },
  ],
  teams: [0, 1, 1],
  // Nobody sails the lakes.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Kill Brother Mallory by round 16. The stars: by round 13, and no city
  // lost.
  objective: {
    kind: "KILL",
    units: ["MALLORY"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 13 }, { kind: "KEEP_CITIES" }],
  },
};
