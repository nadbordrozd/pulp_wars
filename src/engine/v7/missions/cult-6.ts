import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_6` "The Long Night" (docs/product/SAGA.md section 3.9, CU6; the Cult
 * campaign's finale and the saga's, `pulp_wars-hmyk.12`). Tonight is the
 * Long Night. The Pact has gathered at the Deep Gate to ring the Lullaby:
 * the Thane at the chain, the Marquis with the score, the Sugarcrest choir
 * in the gallery, Marshal Steele with every Ranger in the north. The
 * Lullaby has a wrong note, the Seal has wax bolts, and the mountain is
 * warm: take the Deep Gate before dawn. Step 6 of 6, the saga's hardest:
 * the whole Pact, three armies, against a cult that is only as strong as
 * its channellers. The Great Summoning needs The Stars Are Right, a
 * Summoner, three chanters and 18 Favour; the Herald it brings ravages two
 * targets a turn and ignores walls, but its Hunger eats 2 Favour a turn,
 * and a broken strand turns it loose on its own side. The Thane and the
 * Marquis are at the bell below, never on the field.
 *
 * The board is the map generator's (Dry Land 20, seed 1): the Deep Gate on
 * its shelf over the shaft in the north, walled, with the Thane's Brass
 * Titan on its centre, Ironbraid Hold to the west and Copperstep below; the
 * Lodge's Hood Hollow and the Seal-works in the east, seven tiles from the
 * Gate; the Marquis's dead at Lantern Hill and Gallows Cross over the
 * western ridge; Steele's Rangers at Camp Concord and the Ranger Post on
 * the southern road. The dwarves keep nine at the Gate (`GUARD`) and have
 * no Clockwork Gunners and no Steam Moles (hand play: their shots and
 * tunnels broke every strand); the Rangers march on the fourth night
 * (`RUSH`) and more come up the road on the eighth and fourteenth; the dead
 * play their own game and from the sixth night storm the Seal-works
 * (`ASSAULT`).
 *
 * ```text
 *      x 01234567890123456789
 * y  0   ^f^^.^...f.f..f.f.ff
 *    1   f^^..^........f..ff.
 *    2   f^.ff......f.ff.f.f.
 *    3   ^^If^..Dff...fvffvff      D: the Deep Gate; I: Ironbraid Hold
 *    4   .^......ff....f..fff      v: villages; $: treasure chests
 *    5   ^^..ff...ff...$.f...
 *    6   ffv^^.^fCf^.f^S..Hff      C: Copperstep; S: the Seal-works
 *    7   f.^^^..^.^^^^f^....f      H: Hood Hollow
 *    8   .^^f^...^^f.^^^f...f
 *    9   .fLf^..^.ff.^^.^f.ff      L: Lantern Hill
 *   10   ^^^^f^^^..^^^^f^^ff.
 *   11   fff.$f^f^..^^^^.f^f.
 *   12   ^f^.^.f..f.x.^..^f..      x: the Rift
 *   13   ^.f.f..ff^fx..^f^vff
 *   14   .$Gf...ff^^x.^ff^f.f      G: Gallows Cross
 *   15   .........^^^^f..fff.
 *   16   .........f.f^ff..Kf^      K: Camp Concord
 *   17   ..........f..f^^...^
 *   18   f....v..R....f..ff^f      R: the Ranger Post
 *   19   $...f...f......ff.ff
 * ```
 */
export const CULT_6_V7: MissionDefinitionV7 = {
  id: "CULT_6",
  revision: 1,
  seed: 20261906,
  // <map>
  size: 20,
  source: {
    mapType: "DRY_LAND",
    size: 20,
    seats: 4,
    seed: 1,
    // The Lodge's towns, the Pact's camps and towns stand on villages; the
    // villages between them are gone, so the night is a battle and not a
    // land rush.
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 15 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 18 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 18 }, present: false },
    ],
  },
  terrain: [
    "^f^^.^...f.f..f.f.ff",
    "f^^..^........f..ff.",
    "f^.ff......f.ff.f.f.",
    "^^.f^...ff...f.ff.ff",
    ".^......ff....f..fff",
    "^^..ff...ff...f.f...",
    "ff.^^.^f.f^.f^....ff",
    "f.^^^..^.^^^^f^....f",
    ".^^f^...^^f.^^^f...f",
    ".f.f^..^.ff.^^.^f.ff",
    "^^^^f^^^..^^^^f^^ff.",
    "fff.ff^f^..^^^^.f^f.",
    "^f^.^.f..f.x.^..^f..",
    "^.f.f..ff^fx..^f^.ff",
    "...f...ff^^x.^ff^f.f",
    ".........^^^^f..fff.",
    ".........f.f^ff...f^",
    "..........f..f^^...^",
    "f............f..ff^f",
    "f...f...f......ff.ff",
  ],
  resources: [
    "o.oo..rrr...r....rgg",
    ".oo.eor..e..ee.....e",
    ".or.gr.er.e...g..e..",
    "oo...e....r.....g.g.",
    "r.errr.r..ee.rg.....",
    "oo....e.e..rrr.e..r.",
    "g...o.....o..o.rr...",
    "...oor.oro.o..o.....",
    ".o..oe..oo..ooo.e...",
    "....o.......o..o....",
    "oooo.o.o..oooo.oo...",
    ".....g.g.....oo..og.",
    "ogo.o...eg...o...g.r",
    "o....rrg..g.reo...gg",
    "e........o...o..oge.",
    ".rr.....rooo.....gg.",
    ".r.r...ee.r.o.ger..o",
    ".r.eerree..e.......o",
    "......re..r.e......g",
    ".e.rge..gr.er.e.g.g.",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHPPPPPPPPPPPWWWWW",
    "HHHHPPPPPPPPPPPWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHPPPPPPPPPWWWWWW",
    "HHHHHHHHHHHHHHWWWWWW",
    "HHHHHHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHHHHHHWWWW",
    "HHHHHHHHHHHHHHHHHWWW",
    "HHHHHHHHHHHHHHHHHHWW",
    "HHHHHHHHHHHHHHHHHHWW",
    "HHHHHHHHHHHHHHHHHWWW",
    "HPPPPPPHHHHHHHHHWWWW",
    "PPPPPPPPHHHHHHHWWWWW",
    "PPPPPPPPPHHHHHWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
    "PPPPPPPPPPPPPWWWWWWW",
  ],
  villages: [
    { x: 14, y: 3 },
    { x: 17, y: 3 },
    { x: 2, y: 6 },
    { x: 5, y: 18 },
    { x: 17, y: 13 },
  ],
  treasureChests: [
    { x: 14, y: 5 },
    { x: 4, y: 11 },
    { x: 1, y: 14 },
    { x: 0, y: 19 },
  ],
  // </map>
  // The old Graves of the western ridge, where the Marquis's dead rise.
  graves: [
    { x: 3, y: 8 },
    { x: 1, y: 11 },
    { x: 3, y: 12 },
    { x: 5, y: 13 },
  ],
  aiMode: "RIVAL",
  // The whole Pact against the Lodge.
  teams: [0, 1, 1, 1],
  seats: [
    {
      faction: "CULT",
      coins: 10,
      // The egg's worth, less what the night's work has cost already: a
      // Great Summoning wants 18.
      favour: 8,
      // The whole Lodge: Leadership, Harvest Rites (the Offering), Hexers,
      // Stargazers, Familiars, Warding Circles (the Idol Bearer),
      // Mountaineering, Gibbering Masses, and The Stars Are Right (the
      // Great Summoning).
      technologies: [
        "GATHERING",
        "FARMING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
        "ENGINEERING",
        "METALLURGY",
      ],
      cities: [
        {
          name: "Hood Hollow",
          at: { x: 17, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "The Seal-works",
          at: { x: 14, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mr. Pettigrew, Hierophant of the Deep Gate (soon).
        { role: "CAPTAIN", at: { x: 15, y: 5 }, tag: "PETTIGREW", home: 1 },
        // The Lodge's Thing in the Cellar, brought up for the night: its
        // Anchor makes the strand of the cultist it grips count three.
        { role: "JUGGERNAUT", at: { x: 14, y: 6 }, home: 1 },
        { role: "CAPTAIN", at: { x: 13, y: 7 }, home: 1 },
        { role: "CAPTAIN", at: { x: 15, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 13, y: 4 }, home: 1 },
        { role: "CATAPULT", at: { x: 15, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 13, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 14, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 15, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 16, y: 5 } },
        { role: "FIGHTER", at: { x: 16, y: 7 } },
        { role: "MARKSMAN", at: { x: 13, y: 3 } },
        { role: "RAIDER", at: { x: 16, y: 4 } },
        // The rearguard at Hood Hollow.
        { role: "GUARD", at: { x: 17, y: 6 } },
        { role: "FIGHTER", at: { x: 16, y: 6 } },
        { role: "MARKSMAN", at: { x: 17, y: 5 } },
      ],
      // The mountain and its roads, from the Lodge's maps and the Martians'
      // star-chart, kindly lent.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 19, y1: 10 }] },
    },
    {
      // The Deep Gate: the Thane's dwarves at the chain.
      faction: "DWARF",
      coins: 0,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
      ],
      // No Steam Moles under the circle and no Clockwork Gunners or
      // Gyrocopters over it (hand play of CU4 and of this mission: a Gunner
      // on the shelf shot a channeller a turn and the Herald broke loose in
      // the Lodge's own ranks): the wardens meet the Herald with hammers.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 7, y: 3 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Ironbraid Hold",
          at: { x: 2, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Copperstep",
          at: { x: 8, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Thane's Brass Titan stands on the Gate itself.
        { role: "JUGGERNAUT", at: { x: 7, y: 3 } },
        { role: "SWORDSMAN", at: { x: 8, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 2 } },
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "SWORDSMAN", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 6 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 5 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 19, y1: 10 }] },
      // Nine keep the Gate; the rest play their own game.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 6, y0: 2, x1: 8, y1: 4 }],
        garrison: 9,
      },
    },
    {
      // Marshal Steele's Rangers, every one in the north.
      faction: "ORIGINAL",
      coins: 2,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
      ],
      cities: [
        {
          name: "Camp Concord",
          at: { x: 17, y: 16 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Ranger Post",
          at: { x: 8, y: 18 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "KNIGHT", at: { x: 17, y: 16 } },
        { role: "KNIGHT", at: { x: 16, y: 16 } },
        { role: "FIGHTER", at: { x: 17, y: 17 } },
        { role: "FIGHTER", at: { x: 16, y: 17 } },
        { role: "MARKSMAN", at: { x: 18, y: 17 } },
        { role: "KNIGHT", at: { x: 8, y: 18 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 18 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 18 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 10, y0: 0, x1: 19, y1: 19 }] },
      // The Rangers march on the fourth night.
      directive: [{ kind: "NORMAL", untilRound: 3 }, { kind: "RUSH" }],
    },
    {
      // The Marquis's dead, over the western ridge.
      faction: "UNDEAD",
      coins: 2,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
      ],
      forbiddenTechnologies: ["FORESTRY", "SAWMILLING", "FIELDCRAFT"],
      cities: [
        {
          name: "Gallows Cross",
          at: { x: 2, y: 14 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Lantern Hill", at: { x: 2, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "KNIGHT", at: { x: 2, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 15 } },
        { role: "FIGHTER", at: { x: 1, y: 13 } },
        { role: "MARKSMAN", at: { x: 3, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 1, y: 9 }, home: 1 },
        { role: "RAIDER", at: { x: 0, y: 9 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 19, y1: 10 }] },
      // The dead play their own game, then storm the Seal-works from the
      // sixth night.
      directive: [
        { kind: "NORMAL", untilRound: 5 },
        { kind: "ASSAULT", target: { x: 14, y: 6 } },
      ],
    },
  ],
  // More Rangers up the southern road on the eighth and fourteenth nights.
  reinforcements: [
    {
      seat: 2,
      round: 8,
      units: [
        { role: "KNIGHT", at: { x: 13, y: 18 } },
        { role: "KNIGHT", at: { x: 12, y: 18 } },
        { role: "FIGHTER", at: { x: 13, y: 19 } },
        { role: "MARKSMAN", at: { x: 12, y: 19 } },
      ],
    },
    {
      seat: 2,
      round: 14,
      units: [
        { role: "KNIGHT", at: { x: 13, y: 18 } },
        { role: "KNIGHT", at: { x: 12, y: 18 } },
        { role: "CATAPULT", at: { x: 13, y: 19 } },
        { role: "FIGHTER", at: { x: 12, y: 19 } },
      ],
    },
  ],
  landmarks: [
    { tag: "DEEP_GATE", at: { x: 7, y: 3 } },
    { tag: "HOOD_HOLLOW", at: { x: 17, y: 6 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Deep Gate by round 20 (dawn). The stars: by round 14, and Pettigrew
  // lives.
  objective: {
    kind: "CAPTURE",
    places: ["DEEP_GATE"],
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 14 },
      { kind: "UNIT_ALIVE", unit: "PETTIGREW" },
    ],
  },
};
