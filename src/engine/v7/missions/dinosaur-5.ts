import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_5` "Through the Barrowlands" (docs/product/SAGA.md section 3.5,
 * DN5; the Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old
 * Queen's herd, freed from the circus, across the Barrowlands to the edge
 * of the marsh where Greyhood lies: she must come within a tile of Mire's
 * Edge in the north by round 22. Step 5 of 6. The Unquiet, dead woken by
 * the smell of the eggs, hold two barrow camps and the barrow road with
 * Necromancers, Zombies, Wights and old Graves (`GUARD`), their Skeletons
 * march on you (`RUSH`), and more of them rise along the road in rounds 8
 * and 10; the Redcaps, the Grey Lodge's now, hold the
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
 * Retune 3 (`pulp_wars-hmyk.21`) started you thin against twice the dead
 * and Redcaps, seven announced waves and a 15-round clock; the user found
 * the campaign mostly impossible. Retune 4 (`pulp_wars-hmyk.27`,
 * hand-played, CAMPAIGN.md section 17.5): a level 2 Circus Ground with
 * Drill, Nesting, 8 Coins, a Shaman and two villages back; the dead hold
 * the barrow road with a Wight at each barrow, three Brutes hold the
 * trenches of the ford and the gap, two risings come in rounds 8 and 10,
 * and the clock is 22. The correction pass eased the risings (rounds 5
 * and 6 first) and the clock (14) so that a game that expands before it
 * marches can win too, not only a round-2 rush through the ford.
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
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a thin start (one town,
  // five technologies, three units, 3 Coins, no village in reach), the
  // Unquiet and the Redcaps twice as many, seven announced waves, a
  // 15-round clock.
  // Revision 4 (`pulp_wars-hmyk.27`, retune 4): a level 2 town, 8 Coins,
  // a Shaman, two villages back, the dead holding the barrow road, Brutes
  // in trenches, two risings (rounds 8 and 10), a 22-round clock.
  revision: 4,
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
      // Retune 3: the villages and the chest round the Circus Ground
      // (retune 4 gives back two of the four villages).
      { kind: "VILLAGE", at: { x: 6, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 10 }, present: false },
      { kind: "CHEST", at: { x: 11, y: 10 }, present: false },
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
    { x: 12, y: 10 },
    { x: 6, y: 13 },
  ],
  treasureChests: [{ x: 3, y: 6 }],
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
  // Retune 4: the Redcaps' trenches across the ford and the gap.
  fieldDefenses: [
    { x: 8, y: 9 },
    { x: 9, y: 9 },
    { x: 11, y: 9 },
  ],
  aiMode: "RIVAL",
  // The Unquiet and the Redcaps are one side; Quaxx's saucers are yours.
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3: thin. The Circus Ground alone (Sawdust Camp is gone),
      // five technologies, 3 Coins, the Queen, a Triceratops and a
      // Spitter. Retune 4: level 2, Drill and Nesting, 8 Coins and a Shaman.
      // Only the marsh's edge is in sight.
      coins: 8,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Circus Ground",
          at: { x: 9, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, an Alpha since the circus.
        { role: "KNIGHT", at: { x: 9, y: 12 }, tag: "OLD_QUEEN", kills: 3 },
        { role: "SWORDSMAN", at: { x: 8, y: 13 } },
        { role: "MARKSMAN", at: { x: 10, y: 12 } },
        // Retune 4: a Shaman to tend the Queen's wounds.
        { role: "CAPTAIN", at: { x: 9, y: 13 } },
      ],
      // Mire's Edge, far in the north, and nothing between.
      reveal: {
        radius: 2,
        rects: [{ x0: 8, y0: 0, x1: 10, y1: 2 }],
      },
    },
    {
      // The Unquiet: dead the eggs' smell has woken, not the Marquis's.
      faction: "UNDEAD",
      // Retune 3: level 2 barrows and 8 Coins (retune 4: 4).
      coins: 4,
      // Zombies (the bite) and Necromancers (Raise); no Ghouls (hand
      // play: a Ghoul's Carrion, +1 Attack on a bitten unit, finished the
      // Queen twice).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Barrow Hill",
          at: { x: 6, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Cold Barrow",
          at: { x: 12, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 6, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "GUARD", at: { x: 5, y: 3 } },
        // Retune 4: a Wight at each barrow (it rises again once).
        { role: "SWORDSMAN", at: { x: 7, y: 4 } },
        { role: "GUARD", at: { x: 6, y: 3 } },
        { role: "CAPTAIN", at: { x: 12, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 13, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 6 }, home: 1 },
        { role: "SWORDSMAN", at: { x: 12, y: 7 }, home: 1 },
        // Retune 3: eight more of the dead (eleven before); retune 4 keeps
        // four of them, two Zombies among them.
        { role: "FIGHTER", at: { x: 4, y: 4 } },
        { role: "GUARD", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 14, y: 7 }, home: 1 },
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
        "EXPLOSIVES",
      ],
      // Retune 4: the Zombies, Wights and Necromancers hold the barrow
      // road; the Skeletons march on your camps.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 5, y0: 2, x1: 13, y1: 8 }],
        garrison: 9,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Redcaps, unpaid since the Baron's accident, the Lodge's now.
      faction: "GOBLIN",
      // Retune 3: 6 Coins, Raiding, nine Redcaps (retune 4: 2 Coins, three
      // Brutes and two Goblins).
      coins: 2,
      technologies: ["SCOUTING", "RAIDING", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Redcap Ford",
          at: { x: 9, y: 7 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Retune 4: three Brutes in the trenches of the ford and the gap.
        { role: "GUARD", at: { x: 8, y: 9 } },
        { role: "GUARD", at: { x: 11, y: 9 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "FIGHTER", at: { x: 9, y: 8 } },
        { role: "GUARD", at: { x: 9, y: 9 } },
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
        "CHIVALRY",
        "EXPLOSIVES",
      ],
      // The Brutes hold the trenches; the rest go for your camps.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 8, y0: 9, x1: 9, y1: 9 },
          { x0: 11, y0: 9, x1: 11, y1: 9 },
        ],
        garrison: 3,
        others: { kind: "RUSH" },
      },
    },
    {
      // Captain Quaxx's saucers, who have not forgotten who ate the
      // Overmind.
      faction: "MARTIAN",
      coins: 0,
      technologies: ["SCOUTING"],
      cities: [
        {
          name: "Saucer Rest",
          at: { x: 3, y: 11 },
          level: 1,
          rewards: [],
        },
      ],
      // Retune 4: a Fighter and a Raider (retune 3: the Fighter alone).
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
  // The Unquiet rise along the road twice, round the ford in round 8 (three
  // of them) and by the marsh in round 10, each announced (retune 4's first
  // pass: rounds 5 and 6, and five round the ford; retune 3: six risings
  // and a Redcap column).
  reinforcements: [
    {
      seat: 1,
      round: 8,
      units: [
        { role: "GUARD", at: { x: 7, y: 7 } },
        { role: "FIGHTER", at: { x: 6, y: 6 } },
        { role: "FIGHTER", at: { x: 11, y: 7 } },
      ],
      line: "The ridge's old graves open, one after another.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "GUARD", at: { x: 8, y: 2 } },
        { role: "GUARD", at: { x: 10, y: 2 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "FIGHTER", at: { x: 11, y: 2 } },
        { role: "CAPTAIN", at: { x: 9, y: 2 } },
      ],
      line: "Something in the marsh sends its dead to meet the herd.",
      announce: true,
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
  // The Queen to Mire's Edge by round 22 (the saga's 22; retune 3: 15).
  // The stars: by round 16, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "OLD_QUEEN",
    to: "MIRES_EDGE",
    within: 1,
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
