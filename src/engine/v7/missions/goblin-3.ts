import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_3` "Here Be Monsters" (docs/product/SAGA.md section 3.3, G3; the
 * Goblin campaign, `pulp_wars-hmyk.8`). Halfway across the Lost Sea the
 * crew must sink Snapjaw, the grey old plesiosaur that has eaten three
 * fire rafts and a rowing boat, by round 16. Step 3 of 6: a naval hunt.
 *
 * The board is the map generator's (Archipelago 16, seed 2): the goblins'
 * raft camp on the eastern islands, a strait of deep water down the
 * middle, and the island tribes' fishing villages on the western shore.
 * Snapjaw is a tagged Plesiosaur, Big with two kills: one more kill makes
 * it an Alpha, and growing heals it whole. So a raft fed to it one at a
 * time undoes all the damage done; Fire Rafts Kaboom afloat (Powder Kegs)
 * and Diving Barrels torpedo without reply. Strike it all at once.
 *
 * Hand play (the Goblin campaign's record in CAMPAIGN.md) set the board:
 * with the rafts starting on the strait beside Snapjaw and a second
 * Plesiosaur, both rafts were eaten in the first two rounds (the port
 * gives no cover) and Snapjaw grew into an Alpha; out of sight it is
 * never found (a submerged Plesiosaur is seen only on explored water). The
 * crew now starts at Tarry Wharf on the southern shore with two Fire
 * Rafts and a Diving Barrel, sees the whole sea, and Snapjaw starts in the
 * northern strait; with three rafts and two barrels it was sunk in round
 * 4, so the young Plesiosaur sails with the Dugouts again, and the Dugouts
 * ram (Horned Prows: 10 on a barrel after a two-tile run).
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~~~~~~~~~~~~~
 *    2   ~~~~~~~~~~~~~.~~
 *    3   ~~~f~~~~~.~~~.~~
 *    4   ^f^~^~~~~~.~$~~f      $: chests
 *    5   .^v^^~^~~~f..~..      v: villages
 *    6   .^^^^^~S~f~~....      S: Snapjaw
 *    7   ^^^^^.~~~~...f.^
 *    8   .^G.f.~~~~....v$      G: Gullnest
 *    9   ^...fF~~~~......      F: Shellmound, the tribes' port
 *   10   ^f^fff~~~~.R.f...     R: Saltreef Camp, yours
 *   11   ^vfff~~~~~.~.f.~
 *   12   ^~~~f.~~~~~f..~f
 *   13   ~~~~f~f~~~~.T~~~      T: Tarry Wharf, yours
 *   14   ~~~~~~~~~~~.~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const GOBLIN_3_V7: MissionDefinitionV7 = {
  id: "GOBLIN_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261503,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 2,
    seed: 2,
    // Shellmound and Tarry Wharf stand on villages; the northern villages
    // of both shores would hand each side a free town far from the strait.
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 5 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~.~~",
    "~~~f~~~~~.~~~.~~",
    "^f^~^~~~~~.~.~~f",
    ".^.^^~^~~~f..~..",
    ".^^^^^~~~f~~....",
    "^^^^^.~~~~...f.^",
    ".^.f..~~~~......",
    "^...f.~~~~......",
    "^f^fff~~~~..f...",
    "^.fff~~~~~.~.f.~",
    "^~~~f.~~~~~f..~f",
    "~~~~f~f~~~~..~~~",
    "~~~~~~~~~~~.~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "p...p....p......",
    "...p..........p.",
    "...s.p...sp.se..",
    "ps......p...prss",
    "..oso....se.....",
    "eo.oosopp...e..e",
    "....o.........r.",
    "ooo.ors..s..e.e.",
    ".o.g.e..p..r.r..",
    "orreg...p.e.r..r",
    ".....gs...r.g...",
    "o.gg.....s..r.e.",
    "o...g.s.p....rp.",
    "......g...p.e.ps",
    "....s.spp..r..p.",
    ".............p..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPHPPPPPPPPPPPP",
    "HHHPHPPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHWWPPPPPPPPPP",
    "HHHWWWPPPPPPPPPP",
    "HHWWWPPPPPPPPPPP",
    "HPPPWWPPPPPPPPPP",
    "PPPPWPWPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 2, y: 5 },
    { x: 14, y: 8 },
    { x: 1, y: 11 },
  ],
  treasureChests: [
    { x: 12, y: 4 },
    { x: 15, y: 8 },
  ],
  // </map>
  // The ports: the raft camp's slipway, the wharf's, and the tribes'
  // fishing harbour.
  improvements: [
    { at: { x: 11, y: 11 }, improvement: "PORT" },
    { at: { x: 10, y: 14 }, improvement: "PORT" },
    { at: { x: 6, y: 9 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 8,
      // Fire Rafts, Powder Kegs (a raft's Kaboom afloat, and the Ram),
      // Navigation for the deep water of the strait, and Diving Barrels.
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP", "SUBMERSIBLES"],
      cities: [
        {
          name: "Saltreef Camp",
          at: { x: 11, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Tarry Wharf",
          at: { x: 11, y: 13 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 10 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "FIGHTER", at: { x: 10, y: 11 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 14 }, home: 1 },
        { role: "PATROL_BOAT", at: { x: 12, y: 14 }, home: 1 },
        { role: "SUBMARINE", at: { x: 12, y: 15 }, home: 1 },
      ],
      // The whole Lost Sea hereabouts: Snapjaw is never out of sight.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 15, y1: 15 }] },
    },
    {
      // The island's coast tribes: two fishing villages, Dugouts, a young
      // Plesiosaur, and Snapjaw.
      faction: "DINOSAUR",
      coins: 4,
      // Dugouts with Horned Prows (a two-tile run rams for 10); no new
      // Plesiosaurs or War Rafts.
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      cities: [
        {
          name: "Shellmound",
          at: { x: 5, y: 9 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Gullnest", at: { x: 2, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        // Snapjaw: a Plesiosaur, Big with two kills.
        { role: "SUBMARINE", at: { x: 7, y: 6 }, tag: "SNAPJAW", kills: 2 },
        { role: "FIGHTER", at: { x: 5, y: 9 } },
        { role: "SUBMARINE", at: { x: 4, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 8 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 6, x1: 10, y1: 12 }] },
      forbiddenTechnologies: ["SUBMERSIBLES", "NAVAL_ENGINEERING"],
    },
  ],
  forbiddenTechnologies: [],
  // Sink Snapjaw by round 16 (the saga's 20: the thoughtful win came in
  // round 6). The stars: by round 12, and no city lost.
  objective: {
    kind: "KILL",
    units: ["SNAPJAW"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
