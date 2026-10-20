import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_2` "The Royal Recipe Book" (docs/product/SAGA.md section 3.8, C2;
 * the Candy campaign, `pulp_wars-hmyk.11`). The oldest recipe in the
 * kingdom is in the Royal Library at Riftwatch, on the edge of the crack
 * Sugarcrest fell out of, and a family of dinosaurs that ran away from
 * Baron Kessler's circus has nested in the stacks. Take Riftwatch before
 * they eat the R's. Step 2 of 6: big bodies that grow with every kill.
 * Feed them nothing: a Marshmallow bounces whoever hits it, a beast a Pie
 * Launcher has Splatted cannot strike back for the rest of the turn, so
 * the Toffee Troopers hit it then; and the Nest's Eggs hatch if it stands.
 *
 * The board is the map generator's (Lakes 14, seed 1) with the crack drawn
 * in beside the library (three Rift tiles): the great lake in the middle,
 * Sugarcrest and Gumdrop on its southern shore, the runaways' Nest in the
 * western woods and Riftwatch under the crack in the north-west, at the
 * mouth of a one-tile pass. Mountains close the east, so the road north
 * runs up the western shore, past the Nest. Hand play (CAMPAIGN.md, the
 * Candy campaign's section): with the library at the far end of the pass
 * the column took until round 17 to reach it, single file behind an
 * Ankylosaurus; the T-Rex Egg in the Nest hatches in four turns unless a
 * Rushed Trooper kills it first; a Raptor fed two kills grows to 16 HP.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   .^^^^.ff^^.f^.
 *    1   ^xxx^...f^ff^f      x: the Rift
 *    2   ^^Rf.....^^.f^      R: Riftwatch
 *    3   f.^~~~^^~^^fff
 *    4   ...~~~~f~~~fff
 *    5   ...ff.~f~~~..f
 *    6   f..~~ff.~~~ff.
 *    7   f..~~~f.~f.^ff
 *    8   f.N~~~~.~~~f^^      N: the Nest
 *    9   ..f~~~~ffff...
 *   10   f.f~~~~~ff.fff
 *   11   .v.^fS..G..^f^      S: Sugarcrest; G: Gumdrop; v: villages
 *   12   f....f......vf
 *   13   ff.$...^....ff      $: treasure chests
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 21.4, not
 * play-tested): a skirmish start. Sugarcrest alone at level 2 (Gumdrop is
 * gone) with Madame Nougat, a Fighter and the old Pie Launcher nobody can
 * build yet, no technology, 3 Coins, only the library seen. The runaways
 * have seven more dinosaurs and 4 Coins, hold home for three rounds and
 * then send all but four, and three announced waves come in rounds 5, 9
 * and 13. The clock is 16 (was 20).
 */
export const CANDY_2_V7: MissionDefinitionV7 = {
  id: "CANDY_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start.
  revision: 3,
  seed: 20261802,
  // <map>
  size: 14,
  source: {
    mapType: "LAKES",
    size: 14,
    seats: 2,
    seed: 1,
    edits: [
      // The crack Sugarcrest fell out of, beside the library.
      { kind: "TERRAIN", at: { x: 1, y: 1 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 2, y: 1 }, terrain: "x" },
      { kind: "TERRAIN", at: { x: 3, y: 1 }, terrain: "x" },
      // Riftwatch, the Nest, Sugarcrest and Gumdrop stand on villages; the
      // villages in the north and round the lake would hand the runaways
      // more towns.
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 7 }, present: false },
    ],
  },
  terrain: [
    ".^^^^.ff^^.f^.",
    "^xxx^...f^ff^f",
    "^^.f.....^^.f^",
    "f.^~~~^^~^^fff",
    "...~~~~f~~~fff",
    "...ff.~f~~~..f",
    "f..~~ff.~~~ff.",
    "f..~~~f.~f.^ff",
    "f..~~~~.~~~f^^",
    "..f~~~~ffff...",
    "f.f~~~~~ff.fff",
    "...^f......^f^",
    "f....f......ff",
    "ff.....^....ff",
  ],
  resources: [
    "..ooo...oor.o.",
    "....o..r..g.o.",
    ".o.....r..o...",
    "geos..oopoog..",
    "....s...s.sg..",
    "......s.sps.e.",
    ".e.s.gg...sg..",
    ".r..p.g.sge.gg",
    ".e.....e...g..",
    ".r.p.p...gg...",
    "g..s..s...e...",
    ".e........rog.",
    "grrr.ge..r...g",
    "gge.eer....r.g",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHHHHHH",
    "HHHHHHHHHHHHHH",
    "PHHHHHHHHHHHHH",
    "PPHPPPHHPHHHHH",
    "PPPPPPPHPPPHHH",
    "PPPPWWPWPPPWWW",
    "PPPPPWWWPPPWWW",
    "PPPPPPWWPWWWWW",
    "PPPPPPPWPPPWWW",
    "PPPPPPPWWWWWWW",
    "PPPPPPPPWWWWWW",
    "PPPPPWWWWWWWWW",
    "PPPPPPWWWWWWWW",
    "PPPPPPPWWWWWWW",
  ],
  villages: [
    { x: 2, y: 11 },
    { x: 11, y: 12 },
  ],
  treasureChests: [
    { x: 8, y: 12 },
    { x: 3, y: 13 },
  ],
  // </map>
  // Sugarcrest's sugar-beet Farm and its candy-cane plantation.
  improvements: [
    { at: { x: 6, y: 12 }, improvement: "FARM" },
    { at: { x: 4, y: 11 }, improvement: "LUMBER_CAMP" },
    // The library's kitchen garden, which the runaways have trampled.
    { at: { x: 1, y: 3 }, improvement: "FARM" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CANDY",
      // Retune 3: a skirmish start. Sugarcrest alone, Madame Nougat, a
      // Fighter and the old Pie Launcher (no Sawmilling), no technology.
      coins: 3,
      technologies: [],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Madame Nougat, the Royal Confectioner, in goggles.
        { role: "CAPTAIN", at: { x: 5, y: 12 }, tag: "NOUGAT" },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
        { role: "CATAPULT", at: { x: 6, y: 12 } },
      ],
      // The library, and nothing else.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 2, y1: 2 }] },
    },
    {
      // Kessler's runaway menagerie, nesting in the stacks.
      faction: "DINOSAUR",
      coins: 4,
      technologies: [],
      cities: [
        {
          name: "Riftwatch",
          at: { x: 2, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Nest",
          at: { x: 2, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 2 } },
        { role: "RAIDER", at: { x: 3, y: 2 }, kills: 1 },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 1, y: 9 }, home: 1 },
        // The clutch in the Nest: a T-Rex, four turns from hatching.
        { role: "KNIGHT", at: { x: 2, y: 7 }, home: 1, egg: 4 },
        // Retune 3: seven more of the menagerie.
        { role: "FIGHTER", at: { x: 5, y: 2 } },
        { role: "GUARD", at: { x: 5, y: 1 } },
        { role: "RAIDER", at: { x: 6, y: 2 }, kills: 1 },
        { role: "FIGHTER", at: { x: 1, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 2, y: 9 }, home: 1 },
        { role: "RAIDER", at: { x: 0, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 1, y: 6 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 6, x1: 6, y1: 12 }] },
      // Runaways from a circus: they learn nothing.
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
      ],
      // Retune 3: all of them hold the stacks for three rounds; then four
      // stay with the Nest's clutch and the rest rampage for Sugarcrest.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 1, x1: 6, y1: 3 },
            { x0: 0, y0: 6, x1: 3, y1: 9 },
          ],
          garrison: 13,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 1, x1: 6, y1: 3 },
            { x0: 0, y0: 6, x1: 3, y1: 9 },
          ],
          garrison: 4,
          others: { kind: "RUSH" },
          fromRound: 3,
        },
      ],
    },
  ],
  // Retune 3: more of the circus's runaways turn up, three times.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      line: "A second family of runaways blunders out of the western reeds.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 2, y: 6 } },
        { role: "RAIDER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 1, y: 9 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      line: "Kessler's circus has been busy: three more beasts, none of them fed.",
      announce: true,
      units: [
        { role: "RAIDER", at: { x: 5, y: 2 } },
        { role: "FIGHTER", at: { x: 6, y: 1 } },
        { role: "GUARD", at: { x: 6, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 1 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      line: "The T-Rex's cousins roar in from the pass. Library hours are over.",
      announce: true,
      units: [
        { role: "KNIGHT", at: { x: 4, y: 2 } },
        { role: "RAIDER", at: { x: 5, y: 2 } },
        { role: "FIGHTER", at: { x: 6, y: 2 } },
        { role: "GUARD", at: { x: 3, y: 2 } },
      ],
    },
  ],
  landmarks: [{ tag: "RIFTWATCH", at: { x: 2, y: 2 } }],
  // Nobody sails the lake.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Riftwatch by round 16. The stars: by round 12, and Madame Nougat lives.
  objective: {
    kind: "CAPTURE",
    places: ["RIFTWATCH"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "NOUGAT" },
    ],
  },
};
