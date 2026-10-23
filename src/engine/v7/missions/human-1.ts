import type { MissionDefinitionV7 } from "./types";

/**
 * `HUMAN_1` "Thaw at Northwatch" (docs/product/SAGA.md section 3.1, H1; the
 * Humans campaign, `pulp_wars-hmyk.4`). You lead the Humans against the
 * Unquiet, dead nobody raised on purpose, on a dry 11 x 11 board. Step 1 of
 * 6: the Undead basics. Every death leaves a Grave, and the Necromancer
 * raises a Skeleton on every free Grave within two tiles of it; a quick,
 * tidy fight that keeps the Graves covered and reaches the Necromancer wins,
 * a slow brawl feeds the barrow.
 *
 * The board is the map generator's (Dry Land 11, seed 2). Northwatch stands
 * on the southern farmland; Hollow Barrow sits in the northern hills inside
 * a ring of peaks, with the barrow camp beside it. Six old Graves lie on the
 * fields between. The dead mill about for two rounds and march on
 * Northwatch from round 3; the barrow is to be found, not seen, and the
 * clearing must be done by round 20.
 *
 * The second retune (`pulp_wars-hmyk.19`, CAMPAIGN.md section 15.5): a
 * skirmish start (one young town, a Fighter and the Knight) was tried and
 * snowballed every time (the Necromancer's free Skeletons), so step 1 keeps
 * the first pass's start, loses the village at Northwatch's door, and gains
 * the clock.
 *
 * The fourth retune (`pulp_wars-hmyk.25`, CAMPAIGN.md section 15.6): the
 * barrow starts stronger than Northwatch (two Zombies on the gates, five
 * Skeletons and 4 Coins against the Knight and two Fighters), and the
 * conquest clock is lax (20 rounds; the thoughtful win took 10).
 *
 * ```text
 *      x 0123456789A
 * y  0   f^.^^^.f.ff
 *    1   ^^^^^.^...^
 *    2   ..^fB^.Cff^      B: Hollow Barrow; C: the barrow camp
 *    3   .f^..ffffff
 *    4   ^.f...ff$ff      $: a treasure chest
 *    5   ^v^+v++.+.f      +: old Graves; v: villages
 *    6   ^ff^+^+....
 *    7   .f^........
 *    8   ..$.N......      N: Northwatch
 *    9   .^^.ff.....
 *   10   .ff.ff.....
 * ```
 */
export const HUMAN_1_V7: MissionDefinitionV7 = {
  id: "HUMAN_1",
  // Revision 3 (`pulp_wars-hmyk.25`, the fourth retune): the barrow's
  // Zombies on both gates, five Skeletons and 4 Coins; a lax 20-round
  // clock. Revision 2 (`pulp_wars-hmyk.19`): no free village at
  // Northwatch's door, the barrow unseen, and the dead march from round 3.
  revision: 3,
  seed: 20261201,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 2,
    // The barrow camp stands on a village; the village by the barrow would
    // hand the dead a third town.
    edits: [
      { kind: "VILLAGE", at: { x: 7, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 2 }, present: false },
      // Retune 2: no free town at Northwatch's door.
      { kind: "VILLAGE", at: { x: 1, y: 8 }, present: false },
    ],
  },
  terrain: [
    "f^.^^^.f.ff",
    "^^^^^.^...^",
    "..^f.^..ff^",
    ".f^..ffffff",
    "^.f...ff.ff",
    "^.^f......f",
    "^ff^.^.....",
    ".f^........",
    "...........",
    ".^^.ff.....",
    ".ff.ff.....",
  ],
  resources: [
    ".orooorge..",
    ".ooo.ro.r..",
    "..o..o...go",
    "r.o.r.g.g.g",
    "..g........",
    "o.og.....e.",
    "...oeo.errr",
    "..oreere.r.",
    ".....rerrr.",
    "e.o....er.e",
    ".g..g.er...",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHHWWWWW",
    "HHHHHPPPPPW",
    "HHHHPPPPPPP",
    "HHHPPPPPPPP",
    "HHPPPPPPPPP",
    "PPPPPPPPPPP",
    "PPPPPPPPPPP",
  ],
  villages: [
    { x: 1, y: 5 },
    { x: 4, y: 5 },
    { x: 7, y: 5 },
  ],
  treasureChests: [
    { x: 8, y: 4 },
    { x: 2, y: 8 },
  ],
  // </map>
  // The old Graves on the fields between the barrow and the farms.
  graves: [
    { x: 3, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 8, y: 5 },
    { x: 4, y: 6 },
    { x: 6, y: 6 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["GATHERING", "HUNTING", "SCOUTING"],
      cities: [
        {
          name: "Northwatch",
          at: { x: 4, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "KNIGHT", at: { x: 4, y: 7 } },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "FIGHTER", at: { x: 5, y: 7 } },
      ],
      // The farms and the fields of Graves; the barrow is for the scouts
      // to find (retune 2).
      reveal: { radius: 2, rects: [{ x0: 2, y0: 4, x1: 8, y1: 6 }] },
    },
    {
      // The Unquiet of Hollow Barrow.
      faction: "UNDEAD",
      coins: 4,
      technologies: ["GATHERING", "ADMINISTRATION"],
      cities: [
        {
          name: "Hollow Barrow",
          at: { x: 4, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Barrow Camp", at: { x: 7, y: 2 }, level: 1, rewards: [] },
      ],
      // Retune 4: a Zombie on each gate and five Skeletons, more than
      // Northwatch fields.
      units: [
        { role: "CAPTAIN", at: { x: 4, y: 2 } },
        { role: "GUARD", at: { x: 4, y: 3 } },
        { role: "GUARD", at: { x: 7, y: 2 }, home: 1 },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
        { role: "FIGHTER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 3 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 4, x1: 8, y1: 6 }] },
      // Step 1 keeps to the lesson: no Liches, Banshees, Vampires or
      // Wights, and no Zombies dug in on Field Defenses (hand play: a siege
      // of fortified Zombies turned the end into a slog that taught
      // nothing, and two Banshees' Wails decided the middle).
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SAWMILLING",
        "CHIVALRY",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // The dead mill about for two rounds, then march (retune 2: from
      // round 3, not 4).
      directive: [{ kind: "NORMAL", untilRound: 3 }, { kind: "RUSH" }],
    },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Clear the barrow: every dead town, by round 20 (retune 4: lax for a
  // conquest; the thoughtful win took 10 rounds). The stars: by round
  // 14, and Northwatch never falls.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 14 }, { kind: "KEEP_CITIES" }],
  },
};
