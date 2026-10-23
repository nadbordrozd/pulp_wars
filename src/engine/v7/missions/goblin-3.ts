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
 * The fourth retune (`pulp_wars-hmyk.29`, CAMPAIGN.md section 19.5, hand
 * played) eases the third (Tarry Wharf alone against three Plesiosaurs,
 * three Dugouts and two waves on a 13-round clock): the wharf has two Fire
 * Rafts and the Diving Barrel, 5 Coins and the village on its shore back
 * (Submersibles are still to be learned); the tribes have Snapjaw, one
 * young Plesiosaur and three Dugouts, 6 Coins, and hunt the wharf from
 * round 3. The whole sea is known again: with only the southern waters
 * explored, Snapjaw was never found. No waves; the hunt's clock is 15.
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
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against tribes that hunt the wharf from round 2.
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): the sea known, a
  // Plesiosaur fewer, no waves, a 15-round hunt.
  revision: 4,
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
  // The ports: the wharf's and the tribes' fishing harbour (retune 3: the
  // raft camp and its slipway are gone).
  improvements: [
    { at: { x: 10, y: 14 }, improvement: "PORT" },
    { at: { x: 6, y: 9 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Retune 4: Tarry Wharf alone, a Fighter, two rafts and a Diving
      // Barrel, 5 Coins.
      coins: 5,
      // Fire Rafts, Powder Kegs (a raft's Kaboom afloat, and the Ram) and
      // Navigation for the deep water of the strait; Submersibles (Diving
      // Barrels) are still to be learned.
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      cities: [
        {
          name: "Tarry Wharf",
          at: { x: 11, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 13 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 12, y: 14 } },
        { role: "SUBMARINE", at: { x: 12, y: 15 } },
      ],
      // The whole Lost Sea hereabouts (retune 4, as before retune 3): a
      // submerged Plesiosaur is seen only on explored water, and with only
      // the southern waters known Snapjaw was never found.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 15, y1: 15 }] },
    },
    {
      // The island's coast tribes: two fishing villages, Dugouts, a young
      // Plesiosaur, and Snapjaw.
      faction: "DINOSAUR",
      // Retune 4: 6 Coins, three Dugouts, two Plesiosaurs (Snapjaw and a
      // young one), and a hunt from round 3.
      coins: 6,
      // Dugouts with Horned Prows (a two-tile run rams for 10); no new
      // Plesiosaurs or War Rafts.
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP", "HUNTING"],
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
        { role: "PATROL_BOAT", at: { x: 7, y: 10 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 6, x1: 10, y1: 12 }] },
      forbiddenTechnologies: ["SUBMERSIBLES", "NAVAL_ENGINEERING"],
      // The hunt: from round 3 every free unit goes for the wharf.
      directive: [{ kind: "NORMAL", untilRound: 3 }, { kind: "RUSH" }],
    },
  ],
  forbiddenTechnologies: [],
  // Sink Snapjaw by round 15 (retune 4; a hunt keeps a meaningful clock).
  // The stars: by round 11, and no city lost.
  objective: {
    kind: "KILL",
    units: ["SNAPJAW"],
    byRound: 15,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 11 }, { kind: "KEEP_CITIES" }],
  },
};
