import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_3` "Green Tide" (docs/product/CAMPAIGN.md section 9, mission
 * 3). You lead the Goblins against the Undead on a dry 16 x 16 board. A
 * build-up mission: you start with one camp in the hills, three units and
 * no technology, and the Undead are established on the high plain with
 * three towns. Taking the Barrow by round 26 wins the mission.
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
 * Revision 5 (`pulp_wars-v642.10`, the danger pass, CAMPAIGN.md sections
 * 9.6 and 11.18): no quiet build-up. The dead hold their plain for three
 * rounds; from round 4 three keep the Barrow (`GUARD` with `others:
 * ASSAULT`) and everything else comes down the hills for Wolfden, with
 * raiding parties out of the hills' old graves in rounds 5 and 9; from the
 * new moon (round 11) they fall back to the plain (`HOLD`), and the Barrow's
 * last crypts open in round 16. Five more villages are gone (the three
 * nearest the camp and the two by the dead towns), the dead towns are
 * level 1, and the dead may not research Liches, Pestilence, Wights or
 * Lumber Camps. The problem: break the raids on your own hills (a Goblin
 * alone in the open is killed and rises on their side, and a Troll that
 * chases the dead into the open is eaten), then march.
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
  revision: 5,
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
      // Revision 5 (`pulp_wars-v642.10`): the three villages nearest the
      // camp, so the horde has to walk for its slots.
      { kind: "VILLAGE", at: { x: 13, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 8 }, present: false },
      // And the two by the dead towns: with them the Undead reached six
      // cities and twenty-five units by round 15.
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 5 }, present: false },
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
    { x: 13, y: 8 },
    { x: 1, y: 14 },
    { x: 4, y: 14 },
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
          level: 1,
          rewards: [],
        },
        {
          name: "Cairnholm",
          at: { x: 4, y: 2 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 5 }, home: 1 },
        { role: "FIGHTER", at: { x: 4, y: 2 }, home: 2 },
      ],
      // Revision 5: the dead know where the camp is.
      reveal: { radius: 2, rects: [{ x0: 9, y0: 12, x1: 11, y1: 14 }] },
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
        // Revision 5: no new Liches and no Pestilence (hand play: two
        // Liches out of sight and the plague killed a Troll a turn).
        "SAWMILLING",
        "EXPLOSIVES",
        "METALLURGY",
        "FORESTRY",
      ],
      // Revision 5 (`pulp_wars-v642.10`): no quiet build-up. Three of the
      // dead keep the Barrow; everything else comes down the hills for
      // Wolfden from the first night, and from the new moon (round 12) for
      // the nearest goblin town.
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 0, y0: 0, x1: 15, y1: 5 }],
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 11, y0: 3, x1: 13, y1: 5 }],
          garrison: 3,
          others: { kind: "ASSAULT", target: { x: 10, y: 13 } },
          untilRound: 11,
        },
        // The new moon: the dead fall back to their plain and wait.
        {
          kind: "HOLD",
          zone: [{ x0: 0, y0: 0, x1: 15, y1: 6 }],
        },
      ],
    },
  ],
  // Revision 5 (`pulp_wars-v642.10`): a raiding party out of the hills'
  // old graves in round 5, the new moon's host in round 12, and the
  // Barrow's last crypts in round 16.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "FIGHTER", at: { x: 11, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 9 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 8, y: 9 } },
        { role: "FIGHTER", at: { x: 12, y: 9 } },
        { role: "GUARD", at: { x: 10, y: 8 } },
      ],
    },
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
