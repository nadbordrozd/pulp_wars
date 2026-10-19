import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_3` "Down the Bottomless" (docs/product/SAGA.md section 3.4, D3;
 * the Dwarf campaign, `pulp_wars-hmyk.9`). The Thane goes down the
 * Bottomless herself: bring her (a tagged Engineer, `THANE`) to the Bell's
 * Rest at the bottom of the shaft by round 20. Step 3 of 6. The way down
 * is one gallery through the rock, a tile or two wide, and the deep dead
 * stand in it; the Grey Lodge's diggers have a side cave halfway down and
 * come out on round 8. Nobody may climb the peaks in this mission (Mining
 * is forbidden to every seat), so one Zombie blocks the gallery. The key
 * is the Tunnel: a Steam Mole passes under the rock, three tiles at most,
 * with a Hammerer riding beside it, and comes up behind the dead.
 *
 * The board is the map generator's (Dry Land 16, seed 30): the gallery is
 * the column of grass and forest that runs down the eastern mass of peaks
 * from the Deep Gate to the Bell's Rest; the Rift seals it from the old
 * workings in the south-west, where the dead have their barrow.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  3   fff..f..f...f^..
 *    4   ffffff.v.fL.^D..      D: the Deep Gate; L: Lanternhall
 *    5   fffff^......^f.^
 *    6   .f^f.^.f^..^.f^.
 *    7   .v..v.fv^f^^^.f^      the gallery runs down column D
 *    8   ....^.f^.^^^^.^^
 *    9   ....^^.f^^^^C.^^      C: the diggers' cave
 *   10   .v..v^fv^^^^f.ff
 *   11   .f...f.^^^^xxxf.      x: the Rift
 *   12   ...f...^^^f^^ff^
 *   13   .......v^^^f^^.^
 *   14   ........f^S^^^B.      B: the Bell's Rest; S: Old Sump
 *   15   ....ffff..^^^f^.
 * ```
 */
