import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_6` "The Great Seal" (docs/product/SAGA.md section 3.4, D6; the
 * Dwarf campaign, `pulp_wars-hmyk.9`). On the night the lid goes down, the
 * dead pour up out of the Bottomless and the Grey Lodge comes up the
 * mountain behind them: take the Deep Gate back by round 20. Step 6 of 6,
 * the finale. A siege of your own gate, from below and above at once: the
 * Unquiet hold the Gate on its shelf over the shaft, more of them climb out
 * every few rounds, and the rest march on Copperstep; the Lodge storms
 * Copperstep from the eastern slope. Two Liches in the bowl drop plague on
 * whatever crowds the Gate. Steam Tanks are Plated (no single hit takes
 * more than 4) and lead the assault; a city of level 5 gives a Brass Titan
 * whose Siege Hammer ignores walls; Blasting Charges bring a mountain down
 * on whatever stands round it, and the Gate is ringed by mountains; the
 * Lodge's daemons fall apart when their channellers do. Marshal Steele has
 * kept the Pact's first promise: her Rangers march up the southern road,
 * and from round 6 they attack.
 *
 * The board is the map generator's (Dry Land 16, four seats, seed 2208):
 * the Deep Gate stands in a bowl of the eastern peaks, open to the south
 * and east; Copperstep on the meadow by the old Rift, behind a ridge of
 * ore mountains, and Ironbraid Hold beyond the Rift to the west; the
 * Lodge's camp on the slope east of the Gate, the Rangers' camp on the
 * southern road.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  5   ......v......f^^
 *    6   ......ff..f..^^f
 *    7   ^.H..x.....v^^.f      H: Ironbraid Hold; x: the Rift
 *    8   ..f^.xC^^^^^^^^^      C: Copperstep
 *    9   .f.f.xf^^^^^^^^.
 *   10   ffvff.^f^^^D..Lf      D: the Deep Gate; L: the Lodge's camp
 *   11   fffffff^.^f.^..^
 *   12   ..ffffff.^f^f^.^
 *   13   ...f.Rffv.^f^..^      R: the Rangers' camp
 *   14   ffff...^.ff..^.^
 *   15   ffff.f^..^......
 * ```
 */
