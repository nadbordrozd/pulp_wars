import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_1` "Sweet Tooth" (docs/product/SAGA.md section 3.8, C1; the Candy
 * campaign, `pulp_wars-hmyk.11`). You lead Queen Praline's Sugarcrest
 * against the Sweet-tooth Boys, a goblin gang that has found out the walls
 * of Gumdrop are made of nougat. Step 1 of 6: the Candy from scratch. A
 * sweet that Sugar Rushes before it moves goes one tile farther and hits
 * harder on its first attack, then Crashes for a turn (no attack, but it
 * still strikes back); a fallen sweet leaves Crumbs, and a Confectioner
 * bakes it back from them at half price.
 *
 * The board is the map generator's (Lakes 11, seed 1): a lake in the
 * middle, Sugarcrest and Gumdrop on its southern shore, the gang's camp
 * under Gumdrop's walls in the south-east and its raiders' camp, Spoon
 * Hill, three tiles above it on the road from Sourmash. The gang storms
 * Gumdrop (`ASSAULT`; under `RUSH` it stood off the walls) and gets three
 * more goblins down the road in round 5; Land Grants give the kingdom a
 * slot to train in each city. Hand play (CAMPAIGN.md, the Candy campaign's
 * section): with the second camp across the lake and three free villages
 * the hunt ran past round 14; a lone Trooper beside two goblins dies to
 * Gang Up in one enemy phase.
 *
 * ```text
 *      x 0123456789A
 * y  0   f.......$.f      $: treasure chests
 *    1   ......f^^.^
 *    2   ......~~~^.
 *    3   .....~~~.^f
 *    4   .....f~~f.^
 *    5   ...f~.ffH^.      H: Spoon Hill
 *    6   ..~~~.~ffff
 *    7   f.~~~~~~ff.
 *    8   ^.~~~~~~M.f      M: Muncher's Camp
 *    9   .fSffG..fff      S: Sugarcrest; G: Gumdrop
 *   10   f...$ffff..
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 21.4, not
 * play-tested): a skirmish start. Sugarcrest alone (Gumdrop is gone) with
 * Queen Praline, a Fighter, no technology and 3 Coins, the board unseen.
 * The gang has two camps, eleven goblins and 4 Coins, holds its
 * camps for three rounds and then sends all but three at Sugarcrest, with
 * announced waves in rounds 4 and 7. The clock is 14 (it had none).
 *
 * The fourth retune (`pulp_wars-hmyk.32`, CAMPAIGN.md section 21.5,
 * hand-played): Sugarcrest at level 2 and Gumdrop back, Praline, two
 * Fighters and a Confectioner, Gathering and Hunting, 5 Coins. The gang
 * has ten goblins and 3 Coins; three hold the camps and the rest go for
 * Gumdrop from round 1. No waves. The clock is 20 (the stars: 14).
 */
export const CANDY_1_V7: MissionDefinitionV7 = {
  id: "CANDY_1",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a skirmish start.
  // Revision 3 (`pulp_wars-hmyk.32`, the fourth retune): Gumdrop back,
  // the gang smaller and its waves gone, a lax clock.
  revision: 3,
  seed: 20261801,
  // <map>
  size: 11,
  source: {
    mapType: "LAKES",
    size: 11,
    seats: 2,
    seed: 1,
    // Sugarcrest and Gumdrop stand on villages; the other three would hand
    // the gang more towns to hide in (hand play: it took the one on the
    // north shore and the hunt ran past round 15).
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 5 }, present: false },
    ],
  },
  terrain: [
    "f.......f.f",
    "......f^^.^",
    "......~~~^.",
    ".....~~~.^f",
    ".....f~~f.^",
    "...f~.ff.^.",
    "..~~~.~ffff",
    "f.~~~~~~ff.",
    "^.~~~~~~.f.",
    ".f.ff...fff",
    "f....ffff..",
  ],
  resources: [
    "....e.r..e.",
    "r..r.e.oo.o",
    "e.e.e....or",
    "eer..sp..o.",
    ".rre...pg.o",
    ".r.......o.",
    "re.p.esggg.",
    "..s....sgg.",
    "..sss.s....",
    "e.....ee..g",
    "..e...gggr.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPHHHH",
    "PPPPPPHHHHH",
    "PPPPPPPPPHH",
    "PPPPPPPPHHH",
    "PPPPPWPPHHH",
    "PPPPPWWWWHH",
    "PPPPPWPWWWH",
    "WWPPPPPPWWW",
    "WWPPPPPPWWW",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
  ],
  villages: [],
  treasureChests: [
    { x: 8, y: 0 },
    { x: 4, y: 10 },
  ],
  // </map>
  // Sugarcrest's sugar-beet Farm.
  improvements: [{ at: { x: 2, y: 10 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CANDY",
      // Retune 4: Sugarcrest and Gumdrop, Queen Praline (a Gingerbread
      // Giant nobody can train yet), a Confectioner and two Fighters,
      // Gathering and Hunting.
      coins: 5,
      technologies: ["GATHERING", "HUNTING"],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 2, y: 9 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Gumdrop", at: { x: 5, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        // Queen Praline, a Gingerbread Giant armed to the teeth.
        { role: "JUGGERNAUT", at: { x: 3, y: 9 }, tag: "PRALINE" },
        { role: "FIGHTER", at: { x: 2, y: 9 } },
        { role: "CAPTAIN", at: { x: 1, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 9 }, home: 1 },
      ],
      reveal: { radius: 2 },
    },
    {
      // The Sweet-tooth Boys, out of Sourmash with spoons.
      faction: "GOBLIN",
      coins: 3,
      technologies: [],
      cities: [
        {
          name: "Muncher's Camp",
          at: { x: 8, y: 8 },
          level: 1,
          rewards: [],
        },
        { name: "Spoon Hill", at: { x: 8, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "FIGHTER", at: { x: 9, y: 8 } },
        { role: "GUARD", at: { x: 8, y: 7 } },
        { role: "FIGHTER", at: { x: 8, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 4 }, home: 1 },
        { role: "RAIDER", at: { x: 10, y: 5 }, home: 1 },
        // Retune 3's four more goblins, three of them kept by retune 4.
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "GUARD", at: { x: 10, y: 8 } },
        { role: "RAIDER", at: { x: 9, y: 6 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 7, x1: 7, y1: 10 }] },
      // Step 1 keeps to the lesson: the gang learns nothing.
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
      // Retune 4: three hold the camps and the rest storm Gumdrop from the
      // first round (hand play: under RUSH the gang stood off at the edge
      // of the walls).
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 7, y0: 7, x1: 10, y1: 9 },
          { x0: 7, y0: 4, x1: 10, y1: 6 },
        ],
        garrison: 3,
        others: { kind: "ASSAULT", target: { x: 5, y: 9 } },
      },
    },
  ],
  landmarks: [],
  // Nobody sails the lake yet.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Drive the gang out by round 20. The stars: by round 14, and Praline
  // lives.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 14 },
      { kind: "UNIT_ALIVE", unit: "PRALINE" },
    ],
  },
};
