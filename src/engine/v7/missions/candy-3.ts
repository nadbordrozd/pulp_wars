import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_3` "The Commissioner" (docs/product/SAGA.md section 3.8, C3; the
 * Candy campaign, `pulp_wars-hmyk.11`). The Crown has sent a Royal
 * Commissioner for Confectionery onto the lake with a warrant, a squadron
 * and a contract for the Sugarcrest choir's services on a date to be
 * confirmed; Praline has eaten the contract. Sink his flagship, the
 * Sovereign. Step 3 of 6: a naval hunt against a Battleship that
 * outranges everything on the lake. With Sugar Sails a Gumdrop Tug may
 * Sugar Rush afloat and rams harder, then Crashes and cannot attack for a
 * turn; a ship hit by a Pie Galleon's pie cannot strike back for the rest
 * of the turn; a Choco Sub torpedoes without reply.
 *
 * The board is the map generator's (Lakes 16, seed 8) with one tile of the
 * lake raised for the Crown's island fort. The western lake is the
 * battlefield: Sugarcrest on its northern shore, out of the Sovereign's
 * reach, Gumdrop on its eastern one, under her guns, and the Outflow fort
 * on its island in the south, where the lake drains away. The squadron
 * keeps to its anchorage off the fort: the seat's `HOLD` leashes its ships
 * (`ships: true`, saga extension E7, `src/ai/v7-directives.ts`). Hand play
 * (CAMPAIGN.md, the Candy campaign's section): without the leash the
 * Sovereign sailed out in round 1 and shelled every boat the kingdom
 * launched; with three Rushed Tugs to start it was rammed to death in round
 * 2; a fort with a Port launched a new Submarine every few rounds, and on
 * her third kill the Sovereign was promoted and healed whole. The winning
 * line waits out of her reach (four tiles) and strikes together when she
 * swings to the west end of her anchorage.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   f..f.ff^.f^f.^f^
 *    1   fffff.^..^^..^.^
 *    2   fffffff^^^^.^^^^
 *    3   fffff~~~~~~^^^^.
 *    4   ffff^ff~~~~.^^..
 *    5   fff^~~$~~~~f^f..      $: a treasure chest
 *    6   ffff~~fS^~~^^...      S: Sugarcrest
 *    7   ffff~~~~^~~.^..^
 *    8   f.f~~~~~.~~.fff.
 *    9   .ff~~~~~..^f.f..
 *   10   .f.~~~~~G^......      G: Gumdrop
 *   11   f.f.~O~~^f......      O: the Outflow, the Crown's island fort
 *   12   ...~~~~~....f..f
 *   13   ..^^.v.f...^f...      v: a village
 *   14   ...ff..^f..f....
 *   15   ff.f.^.ff..^..f.
 * ```
 */
