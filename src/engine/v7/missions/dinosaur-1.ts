import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_1` "The Empty Nest" (docs/product/SAGA.md section 3.5, DN1; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs against Kessler's poachers, who stole her first clutch, on an
 * 11 x 11 island. Step 1 of 6: the Dinosaurs from scratch. A city lays an
 * Egg on a tile beside it (a Raptor hatches at your next turn), the Shaman
 * hatches an older Egg at once, and every dinosaur grows with its kills:
 * Big at one kill, Alpha at three, each step a full heal. The Old Queen is
 * a T-Rex, strong but alone; the poachers' Marksmen shoot her to pieces if
 * she walks in by herself.
 *
 * The board is the map generator's (Pangea 11, seed 16). Thunder Nest
 * stands on the north-eastern edge of the jungle; the poachers have two
 * beach camps, one on the western shore and one on the south-eastern. The
 * village in the middle of the jungle is yours to take; the one walled in
 * by the south-western peaks is gone.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * numbers: against three Fighters and a rifle per camp the Queen alone
 * ate both camps by round 4; with two rifles each she was shot dead in
 * round 4. Each camp keeps a Guard and a rifle, and you start with a
 * Raptor and Land Grants (a free slot for an Egg).
 *
 * ```text
 *      x 0123456789A
 * y  0   ~~~~~~~~~~~
 *    1   ~~~^^....~~
 *    2   ~~^.ffffN.~      N: Thunder Nest
 *    3   ~^^fffffff~
 *    4   ~..f.^ffff~
 *    5   ~.G.ff^fvf~      G: Gunwale Camp; v: a village
 *    6   ~^^^^.f.$f~      $: treasure chests
 *    7   ~f^^f^..^f~
 *    8   ~..^^.$.T~~      T: Tusker's Landing
 *    9   ~~~^....~~~
 *   10   ~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_1_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_1",
  revision: 1,
  seed: 20261401,
  // <map>
  size: 11,
  source: {
    mapType: "PANGEA",
    size: 11,
    seats: 2,
    seed: 16,
    // The two camps stand on villages; the village in the south-western
    // pocket, walled in by peaks, is gone.
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~",
    "~~~^^....~~",
    "~~^.ffff..~",
    "~^^fffffff~",
    "~..f.^ffff~",
    "~...ff^f.f~",
    "~^^^^.f.ff~",
    "~f^^f^..^f~",
    "~..^^....~~",
    "~~~^....~~~",
    "~~~~~~~~~~~",
  ],
  resources: [
    ".....ss.p.p",
    "...o...r...",
    "..o.gg.g..s",
    ".oo.g.gggg.",
    "p.......g..",
    "...r...g...",
    "soo....r..s",
    "..oo.oee...",
    "s...o....pp",
    ".spoereep..",
    ".....s.p...",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPP",
    "PPPHWWWWWPP",
    "PPHHWWWWWWP",
    "PHHHWWWWWWP",
    "PHHHHWWWWWP",
    "PHHHHHWWWWP",
    "PHHHHHPPWWP",
    "PHHHHHPPPWP",
    "PHHHHPPPPPP",
    "PPPHPPPPPPP",
    "PPPPPPPPPPP",
  ],
  villages: [{ x: 8, y: 5 }],
  treasureChests: [
    { x: 8, y: 6 },
    { x: 6, y: 8 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DINOSAUR",
      coins: 6,
      // Nesting and Land Grants (two slots more in every city), the Raptor
      // Egg, and the Shaman's Hatch and War Drums.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 8, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex, and Shaman Oona, who speaks for her.
        { role: "KNIGHT", at: { x: 8, y: 3 }, tag: "OLD_QUEEN" },
        { role: "CAPTAIN", at: { x: 8, y: 2 }, tag: "OONA" },
        { role: "RAIDER", at: { x: 9, y: 2 } },
      ],
      // Both camps, seen from the jungle.
      reveal: {
        radius: 2,
        rects: [
          { x0: 1, y0: 4, x1: 3, y1: 6 },
          { x0: 5, y0: 5, x1: 9, y1: 9 },
        ],
      },
    },
    {
      // Kessler's poachers, Thunder Nest's eggs in their crates: a Guard
      // on each camp, two rifles behind it, and men with clubs.
      faction: "ORIGINAL",
      coins: 4,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Gunwale Camp",
          at: { x: 2, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Tusker's Landing",
          at: { x: 8, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 5 } },
        { role: "MARKSMAN", at: { x: 1, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "GUARD", at: { x: 8, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 7, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 7 }, home: 1 },
      ],
      reveal: { radius: 1 },
      // Step 1 keeps to the lesson: the poachers learn nothing more.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
    },
  ],
  forbiddenTechnologies: [],
  // Follow the boots: take both camps. The stars: by round 12, and the Old
  // Queen lives.
  objective: {
    kind: "DOMINATION",
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
