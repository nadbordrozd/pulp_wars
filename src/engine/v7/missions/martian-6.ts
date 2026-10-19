import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_6` "Starfall over Red Dust" (docs/product/SAGA.md section 3.6,
 * M6; the Martian campaign, `pulp_wars-hmyk.7`). The Grey Lodge knows
 * what the Martians know, and three of its Stargazers pull stars down on
 * Red Dust from the hills around it while the Unquiet walk in from the
 * barrows; the Pact's Rangers march up from Millford to help. Kill the
 * three Stargazers. Step 6 of 6, the finale: three targets on three hills,
 * each behind chanters who make its star hit harder. A chanter that is hurt
 * or moved stops chanting; Saucers and Beam Down reach the hills before the
 * stars fall.
 *
 * The board is the map generator's (Lakes 16, seed 13, four seats): the
 * Rift Lakes again. Red Dust stands in the middle of the northern shore;
 * the Lodge's three hill camps ring it to the west, north and north-east;
 * Saucer Field and Candlewick are east of it; the Unquiet come from the
 * barrow country round the lake's western end; Millford is on the southern
 * shore.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   .f.^ff.^.3......      1 2 3: the Stargazers
 *    1   ^^^^2^...O......      O: Owl Hill
 *    2   f^^T....f.^f...^      T: Cairn Top
 *    3   .f.f....f..f~..f
 *    4   f.^^ffv..v.~~...      v: villages
 *    5   .$xxx...$~~~~...      x: the Rift   $: treasure chests
 *    6   ......f.~~~~~Sff      S: Saucer Field
 *    7   1H.vf.R....~~fff      H: Hob's Knoll   R: Red Dust
 *    8   .....~~~~~..f^ff
 *    9   ....~~~~~~....Wf      W: Candlewick
 *   10   ..C~~~~~~~~.f.ff      C: Coffin Hill
 *   11   ..f~~~~~~~~~.f..
 *   12   ...~~~~~~~~~~.f.
 *   13   ...vffv.fMffvfff      M: Millford
 *   14   ...ffff^.ff.^fff
 *   15   .^f.f^...ff^f^ff
 * ```
 */