export const CANDY_3_V7: MissionDefinitionV7 = {
  id: "CANDY_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261803,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 2,
    seed: 8,
    edits: [
      // The Crown's island, raised out of the lake for the fort.
      { kind: "TERRAIN", at: { x: 5, y: 11 }, terrain: "." },
      // Gumdrop and Sugarcrest stand on villages; the rest of the shore
      // and the hills keep none, so nobody grows while the ships fight.
      { kind: "VILLAGE", at: { x: 7, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 10 }, present: false },
    ],
  },
  terrain: [
    "f..f.ff^.f^f.^f^",
    "fffff.^..^^..^.^",
    "fffffff^^^^.^^^^",
    "fffff~~~~~~^^^^.",
    "ffff^ff~~~~.^^..",
    "fff^~~.~~~~f^f..",
    "ffff~~f.^~~^^...",
    "ffff~~~~^~~.^..^",
    "f.f~~~~~.~~.fff.",
    ".ff~~~~~..^f.f..",
    ".f.~~~~~.^......",
    "f.f.~.~~^f......",
    "...~~~~~....f..f",
    "..^^...f...^f...",
    "...ff..^f..f....",
    "ff.f.^.ff..^..f.",
  ],
  resources: [
    "..r.....r.o.eogo",
    ".g.gg.....o..o.o",
    "..g.g.goooo.o.oo",
    "...g.p..sp.o.oo.",
    ".ggg......s.o...",
    "..gos.......o...",
    "g.....g.o.po.rr.",
    "gggg..p.o.p.or..",
    "..gs..p....r.ggr",
    "eg.s.p..ee.g....",
    ".g.....s.o..er..",
    "gr.rs......r..re",
    "........rr.rg.eg",
    ".e..r..g.rr.g...",
    "ee..ge.oge....er",
    "g.r.roeg.rroee..",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWHHHHHHHHHHH",
    "WWWWWHHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWPPPPPPHHHHH",
    "WWWWWWHPPPPHHHHP",
    "WWWWPPHPPPPHHHPP",
    "WWWWPPPHHPPHHPPP",
    "WWWWPPPPHPPHPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWWPPPPPPPPPPPPP",
    "WWPPPPPPPPPPPPPP",
    "WPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [{ x: 5, y: 13 }],
  treasureChests: [
    { x: 6, y: 5 },
    { x: 2, y: 10 },
  ],
  // </map>
  improvements: [
    // Sugarcrest's and Gumdrop's Ports. The Outflow has none: a fort
    // with a Port launched a new Submarine every few rounds (hand play).
    { at: { x: 7, y: 7 }, improvement: "PORT" },
    { at: { x: 7, y: 10 }, improvement: "PORT" },
    // Gumdrop's sugar-beet Farms.
    { at: { x: 8, y: 9 }, improvement: "FARM" },
    { at: { x: 9, y: 9 }, improvement: "FARM" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CANDY",
      coins: 10,
      // Gumdrop Tugs, Navigation and Sugar Sails (a ship may Sugar Rush
      // afloat, and Tugs ram); Pie Galleons and Choco Subs are a research
      // away. Hand play: with three Tugs three Rushed rams sank the
      // Sovereign in round 3; with one and no Sugar Sails nothing could
      // leave port alive.
      technologies: [
        "GATHERING",
        "HUNTING",
        "ADMINISTRATION",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
      ],
      cities: [
        // Sugarcrest out of the Sovereign's reach on the northern shore
        // (hand play: a city within three tiles of her anchorage could not
        // launch a boat that she did not sink at once), Gumdrop under her
        // guns.
        {
          name: "Sugarcrest",
          at: { x: 7, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Gumdrop",
          at: { x: 8, y: 10 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 7, y: 6 } },
        // Two Tugs, out of the Sovereign's reach.
        { role: "PATROL_BOAT", at: { x: 6, y: 7 }, home: 1 },
        { role: "PATROL_BOAT", at: { x: 5, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 10 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 5, x1: 8, y1: 13 }] },
    },
    {
      // The Crown's lake squadron, out of the Outflow fort.
      faction: "ORIGINAL",
      coins: 0,
      // The squadron's own technologies, but no Shipyard: the Sovereign
      // stays the only Battleship.
      technologies: ["SHORECRAFT", "NAVIGATION", "SEAMANSHIP", "SUBMERSIBLES"],
      cities: [
        { name: "The Outflow", at: { x: 5, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 5, y: 11 } },
        // The Sovereign at anchor off the fort, with her escort.
        { role: "BATTLESHIP", at: { x: 4, y: 11 }, tag: "SOVEREIGN" },
        { role: "PATROL_BOAT", at: { x: 6, y: 11 } },
        { role: "SUBMARINE", at: { x: 4, y: 12 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 5, x1: 8, y1: 13 }] },
      // A squadron, not an army: no new trees.
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
      ],
      // The squadron keeps to its anchorage off the Outflow (E7): hand
      // play without the leash had the Sovereign sail out in round 1 and
      // shell every boat the kingdom launched.
      directive: {
        kind: "HOLD",
        zone: [{ x0: 3, y0: 11, x1: 6, y1: 12 }],
        ships: true,
      },
    },
  ],
  landmarks: [],
  forbiddenTechnologies: [],
  // Sink the Sovereign by round 18 (the saga's 22: the thoughtful win
  // came in round 8). The stars: by round 12, and no city lost.
  objective: {
    kind: "KILL",
    units: ["SOVEREIGN"],
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
