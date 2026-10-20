import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_3` "Old Blood" (docs/product/SAGA.md section 3.9, CU3; the Cult
 * campaign, `pulp_wars-hmyk.12`). The Grey Book says a Herald is paid for
 * in old blood, and the oldest blood in the world is a dinosaur egg; the
 * last egg left Greyhood aboard the Galleon of the Eye. Sail it up the
 * coast of the Lost Sea to Lamplight Cove, past the island's tribes and
 * the Martian Skimmers, and do not let it sink. Step 3 of 6: a big ship
 * through a sea of small killers. A Kraken holds any enemy ship that
 * begins its Move beside it to one tile, so it clears the lane ahead; with
 * Offerings to the Deep every ship a Cult ship sinks pays Favour.
 *
 * The board is the map generator's (Archipelago 16, seed 2), read with
 * the coast along the top: Reedmouth, the fishing hamlet at the marsh
 * mouth, on the eastern shore, Lamplight Cove under the sea cliffs of the
 * west, and the lane between them past a chain of islets; the island's
 * tribes and the Martians' Ray Hollow on the island in the south. The
 * tribes keep their boats in the lane (`GUARD` with `ships: true`, the
 * saga's extension E7): they hunt the Galleon's way, not your towns.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   $ff.~~~~~^~.^$f.      $: treasure chests
 *    1   ...f~ff~~~^f....
 *    2   .^.^~~.~~~......
 *    3   ^^^f^~~~~.~~....
 *    4   ^^^^.f~~~~..fR~.      R: Reedmouth
 *    5   fL^^v~.~~~.~.~..      L: Lamplight Cove; v: a village
 *    6   ~^~~~.~~~.~~G.~~      G: the Galleon of the Eye
 *    7   ~~~~~~~~~~~~~~~~
 *    8   ~~~~~~~~~~~~~~~~
 *    9   ~~~~~~~~~~~~~~~~
 *   10   ~~~~..~~~~~~.~~~
 *   11   ~~~~~~~~f~f~.~~~
 *   12   ~~~~.H.~T.f.E~~~      H: Ray Hollow; T: Gull Rock; E: Tarpit
 *   13   ~~~~ff^...~f.~~~
 *   14   ~~~~^~f...~.~~~~
 *   15   ~~~~~ff....~~~~~
 * ```
 */
