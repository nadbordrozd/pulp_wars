import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_7` "The Island That Time Forgot" (docs/product/CAMPAIGN.md
 * section 9, mission 7). You lead the Ice Folk against the Dinosaurs and
 * the Humans on a 16 x 16 archipelago, Rival. Hard. The lesson is the
 * frozen sea: the Ice Folk have no ships, so you freeze a road across the
 * strait (you start with Rime and Pack Ice), slide your army over it, and
 * land on the island of the Dinosaurs, whose town on the Crater is the
 * objective. It is a race: the mission is lost when round 18 ends, and the
 * Baron's expedition, which does have ships, lands beside the Crater in
 * round 8 and keeps coming by sea.
 *
 * The board is the map generator's (Archipelago, seed 9): your island in
 * the north-west, the Baron's in the north-east, and the island of the
 * Dinosaurs in the south, two rows of sea away. Four villages are removed:
 * your town, the Crater, and the three that would hand an AI seat a free
 * city.
 *
 * ```text
 *      x 0123456789012345
 * y  0   .f.....~~.^^.f^^
 *    1   .v....~~~~f.^.^.      v: a village
 *    2   .....f~~~~~PB..f      B: the Baron's port town; P: its Port
 *    3   ^f..I.f~~~~.^f^^      I: your capital
 *    4   .i~~.~.~~~.f^^~~      i: your town
 *    5   ..~~~~^~~~..^.~.
 *    6   ~.~~~.~~~~.~~f^~
 *    7   ~~~~~~~~~~~~~~~~      the strait
 *    8   ~~~~~~~~~~~~~~~~
 *    9   ~~~~~~~f~~~~~~~~
 *   10   ~~~~~.f~~~~~~~~~
 *   11   ~~~~~C.ff~~f~~~~      C: the Crater
 *   12   ~~~~~..f.ff..~~~
 *   13   ~~~~~~ffDff^~~~~      D: the Dinosaur capital
 *   14   ~~~~~~ff..^^~~~~
 *   15   ~~~~~~f.^ff^~~~~
 * ```
 */
export const FRONTIER_7_V7: MissionDefinitionV7 = {
  id: "FRONTIER_7",
  revision: 1,
  seed: 20261107,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 9,
    edits: [
      { kind: "VILLAGE", at: { x: 1, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 12 }, present: false },
    ],
  },
  terrain: [
    ".f.....~~.^^.f^^",
    "......~~~~f.^.^.",
    ".....f~~~~~~...f",
    "^f...f~~~~~.^f^^",
    "..~~.~.~~~.f^^~~",
    "..~~~~^~~~..^.~.",
    "~.~~~.~~~~.~~f^~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~f~~~~~~~~",
    "~~~~~.f~~~~~~~~~",
    "~~~~~..ff~~f~~~~",
    "~~~~~..f.ff..~~~",
    "~~~~~~ff.ff^~~~~",
    "~~~~~~ff..^^~~~~",
    "~~~~~~f.^ff^~~~~",
  ],
  resources: [
    "..eee....eoo.goo",
    "r..r.rsp.s.eoro.",
    "r.eer.s...ps.rrg",
    "o.e...s...s.og..",
    "...ses...s.....s",
    ".e....os...ro...",
    "s..p.e.pppe...op",
    "...p.p........s.",
    ".p...p.s.p......",
    ".....ss.s.......",
    "......gs..p.....",
    "..p.s...gs......",
    "p...sreg....r.p.",
    "p.....g.....p...",
    "......gg.e.os...",
    "..p....e..gos.p.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPPPPPHHHHH",
    "PPPPPPPPPPPHHHPP",
    "PPPPPPPPPPPPHHPH",
    "PPPPPPPPPPPPPHHP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPWPPWPPPP",
    "PPPPPPPWWWWWWPPP",
    "PPPPPPWWWWWWPPPP",
    "PPPPPPWWWWWWPPPP",
    "PPPPPPWWWWWWPPPP",
  ],
  villages: [{ x: 1, y: 1 }],
  treasureChests: [
    { x: 10, y: 4 },
    { x: 10, y: 13 },
  ],
  // </map>
  // The Baron's Port, on the channel between the northern islands.
  improvements: [{ at: { x: 11, y: 2 }, improvement: "PORT" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 10,
      // The whole frozen sea but Icebound (hand play, CAMPAIGN.md section
      // 11.8): Rime and Pack Ice freeze Shallow and Deep Water, Black Ice
      // freezes whoever steps onto your ice, and with Glacier the road
      // lasts five turns and your units cross it faster.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      cities: [
        // A small capital (hand play, CAMPAIGN.md section 11.8): at level
        // 3 with a land grant the Fish of its home waters made a Frost
        // Giant in round 1.
        {
          name: "Coldharbour",
          at: { x: 4, y: 3 },
          level: 2,
          rewards: ["SURVEY"],
        },
        { name: "Skerry", at: { x: 1, y: 4 }, level: 2, rewards: ["SURVEY"] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 4, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "RAIDER", at: { x: 4, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 3 } },
        // The town's levy has already marched to the capital (hand play:
        // from the town it reached the strait three turns behind).
        { role: "FIGHTER", at: { x: 3, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 2, y: 3 }, home: 1 },
      ],
      // The strait, and the island as far as its two towns.
      reveal: {
        radius: 2,
        rects: [
          { x0: 4, y0: 5, x1: 8, y1: 9 },
          { x0: 5, y0: 10, x1: 9, y1: 14 },
        ],
      },
    },
    {
      faction: "DINOSAUR",
      coins: 3,
      technologies: ["GATHERING", "HUNTING", "MARKSMANSHIP", "SCOUTING"],
      cities: [
        {
          name: "Fernmaw",
          at: { x: 8, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        // The town on the Crater, on the shore that faces your island.
        {
          name: "The Crater",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 13 } },
        { role: "RAIDER", at: { x: 7, y: 12 } },
        { role: "MARKSMAN", at: { x: 8, y: 14 } },
        { role: "GUARD", at: { x: 8, y: 12 } },
        // The Crater's keeper stands on it.
        { role: "GUARD", at: { x: 5, y: 11 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 12 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 11 }, home: 1 },
      ],
      reveal: { radius: 2 },
      // The natives do not sail, and they lay no more Ankylosauruses (hand
      // play, CAMPAIGN.md section 11.8): with Nesting three of them walled
      // the Crater off behind 60 Hit Points.
      forbiddenTechnologies: [
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // Three of them never leave the Crater (hand play, CAMPAIGN.md
      // section 11.8: told only to hold the island, every one of them
      // walked off to the capital and the Crater stood empty in round 3).
      // The rest play their ordinary game; without ships it is on their
      // island.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 10, x1: 6, y1: 12 }],
        garrison: 3,
      },
    },
    {
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
          at: { x: 12, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 12, y: 2 } },
        { role: "FIGHTER", at: { x: 13, y: 2 } },
        { role: "MARKSMAN", at: { x: 11, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 3 } },
      ],
      // The Baron's charts: the Crater.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 9, x1: 7, y1: 13 }] },
      // Patrol Boats and transports, no Battleship (hand play, CAMPAIGN.md
      // section 11.8): one shelled your home island from the open sea.
      forbiddenTechnologies: ["NAVAL_ENGINEERING"],
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 9, y0: 0, x1: 15, y1: 6 }],
          untilRound: 8,
        },
        { kind: "RUSH" },
      ],
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [{ tag: "CRATER", at: { x: 5, y: 11 } }],
  // The Baron's landing party, on the shore south of the Crater.
  reinforcements: [
    {
      seat: 2,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 6, y: 12 } },
        { role: "GUARD", at: { x: 6, y: 12 } },
        { role: "PATROL_BOAT", at: { x: 4, y: 12 } },
      ],
    },
  ],
  // Take the town on the Crater before round 18 ends. The stars are for
  // doing it by round 14 and for losing no city of your own.
  objective: {
    kind: "CAPTURE",
    places: ["CRATER"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
