import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_4` "Red Dust" (docs/product/SAGA.md section 3.6, M4; the
 * Martian campaign, `pulp_wars-hmyk.7`). The dish at Red Dust listens to
 * the mountain, and every dead thing in the Rift Lakes climbs out of the
 * ground and walks toward it. Hold Red Dust while Professor Haddock
 * decodes the call; Queen Praline of Sugarcrest, across the lake, holds
 * her own walls beside you. Step 4 of 6: attrition against an enemy that
 * grows from its own dead. Shields stop everything but Plague, so the
 * Liches die first; with Force Fields a Shield Projector raises the
 * Shields beside it to 4.
 *
 * The board is the map generator's (Lakes 16, seed 13, three seats). Red
 * Dust stands beside the Rift in the north-west, Saucer Field east of it;
 * the barrow fields and the Unquiet's two camps, Wormwood and Coffin
 * Hill, lie along the western edge; Sugarcrest and Gumdrop are across the
 * great lake, on its southern shore.
 *
 * The Unquiet learn nothing and fight with what they have, what their
 * Necromancers raise and three waves: the barrow country in rounds 5 and
 * 13, the road round the lake toward Sugarcrest in round 9; every Lich
 * they get comes with a wave or stands in Coffin Hill. A Saucer that
 * beams two Grunts beside a Lich kills it in one turn (hand play).
 *
 * Retune 4 (`pulp_wars-hmyk.28`, hand-played; CAMPAIGN.md section 18.5):
 * you start with Red Dust at level 3 with Walls and Saucer Field at level
 * 2, a Guard, two Grunts, two guns, a Catapult and a Saucer, six
 * technologies, 6 Coins, the village north of Red Dust is back, the dead
 * begin as twelve, Sugarcrest keeps three men, and two announced waves
 * come (rounds 5 and 10) against the unchanged 16-night hold (retune 3:
 * Red Dust alone with four units, fourteen dead and six waves).
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   .f$^ff.^........      $: treasure chests   v: villages
 *    1   ^W^^.^.v......v.      W: Wormwood
 *    2   f^ff....f.^..f.^
 *    3   .f.x....f..f~..f      x: the Rift
 *    4   f.^xff..S..~~.v.      S: Saucer Field
 *    5   ...xR....~~~~...      R: Red Dust
 *    6   +++.....~~~~~.ff      +: the barrow fields (old Graves)
 *    7   ++.........~~vff
 *    8   .....~~~~~..f..f
 *    9   ....~~~~~~....ff
 *   10   $.C~~~~~~~~.f.vf      C: Coffin Hill
 *   11   ..f~~~~~~~~~.f..
 *   12   .f.~~~~~~~~~~.f.
 *   13   .....ffGffDffvff      G: Sugarcrest   D: Gumdrop
 *   14   ...fff.^^ff.^f.f
 *   15   .^f.f^...ff^f^ff
 * ```
 */
