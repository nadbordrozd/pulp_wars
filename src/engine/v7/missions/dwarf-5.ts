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
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 20.4, NOT play
 * tested): the Anvil sails lean. Anvil Bay is level 2 and the River
 * Landing is no longer a town (only a landing, which the Anvil must still
 * reach); four ships, four technologies, 4 Coins; the village and chest
 * beside Anvil Bay are gone and only the Landing is explored. The Redcaps
 * have seven ships, 8 Coins and sail on the Anvil from round 3; the Lodge
 * has 6 Coins; four announced waves of ships (the Redcaps in rounds 3 and
 * 8, the Lodge in rounds 5 and 10) come up the strait. The clock is 18
 * rounds.
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
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean fleet
  // against two navies that grow in four announced waves.
  revision: 3,
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
      // Retune 3: nothing free beside Anvil Bay or the Landing.
      { kind: "VILLAGE", at: { x: 4, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 6 }, present: false },
      { kind: "CHEST", at: { x: 0, y: 5 }, present: false },
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
    { x: 13, y: 12 },
  ],
  treasureChests: [{ x: 9, y: 1 }],
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
      // Retune 3: a lean fleet. Four ships, four technologies (Steam
      // Launches, Navigation, the Diving Bell's first step), 4 Coins.
      coins: 4,
      technologies: ["GATHERING", "SHORECRAFT", "NAVIGATION", "SEAMANSHIP"],
      cities: [
        {
          name: "Anvil Bay",
          at: { x: 2, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Anvil, the bolts of the Seal in her hold.
        { role: "BATTLESHIP", at: { x: 2, y: 7 }, tag: "ANVIL" },
        { role: "PATROL_BOAT", at: { x: 3, y: 7 } },
        { role: "SUBMARINE", at: { x: 1, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 1, y: 7 } },
      ],
      // The Landing (the objective's place must be known); the estuary is
      // unexplored.
      reveal: {
        radius: 2,
        rects: [{ x0: 13, y0: 5, x1: 15, y1: 7 }],
      },
    },
    {
      // The Grey Lodge's navy, out of Greyhood.
      faction: "CULT",
      // Retune 3: 6 Coins (the Favour stays 2).
      coins: 6,
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
      // Retune 3: seven ships and men, 8 Coins, a hunt from round 3.
      coins: 8,
      technologies: ["SHORECRAFT", "SEAMANSHIP"],
      cities: [
        { name: "Reed Camp", at: { x: 8, y: 13 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 13 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 5, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 4, y: 14 } },
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
      // The wreckers sail from round 3.
      directive: [{ kind: "NORMAL", untilRound: 3 }, { kind: "RUSH" }],
    },
  ],
  landmarks: [{ tag: "RIVER_LANDING", at: { x: 14, y: 6 } }],
  // Both navies grow: the wreckers' rafts and the Lodge's gondolas.
  reinforcements: [
    {
      seat: 2,
      round: 3,
      units: [
        { role: "PATROL_BOAT", at: { x: 5, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 14 } },
      ],
      line: "Two more reed-raft crews launch, already arguing about the pay.",
      announce: true,
    },
    {
      seat: 1,
      round: 5,
      units: [
        { role: "PATROL_BOAT", at: { x: 12, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 8 } },
      ],
      line: "Black gondolas slip out of the marsh, lanterns shuttered.",
      announce: true,
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "PATROL_BOAT", at: { x: 5, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 10, y: 14 } },
        { role: "PATROL_BOAT", at: { x: 11, y: 14 } },
      ],
      line: "The Redcaps' whole raft fleet sets out, mostly on fire.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "SUBMARINE", at: { x: 13, y: 8 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 8 } },
      ],
      line: "Something with too many arms swims up behind the gondolas.",
      announce: true,
    },
  ],
  forbiddenTechnologies: [],
  // The Anvil beside the River Landing by round 18 (it was 22). The stars:
  // by round 15, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "ANVIL",
    to: "RIVER_LANDING",
    within: 1,
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 15 }, { kind: "KEEP_CITIES" }],
  },
};