export const MARTIAN_6_V7: MissionDefinitionV7 = {
  id: "MARTIAN_6",
  revision: 1,
  seed: 20261606,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 4,
    seed: 13,
    edits: [
      // The towns and Owl Hill stand on villages.
      { kind: "VILLAGE", at: { x: 6, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 1 }, present: false },
      // The village between the northern hills would hand the Lodge a town.
      { kind: "VILLAGE", at: { x: 6, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 13 }, present: false },
      // Hob's Knoll stands on Fertile Ground.
      { kind: "RESOURCE", at: { x: 1, y: 7 }, resource: "." },
    ],
  },
  terrain: [
    ".f.^ff.^........",
    "^^^^.^..........",
    "f^^.....f.^f...^",
    ".f.f....f..f~..f",
    "f.^^ff.....~~...",
    "..xxx....~~~~...",
    "......f.~~~~~.ff",
    "....f......~~fff",
    ".....~~~~~..f^ff",
    "....~~~~~~.....f",
    "...~~~~~~~~.f.ff",
    "..f~~~~~~~~~.f..",
    "...~~~~~~~~~~.f.",
    "....ff..f.ff.fff",
    "...ffff^.ff.^fff",
    ".^f.f^...ff^f^ff",
  ],
  resources: [
    "...o...o....err.",
    "ooo.ro..e..er.re",
    "goo..eer.e.g.rr.",
    "....r.er.r....eg",
    "..o....r..rs.r..",
    ".....rr..pspsee.",
    "..ee...rp...s...",
    ".......er.e.p...",
    "e.eeesp...re...g",
    "..rr...p..erre.g",
    ".......ppps..e..",
    ".r.s.p..........",
    "eer....p.pps..g.",
    "r.r....e.....g..",
    "rrrgggg.e..e.g.g",
    "r.gego....gog...",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPWWW",
    "PPPPWWWWWWWWWWWW",
    "PPPWWWWWWWWWWWWW",
    "PPWWWWWWWWWWWWWW",
  ],
  villages: [
    { x: 6, y: 4 },
    { x: 9, y: 4 },
    { x: 3, y: 7 },
    { x: 3, y: 13 },
    { x: 6, y: 13 },
    { x: 12, y: 13 },
  ],
  treasureChests: [
    { x: 1, y: 5 },
    { x: 8, y: 5 },
  ],
  // </map>
  // Red Dust's hydroponic farm.
  improvements: [{ at: { x: 7, y: 7 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "MARTIAN",
      coins: 10,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      // No Raiding: a Saucer's Charge one-shot a Stargazer (hand play).
      forbiddenTechnologies: ["RAIDING", "CHIVALRY"],
      cities: [
        {
          name: "Red Dust",
          at: { x: 6, y: 7 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Saucer Field",
          at: { x: 13, y: 6 },
          level: 1,
          rewards: [],
        },
        { name: "Candlewick", at: { x: 14, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        // Captain Quaxx.
        { role: "CAPTAIN", at: { x: 6, y: 7 }, tag: "QUAXX" },
        { role: "GUARD", at: { x: 7, y: 7 } },
        // Every unit starts out of the Stargazers' reach (a star falls 2 to 4
        // tiles from its Stargazer).
        { role: "FIGHTER", at: { x: 7, y: 6 } },
        { role: "FIGHTER", at: { x: 6, y: 6 } },
        { role: "MARKSMAN", at: { x: 14, y: 6 }, home: 1 },
        { role: "MARKSMAN", at: { x: 12, y: 9 }, home: 2 },
        { role: "CATAPULT", at: { x: 8, y: 7 } },
        { role: "KNIGHT", at: { x: 14, y: 5 }, home: 1 },
        { role: "RAIDER", at: { x: 13, y: 7 }, home: 1 },
        { role: "RAIDER", at: { x: 14, y: 8 }, home: 2 },
      ],
      // The dish sees the hills, the barrows and the southern shore.
      reveal: {
        radius: 2,
        rects: [{ x0: 0, y0: 0, x1: 15, y1: 14 }],
      },
    },
    {
      // The Grey Lodge: three hill camps, each with a Stargazer.
      faction: "CULT",
      coins: 2,
      favour: 6,
      // The Lodge learns nothing (hand play: hunting grew Owl Hill and its
      // reward unit took the centre, pushing the Idol Bearer off the
      // Stargazer).
      technologies: [],
      cities: [
        { name: "Hob's Knoll", at: { x: 1, y: 7 }, level: 1, rewards: [] },
        { name: "Cairn Top", at: { x: 3, y: 2 }, level: 1, rewards: [] },
        { name: "Owl Hill", at: { x: 9, y: 1 }, level: 1, rewards: [] },
      ],
      // Each Stargazer stands in a full circle: its Idol Bearer (ranged
      // attacks on it are halved; a unit beside the idol may attack only
      // the idol), a Hexer to frog Saucers and Brains, and Initiates on
      // every other tile a walker could reach (hand play: with open tiles
      // beside them, beamed Grunts and a charging Saucer killed all three
      // Stargazers by round 8, three times).
      units: [
        { role: "CATAPULT", at: { x: 0, y: 7 }, tag: "STARGAZER_1" },
        { role: "GUARD", at: { x: 0, y: 6 } },
        { role: "MARKSMAN", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 0, y: 8 } },
        { role: "FIGHTER", at: { x: 1, y: 8 } },
        { role: "CATAPULT", at: { x: 4, y: 1 }, home: 1, tag: "STARGAZER_2" },
        { role: "GUARD", at: { x: 4, y: 0 }, home: 1 },
        { role: "MARKSMAN", at: { x: 4, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 5, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 3, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 5, y: 0 }, home: 1 },
        { role: "CATAPULT", at: { x: 9, y: 0 }, home: 2, tag: "STARGAZER_3" },
        { role: "GUARD", at: { x: 10, y: 0 }, home: 2 },
        { role: "MARKSMAN", at: { x: 8, y: 1 }, home: 2 },
        { role: "FIGHTER", at: { x: 10, y: 1 }, home: 2 },
        { role: "FIGHTER", at: { x: 8, y: 0 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 1 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 15, y1: 10 }] },
      // Each Stargazer and its Idol Bearer hold their two tiles, off the
      // camp's centre (hand play: a Bearer on the centre was pushed off it
      // by the camp's level-up reward, and one leashed to a wide zone
      // wandered off, leaving its Stargazer open); the rest of each circle
      // plays its ordinary game and goes for whatever comes near.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 0, y0: 6, x1: 0, y1: 7 },
          { x0: 4, y0: 0, x1: 4, y1: 1 },
          { x0: 9, y0: 0, x1: 10, y1: 0 },
        ],
        garrison: 6,
      },
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
        "DRILL",
        "FORTIFICATION",
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
    },
    {
      // The Unquiet, walking in from the barrows.
      faction: "UNDEAD",
      coins: 0,
      technologies: ["DRILL", "FORTIFICATION", "EXPLOSIVES"],
      cities: [
        { name: "Coffin Hill", at: { x: 2, y: 10 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 10 } },
        { role: "FIGHTER", at: { x: 1, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 4, x1: 9, y1: 12 }] },
      directive: { kind: "RUSH" },
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
        "ENGINEERING",
        "METALLURGY",
      ],
    },
    {
      // The Pact's Rangers at Millford.
      faction: "ORIGINAL",
      coins: 0,
      technologies: ["DRILL", "FORTIFICATION", "HUNTING", "MARKSMANSHIP"],
      cities: [
        {
          name: "Millford",
          at: { x: 9, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
          landGrant: true,
        },
      ],
      units: [
        { role: "GUARD", at: { x: 9, y: 13 } },
        { role: "KNIGHT", at: { x: 8, y: 13 } },
        { role: "FIGHTER", at: { x: 10, y: 13 } },
        { role: "FIGHTER", at: { x: 9, y: 14 } },
        { role: "MARKSMAN", at: { x: 8, y: 14 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 4, x1: 15, y1: 14 }] },
      // The Rangers keep Millford until round 8, then march.
      directive: [
        { kind: "NORMAL", untilRound: 8 },
        { kind: "RUSH", fromRound: 8 },
      ],
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
      ],
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Unquiet rise three times from the barrows on the shore west of
  // Red Dust (hand play: from the western edge they dug in round Coffin
  // Hill and never came).
  reinforcements: [
    {
      seat: 2,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "GUARD", at: { x: 2, y: 8 } },
      ],
    },
    {
      seat: 2,
      round: 7,
      units: [
        { role: "CATAPULT", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "GUARD", at: { x: 2, y: 8 } },
      ],
    },
    {
      seat: 2,
      round: 10,
      units: [
        { role: "KNIGHT", at: { x: 4, y: 8 } },
        { role: "CATAPULT", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
    },
  ],
  // Kill the three Stargazers by round 16 (the saga's 22). The stars: by
  // round 12, and no city lost.
  objective: {
    kind: "KILL",
    units: ["STARGAZER_1", "STARGAZER_2", "STARGAZER_3"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