export const MARTIAN_4_V7: MissionDefinitionV7 = {
  id: "MARTIAN_4",
  // Revision 2 (`pulp_wars-hmyk.21`, retune 3): a thin start (Red Dust
  // alone, four units, four technologies, 2 Coins), no village near it,
  // fourteen dead to begin with and six announced waves.
  // Revision 3 (`pulp_wars-hmyk.28`, retune 4): Saucer Field back with a
  // Saucer, seven units, a village back, twelve dead and two waves.
  revision: 3,
  seed: 20261604,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 3,
    seed: 13,
    edits: [
      // Wormwood, Saucer Field, Sugarcrest and Gumdrop stand on villages;
      // the villages in the barrow country would hand the Unquiet more
      // camps.
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 13 }, present: false },
    ],
  },
  terrain: [
    ".f.^ff.^........",
    "^.^^.^..........",
    "f^ff....f.^..f.^",
    ".f.x....f..f~..f",
    "f.^xff.....~~...",
    "...x.....~~~~...",
    "........~~~~~.ff",
    "...........~~.ff",
    ".....~~~~~..f..f",
    "....~~~~~~....ff",
    "...~~~~~~~~.f..f",
    "..f~~~~~~~~~.f..",
    ".f.~~~~~~~~~~.f.",
    ".....ff.ff.ff.ff",
    "...fff.^^ff.^f.f",
    ".^f.f^...ff^f^ff",
  ],
  resources: [
    "...o...o....err.",
    "o....o...erer..e",
    "go...eer.e....r.",
    "......er.r....eg",
    "..o...er..r.sr..",
    ".....rr....p..e.",
    "..ee...rs.......",
    ".e..r.rer.ep....",
    "e.eee.sss.re.eeg",
    "..rr....p.erre.g",
    ".............e..",
    ".r.s...p...s....",
    "e.rsp....s.ps.g.",
    "r.rr..g..g..g...",
    "rrrggge....e.geg",
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
    { x: 7, y: 1 },
    { x: 14, y: 1 },
    { x: 14, y: 4 },
    { x: 13, y: 7 },
    { x: 14, y: 10 },
    { x: 13, y: 13 },
  ],
  treasureChests: [
    { x: 2, y: 0 },
    { x: 0, y: 10 },
  ],
  // </map>
  // Red Dust's hydroponic farm.
  improvements: [{ at: { x: 3, y: 6 }, improvement: "FARM" }],
  // The barrow fields.
  graves: [
    { x: 0, y: 6 },
    { x: 1, y: 6 },
    { x: 2, y: 6 },
    { x: 0, y: 7 },
    { x: 1, y: 7 },
  ],
  aiMode: "RIVAL",
  teams: [0, 1, 0],
  seats: [
    {
      faction: "MARTIAN",
      // Retune 4: Red Dust and Saucer Field, six technologies, 6 Coins,
      // seven units (the Catapult is one you cannot raise again: no
      // Sawmilling), the barrow country half seen (retune 3: Red Dust
      // alone, four technologies, 2 Coins, four units).
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Red Dust",
          at: { x: 4, y: 5 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Saucer Field",
          at: { x: 8, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "MARKSMAN", at: { x: 5, y: 6 } },
        { role: "MARKSMAN", at: { x: 6, y: 5 } },
        { role: "CATAPULT", at: { x: 5, y: 4 } },
        { role: "RAIDER", at: { x: 8, y: 4 }, home: 1 },
      ],
      // The dish sees the barrow country west of it, and Sugarcrest's walls
      // across the lake, but not the lake.
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 0, x1: 8, y1: 9 },
          { x0: 6, y0: 12, x1: 8, y1: 14 },
        ],
      },
    },
    {
      // The Unquiet: the Rift Lakes' dead, walking toward the dish.
      faction: "UNDEAD",
      // Retune 3: fourteen of the dead instead of eight (retune 4: twelve,
      // 5 Coins, were 10).
      coins: 5,
      technologies: ["DRILL", "FORTIFICATION", "EXPLOSIVES"],
      cities: [
        {
          name: "Coffin Hill",
          at: { x: 2, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Wormwood", at: { x: 1, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 10 } },
        { role: "CAPTAIN", at: { x: 1, y: 9 } },
        { role: "CATAPULT", at: { x: 1, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 0, y: 8 } },
        { role: "GUARD", at: { x: 1, y: 1 }, home: 1 },
        { role: "FIGHTER", at: { x: 0, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 2, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 0, y: 9 } },
        { role: "FIGHTER", at: { x: 2, y: 9 } },
        { role: "GUARD", at: { x: 1, y: 11 } },
        { role: "GUARD", at: { x: 0, y: 2 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 9, y1: 15 }] },
      // Every dead thing walks toward the nearest living town (hand play:
      // with ASSAULT on Red Dust the dead dug in round their camps).
      directive: { kind: "RUSH" },
      // Hand play: with Liches to train and an economy to grow (Gathering,
      // Hunting, Forestry) the camps reached levels 3 and 4 in two rounds
      // and three Liches plagued the dish's garrison to death by round 7.
      // The Unquiet now learn nothing: their Liches come with the waves.
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
      // Queen Praline's Candy, who remember who saved them last autumn.
      faction: "CANDY",
      coins: 0,
      technologies: [
        "GATHERING",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
        "MARKSMANSHIP",
      ],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 7, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
          landGrant: true,
        },
        { name: "Gumdrop", at: { x: 10, y: 13 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 7, y: 13 } },
        { role: "FIGHTER", at: { x: 6, y: 13 } },
        { role: "GUARD", at: { x: 10, y: 13 }, home: 1 },
      ],
      reveal: { radius: 3, rects: [{ x0: 0, y0: 8, x1: 12, y1: 15 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
      ],
      // The ally keeps to the land of its two towns.
      directive: {
        kind: "HOLD",
        zone: [{ x0: 6, y0: 12, x1: 11, y1: 14 }],
      },
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [
    { tag: "RED_DUST", at: { x: 4, y: 5 } },
    { tag: "SUGARCREST", at: { x: 7, y: 13 } },
  ],
  // The nights the dead walk (retune 4: two announced waves out of the
  // barrow country, a Lich's in round 5 and a Lich and a Vampire in
  // round 10; retune 3 had six, in rounds 3 to 13).
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 0, y: 5 } },
        { role: "FIGHTER", at: { x: 0, y: 4 } },
        { role: "CATAPULT", at: { x: 0, y: 6 } },
      ],
      line: "The dish hums and the dead climb out, Liches among them.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "KNIGHT", at: { x: 0, y: 5 } },
        { role: "CATAPULT", at: { x: 0, y: 6 } },
        { role: "FIGHTER", at: { x: 0, y: 4 } },
        { role: "FIGHTER", at: { x: 0, y: 3 } },
      ],
      line: "A Lich and a Vampire lead the night's dead.",
      announce: true,
    },
  ],
  // Hold Red Dust for 16 nights. The stars: no city lost, and Sugarcrest
  // stands.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "RED_DUST" }],
    bonus: [
      { kind: "KEEP_CITIES" },
      { kind: "HOLD_PLACE", place: "SUGARCREST" },
    ],
  },
};
