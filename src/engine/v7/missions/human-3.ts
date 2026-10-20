import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_3` "Outlaws of the Greenwood" (docs/product/SAGA.md section 3.1,
 * H3; `pulp_wars-hmyk.4`). You lead the Humans, outlawed by the Baron's
 * writ, and must walk Mr. Pettigrew (a tagged Captain, frail) and the
 * Baron's ledgers from the outlaw camp in the south-west to Kingsbridge in
 * the north-east by round 20. Step 3 of 6.
 *
 * The board is the map generator's (Pangea 16, seed 21): a forest from the
 * outlaw camp to the middle of the island, where Kessler's runaway circus
 * beasts hold their wood around a wrecked circus camp (`HOLD`), and open
 * country around it on either side, each way past a Redcap camp whose
 * goblins march on you from the first round (`RUSH`). The beasts and the
 * Redcaps are rival seats: each bites the other as readily as you. The
 * problem: a frail unit through ambush country. The short road runs
 * through the beasts' wood; the long roads run past the Redcaps. The
 * clever route lets the Redcaps chase you into the wood and meet the
 * beasts there.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~^..^..f.~~~~
 *    2   ~~~^.^..^.^f.K~~      K: Kingsbridge (a village)
 *    3   ~~f^..fv^^v...f~      v: villages
 *    4   ~v..ff^f.f...ff~
 *    5   ~f...ffff...f.f~
 *    6   ~f..R.fBf^..f.f~      R: Cutthroat Camp; B: the Circus Wreck
 *    7   ~vf.f.ff.fff..f~      (the beasts' wood: x 6 to 10, y 4 to 8)
 *    8   ~^.......ffff..~
 *    9   ~.$f....f.f$...~      $: treasure chests
 *   10   ~ffff.fff......~
 *   11   ~.ffOfffff....f~      O: the Outlaw Camp
 *   12   ~~.ffffvff.R..f~      R: Rookery Camp
 *   13   ~~~.ff.ff....^~~
 *   14   ~~~~vffff.f.~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const HUMAN_3_V7: MissionDefinitionV7 = {
  id: "HUMAN_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261203,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 21,
    edits: [
      { kind: "VILLAGE", at: { x: 4, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 6 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~^..^..f.~~~~",
    "~~~^.^..^.^f..~~",
    "~~f^..f.^^....f~",
    "~...ff^f.f...ff~",
    "~f...ffff...f.f~",
    "~f....f.f^..f.f~",
    "~.f.f.ff.fff..f~",
    "~^.......ffff..~",
    "~.ff....f.ff...~",
    "~ffff.fff......~",
    "~.ff.fffff....f~",
    "~~.ffff.ff....f~",
    "~~~.ff.ff....^~~",
    "~~~~.ffff.f.~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "......p...s.p.p.",
    "....o.....g.s...",
    "..s.ro..oeog..s.",
    "p..o.rg.oo..er..",
    "..re..o..g.ee...",
    "p...eggg.re....s",
    ".....r...o..grg.",
    ".....e.geg.ger.p",
    "sor...er.g.g...s",
    "...ge.e...g....s",
    "...g.r....rrrr.s",
    "..gg..g.ggr.e..s",
    "p.......ggr.er..",
    "p..e..e.gerer..p",
    "..ps..g.g..e.s..",
    "..p.....p...p...",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPHHHHHHHHPPPP",
    "PPPHHHHHHHHPPPPP",
    "PPHHHHHHHHPPPPPP",
    "PWWWWWWHHHPPPPPP",
    "PWWWWWWWWWPPPPPP",
    "PWWWWWWWWWWPPPPP",
    "PWWWWWWWWWWWPPPP",
    "PWWWWWWWWWWWWPPP",
    "PWWWWWWWWWWWPPPP",
    "PWWWWWWWWWWPPPPP",
    "PWWWWWWWWWPPPPPP",
    "PPWWWWWWWPPPPPPP",
    "PPPWWWWWWPPPPPPP",
    "PPPPWWWWWPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 13, y: 2 },
    { x: 7, y: 3 },
    { x: 10, y: 3 },
    { x: 1, y: 4 },
    { x: 1, y: 7 },
    { x: 7, y: 12 },
    { x: 4, y: 14 },
  ],
  treasureChests: [
    { x: 2, y: 9 },
    { x: 11, y: 9 },
  ],
  // </map>
  // The outlaws' Lumber Camps in the Greenwood.
  improvements: [
    { at: { x: 4, y: 10 }, improvement: "LUMBER_CAMP" },
    { at: { x: 5, y: 11 }, improvement: "LUMBER_CAMP" },
    { at: { x: 4, y: 12 }, improvement: "LUMBER_CAMP" },
    { at: { x: 5, y: 12 }, improvement: "LUMBER_CAMP" },
    // The circus wreck's.
    { at: { x: 8, y: 5 }, improvement: "LUMBER_CAMP" },
    { at: { x: 6, y: 6 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      // Land Grants: one more slot in the camp, for the escort.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Outlaw Camp",
          at: { x: 4, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // Mr. Silas Pettigrew, the Marshal's clerk, with the ledgers.
        { role: "CAPTAIN", at: { x: 4, y: 11 }, tag: "PETTIGREW" },
        { role: "FIGHTER", at: { x: 5, y: 10 } },
        { role: "FIGHTER", at: { x: 3, y: 10 } },
        { role: "MARKSMAN", at: { x: 4, y: 10 } },
        { role: "RAIDER", at: { x: 5, y: 11 } },
      ],
      // The Greenwood, the southern road, and Kingsbridge where the
      // Assizes sit.
      reveal: {
        radius: 2,
        rects: [
          { x0: 2, y0: 5, x1: 9, y1: 9 },
          { x0: 6, y0: 10, x1: 12, y1: 13 },
          { x0: 11, y0: 1, x1: 14, y1: 4 },
        ],
      },
    },
    {
      // The Redcaps, combing the Greenwood for the clerk.
      faction: "GOBLIN",
      coins: 4,
      technologies: ["HUNTING"],
      cities: [
        {
          name: "Cutthroat Camp",
          at: { x: 4, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Rookery Camp",
          at: { x: 11, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "RAIDER", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 11, y: 12 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 11 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 9, x1: 6, y1: 13 }] },
      // Step 3 (hand play, CAMPAIGN.md section 15): the two Wolf Riders they
      // start with are all they get (with Scouting to train more, a pack
      // of six ran down the escort once the beasts were gone), and no Bomb
      // Chuckers (their Kaboom took the escort's Fighters one by one) or
      // Orc Brutes. Goblins on foot, which mob.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "FORTIFICATION",
        "EXPLOSIVES",
        "SAWMILLING",
        "CHIVALRY",
        "METALLURGY",
      ],
      directive: { kind: "RUSH" },
    },
    {
      // Kessler's runaway menagerie, in the wood around the circus wreck:
      // a grown Triceratops, three Raptors and a Caveman keeper, with the
      // Wreck's Lumber Camps to feed new Eggs.
      faction: "DINOSAUR",
      coins: 6,
      technologies: ["HUNTING"],
      cities: [
        {
          name: "Circus Wreck",
          at: { x: 7, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "SWORDSMAN", at: { x: 7, y: 7 }, kills: 1 },
        { role: "RAIDER", at: { x: 6, y: 8 }, kills: 1 },
        { role: "RAIDER", at: { x: 8, y: 5 } },
        { role: "RAIDER", at: { x: 9, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 6 } },
      ],
      reveal: { radius: 3 },
      // The heart of the wood (hand play: with the zone reaching the camp's
      // edge, a Triceratops chained kills from it into the camp).
      directive: { kind: "HOLD", zone: [{ x0: 6, y0: 4, x1: 10, y1: 8 }] },
    },
  ],
  // An island, but no fleets in the Greenwood.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "KINGSBRIDGE", at: { x: 13, y: 2 }, name: "Kingsbridge" }],
  // Pettigrew beside Kingsbridge by round 20, alive. The stars: by round
  // 16, and the outlaw camp never falls.
  objective: {
    kind: "ESCORT",
    unit: "PETTIGREW",
    to: "KINGSBRIDGE",
    within: 1,
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
