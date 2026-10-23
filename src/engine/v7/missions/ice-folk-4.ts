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
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 22.4, not
 * play-tested): a thin start. Whitewater and Frostford are both level 2,
 * Icemoor is gone, five units instead of nine, four technologies, 3 Coins,
 * a small reveal; the villages by Whitewater are gone. The Wardens have a
 * level 2 camp, nine riders and 6 Coins, the sweets a level 2 camp and
 * eight, both march from round 1, and six announced waves (rounds 3, 4,
 * 6, 8, 10 and 12) come from the two sides in turn. The clock is 13 (was
 * 16).
 *
 * The fourth retune (`pulp_wars-hmyk.31`, CAMPAIGN.md section 22.5,
 * hand-played): Whitewater is level 3 behind walls and Frostford level 2,
 * the villages by Whitewater are back, six units (a second Snow Hunter),
 * six technologies (Hunting and Marksmanship back), 5 Coins. The Wardens
 * have eight riders and rifles (four Knights, three Marksmen, a Fighter)
 * and 4 Coins, the sweets eight with a Gumball Gunner and 3 Coins; both
 * still march from round 1, and two announced waves are left (the sweets
 * in round 6, the Wardens in round 8). The hold stays 13 rounds.
 */
export const ICE_FOLK_4_V7: MissionDefinitionV7 = {
  id: "ICE_FOLK_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start against
  // two marching armies and six waves.
  // Revision 4 (`pulp_wars-hmyk.31`, the fourth retune): eased toward
  // the middle.
  revision: 4,
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
      // Retune 3: a thin start. Rime (freeze the lakes) known; Black Ice is
      // one research away. Retune 4: Hunting and Marksmanship back, 5
      // Coins, Whitewater at level 3 behind walls.
      coins: 5,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
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
      ],
      units: [
        // Mother Rime, the Ice Witch.
        { role: "CAPTAIN", at: { x: 5, y: 3 }, tag: "RIME" },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        // Retune 4: Whitewater's Snow Hunter is back.
        { role: "MARKSMAN", at: { x: 5, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 4 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 5 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 4 }, home: 1 },
      ],
      // The Snow Line's north banks, and nothing beyond the lakes.
      reveal: { radius: 2, rects: [{ x0: 0, y0: 3, x1: 15, y1: 6 }] },
    },
    {
      // The Crown's Harvest Wardens (not Steele's Rangers).
      faction: "ORIGINAL",
      coins: 4,
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
        // Retune 4: three rifles (hand play: a wall of Musk Oxen kept every
        // Knight off; a shot from two tiles draws no Frostbite).
        { role: "MARKSMAN", at: { x: 7, y: 12 } },
        { role: "MARKSMAN", at: { x: 8, y: 13 } },
        // Retune 3: two more Knights, two more Fighters (retune 4: one is a
        // rifle, the other is gone).
        { role: "KNIGHT", at: { x: 7, y: 11 } },
        { role: "KNIGHT", at: { x: 6, y: 12 } },
        { role: "MARKSMAN", at: { x: 8, y: 14 } },
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
      coins: 3,
      technologies: ["SCOUTING"],
      cities: [
        {
          name: "Sugar Camp",
          at: { x: 12, y: 4 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 12, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 4 } },
        // Retune 3: two more Fighters and a Raider.
        { role: "FIGHTER", at: { x: 10, y: 5 } },
        { role: "RAIDER", at: { x: 9, y: 5 } },
        // Retune 4: a rifle of sugar.
        { role: "MARKSMAN", at: { x: 10, y: 3 } },
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
  // Retune 3: six announced waves, the sweets over the eastern hills in
  // rounds 3, 6 and 10, the Wardens up the west shore in rounds 4, 8 and
  // 12. Retune 4: two, the sweets in round 6 and the Wardens in round 8.
  reinforcements: [
    {
      seat: 2,
      round: 6,
      line: "A column of sweets crosses the eastern hills at a run.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 3 } },
        { role: "GUARD", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 11, y: 4 } },
        { role: "RAIDER", at: { x: 10, y: 5 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      line: "More Wardens. The Crown has sent the horses this time.",
      announce: true,
      units: [
        { role: "KNIGHT", at: { x: 1, y: 10 } },
        { role: "MARKSMAN", at: { x: 2, y: 11 } },
        { role: "FIGHTER", at: { x: 0, y: 11 } },
        { role: "MARKSMAN", at: { x: 2, y: 10 } },
      ],
    },
  ],
  landmarks: [
    { tag: "WHITEWATER", at: { x: 4, y: 2 } },
    { tag: "FROSTFORD", at: { x: 7, y: 4 } },
  ],
  forbiddenTechnologies: [],
  // Thirteen rounds, and neither Snow Line town may fall. The stars: no
  // city lost, and Rime lives.
  objective: {
    kind: "SURVIVE",
    rounds: 13,
    protect: [{ place: "WHITEWATER" }, { place: "FROSTFORD" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "RIME" }],
  },
};
