import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_6` "The Deep Gate" (docs/product/CAMPAIGN.md section 9, mission
 * 6; `pulp_wars-v642.2`). You lead the Dwarves on a 14 x 14 board and hold
 * the Deep Gate for 14 rounds. Medium. A hold-out: the mission is lost when
 * the Deep Gate falls.
 *
 * The board is the map generator's (Dry Land, seed 18). The Deep Gate
 * stands in a pocket of the western mountains with two doors: the east
 * door, two Forest tiles, and the south door past your town. The Dwarves
 * own Mining and walk the mountains; the Baron's Humans may not
 * (Engineering is forbidden to their seat) and must come through a door.
 * The Ice Folk's Yetis are Mountain-born: they come straight over the
 * peaks from the north, and from a peak they throw rocks two tiles down
 * into the pocket. That is the siege: whatever stands in the open is
 * shelled, the peaks have to be contested, and the Thane (an Engineer:
 * she Tends, Assembles, and Barricades) has to be kept out of reach.
 *
 * Both enemies come in waves (three each, the last with a giant), and the
 * player's relief arrives in round 9. Land Grants and Farming are forbidden
 * to everybody: the pocket has no land to give, so a Brass Titan comes
 * only from a Monument (the Explorer's, with a Gyrocopter; the Muster's,
 * with six kinds of unit), and the enemy camps field no giant of their
 * own. Hand play (CAMPAIGN.md section 11, mission 6) set these.
 *
 * Revision 2 (`pulp_wars-v642.8`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.16): less is given. You start without Hunting and
 * Clockwork (more Gunners, which fire twice when they hold still, are two
 * technologies away) and research Blasting Charges yourself: Blast
 * Mountain brings a peak down on the Yetis on it and beside it. A garrison
 * that marches out to meet the waves is shelled from the peaks and the
 * Deep Gate falls by round 6; one that holds the doors and blasts the
 * peaks lasts the fourteen rounds.
 *
 * ```text
 *      x 01234567890123
 * y  0   .^ff^f^f..f...
 *    1   f^^.yy.^......      y, h: the Ice Folk war band
 *    2   .f^hy.^^......
 *    3   ^..^f.^^.^.I.f      I: the Ice Folk camp
 *    4   ^.^^^^^^f^^f..
 *    5   ^^^.MM^^f..fff      M: the Deep Gate's Mines
 *    6   ^^vf.D.^.^^.ff      D: the Deep Gate; v: a village in the rock
 *    7   ^^^^..#^fffff.      #: a Field Defense
 *    8   f^^^^.#Ef.ff.f      E: the east door
 *    9   ^^^^^t^E..^^..      t: your town
 *   10   ^^^^..#^..f...
 *   11   ^^^^^^^S.ff.H.      S: the south door; H: the Baron's camp
 *   12   ^..^..^f.f...^
 *   13   .ff^f...^f..ff
 * ```
 */
export const FRONTIER_6_V7: MissionDefinitionV7 = {
  id: "FRONTIER_6",
  // Revision 3 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 3,
  seed: 20261106,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 3,
    seed: 18,
    edits: [
      { kind: "VILLAGE", at: { x: 5, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 12 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 12 }, present: false },
      { kind: "CHEST", at: { x: 5, y: 7 }, present: false },
    ],
  },
  terrain: [
    ".^ff^f^f..f...",
    "f^^....^......",
    ".f^...^^......",
    "^..^f.^^.^...f",
    "^.^^^^^^f^^f..",
    "^^^.^^^^f..fff",
    "^^.f...^.^^.ff",
    "^^^^..f^fffff.",
    "f^^^^.fff.ff.f",
    "^^^^^.^f..^^..",
    "^^^^...^..f...",
    "^^^^^^^..ff...",
    "^..^..^f.f...^",
    ".ff^f...^f..ff",
  ],
  resources: [
    ".oggogo.r..e..",
    ".oo...eoree.e.",
    ".go...oo.errrr",
    ".r.og..o.o....",
    "oro.o....oo..e",
    "ooo.oo.og.egg.",
    "oo.ge..o.o..gg",
    "o..o...og.gg.r",
    "..o.o..ggeg.rg",
    "..ooo..g....r.",
    "ooooe....r....",
    "o.o.oooe....r.",
    "o..o...g..e.ro",
    "...o........gg",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHPPPPPPP",
    "HHHHHHHHPPPPPP",
    "HHHHHHHHHPPPPP",
    "HHHHHHHHHHPPPP",
    "HHHHHHHHHHHPPP",
    "HHHHHHHHHHHWWW",
    "HHHHHHHHHHWWWW",
    "HHHHHHHHHWWWWW",
    "HHHHHHHHWWWWWW",
    "HHHHHHHWWWWWWW",
    "HHHHHHHWWWWWWW",
    "HHHHHHHWWWWWWW",
    "HHHHHHHWWWWWWW",
    "HHHHHHHWWWWWWW",
  ],
  villages: [{ x: 2, y: 6 }],
  treasureChests: [{ x: 13, y: 11 }],
  // </map>
  // The two doors of the pocket, from the inside: a Field Defense works
  // only on its owner's land.
  fieldDefenses: [
    { x: 6, y: 7 },
    { x: 6, y: 8 },
    { x: 6, y: 10 },
  ],
  // The Deep Gate's Mines.
  improvements: [
    { at: { x: 4, y: 5 }, improvement: "MINE" },
    { at: { x: 5, y: 5 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DWARF",
      coins: 10,
      // What the opening needs (revision 2): Mining for the peaks and the
      // Mines, Dig In and the Steam Mole, and the Thane's Leadership.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "DRILL",
        "ENGINEERING",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "The Deep Gate",
          at: { x: 5, y: 6 },
          level: 4,
          rewards: ["STOCKPILE", "WALLS", "BOOM"],
        },
        {
          name: "Copperstep",
          at: { x: 5, y: 9 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Thane Brunhild Ironbraid.
        { role: "CAPTAIN", at: { x: 5, y: 6 }, tag: "THANE" },
        { role: "FIGHTER", at: { x: 6, y: 7 } },
        { role: "FIGHTER", at: { x: 6, y: 8 } },
        { role: "MARKSMAN", at: { x: 6, y: 6 } },
        { role: "GUARD", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 6, y: 10 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 9 }, home: 1 },
      ],
      // The pocket, its doors, the peaks north of it, and the Baron's camp.
      reveal: {
        radius: 2,
        rects: [
          { x0: 3, y0: 1, x1: 6, y1: 4 },
          { x0: 2, y0: 5, x1: 3, y1: 7 },
          { x0: 7, y0: 7, x1: 11, y1: 10 },
          { x0: 10, y0: 10, x1: 12, y1: 12 },
        ],
      },
    },
    {
      // Mother Rime's Ice Folk, north of the peaks.
      faction: "ICE_FOLK",
      coins: 5,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      // The camp is far off and walled (a first camp three tiles north of
      // the gate could be taken in round 4): taking it ends the Ice Folk and
      // their waves, and it is meant to cost more than holding out.
      cities: [
        {
          name: "Rime Camp",
          at: { x: 11, y: 3 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 11, y: 3 } },
        { role: "FIGHTER", at: { x: 10, y: 3 } },
        // The war band, already under the peaks.
        { role: "FIGHTER", at: { x: 4, y: 1 } },
        { role: "FIGHTER", at: { x: 5, y: 1 } },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "MARKSMAN", at: { x: 3, y: 2 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 1, x1: 7, y1: 8 }] },
      // `pulp_wars-v642.5`: the middle rounds were quiet (a RUSH seat does
      // not storm a prepared line), so from round 5 to round 10 the Ice
      // Folk assault the Deep Gate itself.
      directive: [
        { kind: "RUSH", untilRound: 5 },
        { kind: "ASSAULT", target: { x: 5, y: 6 }, untilRound: 11 },
        { kind: "RUSH" },
      ],
    },
    {
      // Baron Kessler's hired guns, in the valley to the south-east.
      faction: "ORIGINAL",
      coins: 5,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Bullion",
          at: { x: 11, y: 11 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 11, y: 11 } },
        { role: "FIGHTER", at: { x: 10, y: 11 } },
        { role: "FIGHTER", at: { x: 10, y: 10 } },
        { role: "MARKSMAN", at: { x: 11, y: 10 } },
        { role: "RAIDER", at: { x: 12, y: 11 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 5, x1: 8, y1: 11 }] },
      // The Humans do not climb: they come through a door.
      forbiddenTechnologies: ["ENGINEERING", "METALLURGY"],
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 8, y0: 8, x1: 13, y1: 13 }],
          untilRound: 6,
        },
        // `pulp_wars-v642.5`: and so do the Baron's men, rounds 6 to 10.
        { kind: "ASSAULT", target: { x: 5, y: 6 }, untilRound: 11 },
        { kind: "RUSH" },
      ],
    },
  ],
  // The waves. The Ice Folk come down the peaks north of the gate in rounds
  // 3, 7 and 11 (the last with a Frost Giant); the Baron's men come up to
  // the east door in rounds 6, 9 and 12 (the last with a Juggernaut and a
  // Catapult); your relief comes up the deep roads in round 9. The Baron's
  // waves arrive one or two steps from the door on purpose (hand play,
  // CAMPAIGN.md section 11, mission 6): the Normal AI does not walk a
  // column up to a prepared line, so a wave that arrived four steps away
  // never attacked.
  // The briefing's hints give the rounds, so that nothing arrives unseen.
  reinforcements: [
    {
      seat: 1,
      round: 3,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
      ],
    },
    {
      seat: 2,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "FIGHTER", at: { x: 8, y: 10 } },
        { role: "MARKSMAN", at: { x: 9, y: 10 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 2 } },
        { role: "CATAPULT", at: { x: 5, y: 3 } },
      ],
    },
    {
      seat: 0,
      round: 9,
      units: [
        { role: "SWORDSMAN", at: { x: 3, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "MARKSMAN", at: { x: 4, y: 7 } },
      ],
    },
    {
      seat: 2,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "GUARD", at: { x: 8, y: 10 } },
        { role: "MARKSMAN", at: { x: 9, y: 10 } },
        { role: "MARKSMAN", at: { x: 9, y: 8 } },
      ],
    },
    {
      seat: 1,
      round: 11,
      units: [
        { role: "JUGGERNAUT", at: { x: 5, y: 3 } },
        { role: "CATAPULT", at: { x: 5, y: 2 } },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
      ],
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "JUGGERNAUT", at: { x: 8, y: 9 } },
        { role: "FIGHTER", at: { x: 8, y: 10 } },
        { role: "CATAPULT", at: { x: 9, y: 9 } },
      ],
    },
  ],
  // The Naval branch: a dry board. And Land Grants and Farming (hand play,
  // CAMPAIGN.md section 11, mission 6): with the ore of a wider territory,
  // or a Farm in each city, the Dwarves had two Brass Titans by round 5 and
  // nothing dared attack them. In the rock there is no land to grant or to
  // plough: a Titan comes from a Monument (explore, or field six kinds of
  // unit), and the enemy camps stay small.
  forbiddenTechnologies: [
    "PLANNING",
    "FARMING",
    "MILLING",
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "DEEP_GATE", at: { x: 5, y: 6 } }],
  // Fourteen rounds, and the Deep Gate must not fall. The stars are for
  // losing no city (the town at the south door too) and for the Thane.
  objective: {
    kind: "SURVIVE",
    rounds: 14,
    protect: [{ place: "DEEP_GATE" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "THANE" }],
  },
};