export const CULT_3_V7: MissionDefinitionV7 = {
  id: "CULT_3",
  revision: 1,
  seed: 20261903,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 3,
    seed: 2,
    // Reedmouth, Lamplight Cove, Ray Hollow and Gull Rock stand on
    // villages.
    edits: [
      { kind: "VILLAGE", at: { x: 13, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 12 }, present: false },
    ],
  },
  terrain: [
    ".ff.~~~~~^~.^.f.",
    "...f~ff~~~^f....",
    ".^.^~~.~~~......",
    "^^^f^~~~~.~~....",
    "^^^^.f~~~~..f.~.",
    "f.^^.~.~~~.~.~..",
    "~^~~~.~~~.~~~.~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~..~~~~~~.~~~",
    "~~~~~~~~f~f~.~~~",
    "~~~~...~.ff..~~~",
    "~~~~ff^...~f.~~~",
    "~~~~^~f...~.~~~~",
    "~~~~~ff....~~~~~",
  ],
  resources: [
    "...rp.s.....o...",
    ".e.gs.g...o...r.",
    ".....s.s...r..r.",
    "ooogos..sr.s..e.",
    "oo.org.....e....",
    "...o.s.s..rsrs.e",
    "......p.....s...",
    "..p.p....s.p...p",
    ".........p......",
    "....spp.......p.",
    ".p.pe.s...s.es..",
    ".....s......r...",
    "p..pe.e....r....",
    "......oe.epge.pp",
    "...sos.....rspp.",
    "...p...r.er.....",
  ],
  biome: "PLAINS",
  biomes: [
    "HHWWPPPPPWPPPPPP",
    "HHWWPWWPPPPPPPPP",
    "HHWWPPWPPPPPPPPP",
    "HHHWWPPPPPPPPPPP",
    "HHHHWWPPPPPPPPPP",
    "HHHHHPWPPPPPPPPP",
    "PHPPPWPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPHPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 13, y: 1 },
    { x: 4, y: 5 },
  ],
  treasureChests: [
    { x: 0, y: 0 },
    { x: 13, y: 0 },
  ],
  // </map>
  improvements: [
    // The Cult's two Ports, on the lane.
    { at: { x: 13, y: 5 }, improvement: "PORT" },
    { at: { x: 2, y: 6 }, improvement: "PORT" },
    // The tribes' landing at Tarpit and the Skimmers' dock at Ray Hollow.
    { at: { x: 13, y: 12 }, improvement: "PORT" },
    { at: { x: 5, y: 11 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "CULT",
      coins: 8,
      favour: 2,
      // Black Gondolas, Navigation (the deep water), Offerings to the Deep
      // and the Kraken; Leadership and Tentacles for the brethren at the
      // Cove (a Summoner's Tentacle rises on water too).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // Naval Engineering stays out of reach: one Galleon, and only one.
      forbiddenTechnologies: ["NAVAL_ENGINEERING"],
      cities: [
        {
          name: "Reedmouth",
          at: { x: 13, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Lamplight Cove",
          at: { x: 1, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 4 } },
        // The Galleon of the Eye, with the egg aboard.
        { role: "BATTLESHIP", at: { x: 12, y: 6 }, tag: "GALLEON" },
        // A Kraken and a Black Gondola sail with her.
        { role: "SUBMARINE", at: { x: 13, y: 7 } },
        { role: "PATROL_BOAT", at: { x: 11, y: 7 } },
        { role: "CAPTAIN", at: { x: 1, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 0, y: 5 }, home: 1 },
      ],
      // The whole coast and the lane, from the Lodge's charts.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 3, x1: 15, y1: 9 }] },
    },
    {
      // The island's tribes, come after the egg.
      faction: "DINOSAUR",
      coins: 3,
      technologies: ["GATHERING", "HUNTING", "SHORECRAFT", "NAVIGATION"],
      // One War Raft, and it comes late; the Plesiosaurs they have are all
      // they get, and no tribe boards the Galleon (hand play: a Dugout's
      // Ram and Board took her at a third of her hull).
      forbiddenTechnologies: [
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      cities: [
        {
          name: "Tarpit",
          at: { x: 12, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Gull Rock", at: { x: 8, y: 12 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 12, y: 12 } },
        { role: "FIGHTER", at: { x: 8, y: 12 }, home: 1 },
        // The tribes' boats, in the lane.
        { role: "PATROL_BOAT", at: { x: 10, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 5, y: 8 } },
        { role: "SUBMARINE", at: { x: 7, y: 8 } },
        { role: "SUBMARINE", at: { x: 3, y: 8 } },
        { role: "SUBMARINE", at: { x: 10, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 5, x1: 15, y1: 10 }] },
      // The tribes' boats hunt the lane (E7); a warrior keeps each town.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 0, y0: 6, x1: 15, y1: 9 },
          { x0: 12, y0: 12, x1: 12, y1: 12 },
        ],
        garrison: 1,
        ships: true,
      },
    },
    {
      // The Martians' Skimmers out of Ray Hollow.
      faction: "MARTIAN",
      coins: 3,
      technologies: ["SHORECRAFT", "NAVIGATION"],
      cities: [
        {
          name: "Ray Hollow",
          at: { x: 5, y: 12 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 5, y: 12 } },
        { role: "PATROL_BOAT", at: { x: 5, y: 9 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 10 } },
        { role: "PATROL_BOAT", at: { x: 3, y: 10 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 5, x1: 15, y1: 10 }] },
    },
  ],
  // The tribes' War Raft comes round the island to the Cove's mouth.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [{ role: "BATTLESHIP", at: { x: 4, y: 9 } }],
    },
  ],
  landmarks: [
    { tag: "LAMPLIGHT_COVE", at: { x: 1, y: 5 } },
    { tag: "REEDMOUTH", at: { x: 13, y: 4 } },
  ],
  forbiddenTechnologies: [],
  // The Galleon beside Lamplight Cove by round 16. The stars: by round
  // 12, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "GALLEON",
    to: "LAMPLIGHT_COVE",
    within: 1,
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
