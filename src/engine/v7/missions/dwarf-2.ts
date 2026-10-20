import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_2` "The Iron Peak" (docs/product/SAGA.md section 3.4, D2; the
 * Dwarf campaign, `pulp_wars-hmyk.9`). You lead the dwarves of Copperstep
 * against the Whitefang clan, who sit on the best iron in the north: take
 * the clan's three camps in the ore mountains by round 20. Step 2 of 6.
 * Ice Folk on their own ground: Yetis walk over the peaks, Snow Hunters
 * throw rocks from them, and a Musk Ox freezes whoever hits it up close.
 * The dwarves' answer is underground: a Steam Mole tunnels up to three
 * tiles under anything, peaks included, with a Hammerer riding beside it,
 * and surfaces among the enemy (the eruption hits everyone around it).
 *
 * The board is the map generator's (Dry Land 14, seed 7): the Iron Peak is
 * the mass of ore mountains in the middle and east. Copperstep stands at
 * the valley mouth in the south-west; Tusk Camp on the peak's western
 * shoulder, Gnash's Camp in a pocket in the middle of it, and the Iron Den
 * in a pocket on its eastern side, which no road reaches from the south.
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 20.4, NOT play
 * tested): a skirmish start. Copperstep is level 2 with the Engineer, a
 * Gunner and a Fighter, Drill alone and 3 Coins; the village and the chest
 * beside it are gone and only the three camps' own tiles are explored. The
 * clan has sixteen men (nine hold the camps, the rest march on Copperstep
 * from round 3), Gathering and Hunting, 8 Coins and three announced waves
 * (rounds 4, 7 and 10). The clock is 16 rounds.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   .f...^..^^fff.
 *    1   fvf.vfffff.f..      v: villages
 *    2   .ffffffff.f^.f
 *    3   .f.fffff.^ff.f
 *    4   .v.ffff.f^^f^.
 *    5   ^.ff.f.^^^^...
 *    6   .ff...^.fG^^.^      G: Gnash's Camp
 *    7   f..^.fT^^^^^^f      T: Tusk Camp
 *    8   f..f^^^^^^^^.^
 *    9   ...v^^^^.^^^D.      D: the Iron Den
 *   10   .....^^..^^^f^
 *   11   ..f..^^.f^^^^f
 *   12   ...C..f^^^^.v.      C: Copperstep
 *   13   .....ff..^f..f
 * ```
 */