export const DWARF_3_V7: MissionDefinitionV7 = {
  id: "DWARF_3",
  revision: 1,
  seed: 20261503,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 3,
    seed: 30,
    // Lanternhall and Old Sump stand on villages; the diggers have
    // cleared their cave.
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 14 }, present: false },
      { kind: "TERRAIN", at: { x: 12, y: 9 }, terrain: "." },
    ],
  },
  terrain: [
    "...f.f.ff.......",
    "f.ff.f.....f....",
    "^ff^.........f..",
    "fff..f..f...f^..",
    "ffffff...f..^...",
    "fffff^......^f.^",
    ".f^f.^.f^..^.f^.",
    "......f.^f^^^.f^",
    "....^.f^.^^^^.^^",
    "....^^.f^^^^..^^",
    ".....^f.^^^^f.ff",
    ".f...f.^^^^xxxf.",
    "...f...^^^f^^ff^",
    "........^^^f^^.^",
    "........f^.^^^..",
    "....ffff..^^^f^.",
  ],
  resources: [
    "..rg..e.gre...re",
    "g..gege.....r.rr",
    "..go.r..........",
    ".gg.eg...r.rgor.",
    "gg.........ro...",
    "g...g.e.e.e..g.o",
    "rg.g.o..o..o....",
    "r.e.....o.ooo.go",
    "r.rro....ooo...o",
    "ereeo....ooo..oo",
    ".....o....o.g...",
    "..r.r.roooo...ge",
    ".erg.re....oog..",
    ".r.rre....o.oo.o",
    "rrrrrrr....ooo..",
    ".e...gg....oo.o.",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWPPPPPPPPPP",
    "WWWWWWPPPPPPPPPP",
    "WWWWWWPPPPPPPPPP",
    "WWWWWWPPPPPPPHHH",
    "WWWWWWPPPPPPHHHH",
    "WWWWWWPPPPPHHHHH",
    "WWWWWHHHHHHHHHHH",
    "PPPPHHHHHHHHHHHH",
    "PPPPHHHHHHHHHHHH",
    "PPPPHHHHHHHHHHHH",
    "PPPPPHHHHHHHHHHH",
    "PPPPPPHHHHHHHHHH",
    "PPPPPPPHHHHHHHHH",
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPPHHHHHHH",
    "PPPPPPPPPHHHHHHH",
  ],
  villages: [
    { x: 7, y: 1 },
    { x: 10, y: 1 },
    { x: 13, y: 1 },
    { x: 7, y: 4 },
    { x: 1, y: 7 },
    { x: 4, y: 7 },
    { x: 7, y: 7 },
    { x: 1, y: 10 },
    { x: 4, y: 10 },
    { x: 7, y: 10 },
    { x: 7, y: 13 },
    { x: 14, y: 14 },
  ],
  treasureChests: [
    { x: 0, y: 0 },
    { x: 5, y: 8 },
  ],
  // </map>
  // The Deep Gate's two Mines.
  improvements: [
    { at: { x: 12, y: 4 }, improvement: "MINE" },
    { at: { x: 13, y: 3 }, improvement: "MINE" },
  ],
  // Old graves in the gallery's side pockets.
  graves: [
    { x: 15, y: 10 },
    { x: 15, y: 11 },
    { x: 13, y: 12 },
  ],
  aiMode: "RIVAL",
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DWARF",
      coins: 8,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      // Hand play: with every unit homed to a full Gate nobody could
      // Assemble a Gunner; the Gate has a free slot and Lanternhall holds
      // the Moles.
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 13, y: 4 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        {
          name: "Lanternhall",
          at: { x: 10, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Thane Brunhild Ironbraid, lantern in hand, and Master Engineer
        // Tobbin Copperstep with the chain.
        { role: "CAPTAIN", at: { x: 13, y: 4 }, tag: "THANE" },
        { role: "CAPTAIN", at: { x: 14, y: 4 }, tag: "TOBBIN" },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
        { role: "MARKSMAN", at: { x: 14, y: 3 } },
        { role: "FIGHTER", at: { x: 13, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 14, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 6 }, home: 1 },
      ],
      // The old survey of the shaft.
      reveal: {
        radius: 2,
        rects: [{ x0: 10, y0: 5, x1: 15, y1: 15 }],
      },
    },
    {
      // The deep dead: miners, prospectors and worse, standing in the
      // gallery the way they fell.
      faction: "UNDEAD",
      coins: 0,
      technologies: [],
      cities: [
        { name: "Old Sump", at: { x: 10, y: 14 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 10, y: 14 } },
        { role: "GUARD", at: { x: 13, y: 8 } },
        { role: "FIGHTER", at: { x: 13, y: 9 } },
        { role: "GUARD", at: { x: 13, y: 10 } },
        { role: "GUARD", at: { x: 14, y: 11 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "GUARD", at: { x: 14, y: 13 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 11, y0: 3, x1: 15, y1: 15 }] },
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
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // The dead stand in the gallery and do not leave it.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 12, y0: 7, x1: 15, y1: 15 }],
        garrison: 6,
      },
    },
    {
      // The Grey Lodge's diggers: candle stubs and hooded footprints, all
      // going down.
      faction: "CULT",
      // Hand play: with 4 Favour a Horror stood over the gallery from
      // round 1.
      coins: 2,
      favour: 2,
      technologies: ["GATHERING", "ADMINISTRATION", "DRILL", "FORTIFICATION"],
      cities: [
        { name: "Diggers' Cave", at: { x: 12, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 12, y: 9 } },
        { role: "GUARD", at: { x: 12, y: 10 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 11, y0: 3, x1: 15, y1: 15 }] },
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
      // They keep to their cave, then come up the gallery at the Gate.
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 12, y0: 9, x1: 12, y1: 10 }],
          untilRound: 8,
        },
        { kind: "RUSH" },
      ],
    },
  ],
  landmarks: [{ tag: "BELLS_REST", at: { x: 14, y: 14 }, name: "Bell's Rest" }],
  // Nobody climbs the peaks: the gallery is the only way down on foot.
  forbiddenTechnologies: [
    "ENGINEERING",
    "METALLURGY",
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Thane to the Bell's Rest by round 20 (the saga's 24; hand play
  // won in round 14). The stars: by round 16, and Tobbin lives.
  objective: {
    kind: "ESCORT",
    unit: "THANE",
    to: "BELLS_REST",
    within: 1,
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 16 },
      { kind: "UNIT_ALIVE", unit: "TOBBIN" },
    ],
  },
};
