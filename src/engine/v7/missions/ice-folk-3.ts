import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_3` "The Frozen Strait" (docs/product/SAGA.md section 3.7, I3;
 * the Ice Folk campaign, `pulp_wars-hmyk.10`). The shortest road from the
 * peaks to the Hollow Mountain crosses the Grey Strait, and the dwarves of
 * Anvil Bay patrol it with ironclads: freeze a road across and take Anvil
 * Bay by round 22. Step 3 of 6. The Ice Folk have no ships: a unit freezes
 * the water beside it two tiles out in a line (the Witch every tile round
 * her), the ice stays, and Ice Folk slide across it. Every dwarf ship and
 * soldier can crack a tile of ice beside it back into water, unless a unit
 * stands on it; Black Ice freezes an enemy that steps onto your ice, and
 * Icebound locks a ship into the ice to be crushed.
 *
 * The board is the map generator's (Continents 16, seed 15), turned: the
 * Grey Strait runs north and south between the Ice Folk shore in the west
 * and the dwarves' shore in the east, shallow at its edges and deep in the
 * middle, with a rock in it. Coldharbour faces Anvil Bay straight across.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  6   ~...f~~.~~f....~
 *    7   ~..f~~~f~f.....~      the rock in the strait
 *    8   ~..S~~~~~......~      S: Snowmere
 *    9   ~...~~~~~~.....~
 *   10   ~~..^^~~~~f.F..~      F: Anvil Bay's farm
 *   11   ~~v.fC.~~~PA...~      C: Coldharbour; A: Anvil Bay; P: its Port
 *   12   ~~.fff.~~~~Y...~      Y: Anvil Bay's Shipyard
 *   13   ~~c.fff~~~~f..~~
 *   14   ~~~.v~~~.~~.v^~~
 * ```
 */
export const ICE_FOLK_3_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261603,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 15,
    // Snowmere and Anvil Bay stand on villages.
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
    ],
  },
  terrain: [
    "~~.~~.~~~~~~~~~~",
    "~~..^^~~~~.^^^~~",
    "~....f.~~~^f^.~~",
    "~~.....~~~....~~",
    "~~f....~~~~^^f~~",
    "~~...~~~~~~^..f~",
    "~...f~~.~~f....~",
    "~..f~~~f~f.....~",
    "~...~~~~~......~",
    "~...~~~~~~.....~",
    "~~..^^~~~~f....~",
    "~~..f..~~~~....~",
    "~~.fff.~~~~~...~",
    "~~f.fff~~~~f..~~",
    "~~~..~~~.~~..^~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    ".sr..e.p........",
    ".s.e.o..pp.ooo..",
    "seere..s..o.o...",
    "ps...ers....r.sp",
    ".s..e....p.oo..p",
    ".........p.oee..",
    "sre....e.s.e..r.",
    "ser...s...rr..rs",
    ".er........ee.e.",
    ".rr.......ere..p",
    "..r.o.......eers",
    ".p.eg...pp..rre.",
    "...gg.r.........",
    "....gg...ps..es.",
    ".psr..pp..sr.o..",
    "..........ps....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPHHHHPP",
    "PPPPPPPPPPPHHHPP",
    "PPPPPPPPPPPHHHPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPWWWPPPPPPPPP",
    "PPWWWWWPPPPPPPPP",
    "PPWWWWWPPPPPPPPP",
    "PPPWWPPPWPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 2 },
    { x: 10, y: 3 },
    { x: 13, y: 3 },
    { x: 2, y: 11 },
    { x: 4, y: 14 },
    { x: 12, y: 14 },
  ],
  improvements: [
    // Anvil Bay's farm, its Port on the strait and the Shipyard where its
    // ironclads are built.
    { at: { x: 12, y: 10 }, improvement: "FARM" },
    { at: { x: 10, y: 11 }, improvement: "PORT" },
    { at: { x: 11, y: 12 }, improvement: "SHIPYARD" },
  ],
  treasureChests: [
    { x: 3, y: 3 },
    { x: 2, y: 13 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 6,
      // Rime (freeze the shallows), Pack Ice (the deep water) and Icebound
      // (freeze a ship in) known; the Witch, Sleds, Snow Hunters and Musk
      // Oxen.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
      ],
      cities: [
        {
          name: "Coldharbour",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Snowmere", at: { x: 3, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 5, y: 11 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 6, y: 11 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        { role: "GUARD", at: { x: 5, y: 12 } },
        { role: "MARKSMAN", at: { x: 4, y: 12 } },
        { role: "RAIDER", at: { x: 3, y: 9 }, home: 1 },
      ],
      // The strait and the far shore, as seen from the cliffs.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 6, x1: 13, y1: 14 }] },
    },
    {
      // The Anvil Bay iron fleet.
      faction: "DWARF",
      coins: 0,
      technologies: [
        "GATHERING",
        "FARMING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
      ],
      cities: [
        {
          name: "Anvil Bay",
          at: { x: 11, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // The harbour's garrison: a Hammerer on the gate and a Clockwork
        // Gunner on the quay (hand play: a second Gunner on the shore
        // shot two units a turn off the end of the ice road).
        { role: "FIGHTER", at: { x: 11, y: 11 } },
        { role: "MARKSMAN", at: { x: 12, y: 12 } },
        // The landing party.
        { role: "FIGHTER", at: { x: 12, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "CAPTAIN", at: { x: 12, y: 10 } },
        // The patrol on the strait: a Steam Launch and a Diving Bell (hand
        // play: with the Ironclad on the strait from the first round it
        // shot a Yeti a turn off the shore, three tiles out).
        { role: "PATROL_BOAT", at: { x: 9, y: 13 } },
        { role: "SUBMARINE", at: { x: 8, y: 12 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 7, x1: 10, y1: 14 }] },
      forbiddenTechnologies: [
        "MILLING",
        "ADMINISTRATION",
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
        // Hand play: with Naval Engineering the Shipyard launched an
        // Ironclad in round 6, which shot the road from its own dock,
        // where no ice can lock it.
        "NAVAL_ENGINEERING",
        "SUBMERSIBLES",
      ],
      // Three hold the harbour; the rest cross the ice for Coldharbour.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 10, x1: 12, y1: 12 }],
        garrison: 3,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The Ironclad comes home from the south in round 12 (hand play: in
  // round 6 it shot a unit a turn off the ice from three tiles out).
  reinforcements: [
    {
      seat: 1,
      round: 12,
      units: [{ role: "BATTLESHIP", at: { x: 10, y: 14 } }],
    },
  ],
  landmarks: [{ tag: "ANVIL_BAY", at: { x: 11, y: 11 } }],
  forbiddenTechnologies: [],
  // Anvil Bay by round 22. The stars: by round 18, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["ANVIL_BAY"],
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
