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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): a thin start. Coldharbour alone at level 2 with Mother
 * Rime, two Fighters and a Guard nobody can train yet, Rime and Pack Ice
 * (Shorecraft and Navigation) and nothing else, 4 Coins; Snowmere is gone
 * and the villages on the cliffs with it. Anvil Bay is level 4 with eleven
 * dwarves, two Gunners and a second patrol boat, five hold the harbour and
 * the rest cross the ice from the first round; landing parties arrive in
 * rounds 5 and 14 and the Ironclad comes home in round 9 (was 12). The
 * clock is 18 (was 22).
 */
export const ICE_FOLK_3_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start against
  // a garrisoned harbour and three waves.
  revision: 3,
  seed: 20261603,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 15,
    // Anvil Bay stands on a village; Snowmere's is gone (retune 3: no
    // second town), and so are the two on the cliffs.
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 14 }, present: false },
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
      // Retune 3: Rime (freeze the shallows) and Pack Ice (the deep water)
      // are all the learning there is; Icebound is a research away.
      coins: 4,
      technologies: ["SHORECRAFT", "NAVIGATION"],
      cities: [
        {
          name: "Coldharbour",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 5, y: 11 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 6, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        // The one Guard nobody can train yet (no Fortification).
        { role: "GUARD", at: { x: 5, y: 12 } },
      ],
      // The cliffs round the camp, and Anvil Bay across the strait.
      reveal: { radius: 2, rects: [{ x0: 11, y0: 11, x1: 11, y1: 11 }] },
    },
    {
      // The Anvil Bay iron fleet.
      faction: "DWARF",
      coins: 4,
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
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
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
        // Retune 3: two more Hammerers, a second Gunner on the shore, a
        // Guard on the quay and a second Steam Launch.
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 10 } },
        { role: "MARKSMAN", at: { x: 12, y: 8 } },
        { role: "GUARD", at: { x: 10, y: 10 } },
        { role: "PATROL_BOAT", at: { x: 9, y: 11 } },
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
      // Retune 3: five hold the harbour (a concentrated strike is needed);
      // the rest cross the ice for Coldharbour from the first round.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 10, x1: 12, y1: 12 }],
        garrison: 5,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The Ironclad comes home from the south in round 9 (hand play: in
  // round 6 it shot a unit a turn off the ice from three tiles out; retune
  // 3: round 12 was too late), and landing parties come in rounds 5 and 14.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      line: "A landing party of dwarves tramps ashore at Anvil Bay, boots first.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 9 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "FIGHTER", at: { x: 13, y: 10 } },
        { role: "MARKSMAN", at: { x: 14, y: 10 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      line: "The Ironclad comes home from the south. It has opinions about ice.",
      announce: true,
      units: [{ role: "BATTLESHIP", at: { x: 10, y: 14 } }],
    },
    {
      seat: 1,
      round: 14,
      line: "Anvil Bay sends its second shift: the thane has stopped being polite.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 12 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 12, y: 13 } },
        { role: "GUARD", at: { x: 13, y: 13 } },
      ],
    },
  ],
  landmarks: [{ tag: "ANVIL_BAY", at: { x: 11, y: 11 } }],
  forbiddenTechnologies: [],
  // Anvil Bay by round 18. The stars: by round 14, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["ANVIL_BAY"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
