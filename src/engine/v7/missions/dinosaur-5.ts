import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_5` "Through the Barrowlands" (docs/product/SAGA.md section 3.5,
 * DN5; the Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old
 * Queen's herd, freed from the circus, across the Barrowlands to the edge
 * of the marsh where Greyhood lies: she must come within a tile of Mire's
 * Edge in the north by round 18. Step 5 of 6. The Unquiet, dead woken by
 * the smell of the eggs, hold two barrow camps with Necromancers and old
 * Graves and march on you (`RUSH`), and more of them rise along the road
 * in rounds 4, 7, 10 and 13; the Redcaps, the Grey Lodge's now, hold the
 * gaps in the ridge with Orc Brutes (`GUARD`, the rest `RUSH`); Captain
 * Quaxx's small Martian camp in the south-west fights on your side. The
 * dead bite, and a bitten unit that dies rises as a Zombie for them: keep
 * the wounded back, and never let the Queen walk alone.
 *
 * The board is the map generator's (Dry Land 16, seed 16): the circus
 * ground in the south, a ridge of peaks across the middle of the board
 * with gaps (the Redcaps' ford in the middle, a gap in the woods east of
 * it, and the long way round by the western moors), the barrow fields
 * north of the ridge, and the marsh's edge in the north. The saga's "river
 * ford" is a ford in a dry land: the gap in the ridge the Redcaps hold.
 * Eight villages are gone (under the camps, and those of the north that
 * would feed the dead).
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * numbers: with twelve Graves and Ghouls (Carrion: +1 Attack on a bitten
 * unit) the Queen died twice deep in the barrow fields, alone.
 *
 * ```text
 *      x 0123456789012345
 * y  0   f.f^^f^..^f.....
 *    1   ff..f....M......      M: Mire's Edge (a village)
 *    2   ff...f......f.^^
 *    3   fff....+...^f..^      +: old Graves
 *    4   ...ff^B.f.^^^f.^      B: Barrow Hill (the Unquiet)
 *    5   ..ffff.+.^^^K+^f      K: Cold Barrow (the Unquiet)
 *    6   .xf$f^+.^^^^.+^^      x: the Rift; $: treasure chests
 *    7   fxf.f..+fR^^+.f.      R: Redcap Ford
 *    8   fx..f^^f^ff.+f^.
 *    9   ...^^^^^.f^f^^^^      the ridge
 *   10   f.f.^fv.^v.$v^^f      v: villages
 *   11   ff.Q...^^......^      Q: Saucer Rest (Quaxx, your ally)
 *   12   ff.....^^.....^.
 *   13   f.....vf.C^^S^^f      C: the Circus Ground; S: Sawdust Camp
 *   14   ........^ff^^f^^
 *   15   f.......^^f.^^.^
 * ```
 */
export const DINOSAUR_5_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_5",
  revision: 1,
  seed: 20261405,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 4,
    seed: 16,
    // The camps stand on villages; the villages north of the ridge would
    // feed the dead and the Redcaps.
    edits: [
      { kind: "VILLAGE", at: { x: 9, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 7 }, present: false },
    ],
  },
  terrain: [
    "f.f^^f^..^f.....",
    "ff..f...........",
    "ff...f......f.^^",
    "fff........^f..^",
    "...ff^..f.^^^f.^",
    "..ffff...^^^..^f",
    ".xfff^..^^^^..^^",
    "fxf.f...f.^^..f.",
    "fx..f^^f^ff..f^.",
    "...^^^^^.f^f^^^^",
    "f.f.^f..^....^^f",
    "ff.....^^......^",
    "ff.....^^.....^.",
    "f......f..^^.^^f",
    "........^ff^^f^^",
    "f.......^^f.^^.^",
  ],
  resources: [
    "g.g..g.eeog...rr",
    ".g..gr.......re.",
    "gge.r.rr.r...e..",
    "..g..rr.e..ogrro",
    "ee..g..r..o.....",
    "e..g....e.oo.r.g",
    "e.g.go..o.oor.o.",
    "g.g.g...g.oo....",
    "g..egoo.o.....or",
    ".e..o..oe..goo..",
    ".r.ro...o....oo.",
    ".......oo.e.er.o",
    "..er......e.rro.",
    ".e...r....oo.oo.",
    ".r.err..o...o.o.",
    "ge.rrr...og.oo.o",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWPPPPPPPPPPPPP",
    "WWWWPPPPPPPPPPPP",
    "WWWWWPPPPPPPPPPP",
    "WWWWWWPPPPPHHHHH",
    "WWWWWWPPPPHHHHHH",
    "WWWWWWPPPHHHHHHH",
    "WWWWWHHHHHHHHHHH",
    "WWWWHHHHHHHHHHHH",
    "WWWHHHHHHHHHHHHH",
    "WWWHHHHHHHHHHHHH",
    "PPPPHHHHHHHHHHHH",
    "PPPPPHHHHHHHHHHH",
    "PPPPPPHHHHHHHHHH",
    "PPPPPPPHHHHHHHHH",
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPPHHHHHHH",
  ],
  villages: [
    { x: 9, y: 1 },
    { x: 6, y: 10 },
    { x: 9, y: 10 },
    { x: 12, y: 10 },
    { x: 6, y: 13 },
  ],
  treasureChests: [
    { x: 3, y: 6 },
    { x: 11, y: 10 },
  ],
  // </map>
  // The old Graves of the barrow fields and along the road.
  graves: [
    { x: 7, y: 3 },
    { x: 7, y: 5 },
    { x: 6, y: 6 },
    { x: 7, y: 7 },
    { x: 13, y: 5 },
    { x: 13, y: 6 },
    { x: 12, y: 7 },
    { x: 12, y: 8 },
  ],
  aiMode: "RIVAL",
  // The Unquiet and the Redcaps are one side; Quaxx's saucers are yours.
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "DINOSAUR",
      coins: 10,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "Circus Ground",
          at: { x: 9, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Sawdust Camp",
          at: { x: 12, y: 13 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // The Old Queen, an Alpha since the circus.
        { role: "KNIGHT", at: { x: 9, y: 12 }, tag: "OLD_QUEEN", kills: 3 },
        { role: "SWORDSMAN", at: { x: 8, y: 13 } },
        { role: "CAPTAIN", at: { x: 9, y: 13 } },
        { role: "RAIDER", at: { x: 11, y: 12 }, home: 1 },
        { role: "MARKSMAN", at: { x: 12, y: 12 }, home: 1 },
      ],
      // The road north: the ridge, the barrow fields and the marsh's edge.
      reveal: {
        radius: 2,
        rects: [
          { x0: 5, y0: 0, x1: 13, y1: 10 },
          { x0: 1, y0: 9, x1: 4, y1: 12 },
        ],
      },
    },
    {
      // The Unquiet: dead the eggs' smell has woken, not the Marquis's.
      faction: "UNDEAD",
      coins: 2,
      // Zombies (the bite) and Necromancers (Raise); no Ghouls (hand
      // play: a Ghoul's Carrion, +1 Attack on a bitten unit, finished the
      // Queen twice).
      technologies: ["GATHERING", "ADMINISTRATION", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Barrow Hill",
          at: { x: 6, y: 4 },
          level: 1,
          rewards: [],
        },
        {
          name: "Cold Barrow",
          at: { x: 12, y: 5 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 6, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "CAPTAIN", at: { x: 12, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 13, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 7 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 11, x1: 13, y1: 14 }] },
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
    {
      // The Redcaps, unpaid since the Baron's accident, the Lodge's now.
      faction: "GOBLIN",
      coins: 2,
      technologies: ["SCOUTING", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Redcap Ford",
          at: { x: 9, y: 7 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 8, y: 9 } },
        { role: "GUARD", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "FIGHTER", at: { x: 9, y: 8 } },
        { role: "RAIDER", at: { x: 10, y: 8 } },
        { role: "RAIDER", at: { x: 8, y: 7 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 11, x1: 13, y1: 14 }] },
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
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The Brutes hold the gaps; the rest go for your camps.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 8, y0: 8, x1: 11, y1: 9 }],
        garrison: 2,
        others: { kind: "RUSH" },
      },
    },
    {
      // Captain Quaxx's saucers, who have not forgotten who ate the
      // Overmind.
      faction: "MARTIAN",
      coins: 3,
      technologies: ["SCOUTING"],
      cities: [
        {
          name: "Saucer Rest",
          at: { x: 3, y: 11 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "RAIDER", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 5, y0: 0, x1: 13, y1: 10 }] },
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
    },
  ],
  // The Unquiet rise all along the road: south of the ridge in round 4,
  // round the ford in round 7, on the barrow fields in round 10, by the
  // marsh in round 13.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [
        { role: "GUARD", at: { x: 5, y: 11 } },
        { role: "FIGHTER", at: { x: 4, y: 13 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "FIGHTER", at: { x: 5, y: 14 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "GUARD", at: { x: 7, y: 7 } },
        { role: "FIGHTER", at: { x: 6, y: 6 } },
        { role: "FIGHTER", at: { x: 11, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 8 } },
      ],
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "GUARD", at: { x: 7, y: 5 } },
        { role: "GUARD", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 7, y: 3 } },
        { role: "FIGHTER", at: { x: 10, y: 4 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      units: [
        { role: "GUARD", at: { x: 8, y: 2 } },
        { role: "GUARD", at: { x: 10, y: 2 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "FIGHTER", at: { x: 11, y: 2 } },
      ],
    },
  ],
  landmarks: [{ tag: "MIRES_EDGE", at: { x: 9, y: 1 }, name: "Mire's Edge" }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Queen to Mire's Edge by round 18 (the saga's 22; hand play won in
  // round 7). The stars: by round 14, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "OLD_QUEEN",
    to: "MIRES_EDGE",
    within: 1,
    byRound: 18,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
