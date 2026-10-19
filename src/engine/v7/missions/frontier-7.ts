import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_7` "The Island That Time Forgot" (docs/product/CAMPAIGN.md
 * section 9, mission 7). You lead the Ice Folk against the Dinosaurs and
 * the Humans on a 20 x 20 archipelago, Rival. Hard. The Ice Folk have no
 * ships, so you freeze a road across the strait, slide your army over it,
 * and land on the island of the Dinosaurs, whose town on the Crater, on
 * the shore that faces you, is the objective. The mission is lost when
 * round 30 ends.
 *
 * Revision 2 (`pulp_wars-v642.8`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.16) makes it a build-up mission: you start with
 * one town, three units, and no technology at all, against natives who
 * already hold three cities and the Baron's port, on a bigger board with a
 * longer clock. The frozen sea is yours to discover (Rime freezes the
 * shallows, Pack Ice the deep water in the middle of the strait, Black Ice
 * freezes whoever steps on your ice, Glacier makes your ice thick), the
 * island in the north-west is yours to settle first, and the Crater falls
 * to Frost Giants: a city of yours at level 5 sends one, its Cold Aura
 * freezes whatever it stands next to, and its Glacial Smash shatters what
 * is frozen. The Baron holds his island until round 16 and then races you
 * for the Crater; his landing party comes ashore beside it in round 14.
 *
 * Revision 3 (the danger pass, `pulp_wars-v642.10`, CAMPAIGN.md section
 * 11.19) adds a raid: in round 7 a landing party of the Baron (a Fighter
 * and a Marksman) comes ashore on your spur, beside Hjorna, and the Baron
 * storms Coldharbour until round 12 before he holds his island again.
 * Hand-played on `7r100` (the ice redesign): lost on autopilot (out of
 * time), won in round 28 with two stars. A raid of three with a second
 * landing in round 11, or an assault until round 16, took Hjorna and
 * starved the build-up (two games abandoned).
 *
 * The board is the map generator's (Archipelago 20, seed 2): your island in
 * the north-west, the Baron's in the north-east, and the island of the
 * Dinosaurs in the south. A spur of your island runs down to the strait;
 * column 7 is the road: four tiles of water (two of them deep), the
 * natives' northern tip, two more tiles of water, and the Crater. Seven
 * villages are removed: the two native towns, one beside a native town,
 * and the four of the Baron's island (with four cities his expedition
 * shipped Juggernauts to your island every round).
 *
 * ```text
 *      x 01234567890123456789
 * y  0   .fffff~~~~~~f^..^..^
 *    1   fffff^~.~~~~^^..^f.^
 *    2   ff..ffvf~~~~.....^^.      v: villages of your island
 *    3   fv..fff~~~~~~ff.^..f
 *    4   ff..^fff~~~~~f^^fff^
 *    5   .ff.Hfv.~~~~~.K^.f..      H: Coldharbour; K: Port Kessler
 *    6   ^v~.~^.~~~~~~^.~^^.~
 *    7   ~~~~~~~.f~~~~~~^^~~.      the spur
 *    8   ~~.~~~~~^~~~~~~~~~~~
 *    9   ~~~~~~~~~~~~~~~~~~~~      the strait
 *   10   ~~~~~~~~~~~~~~~~~~~~
 *   11   ~~~~~~~~~~~~~~~~~~~~
 *   12   ~~~~~f~f~~~~.~~~~~~~      the natives' northern tip at (7, 12)
 *   13   ~~~~~..~~~.~~~f~~~~~
 *   14   ~~~~~~f~~~.^.f.f~~~~
 *   15   ~~~~~~~C..^fF.~~~~~~      C: the Crater; F: Fernmaw
 *   16   ~~~~~~.~...ff^~f~~~~
 *   17   ~~~~~~~.....f^f.~~~~
 *   18   ~~~~~^f~...T.^v~~~~~      T: Tarpit
 *   19   ~~~~~~~..f.f^f~~~~~~
 * ```
 */
export const FRONTIER_7_V7: MissionDefinitionV7 = {
  id: "FRONTIER_7",
  revision: 3,
  seed: 20261107,
  // <map>
  size: 20,
  source: {
    mapType: "ARCHIPELAGO",
    size: 20,
    seats: 3,
    seed: 2,
    edits: [
      { kind: "VILLAGE", at: { x: 7, y: 15 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 15, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 6 }, present: false },
    ],
  },
  terrain: [
    ".fffff~~~~~~f^..^..^",
    "fffff^~.~~~~^^..^f.^",
    "ff..ff.f~~~~.....^^.",
    "f...fff~~~~~~ff.^..f",
    "ff..^fff~~~~~f^^fff^",
    ".ff..f..~~~~~..^.f..",
    "^.~.~^.~~~~~~^.~^^.~",
    "~~~~~~~.f~~~~~~^^~~.",
    "~~.~~~~~^~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~f~f~~~~.~~~~~~~",
    "~~~~~..~~~.~~~f~~~~~",
    "~~~~~~f~~~.^.f.f~~~~",
    "~~~~~~~...^f.f~~~~~~",
    "~~~~~~.~...ff^~f~~~~",
    "~~~~~~~.....f^f.~~~~",
    "~~~~~^f~.....^.~~~~~",
    "~~~~~~~..f.f^f~~~~~~",
  ],
  resources: [
    ".gg....s.p......o..o",
    "gggggo.es..sooe.o..o",
    "ggr.g..gp.p..rr...oe",
    "g..rg.gs.pp.....o...",
    "g..eogg......goo...o",
    "e.g..g...p...r.o..ee",
    "o.s...e......orp.o.s",
    ".....ss..........p..",
    ".........s.p..p....s",
    "...p..........p.....",
    ".....p....p.pp.p.pp.",
    ".pp.ps.p....s.......",
    "pppp.g.g......s....p",
    "..........e..s.sp..p",
    ".pp....s.pe.r..gs...",
    "......p......g.p....",
    ".p....e.e..g....p...",
    "...p..ser.....ges..p",
    ".............o.s.p..",
    ".p.p.s..r.eg.g...p..",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWPPPPPPHHHHHHHH",
    "WWWWWWPWPPPPHHHHHHHH",
    "WWWWWWWWPPPPHHHHHHHH",
    "WWWWWWWPPPPPPHHHHHHH",
    "WWWWWWWWPPPPPHHHPPPP",
    "WWWWWWWWPPPPPHHPPPPP",
    "WWPWPWWPPPPPPHPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPWPPPPPPP",
    "PPPPPPPPPPPPPPWPPPPP",
    "PPPPPPPPPPPWWWWWPPPP",
    "PPPPPPPPPPPWWWPPPPPP",
    "PPPPPPPPPPPWWWPWPPPP",
    "PPPPPPPPPPPWWWWWPPPP",
    "PPPPPPPPPPPWWWWPPPPP",
    "PPPPPPPPPPPWWWPPPPPP",
  ],
  villages: [
    { x: 6, y: 2 },
    { x: 1, y: 3 },
    { x: 7, y: 5 },
    { x: 1, y: 6 },
    { x: 14, y: 18 },
  ],
  treasureChests: [
    { x: 18, y: 1 },
    { x: 8, y: 15 },
    { x: 9, y: 15 },
    { x: 12, y: 17 },
  ],
  // </map>
  // The Baron's Port, on the south shore of his island, and a clearing in
  // the woods by the Crater and by Fernmaw (their land has little bare
  // Grass for the builder's population records).
  improvements: [
    { at: { x: 15, y: 6 }, improvement: "PORT" },
    { at: { x: 13, y: 14 }, improvement: "LUMBER_CAMP" },
    { at: { x: 6, y: 14 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 5,
      // A build-up (the user, 2026-10-14: "at least some of the missions
      // should involve building up your base and army from scratch"): no
      // technology at all. Rime, Pack Ice, Black Ice and Glacier are the
      // tree to discover; Pack Ice also gathers the Pearls of your waters.
      technologies: [],
      cities: [
        {
          name: "Coldharbour",
          at: { x: 4, y: 5 },
          level: 2,
          rewards: ["SURVEY"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "RAIDER", at: { x: 3, y: 4 } },
      ],
      // Your island's south shore and the strait, and the Crater (the
      // objective is in sight from the first turn).
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 5, x1: 9, y1: 12 },
          { x0: 6, y0: 13, x1: 8, y1: 16 },
        ],
      },
    },
    {
      faction: "DINOSAUR",
      coins: 10,
      technologies: ["HUNTING", "MARKSMANSHIP", "SCOUTING"],
      cities: [
        // Fernmaw, the natives' capital, ringed by peaks on its west.
        {
          name: "Fernmaw",
          at: { x: 12, y: 15 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        // The Crater, where the star fell: the town on the shore that
        // faces your island.
        {
          name: "The Crater",
          at: { x: 7, y: 15 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Tarpit",
          at: { x: 11, y: 18 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Fernmaw.
        { role: "GUARD", at: { x: 12, y: 15 } },
        { role: "FIGHTER", at: { x: 11, y: 15 } },
        { role: "FIGHTER", at: { x: 12, y: 16 } },
        { role: "MARKSMAN", at: { x: 13, y: 15 } },
        { role: "RAIDER", at: { x: 12, y: 14 } },
        // The Crater's keepers.
        { role: "GUARD", at: { x: 7, y: 15 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 16 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 14 }, home: 1 },
        // Tarpit, in the south.
        { role: "FIGHTER", at: { x: 11, y: 18 }, home: 2 },
        { role: "RAIDER", at: { x: 10, y: 18 }, home: 2 },
      ],
      reveal: { radius: 2 },
      // The natives do not sail, lay no Ankylosaurus, and do not grow: no
      // Fruit, Farm, Lumber Camp, Workshop, Mine or Blast Mountain (hand
      // play: with Gathering and Crafting their capital grew to level 4
      // and laid a Raptor egg every turn).
      forbiddenTechnologies: [
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // Three of them never leave the Crater; the rest play their ordinary
      // game, on their island until somebody freezes them a road.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 6, y0: 14, x1: 8, y1: 16 }],
        garrison: 3,
      },
    },
    {
      // Baron Kessler's expedition, on the north-eastern island.
      faction: "ORIGINAL",
      coins: 8,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
        "NAVIGATION",
      ],
      cities: [
        {
          name: "Port Kessler",
          at: { x: 14, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 14, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
        { role: "MARKSMAN", at: { x: 13, y: 4 } },
        { role: "PATROL_BOAT", at: { x: 14, y: 7 } },
      ],
      // The Baron's charts: the Crater (an ASSAULT marches only on a city
      // its seat knows).
      // Revision 3: and Coldharbour, which he raids first.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 14, x1: 8, y1: 16 },
          { x0: 3, y0: 4, x1: 5, y1: 6 },
        ],
      },
      // Patrol Boats and transports, no Battleship; and no giant: no Lumber
      // Camp, Farm, Land Grant or Blast Mountain (hand play: with four
      // cities and Lumber Camps the expedition shipped two Juggernauts to
      // your island in round 21).
      forbiddenTechnologies: [
        "NAVAL_ENGINEERING",
        "FORESTRY",
        "SAWMILLING",
        "FARMING",
        "MILLING",
        "EXPLOSIVES",
      ],
      // The Baron races you for the Crater (hand play: told to RUSH, his
      // whole expedition sailed for your island, the nearest hostile city,
      // and blockaded your ports from round 13 on): he holds his island
      // until round 16 and then storms the Crater.
      // Revision 3 (`pulp_wars-v642.10`, the danger pass): a raid. A
      // landing party comes ashore on your spur in round 7 (below) and
      // storms Coldharbour until round 12; then he holds his island again
      // until round 16 (hand play: an assault until round 16 shipped his
      // whole garrison to your island and starved the build-up).
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 12, y0: 0, x1: 19, y1: 7 }],
          untilRound: 7,
        },
        { kind: "ASSAULT", target: { x: 4, y: 5 }, untilRound: 12 },
        {
          kind: "HOLD",
          zone: [{ x0: 12, y0: 0, x1: 19, y1: 7 }],
          untilRound: 16,
        },
        { kind: "ASSAULT", target: { x: 7, y: 15 } },
      ],
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [{ tag: "CRATER", at: { x: 7, y: 15 } }],
  // The Baron's landing parties: on your spur, and on the shore east of
  // the Crater.
  reinforcements: [
    // Revision 3: the Baron's raiders land on the spur of your island.
    {
      seat: 2,
      round: 7,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 7 } },
        { role: "MARKSMAN", at: { x: 8, y: 8 } },
      ],
    },
    {
      seat: 2,
      round: 14,
      units: [
        { role: "FIGHTER", at: { x: 9, y: 16 } },
        { role: "FIGHTER", at: { x: 10, y: 16 } },
        { role: "MARKSMAN", at: { x: 8, y: 17 } },
        { role: "GUARD", at: { x: 9, y: 17 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 16 } },
      ],
    },
  ],
  // Take the Crater before round 30 ends. The stars are for doing it by
  // round 24 and for losing no city you started with.
  objective: {
    kind: "CAPTURE",
    places: ["CRATER"],
    byRound: 30,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 24 }, { kind: "KEEP_CITIES" }],
  },
};
