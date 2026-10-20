import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_6` "The Winter Crown" (docs/product/SAGA.md section 3.7, I6; the
 * Ice Folk campaign, `pulp_wars-hmyk.10`). The Heart of Winter must be set on
 * the summit before the Long Night, and Mother Rime will carry it: bring
 * her onto the summit by round 20. Step 6 of 6, the finale. A frail witch
 * walks a long climb under attack from both sides: the Grey Lodge holds the
 * eastern slopes beside the road and strikes whatever passes, and the
 * Unquiet climb out of the barrows on the western slopes in rounds 4, 8
 * and 12. Thane Ironbraid's dwarves hold the Deep Gate on the road and fight
 * beside you; no unit enters an ally's land, so the road skirts its walls.
 * A Musk Ox freezes whoever strikes it from the next tile; a Mammoth's blow
 * also hits the two enemies beside its target; Rime's Cold Snap freezes
 * every enemy beside her.
 *
 * The board is the map generator's (Dry Land 20, four seats, seed 1): the
 * Ice Folk's towns in the north, the Hollow Mountain's peaks in the middle
 * with the summit, the Lodge's ruins, among them; the Deep Gate on the road
 * up; the Lodge's camps on the eastern slopes, the barrows in the west.
 *
 * ```text
 *      x 0123456789ABCDEF0123
 * y  1   f^^..^....E...f..ff.      E: the Ember Lodge
 *    2   f^.ff......f.ff.f.f.
 *    3   ^^Wf^..Rff...f.ff.ff      W: Whitefang; R: Rime Camp
 *    4   .^......ff....f..fff
 *    5   ^^..ff...ff...c.f...      c: a treasure chest
 *    6   ff.^^.^fGf^.f^L..Hff      G: the Deep Gate; L, H: the Lodge's camps
 *    7   f.^^^..^.^^^^f^....f
 *    8   .^^f^...^^f.^^^f...f
 *    9   .fBf^..^.ffS^^.^f.ff      B: Barrow Hill; S: the Summit
 *   10   ^^^^f^^^..^^^^f^^ff.
 * ```
 */
export const ICE_FOLK_6_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_6",
  revision: 1,
  seed: 20261606,
  // <map>
  size: 20,
  source: {
    mapType: "DRY_LAND",
    size: 20,
    seats: 4,
    seed: 1,
    // The Ember Lodge, Whitefang, the Deep Gate, the Lodge's camp and
    // Barrow Hill stand on villages; the villages round the slopes and the
    // barrows are gone (each would be a free town for the Lodge or the
    // dead).
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 17, y: 13 }, present: false },
      // Hand play: taken on the road up, this village gave the Witch a town
      // and its snow halfway to the summit.
      { kind: "VILLAGE", at: { x: 11, y: 6 }, present: false },
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
    { x: 11, y: 9 },
    { x: 14, y: 15 },
    { x: 1, y: 18 },
    { x: 5, y: 18 },
    { x: 8, y: 18 },
    { x: 11, y: 18 },
    { x: 14, y: 18 },
  ],
  improvements: [
    // The Deep Gate's mines in the peaks beside it.
    { at: { x: 7, y: 7 }, improvement: "MINE" },
    { at: { x: 9, y: 7 }, improvement: "MINE" },
  ],
  treasureChests: [
    { x: 14, y: 5 },
    { x: 4, y: 11 },
    { x: 1, y: 14 },
    { x: 0, y: 19 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 8,
      // Leadership, Sleds, Snow Hunters, Deep Winter (the Musk Ox) and
      // Brittle (Breach, Shatter at 4, and Blast Mountain). No Engineering
      // (hand play: with it the Witch walked straight over the peaks to the
      // summit in nine rounds).
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "Rime Camp",
          at: { x: 7, y: 3 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Whitefang",
          at: { x: 2, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Ember Lodge",
          at: { x: 10, y: 1 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mother Rime, the Ice Witch, with the Heart of Winter.
        { role: "CAPTAIN", at: { x: 7, y: 4 }, tag: "RIME" },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "GUARD", at: { x: 8, y: 4 } },
        { role: "SWORDSMAN", at: { x: 6, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 3 } },
        { role: "MARKSMAN", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 3 }, home: 1 },
        { role: "MARKSMAN", at: { x: 3, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 1 }, home: 2 },
        { role: "RAIDER", at: { x: 10, y: 2 }, home: 2 },
      ],
      // The climb to the summit.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 4, x1: 15, y1: 10 }] },
    },
    {
      // The Grey Lodge on the eastern slopes.
      faction: "CULT",
      coins: 2,
      // Enough Favour for a Horror at once.
      favour: 4,
      // Leadership (the Summoner), Hexers and Familiars.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
      ],
      cities: [
        {
          name: "Slope Camp",
          at: { x: 14, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Eastwatch", at: { x: 17, y: 6 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 14, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 7 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "MARKSMAN", at: { x: 15, y: 8 } },
        { role: "MARKSMAN", at: { x: 15, y: 6 } },
        { role: "RAIDER", at: { x: 13, y: 5 } },
        { role: "GUARD", at: { x: 14, y: 9 } },
        { role: "FIGHTER", at: { x: 17, y: 6 }, home: 1 },
        { role: "RAIDER", at: { x: 16, y: 7 }, home: 1 },
        // The ambush below the summit, on the western path.
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "MARKSMAN", at: { x: 10, y: 8 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 2, x1: 15, y1: 11 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
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
      // They hold the slopes beside the road and strike whatever passes.
      directive: {
        kind: "HOLD",
        zone: [
          { x0: 12, y0: 4, x1: 16, y1: 10 },
          { x0: 8, y0: 8, x1: 10, y1: 9 },
        ],
      },
    },
    {
      // The Unquiet in the barrows on the western slopes.
      faction: "UNDEAD",
      coins: 0,
      technologies: [],
      cities: [
        { name: "Barrow Hill", at: { x: 2, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "FIGHTER", at: { x: 1, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 12, y1: 11 }] },
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
      // The dead climb for the nearest living town.
      directive: { kind: "RUSH" },
    },
    {
      // Thane Ironbraid's dwarves at the Deep Gate.
      faction: "DWARF",
      coins: 2,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 8, y: 6 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 7 } },
        { role: "MARKSMAN", at: { x: 9, y: 6 } },
        { role: "MARKSMAN", at: { x: 7, y: 6 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 4, x1: 15, y1: 10 }] },
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
      // The dwarves hold the Deep Gate's land.
      directive: { kind: "HOLD", zone: [{ x0: 7, y0: 5, x1: 9, y1: 7 }] },
    },
  ],
  teams: [0, 1, 1, 0],
  // The Unquiet climb out of the barrows in rounds 4, 8 and 12 (hand play:
  // in rounds 6, 10 and 14 they came too late for the road).
  reinforcements: [
    {
      seat: 2,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 8 } },
        { role: "GUARD", at: { x: 6, y: 8 } },
      ],
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "SWORDSMAN", at: { x: 7, y: 8 } },
        { role: "GUARD", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "CAPTAIN", at: { x: 5, y: 9 } },
      ],
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "SWORDSMAN", at: { x: 7, y: 8 } },
        { role: "GUARD", at: { x: 6, y: 8 } },
        { role: "FIGHTER", at: { x: 6, y: 9 } },
        { role: "FIGHTER", at: { x: 5, y: 8 } },
      ],
    },
  ],
  landmarks: [{ tag: "SUMMIT", at: { x: 11, y: 9 }, name: "The Summit" }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Rime onto the summit by round 20. The stars: by round 16, and no city
  // lost.
  objective: {
    kind: "ESCORT",
    unit: "RIME",
    to: "SUMMIT",
    within: 0,
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 16 }, { kind: "KEEP_CITIES" }],
  },
};
