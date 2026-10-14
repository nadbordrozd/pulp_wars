import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_3` "Green Tide" (docs/product/CAMPAIGN.md section 9, mission
 * 3). You lead the Goblins against the Undead on a dry 16 x 16 board. A
 * build-up mission: you start with one camp in the hills, three units and
 * no technology, and the Undead are established on the high plain with
 * three towns. They `HOLD` the plain until the new moon (round 12), then
 * march (`NORMAL`); a wave leaves the Barrow in round 16. Taking the Barrow
 * by round 26 wins the mission.
 *
 * Revision 4 (`pulp_wars-v642.7`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.15): the board is the map generator's (Dry Land
 * 16, seed 23). The Undead hold the north: the Barrow in the north-east,
 * Gravesend and Cairnholm in the north-west; six villages are removed (two
 * are the Undead towns, four would hand the dead a free empire). Your camp,
 * Wolfden, sits in ore-rich hills with its Land Grant; seven villages lie
 * between it and the plain. The problem: an economy first (Mines feed a
 * camp in the hills, a level 5 camp sends a Troll), the march of the dead
 * at the new moon, and then the Barrow's ring, which a thrown Goblin's
 * Kaboom breaks open for the Trolls.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ^f^^f^..ff...f^.
 *    1   fff.^..fff.....f
 *    2   ...fu.^........^      u: Cairnholm (west) and Gravesend
 *    3   ..^.f.ff.+^.....      +: Graves
 *    4   f.+^f...f.f.B...      B: the Barrow
 *    5   .v..vf.u.+..f...      v: villages
 *    6   ...............f
 *    7   .....x.f......f.      x: the Rift
 *    8   .....x.^..v..v.^
 *    9   .....x...f......
 *   10   ........^f....^.
 *   11   f......^.^f^^v.^
 *   12   f.....^f.f^ff..^
 *   13   ....^f.^f^G^ff^.      G: Wolfden, your camp
 *   14   fv..v..vf^..^fv^
 *   15   ^..^^..^^...ff..
 * ```
 */
export const FRONTIER_3_V7: MissionDefinitionV7 = {
  id: "FRONTIER_3",
  revision: 4,
  seed: 20261103,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 2,
    seed: 23,
    edits: [
      { kind: "VILLAGE", at: { x: 4, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
    ],
  },
  terrain: [
    "^f^^f^..ff...f^.",
    "fff.^..fff.....f",
    "...f..^........^",
    "..^.f.ff..^.....",
    "f..^f...f.f.....",
    ".....f......f...",
    "...............f",
    ".....x.f......f.",
    ".....x.^.......^",
    ".....x...f......",
    "........^f....^.",
    "f......^.^f^^..^",
    "f.....^f.f^ff..^",
    "....^f.^f^.^ff^.",
    "f.......f^..^f.^",
    "^..^^..^^...ff..",
  ],
  resources: [
    ".g....r..g..rg.r",
    "..g...eg.g..r.r.",
    ".........ee.e...",
    "eroe....r...rr..",
    "..r..e.........e",
    "r........errg..e",
    "r.r....rr.r.rreg",
    "..r.e.e..e.e.e..",
    "er.ee.eoer.r....",
    "r.e.r..ee.eeere.",
    ".eee.e.r.g....o.",
    ".e.r..e.ro.oo..o",
    "...ereo.........",
    "r.r.og.o.o....o.",
    "g.ee....gorrog.o",
    ".re.or.oo.r....r",
  ],
  biome: "PLAINS",
  biomes: [
    "WWWWWWWWWWWPPPPP",
    "WWWWWWWWWWPPPPPP",
    "PWWWWWWWWPPPPPPP",
    "PPWWWWWWPPPPPPPP",
    "PPPWWWWPPPPPPPPP",
    "PPPPWWPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPHHHHHHHHH",
    "PPPPPPHHHHHHHHHH",
    "PPPPPHHHHHHHHHHH",
    "PPPPHHHHHHHHHHHH",
    "PPPHHHHHHHHHHHHH",
  ],
  villages: [
    { x: 1, y: 5 },
    { x: 4, y: 5 },
    { x: 10, y: 8 },
    { x: 13, y: 8 },
    { x: 13, y: 11 },
    { x: 1, y: 14 },
    { x: 4, y: 14 },
    { x: 7, y: 14 },
    { x: 14, y: 14 },
  ],
  treasureChests: [
    { x: 6, y: 4 },
    { x: 12, y: 12 },
  ],
  // </map>
  graves: [
    { x: 9, y: 3 },
    { x: 2, y: 4 },
    { x: 9, y: 5 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 5,
      // Nothing researched: the horde's first technology is free.
      technologies: [],
      cities: [
        {
          name: "Wolfden",
          at: { x: 10, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
          // The hills leave little open ground: the camp has its grant.
          landGrant: true,
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 10, y: 13 } },
        { role: "FIGHTER", at: { x: 9, y: 12 } },
        { role: "RAIDER", at: { x: 11, y: 12 } },
      ],
      // Your camp, and the Barrow seen from the hills.
      reveal: { radius: 2, rects: [{ x0: 11, y0: 3, x1: 13, y1: 5 }] },
    },
    {
      faction: "UNDEAD",
      coins: 0,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "The Barrow",
          at: { x: 12, y: 4 },
          level: 3,
          rewards: ["SURVEY", "WALLS"],
        },
        {
          name: "Gravesend",
          at: { x: 7, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Cairnholm",
          at: { x: 4, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 4, y: 2 }, home: 2 },
      ],
      reveal: { radius: 2 },
      // Hand play (CAMPAIGN.md section 11.15): the Necromancer's Rally, the
      // Banshees' Wail and the Ghouls' charges won every skirmish at the
      // plain's edge before the horde could grow, and a Barrow that grew
      // to level 5 fielded an Abomination. No Necromancers, Banshees or
      // Ghouls, and no harvests or Farms for the dead.
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
      ],
      // The high plain until the new moon; then the dead march.
      directive: {
        kind: "HOLD",
        zone: [{ x0: 0, y0: 0, x1: 15, y1: 5 }],
        untilRound: 12,
      },
    },
  ],
  // The new moon: the Barrow empties its crypts.
  reinforcements: [
    {
      seat: 1,
      round: 16,
      units: [
        { role: "FIGHTER", at: { x: 11, y: 3 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "CATAPULT", at: { x: 14, y: 3 } },
      ],
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "BARROW", at: { x: 12, y: 4 } }],
  // Take the Barrow before the moon wanes.
  objective: {
    kind: "CAPTURE",
    places: ["BARROW"],
    byRound: 26,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 20 }, { kind: "KEEP_CITIES" }],
  },
};