export const DWARF_2_V7: MissionDefinitionV7 = {
  id: "DWARF_2",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a skirmish start
  // against a clan that marches from round 3.
  revision: 2,
  seed: 20261502,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 7,
    // Copperstep and the three camps stand on villages; the clan's two
    // eastern villages are gone (each was a free town for the clan).
    edits: [
      { kind: "VILLAGE", at: { x: 3, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 6 }, present: false },
      // Retune 3: nothing free beside Copperstep.
      { kind: "VILLAGE", at: { x: 3, y: 9 }, present: false },
      { kind: "CHEST", at: { x: 2, y: 11 }, present: false },
    ],
  },
  terrain: [
    ".f...^..^^fff.",
    "f.f..fffff.f..",
    ".ffffffff.f^.f",
    ".f.fffff.^ff.f",
    "...ffff.f^^f^.",
    "^.ff.f.^^^^...",
    ".ff...^.f.^^.^",
    "f..^.f.^^^^^^f",
    "f..f^^^^^^^^.^",
    "....^^^^.^^^.f",
    ".....^^..^^^f^",
    "..f..^^.f^^^^f",
    "......f^^^^...",
    ".....ff..^f..f",
  ],
  resources: [
    "..............",
    "g..e..g..ge..e",
    "r..gggg....o..",
    "..e..g...og...",
    "e........o..o.",
    "......eoooo...",
    "..ge.r....o..o",
    "ge.o.g.ooo..og",
    "g.r.oooo..oo.o",
    "re..o.ooro...g",
    "..e..oo.r.oo.o",
    "e....oo..oooog",
    "re.....oooo..e",
    "re.re..r......",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWW",
    "PWWWWWWWHHHHHH",
    "PPWWWWWHHHHHHH",
    "PPPHHHHHHHHHHH",
    "PPPHHHHHHHHHHH",
    "PPPHHHHHHHHHHH",
    "PPPHHHHHHHHHHH",
    "PPPPHHHHHHHHHH",
    "PPPPPHHHHHHHHH",
    "PPPPPHHHHHHHHH",
    "PPPPPHHHHHHHHH",
    "PPPPPHHHHHHHHH",
  ],
  villages: [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 1, y: 4 },
    { x: 12, y: 12 },
  ],
  treasureChests: [{ x: 4, y: 0 }],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DWARF",
      // Retune 3: a skirmish start. Three units, Drill alone, 3 Coins.
      coins: 3,
      technologies: ["DRILL"],
      cities: [
        {
          name: "Copperstep",
          at: { x: 3, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "MARKSMAN", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "CAPTAIN", at: { x: 3, y: 12 } },
      ],
      // The three camps' own tiles (the objective's places must be known);
      // the Iron Peak between is unexplored.
      reveal: {
        radius: 1,
        rects: [
          { x0: 5, y0: 6, x1: 7, y1: 8 },
          { x0: 8, y0: 5, x1: 10, y1: 7 },
          { x0: 11, y0: 8, x1: 13, y1: 10 },
        ],
      },
    },
    {
      // The Whitefang clan under Chief Gnash, disowned by Mother Rime.
      faction: "ICE_FOLK",
      // Retune 3: sixteen men, 8 Coins, Gathering and Hunting.
      coins: 8,
      // Hand play: with Crafting and Mining the camps grew to level 3 and
      // walled themselves in by round 3. The clan learns little: Gathering
      // and Hunting only (retune 3); its Yetis throw rocks from the peaks
      // anyway (they are Mountain-born).
      technologies: ["GATHERING", "HUNTING"],
      cities: [
        { name: "Gnash's Camp", at: { x: 9, y: 6 }, level: 1, rewards: [] },
        { name: "Tusk Camp", at: { x: 6, y: 7 }, level: 1, rewards: [] },
        { name: "Iron Den", at: { x: 12, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        // Chief Gnash, a Mammoth of a man.
        { role: "SWORDSMAN", at: { x: 8, y: 6 } },
        { role: "GUARD", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "MARKSMAN", at: { x: 7, y: 6 } },
        { role: "GUARD", at: { x: 6, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 9 }, home: 2 },
        { role: "FIGHTER", at: { x: 11, y: 9 }, home: 2 },
        { role: "MARKSMAN", at: { x: 12, y: 10 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 10, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 10 }, home: 2 },
        { role: "MARKSMAN", at: { x: 12, y: 8 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 10, x1: 5, y1: 13 }] },
      // Yetis and Musk Oxen only: no Snow Hunters beyond the three on the
      // peaks, no Sleds, Witches, Sabretooths or giants' kin.
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
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
      // Each camp keeps three on the peak beside it; from round 3 the
      // rest of the clan marches on Copperstep.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 8, y0: 5, x1: 10, y1: 7 },
            { x0: 5, y0: 6, x1: 7, y1: 8 },
            { x0: 11, y0: 8, x1: 13, y1: 10 },
          ],
          garrison: 9,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 8, y0: 5, x1: 10, y1: 7 },
            { x0: 5, y0: 6, x1: 7, y1: 8 },
            { x0: 11, y0: 8, x1: 13, y1: 10 },
          ],
          garrison: 9,
          others: { kind: "RUSH" },
        },
      ],
    },
  ],
  // The clan's warbands come down off the ridge.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 5 } },
        { role: "MARKSMAN", at: { x: 12, y: 5 } },
        { role: "GUARD", at: { x: 13, y: 5 } },
      ],
      line: "Yetis come down off the ridge, howling the clan's name.",
      announce: true,
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "SWORDSMAN", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 8, y: 4 } },
        { role: "FIGHTER", at: { x: 8, y: 3 } },
        { role: "MARKSMAN", at: { x: 6, y: 4 } },
      ],
      line: "Gnash's own warband follows its Mammoth over the peaks.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "GUARD", at: { x: 11, y: 5 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "MARKSMAN", at: { x: 13, y: 5 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "MARKSMAN", at: { x: 8, y: 4 } },
      ],
      line: "The Whitefang send the grandmothers. This is not a good sign.",
      announce: true,
    },
  ],
  landmarks: [
    { tag: "TUSK_CAMP", at: { x: 6, y: 7 } },
    { tag: "GNASHS_CAMP", at: { x: 9, y: 6 } },
    { tag: "IRON_DEN", at: { x: 12, y: 9 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The three camps by round 16 (it was 20). The stars: by round 13, and
  // no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["TUSK_CAMP", "GNASHS_CAMP", "IRON_DEN"],
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 13 }, { kind: "KEEP_CITIES" }],
  },
};
