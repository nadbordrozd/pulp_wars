import type { MissionDefinitionV7 } from "./types";

/**
 * `ICE_FOLK_4` "A Year Without Summer" (docs/product/SAGA.md section 3.7,
 * I4; the Ice Folk campaign, `pulp_wars-hmyk.10`). Winter comes down three
 * months early and the lowlands fight the snow: the Crown's Harvest Wardens
 * ride up from the south to burn the snow-shrines, and Sugarcrest, whose
 * people crack in a frost, marches from the east to stop the snowline at the
 * lakes. Hold the two Snow Line towns for sixteen rounds. Step 4 of 6. Two
 * fronts and two very different enemies: a Rushed sweet moves and hits
 * harder for one turn and then Crashes, and a Crashed sweet cannot attack
 * on its next turn, which is the moment to push it back; the Wardens'
 * Knights ride over anything left alone in the open. Your ice is a trap:
 * an enemy that steps onto it (with Black Ice) is Frozen.
 *
 * The board is the map generator's (Lakes 16, three seats, seed 3): two
 * lakes make the Snow Line across the middle, with three fords: the west
 * shore, the neck between the lakes, and the eastern woods. Whitewater and
 * Frostford stand on the north bank, Icemoor at the west ford; the
 * Wardens' camp is in the south, Sugarcrest's field camp in the eastern
 * hills.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   .v..f..v^fv^^v^^      v: villages
 * y  2   ....W...^^ff^^^.      W: Whitewater
 *    3   ....c..^^^f^.^^^      c: a treasure chest
 *    4   .I.~~f.Fffff$^^f      I: Icemoor; F: Frostford; $: the sweets
 *    5   f..~~~~...f^.^^.
 *    6   f..~~~~..f~~~^^^
 *    7   .v.~~~~vf.~~~vff
 *    8   f..~~~~..~~~~f..
 *    9   ..f~~~~.~~~~~.^f
 *   10   ff.~~~~.c~~~~vff
 *   11   ff...fv.f~~~~.f.
 *   12   .....f...H~~~fff      H: the Wardens' camp
 *   13   ............^vff
 *   14   ......v...f..f.f
 * ```
 */
export const ICE_FOLK_4_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_4",
  revision: 1,
  seed: 20261604,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 3,
    seed: 3,
    // Icemoor and Frostford stand on villages; the villages south of the
    // Snow Line are gone (hand play: the Wardens and the sweets settled
    // five of them and trained a Knight a turn from the Coins).
    edits: [
      { kind: "VILLAGE", at: { x: 1, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 14 }, present: false },
    ],
  },
  terrain: [
    "ff.f..f.^ff.^^ff",
    "....f...^f.^^.^^",
    "........^^ff^^^.",
    ".......^^^f^.^^^",
    "...~~f..ffff.^^f",
    "f..~~~~...f^.^^.",
    "f..~~~~..f~~~^^^",
    "...~~~~.f.~~~.ff",
    "f..~~~~..~~~~f..",
    "..f~~~~.~~~~~.^f",
    "ff.~~~~..~~~~.ff",
    "ff...f..f~~~~.f.",
    ".....f....~~~fff",
    "............^.ff",
    "..........f..f.f",
    "......f...ffff..",
  ],
  resources: [
    "....r..eo...oo.g",
    "e..r.r..og.o...o",
    "reee...eoo...ooe",
    ".r.e..r.oo..r...",
    "..e..g..g....o.g",
    "........e.goroo.",
    ".....psre..s.ooo",
    "..e.ppp..es.s..g",
    "..r...s.es..s..r",
    ".e.s.ppe.p.....g",
    "..r..s...p.....g",
    ".....g.e.s..srgr",
    ".rrrrge.r..ps..g",
    "rrr.eerrere....g",
    "err.e...r.g.e...",
    ".rrre..ereg.gg..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPHHHHHHHH",
    "PPPPPPPPPHHHHHHH",
    "PPPPPPPPPPHHHHHH",
    "PPPPPPPPPPPPPHHH",
    "PPPPPPPPPPPPPHHW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPPPWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPWWWWWW",
    "PPPPPPPPPPWWWWWW",
  ],
  villages: [
    { x: 1, y: 1 },
    { x: 7, y: 1 },
    { x: 10, y: 1 },
    { x: 13, y: 1 },
  ],
  treasureChests: [
    { x: 4, y: 3 },
    { x: 8, y: 10 },
  ],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ICE_FOLK",
      coins: 6,
      // Rime (freeze the lakes) known; Black Ice is one research away.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "SHORECRAFT",
      ],
      cities: [
        {
          name: "Whitewater",
          at: { x: 4, y: 2 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Frostford",
          at: { x: 7, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Icemoor", at: { x: 1, y: 4 }, level: 1, rewards: [] },
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 5, y: 3 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "MARKSMAN", at: { x: 5, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 5 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 4 }, home: 1 },
        { role: "RAIDER", at: { x: 1, y: 4 }, home: 2 },
        { role: "FIGHTER", at: { x: 1, y: 5 }, home: 2 },
      ],
      // The lakes and the far banks.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 3, x1: 15, y1: 13 }] },
    },
    {
      // The Crown's Harvest Wardens (not Steele's Rangers).
      faction: "ORIGINAL",
      coins: 2,
      technologies: ["SCOUTING", "RAIDING", "CHIVALRY", "HUNTING"],
      cities: [
        {
          name: "Wardens' Camp",
          at: { x: 9, y: 12 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "KNIGHT", at: { x: 8, y: 12 } },
        { role: "KNIGHT", at: { x: 8, y: 11 } },
        { role: "FIGHTER", at: { x: 9, y: 12 } },
        { role: "FIGHTER", at: { x: 7, y: 12 } },
        { role: "MARKSMAN", at: { x: 8, y: 13 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 2, x1: 10, y1: 12 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // They ride round the west shore for Whitewater (hand play: under
      // RUSH they stood off a wall of Musk Oxen for ten rounds).
      directive: { kind: "ASSAULT", target: { x: 4, y: 2 } },
    },
    {
      // Sugarcrest's frost-march.
      faction: "CANDY",
      coins: 2,
      technologies: ["SCOUTING"],
      cities: [
        { name: "Sugar Camp", at: { x: 12, y: 4 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 12, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 4 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 5, y0: 1, x1: 12, y1: 7 }] },
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
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // They march on Frostford, the nearer town.
      directive: { kind: "ASSAULT", target: { x: 7, y: 4 } },
    },
  ],
  teams: [0, 1, 1],
  // More Wardens ride up the west shore in rounds 5 and 10; more sweets
  // come over the eastern hills in rounds 4 and 8.
  reinforcements: [
    {
      seat: 2,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 11, y: 4 } },
      ],
    },
    {
      seat: 1,
      round: 5,
      units: [
        { role: "KNIGHT", at: { x: 1, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 0, y: 11 } },
      ],
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "GUARD", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 11, y: 4 } },
      ],
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "KNIGHT", at: { x: 1, y: 10 } },
        { role: "KNIGHT", at: { x: 2, y: 11 } },
        { role: "MARKSMAN", at: { x: 0, y: 11 } },
      ],
    },
  ],
  landmarks: [
    { tag: "WHITEWATER", at: { x: 4, y: 2 } },
    { tag: "FROSTFORD", at: { x: 7, y: 4 } },
  ],
  forbiddenTechnologies: [],
  // Sixteen rounds, and neither Snow Line town may fall. The stars: no
  // city lost (Icemoor too), and Rime lives.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "WHITEWATER" }, { place: "FROSTFORD" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "RIME" }],
  },
};