export const DWARF_6_V7: MissionDefinitionV7 = {
  id: "DWARF_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261506,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 4,
    seed: 2208,
    // Ironbraid Hold, the Deep Gate, the Lodge's and the Rangers' camps
    // stand on villages; the village above the Lodge's camp is gone (hand
    // play on an earlier board: the Lodge settled the villages round its
    // camp and fed a second camp's Offerings into a swarm of Imps).
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 7 }, present: false },
    ],
  },
  terrain: [
    ".....ffff.ff...^",
    "...f..fff.......",
    "...............f",
    "f.f.............",
    "................",
    ".............f^^",
    "......ff..f..^^f",
    "^....x......^^.f",
    "..f^.x.^^^^^^^^^",
    ".f.f.xf^^^^^^^^.",
    "ff.ff.^f^^^....f",
    "fffffff^.^f.^..^",
    "..ffffff.^f^f^.^",
    "...f..ff..^f^..^",
    "ffff...^.ff..^.^",
    "ffff.f^..^......",
  ],
  resources: [
    "...r.ggg.rg.r.eo",
    ".r........r..r..",
    "rr...rr..re.rre.",
    ".r.ree..e.ee.re.",
    "e.r...r..r.e.r.e",
    "...eer.rer..eg..",
    "r..re...re.reoog",
    ".......re...oo..",
    ".r..e..oooooooo.",
    ".gr...goo.oo.o.r",
    ".g..g.o..oo.....",
    "ggg.gg.orog...ro",
    ".r.gg....o.og..o",
    "...gr.....o.o.ro",
    "g...r..o...rroro",
    "..gge......e....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPHHH",
    "PPPPPPPPPPPPHHHH",
    "PPPPPPPHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWHHHHHHHHHH",
    "WWWWWWWHHHHHHHHH",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 11, y: 1 },
    { x: 14, y: 1 },
    { x: 6, y: 5 },
    { x: 2, y: 10 },
    { x: 11, y: 7 },
    { x: 8, y: 13 },
  ],
  treasureChests: [
    { x: 10, y: 6 },
    { x: 3, y: 14 },
  ],
  // </map>
  improvements: [
    // The Deep Gate's Mines on the shaft's rim and Copperstep's.
    { at: { x: 10, y: 9 }, improvement: "MINE" },
    { at: { x: 11, y: 9 }, improvement: "MINE" },
    { at: { x: 10, y: 10 }, improvement: "MINE" },
    { at: { x: 7, y: 8 }, improvement: "MINE" },
    { at: { x: 7, y: 9 }, improvement: "MINE" },
  ],
  // The dead of the shaft, round the Gate's bowl.
  graves: [
    { x: 12, y: 10 },
    { x: 11, y: 11 },
    { x: 13, y: 11 },
    { x: 13, y: 13 },
    { x: 10, y: 12 },
  ],
  aiMode: "RIVAL",
  // You and Steele's Rangers; the Unquiet and the Grey Lodge.
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "DWARF",
      // Hand play: with 12 Coins in hand on round 1 a Workshop, Fruit, Game
      // and the Explorer monument (one Gyrocopter flight away) made
      // Copperstep level 5 and a Brass Titan at once; with less in hand and
      // less of the board known the giant comes a round later.
      coins: 3,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "METALLURGY",
      ],
      cities: [
        {
          name: "Ironbraid Hold",
          at: { x: 2, y: 7 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Copperstep",
          at: { x: 6, y: 8 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // Thane Brunhild Ironbraid, come to see the lid go down.
        { role: "CAPTAIN", at: { x: 2, y: 7 }, tag: "THANE" },
        { role: "FIGHTER", at: { x: 3, y: 7 } },
        { role: "MARKSMAN", at: { x: 2, y: 6 } },
        { role: "RAIDER", at: { x: 1, y: 7 } },
        { role: "SWORDSMAN", at: { x: 6, y: 8 }, home: 1 },
        { role: "SWORDSMAN", at: { x: 7, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 9 }, home: 1 },
      ],
      reveal: {
        radius: 2,
        rects: [{ x0: 8, y0: 8, x1: 15, y1: 13 }],
      },
    },
    {
      // The Unquiet from the shaft, holding the Deep Gate.
      faction: "UNDEAD",
      coins: 2,
      technologies: [],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 11, y: 10 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // The Gate's keepers: two Wights, Zombies on the rim and two
        // Liches, one beside the Gate and one behind it, whose plague
        // falls on whoever crowds the bowl.
        { role: "SWORDSMAN", at: { x: 11, y: 10 } },
        { role: "GUARD", at: { x: 12, y: 10 } },
        { role: "GUARD", at: { x: 11, y: 11 } },
        { role: "SWORDSMAN", at: { x: 10, y: 11 } },
        { role: "CATAPULT", at: { x: 12, y: 12 } },
        { role: "FIGHTER", at: { x: 13, y: 11 } },
        { role: "CAPTAIN", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 8, y: 11 } },
        { role: "FIGHTER", at: { x: 8, y: 12 } },
        { role: "FIGHTER", at: { x: 9, y: 13 } },
        { role: "GUARD", at: { x: 14, y: 13 } },
        { role: "CATAPULT", at: { x: 14, y: 12 } },
      ],
      // Copperstep and the road to it (hand play: with half the board
      // revealed the Unquiet earned the Explorer monument and the Gate grew
      // to level 5).
      reveal: { radius: 2, rects: [{ x0: 5, y0: 6, x1: 10, y1: 10 }] },
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
      // The Gate and the ring round it are held (hand play: with the
      // whole bowl as the zone the Gate's centre stood empty for three
      // rounds); the rest march on Copperstep.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 9, x1: 12, y1: 11 }],
        garrison: 7,
        others: { kind: "ASSAULT", target: { x: 6, y: 8 } },
      },
    },
    {
      // The Grey Lodge, come up the eastern slope.
      faction: "CULT",
      // Enough Favour for a Horror on round 1 (hand play on an earlier
      // board: with 8 the Lodge summoned an Imp a turn from round 3 and a
      // Horror by round 9).
      coins: 0,
      favour: 4,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Lodge Camp",
          at: { x: 14, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 14, y: 10 } },
        { role: "GUARD", at: { x: 13, y: 10 } },
        { role: "FIGHTER", at: { x: 15, y: 9 } },
        { role: "FIGHTER", at: { x: 14, y: 11 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 5, y0: 6, x1: 10, y1: 10 }] },
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // They storm Copperstep.
      directive: { kind: "ASSAULT", target: { x: 6, y: 8 } },
    },
    {
      // Marshal Steele's Rangers on the southern road.
      faction: "ORIGINAL",
      coins: 3,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Rangers' Camp",
          at: { x: 5, y: 13 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 5, y: 13 } },
        { role: "FIGHTER", at: { x: 6, y: 13 } },
        { role: "MARKSMAN", at: { x: 5, y: 14 } },
        { role: "GUARD", at: { x: 4, y: 13 } },
      ],
      // Out of the Lich's reach (hand play on an earlier board: camped on
      // the southern road below the Gate they were shot to pieces by
      // round 3).
      reveal: { radius: 2, rects: [{ x0: 5, y0: 8, x1: 15, y1: 15 }] },
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
      ],
      // The Rangers find their feet, then march on the dead.
      directive: [{ kind: "NORMAL", untilRound: 6 }, { kind: "RUSH" }],
    },
  ],
  // More dead climb out of the shaft by the Gate every third round.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [
        { role: "GUARD", at: { x: 12, y: 14 } },
        { role: "FIGHTER", at: { x: 11, y: 13 } },
        { role: "FIGHTER", at: { x: 10, y: 12 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "SWORDSMAN", at: { x: 12, y: 14 } },
        { role: "GUARD", at: { x: 11, y: 13 } },
        { role: "FIGHTER", at: { x: 10, y: 12 } },
      ],
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "GUARD", at: { x: 12, y: 14 } },
        { role: "SWORDSMAN", at: { x: 11, y: 13 } },
        { role: "CAPTAIN", at: { x: 10, y: 12 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      units: [
        { role: "SWORDSMAN", at: { x: 12, y: 14 } },
        { role: "GUARD", at: { x: 11, y: 13 } },
        { role: "FIGHTER", at: { x: 10, y: 12 } },
      ],
    },
  ],
  landmarks: [{ tag: "DEEP_GATE", at: { x: 11, y: 10 } }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Deep Gate by round 20. The stars: by round 16, and the Thane
  // lives.
  objective: {
    kind: "CAPTURE",
    places: ["DEEP_GATE"],
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 16 },
      { kind: "UNIT_ALIVE", unit: "THANE" },
    ],
  },
};
