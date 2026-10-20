import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_6` "Old Blood" (docs/product/SAGA.md section 3.5, DN6; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's herd
 * into the marsh against the Grey Lodge, who mean to offer her eggs to the
 * thing under the mountain, and must take Greyhood by round 18. Step 6 of
 * 6, the finale. The Lodge holds its island with Summoners, Idol Bearers,
 * Initiates and Hexers (`GUARD`, eight of them) and starts with 16 Favour
 * and The Stars Are Right: a Summoner and three chanters call the Herald
 * for 20 Favour (hand play: it came in round 3), and every unit outside
 * the garrison, the daemons included, storms Mire's Edge (`others:
 * ASSAULT`). The Unquiet hold a barrow on the eastern shore and rise out
 * of the reeds in rounds 5, 8, 11 and 14. Every daemon depends on its
 * channellers: kill enough of them and it turns, Unbound, on the nearest
 * cultists, and then on whoever stands nearest.
 *
 * The board is the map generator's (Lakes 16, seed 16): a ring of lakes
 * round a low island in the middle of the marsh, where Greyhood stands,
 * joined to the shore by a causeway in the north and by fords in the west
 * and the east; your camps at Mire's Edge and Sallow Ford on the southern
 * and western shores; Drowned Barrow on the eastern shore. Six villages
 * are gone (under the towns, one on the island and one by the east ford).
 *
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start like a skirmish
 * (Mire's Edge at level 1, the Old Queen and Oona, no technology, no
 * Coins, only the island seen), Greyhood has 20 Favour and
 * sixteen men, the barrow is level 2 with nine, eight announced waves
 * come (six of the dead, two boatloads of the Lodge's faithful) and the
 * clock is 15.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * Lodge: with two Summoners and 12 Favour the Queen ate it by round 5;
 * with the whole Lodge leashed to the island the Herald never left it.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ..f.......^...f.
 *    1   ff...v...xxx..v.      v: villages; x: the Rift
 *    2   ..f...f...ff....
 *    3   .....~~~f~~~~...      the causeway
 *    4   ....~~~~.~~~~.f.
 *    5   f..~~..ff~~~~.v.
 *    6   fv.~..~..G~~^.$.      G: Greyhood; $: treasure chests
 *    7   ......~~~~..~f..
 *    8   ....S^~~~~~f~B..      S: Sallow Ford (yours); B: Drowned Barrow
 *    9   .v.+.f~~~~..~.+.      +: old Graves
 *   10   ..ff+f~~~.^~~f+.
 *   11   fff...M~~.~~~f.f      M: Mire's Edge (yours)
 *   12   ......f.ff~^^f^.
 *   13   ...f....f^++f.v^
 *   14   f$.^..fv^^.^^^f^
 *   15   f^ffff.f^^...^..
 * ```
 */
