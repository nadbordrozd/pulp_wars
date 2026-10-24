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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 23.4, not
 * play-tested): a thin start. Four units (the Galleon, a Kraken, a Fighter
 * at each town), six technologies, 4 Coins and Favour 2. The tribes have
 * twelve units, the Martians seven and 5 Coins; from round 3 the tribes'
 * boats sail on the Cove and the Skimmers rush, and three announced waves
 * of ships arrive in rounds 3, 6 and 9. The clock is 13 (was 16).
 *
 * The fourth retune (`pulp_wars-hmyk.33`, CAMPAIGN.md section 23.5,
 * hand-played): eased toward the middle. The original's seven (the
 * Galleon, two Krakens, the Gondola, an Initiate at each town and Brother
 * Ames at the Cove), nine technologies (Familiars, Raiding and Tentacles
 * back), 6 Coins and Favour 4. The tribes have eight boats and warriors
 * (the original's seven and a Plesiosaur) and 4 Coins and hunt the lane
 * all game (`GUARD` with ships, the original's E7); the Martians the
 * original four and 3 Coins, rushing from round 4; one wave, the story's
 * War Raft in round 4. The clock is 12 (star 10).
 */
export const CULT_3_V7: MissionDefinitionV7 = {
  id: "CULT_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start in a
  // sea that hunts.
  // Revision 4 (`pulp_wars-hmyk.33`, the fourth retune): eased toward the
  // middle.
  revision: 4,
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
      coins: 6,
      favour: 4,
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
        // Retune 4: a second Kraken.
        { role: "SUBMARINE", at: { x: 12, y: 7 } },
        // Retune 4: the Gondola and Brother Ames at the Cove are back.
        { role: "PATROL_BOAT", at: { x: 11, y: 7 } },
        { role: "CAPTAIN", at: { x: 1, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 0, y: 5 }, home: 1 },
      ],
      // The two towns and the Galleon's first stretch of the lane (retune
      // 3: not the whole coast).
      reveal: { radius: 2, rects: [{ x0: 8, y0: 4, x1: 15, y1: 8 }] },
    },
    {
      // The island's tribes, come after the egg.
      faction: "DINOSAUR",
      coins: 4,
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
        // Retune 4: one of retune 3's extra boats, a Plesiosaur.
        { role: "SUBMARINE", at: { x: 6, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 5, x1: 15, y1: 10 }] },
      // The tribes' boats hunt the lane (E7); a warrior keeps each town
      // (retune 4: all game; retune 3 sailed the whole fleet on Lamplight
      // Cove from round 3, and hand play lost the Galleon by round 6).
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
      // The Skimmers rush the lane from round 4 (retune 3: from round 3).
      directive: [{ kind: "NORMAL", untilRound: 3 }, { kind: "RUSH" }],
    },
  ],
  // The tribes' War Raft comes round the island to the Cove's mouth in
  // round 4 (the story's wave).
  reinforcements: [
    {
      seat: 1,
      round: 4,
      line: "The tribes' War Raft rounds the island, drums beating, egg-hunting.",
      announce: true,
      units: [{ role: "BATTLESHIP", at: { x: 4, y: 9 } }],
    },
  ],
  landmarks: [
    { tag: "LAMPLIGHT_COVE", at: { x: 1, y: 5 } },
    { tag: "REEDMOUTH", at: { x: 13, y: 4 } },
  ],
  forbiddenTechnologies: [],
  // The Galleon beside Lamplight Cove by round 12 (retune 4; retune 3 13,
  // was 16). The stars: by round 10, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "GALLEON",
    to: "LAMPLIGHT_COVE",
    within: 1,
    byRound: 12,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 10 }, { kind: "KEEP_CITIES" }],
  },
};
