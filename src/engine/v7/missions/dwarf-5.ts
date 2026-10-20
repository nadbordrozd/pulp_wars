import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_5` "Iron on the Water" (docs/product/SAGA.md section 3.4, D5; the
 * Dwarf campaign, `pulp_wars-hmyk.9`). The great bolts of the Seal are cast
 * at Anvil Bay and must come up the estuary by ironclad: bring the Anvil (a
 * tagged Ironclad) to the River Landing below the mountain by round 22.
 * Step 5 of 6: a slow, precious ship through a narrow water past two
 * navies. The Grey Lodge sails from Greyhood on the southern marsh shore
 * (Black Gondolas, the Galleon of the Eye and a Kraken that holds any ship
 * beside it to one tile a turn); the Redcaps, out of work since the
 * Baron's war, sail Fire Rafts from their reed camp. Dwarf ships are
 * Armoured (every hit of 2 or more does 1 less), so a screen of Steam
 * Launches takes the blows meant for the Anvil.
 *
 * The board is the map generator's (Continents 16, seed 6): the estuary is
 * the strait between the northern shore and the marsh island; Anvil Bay
 * stands on the northern shore in the west, the River Landing at its
 * eastern end.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  4   .....ff~~f......
 *    5   f..^.f.~~f...f..
 *    6   ~.A^..~~~~..f.L.      A: Anvil Bay; L: the River Landing
 *    7   ~~YP~~~~~~~~~~~~      Y: Anvil Bay's Shipyard; P: ports
 *    8   ~~~~~~~~~~~~~~~~
 *    9   ~f~~~~~~~~fGP~~~      G: Greyhood
 *   10   ~~~~~^.^~~f..f~~
 *   11   ~^~~ff.f~ff.f.~~
 *   12   ~^~.f.ff.fff..~~
 *   13   ~~~..^.fRf^ff.~~      R: the Redcaps' reed camp
 *   14   ~~~~~~~~P~~~~~~~
 * ```
 */
export const DWARF_5_V7: MissionDefinitionV7 = {
  id: "DWARF_5",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261505,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 3,
    seed: 6,
    // The River Landing, Greyhood and the reed camp stand on villages;
    // the pearls off Greyhood are gone (hand play: gathered in round 1,
    // they grew Greyhood a level).
    edits: [
      { kind: "RESOURCE", at: { x: 11, y: 8 }, resource: "." },
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 13 }, present: false },
    ],
  },
  terrain: [
    "..~~~~~~~~~~~~~~",
    "......~~~...f..~",
    "......~~~^.....~",
    "..f...~~~..f..ff",
    ".....ff~~f......",
    "f..^.f.~~f...f..",
    "~..^..~~~~..f...",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~f~~~~~~~~f.~~~~",
    "~~~~~^.^~~f..f~~",
    "~^~~ff.f~ff.f.~~",
    "~^~.f.ff.fff..~~",
    "~~~..^.f.f^ff.~~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "r..........s....",
    "e.r.re..s.rr..rs",
    "..e.rr.......ee.",
    "r...rr..s.e..rg.",
    ".r..eg..s.eer.r.",
    ".r.or.....rer..e",
    ".e.o..s.psr..e..",
    "pp.s.s..pps.ss..",
    "......p......pp.",
    "..p......p...s..",
    "p........pgr.gs.",
    ".o.pg.....g..e..",
    "....g..ge.gg..s.",
    "..s..o....o.....",
    "p....s.s.psp....",
    ".p.p....p.......",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPWPPPPPPPPP",
    "PHHHHWPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PHPPPPPPPPWWPPPP",
    "PPPPPWWWPPWWWWPP",
    "PHPPHWWWPWWWWWPP",
    "PHPHHWWWWWWWWWPP",
    "PPPHWWWWWWWWWWPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 9, y: 3 },
    { x: 4, y: 6 },
    { x: 11, y: 6 },
    { x: 13, y: 12 },
  ],
  treasureChests: [
    { x: 9, y: 1 },
    { x: 0, y: 5 },
  ],
  // </map>
  improvements: [
    // Anvil Bay's Shipyard, where the Anvil was built, and its Port.
    { at: { x: 2, y: 7 }, improvement: "SHIPYARD" },
    { at: { x: 3, y: 7 }, improvement: "PORT" },
    // Greyhood's and the reed camp's Ports.
    { at: { x: 12, y: 9 }, improvement: "PORT" },
    { at: { x: 8, y: 14 }, improvement: "PORT" },
  ],
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DWARF",
      coins: 12,
      // The whole Dwarf navy: Steam Launches, Navigation, Ironclads, Sea
      // Tunnels and Diving Bells.
      technologies: [
        "GATHERING",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      cities: [
        {
          name: "Anvil Bay",
          at: { x: 2, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "River Landing",
          at: { x: 14, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Anvil, the bolts of the Seal in her hold.
        { role: "BATTLESHIP", at: { x: 2, y: 7 }, tag: "ANVIL" },
        { role: "PATROL_BOAT", at: { x: 3, y: 7 } },
        { role: "SUBMARINE", at: { x: 1, y: 8 } },
        // Anvil Bay keeps a slot for a new ship (hand play: with every
        // berth full it could build nothing); the escort's other two
        // Launches are the River Landing's.
        { role: "PATROL_BOAT", at: { x: 1, y: 7 }, home: 1 },
        { role: "PATROL_BOAT", at: { x: 2, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 14, y: 6 }, home: 1 },
      ],
      // The estuary, as the river pilots know it.
      reveal: {
        radius: 2,
        rects: [{ x0: 2, y0: 5, x1: 15, y1: 11 }],
      },
    },
    {
      // The Grey Lodge's navy, out of Greyhood.
      faction: "CULT",
      coins: 0,
      // A navy and nothing else (hand play: with Leadership and Harbours
      // Greyhood grew to level 3 in a round and summoned an Imp; with a
      // Shipyard it launched a second Galleon in round 6). The Galleon
      // stays the only one.
      favour: 2,
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      cities: [
        { name: "Greyhood", at: { x: 11, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 11, y: 9 } },
        // The Galleon of the Eye on its station off Greyhood, two Black
        // Gondolas and the Kraken across the strait. Four ships: a fifth
        // earned the Sea Dog monument and grew Greyhood two levels in
        // round 1; put out to sea south of the marsh they wandered off
        // and the Anvil sailed through unopposed (hand play).
        { role: "BATTLESHIP", at: { x: 10, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 11, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 13, y: 9 } },
        { role: "SUBMARINE", at: { x: 12, y: 8 } },
      ],
      // The strait from Greyhood to the Landing (a wider reveal earned the
      // Explorer monument and grew Greyhood).
      reveal: { radius: 2, rects: [{ x0: 8, y0: 5, x1: 15, y1: 8 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
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
        "NAVAL_ENGINEERING",
        "SUBMERSIBLES",
      ],
    },
    {
      // The Redcaps, out of work since the Baron's war, hired as wreckers.
      faction: "GOBLIN",
      coins: 3,
      technologies: ["SHORECRAFT", "SEAMANSHIP"],
      cities: [
        { name: "Reed Camp", at: { x: 8, y: 13 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 13 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 14 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 7, x1: 9, y1: 9 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
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
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SUBMERSIBLES",
      ],
    },
  ],
  landmarks: [{ tag: "RIVER_LANDING", at: { x: 14, y: 6 } }],
  forbiddenTechnologies: [],
  // The Anvil beside the River Landing by round 22. The stars: by round
  // 18, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "ANVIL",
    to: "RIVER_LANDING",
    within: 1,
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