export const DINOSAUR_6_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start, a
  // Greyhood with 20 Favour, a fuller Lodge and Unquiet, eight announced
  // waves and a 15-round clock.
  revision: 3,
  seed: 20261406,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 3,
    seed: 16,
    edits: [
      { kind: "VILLAGE", at: { x: 9, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 9 }, present: false },
      // Retune 3: the villages within reach of Mire's Edge.
      { kind: "VILLAGE", at: { x: 7, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 9 }, present: false },
    ],
  },
  terrain: [
    "..f.......^...f.",
    "ff.......xxx....",
    "..f...f...ff....",
    ".....~~~f~~~~...",
    "....~~~~.~~~~.f.",
    "f..~~..ff~~~~...",
    "f..~..~....~~^..",
    "......~~~~..~f..",
    ".....^~~~~~f~...",
    ".....f~~~~..~...",
    "..ff.f~~~.^~~f..",
    "fff....~~.~~~f.f",
    "......f.ff~^^f^.",
    "...f....f^..f..^",
    "f..^..f.^^.^^^f^",
    "f^ffff.f^^...^..",
  ],
  resources: [
    "r...r..e.eoe.e..",
    ".ge.r.er....ee.r",
    "r...r..r.e.g.e..",
    ".r....ss........",
    "..ers.......s..e",
    "ge.sp..g.psp.r.e",
    "g.e.eese..e.p...",
    "...rrrsss.ees.ee",
    ".e.r........s.ee",
    "r.ereg...s.rs...",
    ".r.g.....eo...r.",
    ".g..r..s....s..g",
    ".er...ge.gso.g..",
    "....e.e..or....o",
    "..ro.e..oorooo..",
    "go..gg..oo.rro..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPWWWPPPHHPPPPP",
    "WWWWWWWPPHPPPHPP",
    "WWWWWWWWHHPHHHHP",
    "WWWWWWWWHHHHHHHH",
    "WWWWWWWWHHHHHHHH",
    "WWWWWWWWHHHHHHHH",
  ],
  villages: [
    { x: 5, y: 1 },
    { x: 14, y: 1 },
    { x: 14, y: 5 },
    { x: 1, y: 6 },
    { x: 14, y: 13 },
  ],
  treasureChests: [
    { x: 14, y: 6 },
    { x: 1, y: 14 },
  ],
  // </map>
  // The barrows on the dry ground round the marsh.
  graves: [
    { x: 14, y: 9 },
    { x: 14, y: 10 },
    { x: 3, y: 9 },
    { x: 4, y: 10 },
    { x: 10, y: 13 },
    { x: 11, y: 13 },
  ],
  // Greyhood's fields.
  improvements: [
    { at: { x: 10, y: 6 }, improvement: "FARM" },
    { at: { x: 10, y: 7 }, improvement: "FARM" },
  ],
  aiMode: "RIVAL",
  // The Grey Lodge and the Unquiet are one side.
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3: a skirmish start. Mire's Edge at level 1 (Sallow Ford is
      // gone), no technology, no Coins, the Old Queen (an Alpha, the one
      // thing you cannot raise again) and Oona, and only the island in
      // sight.
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "Mire's Edge",
          at: { x: 6, y: 11 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // The Old Queen, an Alpha since the Barrowlands, and Shaman Oona.
        { role: "KNIGHT", at: { x: 5, y: 12 }, tag: "OLD_QUEEN", kills: 3 },
        { role: "CAPTAIN", at: { x: 6, y: 11 }, tag: "OONA" },
      ],
      // Greyhood's island, and nothing else.
      reveal: {
        radius: 1,
        rects: [{ x0: 8, y0: 5, x1: 10, y1: 7 }],
      },
    },
    {
      // The Grey Lodge at Greyhood, and the Queen's eggs.
      faction: "CULT",
      // Retune 3: 10 Coins and 20 Favour (the Herald
      // can be called in the first round).
      coins: 10,
      favour: 20,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "Greyhood",
          at: { x: 9, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // Three Summoners, three Idol Bearers, Initiates, and Hexers on
        // the island's western shore (hand play: with two Summoners and
        // four Initiates the Queen ate the Lodge by round 5).
        { role: "CAPTAIN", at: { x: 9, y: 6 } },
        { role: "CAPTAIN", at: { x: 7, y: 5 } },
        { role: "CAPTAIN", at: { x: 10, y: 7 } },
        { role: "GUARD", at: { x: 8, y: 6 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "GUARD", at: { x: 10, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 5 } },
        { role: "FIGHTER", at: { x: 11, y: 7 } },
        { role: "MARKSMAN", at: { x: 5, y: 5 } },
        { role: "MARKSMAN", at: { x: 5, y: 6 } },
        // Retune 3: four more, the island's west shore and the north.
        { role: "MARKSMAN", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 4, y: 7 } },
        { role: "FIGHTER", at: { x: 5, y: 7 } },
        { role: "GUARD", at: { x: 8, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 7, x1: 8, y1: 12 }] },
      // Summoners, Idol Bearers, Initiates and Hexers, Imps and Horrors,
      // and The Stars Are Right for the Herald; no Familiars, Stargazers,
      // Tentacles or Masses.
      forbiddenTechnologies: [
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "METALLURGY",
      ],
      // The Lodge holds its island with eight; everything else, the
      // daemons it calls included, storms Mire's Edge (hand play: with the
      // whole Lodge leashed to the island the Herald never left it).
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 4, x1: 11, y1: 7 }],
        garrison: 8,
        others: { kind: "ASSAULT", target: { x: 6, y: 11 } },
      },
    },
    {
      // The Unquiet, woken by the eggs' old blood.
      faction: "UNDEAD",
      // Retune 3: a level 2 barrow, 8 Coins, nine of the dead.
      coins: 8,
      technologies: ["GATHERING", "ADMINISTRATION", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Drowned Barrow",
          at: { x: 13, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 13, y: 8 } },
        { role: "GUARD", at: { x: 13, y: 9 } },
        { role: "GUARD", at: { x: 14, y: 7 } },
        { role: "FIGHTER", at: { x: 14, y: 8 } },
        { role: "FIGHTER", at: { x: 13, y: 7 } },
        { role: "FIGHTER", at: { x: 15, y: 8 } },
        { role: "FIGHTER", at: { x: 15, y: 7 } },
        { role: "GUARD", at: { x: 15, y: 9 } },
        { role: "CAPTAIN", at: { x: 13, y: 10 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 7, x1: 8, y1: 12 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
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
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
  ],
  // The Unquiet rise out of the reeds six times and the Lodge sends two
  // boatloads of its faithful across to the island, every wave announced
  // (retune 3: four waves in rounds 5, 8, 11 and 14).
  reinforcements: [
    {
      seat: 2,
      round: 3,
      units: [
        { role: "GUARD", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 1, y: 10 } },
        { role: "CAPTAIN", at: { x: 3, y: 11 } },
      ],
      line: "The reeds to the west rustle: old blood wakes the dead.",
      announce: true,
    },
    {
      seat: 1,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 3 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "GUARD", at: { x: 5, y: 3 } },
        { role: "MARKSMAN", at: { x: 4, y: 4 } },
      ],
      line: "The Lodge's faithful row out to the island.",
      announce: true,
    },
    {
      seat: 2,
      round: 5,
      units: [
        { role: "GUARD", at: { x: 11, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 8 } },
        { role: "FIGHTER", at: { x: 9, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        { role: "CAPTAIN", at: { x: 10, y: 9 } },
      ],
      line: "The dead wade the eastern ford toward the herd.",
      announce: true,
    },
    {
      seat: 2,
      round: 7,
      units: [
        { role: "GUARD", at: { x: 3, y: 5 } },
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "CAPTAIN", at: { x: 2, y: 5 } },
      ],
      line: "The Unquiet rise along the northern shore.",
      announce: true,
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 3 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "GUARD", at: { x: 5, y: 3 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "MARKSMAN", at: { x: 4, y: 4 } },
      ],
      line: "The Grey Lodge pours its last faithful across the water.",
      announce: true,
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "GUARD", at: { x: 4, y: 9 } },
        { role: "GUARD", at: { x: 7, y: 12 } },
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "FIGHTER", at: { x: 8, y: 12 } },
        { role: "CAPTAIN", at: { x: 5, y: 12 } },
      ],
      line: "Barrow-dead crawl out of the southern reeds.",
      announce: true,
    },
    {
      seat: 2,
      round: 11,
      units: [
        { role: "GUARD", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 1, y: 10 } },
        { role: "CAPTAIN", at: { x: 3, y: 11 } },
      ],
      line: "Again from the west: the Unquiet do not tire.",
      announce: true,
    },
    {
      seat: 2,
      round: 13,
      units: [
        { role: "GUARD", at: { x: 11, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 8 } },
        { role: "FIGHTER", at: { x: 9, y: 11 } },
        { role: "FIGHTER", at: { x: 11, y: 8 } },
        { role: "CAPTAIN", at: { x: 10, y: 9 } },
      ],
      line: "The last of the marsh's dead, drawn by the Queen's scent.",
      announce: true,
    },
  ],
  landmarks: [{ tag: "GREYHOOD", at: { x: 9, y: 6 } }],
  // Nobody sails the marsh.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Take Greyhood by round 15 (the saga's 22; was 18). The stars: by round
  // 11, and the Old Queen lives.
  objective: {
    kind: "CAPTURE",
    places: ["GREYHOOD"],
    byRound: 15,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 11 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
