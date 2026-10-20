import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_2` "Waking the Giants" (docs/product/SAGA.md section 3.7, I2;
 * the Ice Folk campaign, `pulp_wars-hmyk.10`). The Frost Giants sleep in
 * the Glacier Tomb, and the Frozen Abbot, a monk three hundred years in the
 * ice, has raised his dead to keep them asleep: destroy the Abbot by round
 * 20. Step 2 of 6. A Lich in a cirque of peaks shoots three tiles and
 * splashes plague on whoever stands round its target; his Zombies hold the
 * tomb and his Skeletons march on Rime Camp. On the tenth round a Frost
 * Giant wakes beside the tomb and joins you: its blow from the next tile
 * shatters a Frozen enemy left with 8 HP or less, and its shards freeze
 * everyone round the shattered one.
 *
 * The board is the map generator's (Dry Land 14, seed 12): the Glacier
 * Tomb in a cirque of the northern peaks, woods to the west, the open
 * snowfields down the middle and east; Rime Camp and Whitefang in the
 * south.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   f...^...^.^f^f
 *    1   ff...^.^^.^^vf      v: villages
 *    2   fffff^T^ff.^^.      T: the Glacier Tomb
 *    3   ffffff^f.....^
 *    4   .ff.^ff.^...vc      c: a treasure chest
 *    5   ffff.ffff^.f^.
 *    6   .ffffff.^ff...
 *    7   ^ffvffv..v..v.
 *    8   ^fff.f..^....f
 *    9   fffff..^......
 *   10   ffffff..R...Wf      R: Rime Camp; W: Whitefang
 *   11   ffffff^f......
 *   12   ^fffffc.......
 *   13   f^ff^f..f.....
 * ```
 */
export const ICE_FOLK_2_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_2",
  revision: 1,
  seed: 20261602,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 12,
    // Whitefang stands on a village; the four villages round the tomb are
    // gone (each would be a free town for the dead).
    edits: [
      { kind: "VILLAGE", at: { x: 12, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 4 }, present: false },
    ],
  },
  terrain: [
    "f...^...^.^f^f",
    "ff...^.^^.^^.f",
    "fffff^.fff.^^.",
    "ffffff^f.....^",
    ".ff.^ff.^.....",
    "ffff.ffff^.f^.",
    ".ffffff.^ff...",
    "^ff.ff........",
    "^fff.f..^....f",
    "fffff..^......",
    "ffffff.......f",
    "ffffff^f......",
    "^fffff........",
    "f^ff^f..f.....",
  ],
  resources: [
    "g.e.o...oeogo.",
    ".g...o.o..o...",
    ".......g..roo.",
    ".gg.g..g....ro",
    "egg.o...o.er..",
    ".g.geggggor.o.",
    "eg.ggg.r..gee.",
    "o.g..g.....e..",
    "oggge.e.or....",
    "gggg...oeer.e.",
    "....gg...r....",
    ".ggg.go..r...e",
    ".....g.r......",
    "gog.og.rg.e...",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWHHHHHHHHHH",
    "WWWWWHHHHHHHHH",
    "WWWWWWHHHHHHHH",
    "WWWWWWWHHHHHHH",
    "WWWWWWWWHHHHHH",
    "WWWWWWWWWHHHHH",
    "WWWWWWWWWWPPPP",
    "WWWWWWWWWWPPPP",
    "WWWWWWWWWPPPPP",
    "WWWWWWWWPPPPPP",
    "WWWWWWWPPPPPPP",
    "WWWWWWPPPPPPPP",
    "WWWWWWPPPPPPPP",
    "WWWWWWPPPPPPPP",
  ],
  villages: [
    { x: 12, y: 1 },
    { x: 12, y: 4 },
    { x: 3, y: 7 },
    { x: 6, y: 7 },
    { x: 9, y: 7 },
    { x: 12, y: 7 },
  ],
  treasureChests: [
    { x: 13, y: 4 },
    { x: 6, y: 12 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 5,
      // The Witch (Leadership), the Sled, and Snow Hunters (Cold Blood:
      // +0.5 Attack on a Frozen target).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Rime Camp",
          at: { x: 8, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Whitefang",
          at: { x: 12, y: 10 },
          level: 2,
          rewards: ["MILITIA"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 8, y: 9 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 7, y: 10 } },
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "MARKSMAN", at: { x: 8, y: 11 } },
        { role: "RAIDER", at: { x: 9, y: 10 } },
        // Chief Gnash of Whitefang, home again, a Mammoth of a man.
        { role: "SWORDSMAN", at: { x: 12, y: 10 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 9 }, home: 1 },
      ],
      // The snowfields up to the cirque.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 1, x1: 13, y1: 9 }] },
    },
    {
      // The Frozen Abbot's ice-bound dead.
      faction: "UNDEAD",
      coins: 2,
      technologies: [],
      cities: [
        { name: "Glacier Tomb", at: { x: 6, y: 2 }, level: 1, rewards: [] },
      ],
      units: [
        // The garrison first: the Abbot, a Lich in the cirque behind the
        // tomb, and the dead who keep its door.
        { role: "CATAPULT", at: { x: 6, y: 1 }, tag: "ABBOT" },
        { role: "GUARD", at: { x: 6, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
        // Skeletons on the snowfields.
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 5 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 5, y0: 6, x1: 13, y1: 11 }] },
      // Skeletons and Zombies only: no Necromancers, Ghouls, Banshees,
      // Wights or more Liches.
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
      // The Abbot and three of his dead hold the cirque; the rest march on
      // Rime Camp.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 5, y0: 0, x1: 7, y1: 3 }],
        garrison: 4,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The first giant wakes on the tenth day, beside the tomb.
  reinforcements: [
    {
      seat: 0,
      round: 10,
      units: [{ role: "JUGGERNAUT", at: { x: 8, y: 3 } }],
    },
  ],
  landmarks: [{ tag: "GLACIER_TOMB", at: { x: 6, y: 2 } }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Abbot by round 20. The stars: by round 15, and no city lost.
  objective: {
    kind: "KILL",
    units: ["ABBOT"],
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 15 }, { kind: "KEEP_CITIES" }],
  },
};
