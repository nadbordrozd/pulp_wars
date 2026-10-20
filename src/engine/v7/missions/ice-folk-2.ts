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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): a skirmish start. Rime Camp alone at level 1 with Mother
 * Rime, Chief Gnash (a Swordsman nobody can train yet) and a Fighter, no
 * technology, 3 Coins; Whitefang and the three villages near the camp are
 * gone. The tomb has eleven dead, which hold home for three
 * rounds and then send six at the camp, and three announced waves of the
 * Abbot's dead come in rounds 4, 8 and 12. The clock is 16 (was 20).
 */
export const ICE_FOLK_2_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a skirmish start.
  revision: 3,
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
      // Retune 3: the villages by the camp are gone too.
      { kind: "VILLAGE", at: { x: 6, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 7 }, present: false },
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
      // Retune 3: a skirmish start. One camp at level 1, Mother Rime, Chief
      // Gnash (a Swordsman, Metallurgy away) and a Fighter, no technology.
      coins: 3,
      technologies: [],
      cities: [
        {
          name: "Rime Camp",
          at: { x: 8, y: 10 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 8, y: 9 }, tag: "RIME" },
        // Chief Gnash of Whitefang, home again, a Mammoth of a man.
        { role: "SWORDSMAN", at: { x: 9, y: 10 } },
        { role: "FIGHTER", at: { x: 7, y: 10 } },
      ],
      // The camp and the tomb's door, and nothing else.
      reveal: { radius: 2, rects: [{ x0: 6, y0: 2, x1: 6, y1: 2 }] },
    },
    {
      // The Frozen Abbot's ice-bound dead.
      faction: "UNDEAD",
      coins: 5,
      technologies: [],
      cities: [
        {
          name: "Glacier Tomb",
          at: { x: 6, y: 2 },
          level: 1,
          rewards: [],
        },
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
        // Retune 3: three more Skeletons and two more Zombies.
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 11, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "GUARD", at: { x: 9, y: 4 } },
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
      // Retune 3: all eleven hold the cirque for three rounds; then the
      // Abbot and four of his dead stay, and the other six march on Rime
      // Camp.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 5, y0: 0, x1: 7, y1: 3 }],
          garrison: 11,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 5, y0: 0, x1: 7, y1: 3 }],
          garrison: 5,
          others: { kind: "RUSH" },
          fromRound: 3,
        },
      ],
    },
  ],
  // The first giant wakes on the tenth day, beside the tomb. Retune 3: and
  // the Abbot sends three announced waves, in rounds 4, 8 and 12.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      line: "The Abbot's dead come down off the snowfields. They have been waiting a while.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 9, y: 4 } },
        { role: "GUARD", at: { x: 10, y: 5 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      line: "A second rank climbs out of the western woods, still in the Abbot's colours.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "GUARD", at: { x: 4, y: 9 } },
        { role: "GUARD", at: { x: 3, y: 9 } },
      ],
    },
    {
      seat: 0,
      round: 10,
      line: "A Frost Giant wakes beside the tomb, yawns, and picks a side.",
      units: [{ role: "JUGGERNAUT", at: { x: 8, y: 3 } }],
    },
    {
      seat: 1,
      round: 12,
      line: "The Abbot's last reserve: everything the tomb had left, and it had a lot left.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "GUARD", at: { x: 12, y: 8 } },
        { role: "GUARD", at: { x: 13, y: 8 } },
        { role: "FIGHTER", at: { x: 11, y: 7 } },
      ],
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
  // The Abbot by round 16. The stars: by round 12, and no city lost.
  objective: {
    kind: "KILL",
    units: ["ABBOT"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
