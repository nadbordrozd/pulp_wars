import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_5` "Dead Men's Road" (docs/product/CAMPAIGN.md section 9,
 * mission 5; `pulp_wars-v642.2`). You lead the Undead on a 16 x 16 board and
 * bring Doctor Crane, the Marquis's archivist (a Necromancer), from your
 * town in the south-west to the Ironbraid gate, a village in the far
 * north-east, by round 24 (20 before revision 3). An escort: it is lost when the
 * Doctor dies. He is a Necromancer like any other (10 Hit Points, Attack
 * 1, one step a turn): he can Rally the column and Raise the dead of the
 * road's Graves, and each of those costs him his step.
 *
 * The board is the map generator's (Dry Land, seed 9). A mountain wall
 * runs down the middle of it, and nobody in this mission climbs
 * (Engineering is forbidden) except the Ice Folk's Yetis. There are two
 * ways through:
 *
 * - **the pass** (short: nine steps for the Doctor): a gap four tiles wide,
 *   and in it Baron Kessler's toll fort, a walled Human city. Every
 *   toll-man `GUARD`s the fort's nine tiles, and the gap's free tiles are
 *   next to them: the Doctor is in reach for two turns unless the garrison
 *   is broken first;
 * - **the south road** (long: fifteen steps): round the mountain block
 *   below the pass and up through the eastern woods. Nobody stands on it:
 *   the Ice Folk raiders `HOLD` their camp in the south-east corner until
 *   round 6 and then `RUSH`, so that a column that sets out at once meets
 *   them about where the road passes the camp.
 *
 * More raiders come down from the snowline onto the plain before the gate
 * in rounds 9 and 13. The clock and the raiders are what stop the player
 * from killing everything first: every round spent makes the far side of
 * the mountains worse. The two enemy seats are one team.
 *
 * Hand play (CAMPAIGN.md section 11, mission 5) set the rest: two small
 * Undead cities and no giant, a fort and a camp that cannot grow, no
 * roaming toll-men, and villages only in the far north-west.
 *
 * Revision 2 (`pulp_wars-v642.8`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.16): the problem is the fort. Its garrison of
 * seven (two Guards, two Marksmen, three Fighters) breaks a column that
 * walks into the pass, and the Doctor dies to its Marksmen on the way; a
 * Lich outranges them, and with Pestilence (researched, not given: the
 * Undead start with four technologies, not nine) its plague rots the
 * whole garrison, the Ghouls' Carrion finishes the sick, and the Zombies'
 * bites raise the dead toll-men on your side. The fort no longer harvests
 * itself to level 5 (no Gathering), so taking it no longer hands you a
 * giant, and the round 9 raiders bring a Musk Ox.
 *
 * Revision 3 (`pulp_wars-v642.10`, the danger pass, CAMPAIGN.md sections
 * 9.6 and 11.18): the raiders come out in round 3 and storm Gallows Cross,
 * the Doctor's town, until round 10 (`GUARD` of their camp with a Musk Ox,
 * `others: ASSAULT`), then hunt the nearest town (`RUSH`); what the fort
 * trains beyond its seven goes out too (`others: RUSH`). The raiders have
 * no Scouting (no Sled but the one at home, no Sabretooth): a Sled's Bolas
 * froze the Doctor beside the pass and its charge killed him. The clock is
 * round 24 and the star round 20 (were 20 and 16): the raids cost the
 * column four rounds.
 *
 * ```text
 *      x 0123456789012345
 * y  0   f.^.^.^^ff^.....
 *    1   f.v^^v.^..^.....
 *    2   ^^ffff..^f^f..G.      G: the Ironbraid gate
 *    3   ^^ff.f^.f^^....f
 *    4   .fv^^..ff.^.....
 *    5   ..^^^^ff^.^.....
 *    6   .....^.^f...f.f.
 *    7   ....^..^.fff.fff
 *    8   .fH..f^.ffT.^f..      H: your capital; T: the toll fort
 *    9   .......^.f..ff..
 *   10   f........^^^ff..
 *   11   ...x.h...^^^fff.      h: your town, where the Doctor starts
 *   12   ...x.......fff.f
 *   13   ...x.....f.fff..
 *   14   ..........f.f.I.      I: the Ice Folk camp
 *   15   ...^f..f.^^^...f
 * ```
 */
export const FRONTIER_5_V7: MissionDefinitionV7 = {
  id: "FRONTIER_5",
  // Revision 4 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 4,
  seed: 20261105,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 3,
    seed: 9,
    edits: [
      { kind: "VILLAGE", at: { x: 8, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 10 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 1 }, present: false },
    ],
  },
  terrain: [
    "f.^.^.^^ff^.....",
    "f..^^..^..^.....",
    "^^ffff..^f^f...f",
    "^^ff.f^.f^^....f",
    ".f.^^.ff..^.....",
    "..^^^^ff^.^.....",
    ".....^.^f...f.f.",
    "....^..^.fff.fff",
    ".f...f^.ff..^f..",
    ".......^.f..ff..",
    "f........^^^ff..",
    "...x.....^^^fff.",
    "...x.......fff.f",
    "...x.....f.fff..",
    "..........f.f...",
    "...^f..f.^^^...f",
  ],
  resources: [
    "g...o.oo..oere.r",
    "...oo.e.....re.e",
    "oo.g..e.ogo.rr..",
    "oog...or.o.r.r.g",
    "....o.....or.er.",
    ".r.o.o..oror...e",
    "rr.....o...r..g.",
    "ee..o..o.gg...g.",
    "r..r..o......gr.",
    "eree..e...r.gg.e",
    "g..r.rer..oo....",
    ".re....reo.oggg.",
    "r.r.e.re..eg.grg",
    "r.....r..g.....r",
    "..re..re....g..r",
    "..eo..e.eoo.....",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHHHHPPPP",
    "HHHHHHHHHHHPPPPP",
    "HHHHHHHHHHHPPPPP",
    "HHHHHHHHHHHPPPPP",
    "HHHHHHHHHHHPPPPP",
    "PPPHHHHHHHHPPPPP",
    "PPPPHHHHHHHPPPPP",
    "PPPPPHHHHHHPPPPP",
    "PPPPPPHHHHHWWWWW",
    "PPPPPPPHHHWWWWWW",
    "PPPPPPPPPWWWWWWW",
    "PPPPPPPPPWWWWWWW",
    "PPPPPPPPPWWWWWWW",
    "PPPPPPPPPWWWWWWW",
    "PPPPPPPPPWWWWWWW",
    "PPPPPPPPPWWWWWWW",
  ],
  villages: [
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 14, y: 2 },
    { x: 2, y: 4 },
  ],
  treasureChests: [
    { x: 2, y: 2 },
    { x: 11, y: 14 },
  ],
  // </map>
  // The dead of the road: those who would not pay the Baron's toll, and
  // those the snow took. Something for the Doctor to do on the way.
  graves: [
    { x: 7, y: 10 },
    { x: 8, y: 9 },
    { x: 8, y: 12 },
    { x: 10, y: 12 },
    { x: 13, y: 5 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 15,
      // The tree to discover (revision 2): Liches are two technologies
      // away, Pestilence three, Roads one.
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING", "SCOUTING"],
      // Two small cities (hand play, CAMPAIGN.md section 11, mission 5): a
      // level 4 capital with a Land Grant harvested its Fruit to level 5 on
      // the first turn, and an Abomination led the column. This is an
      // escort, not a siege: a giant here costs rounds the clock does not
      // have.
      cities: [
        {
          name: "Lantern Hill",
          at: { x: 2, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Gallows Cross",
          at: { x: 5, y: 11 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Doctor Crane: the escorted unit.
        { role: "CAPTAIN", at: { x: 5, y: 11 }, home: 1, tag: "ARCHIVIST" },
        { role: "GUARD", at: { x: 6, y: 10 }, home: 1 },
        { role: "GUARD", at: { x: 6, y: 11 }, home: 1 },
        { role: "FIGHTER", at: { x: 5, y: 10 } },
        { role: "FIGHTER", at: { x: 6, y: 12 } },
        { role: "RAIDER", at: { x: 7, y: 11 } },
        { role: "MARKSMAN", at: { x: 4, y: 10 } },
        { role: "CATAPULT", at: { x: 4, y: 11 } },
      ],
      // The toll fort in the pass, and the gate beyond the mountains.
      reveal: {
        radius: 2,
        rects: [
          { x0: 8, y0: 5, x1: 12, y1: 9 },
          { x0: 13, y0: 1, x1: 15, y1: 3 },
          // The south road, round the mountain block.
          { x0: 7, y0: 10, x1: 11, y1: 13 },
        ],
      },
    },
    {
      // Baron Kessler's toll-men.
      faction: "ORIGINAL",
      coins: 5,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Kessler's Toll",
          at: { x: 10, y: 8 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
      ],
      units: [
        { role: "GUARD", at: { x: 10, y: 8 } },
        { role: "GUARD", at: { x: 9, y: 8 } },
        { role: "MARKSMAN", at: { x: 11, y: 8 } },
        { role: "MARKSMAN", at: { x: 11, y: 7 } },
        { role: "FIGHTER", at: { x: 10, y: 7 } },
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "FIGHTER", at: { x: 10, y: 9 } },
      ],
      // Revision 3 (`pulp_wars-v642.10`): the Baron's men know where the
      // dead live.
      reveal: {
        radius: 2,
        rects: [
          { x0: 1, y0: 7, x1: 3, y1: 9 },
          { x0: 4, y0: 10, x1: 6, y1: 12 },
        ],
      },
      // No Knights and no siege; no Fruit (revision 2: the fort harvested
      // itself to level 4 on round 1 and handed its captor a giant); and no
      // Lumber Camp, Farm, or Blast Mountain
      // (hand play, CAMPAIGN.md section 11, mission 5): the fort grew to
      // level 5 by round 5 and a Juggernaut stood in the pass, and with
      // Explosives it blasted its own mountains for population (a Juggernaut
      // in round 14) and opened the block that keeps the two roads apart.
      forbiddenTechnologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "FARMING",
        "MILLING",
        "EXPLOSIVES",
      ],
      // Every toll-man guards the fort: in the first hand play two of them
      // roamed, took a village, and killed the column's scout on round 1.
      // Revision 3 (`pulp_wars-v642.10`): what the fort trains beyond its
      // seven goes out to collect the toll.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 9, y0: 7, x1: 11, y1: 9 }],
        garrison: 7,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Ice Folk raiders.
      faction: "ICE_FOLK",
      coins: 5,
      // Revision 3: no Scouting, so no Sled but the one at home (hand play:
      // a Sled's Bolas froze the Doctor beside the pass and its charge
      // killed him, twice).
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      // Walled, in the corner, with a Musk Ox at home. Taking the camp ends
      // the raiders and their waves: it is the south road's fight, and the
      // column that wins it walks the rest of the way.
      cities: [
        {
          name: "Whitefang",
          at: { x: 14, y: 14 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 14, y: 14 } },
        { role: "FIGHTER", at: { x: 14, y: 13 } },
        { role: "FIGHTER", at: { x: 13, y: 14 } },
        { role: "FIGHTER", at: { x: 15, y: 14 } },
        { role: "RAIDER", at: { x: 13, y: 15 } },
        { role: "MARKSMAN", at: { x: 15, y: 13 } },
      ],
      // Revision 3: and the raiders know where Gallows Cross is.
      reveal: { radius: 2, rects: [{ x0: 4, y0: 10, x1: 6, y1: 12 }] },
      // The camp stays small too: no Lumber Camp, Farm, Boulder Yeti, or
      // Blast Mountain.
      forbiddenTechnologies: [
        "FORESTRY",
        "SAWMILLING",
        "FARMING",
        "MILLING",
        "EXPLOSIVES",
        // Revision 3: no Sleds and no Sabretooths.
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
      ],
      // Revision 3 (`pulp_wars-v642.10`): the raiders come out in round 3,
      // not 6, and storm Gallows Cross (the Doctor's town) until round 10,
      // a Musk Ox keeping the camp; then they hunt the nearest town.
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 13, y0: 13, x1: 15, y1: 15 }],
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 13, y0: 13, x1: 15, y1: 15 }],
          garrison: 1,
          others: { kind: "ASSAULT", target: { x: 5, y: 11 } },
          untilRound: 10,
        },
        { kind: "RUSH" },
      ],
    },
  ],
  // The toll-men and the raiders are one side.
  teams: [0, 1, 1],
  // Down from the snowline, onto the far side of the mountains.
  reinforcements: [
    {
      seat: 2,
      round: 9,
      units: [
        { role: "FIGHTER", at: { x: 15, y: 7 } },
        { role: "FIGHTER", at: { x: 15, y: 8 } },
        { role: "FIGHTER", at: { x: 14, y: 8 } },
        { role: "GUARD", at: { x: 15, y: 6 } },
      ],
    },
    {
      seat: 2,
      round: 13,
      units: [
        { role: "FIGHTER", at: { x: 15, y: 5 } },
        { role: "FIGHTER", at: { x: 15, y: 6 } },
        { role: "MARKSMAN", at: { x: 15, y: 4 } },
        { role: "FIGHTER", at: { x: 14, y: 6 } },
      ],
    },
  ],
  // The Naval branch (a dry board), and Engineering with Metallurgy: nobody
  // climbs, so the mountains are a wall (the Yetis are Mountain-born).
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
    "ENGINEERING",
    "METALLURGY",
  ],
  landmarks: [
    { tag: "IRONBRAID_GATE", at: { x: 14, y: 2 }, name: "Ironbraid Gate" },
  ],
  // The Doctor stands next to the gate: the Dwarves open it. He must get
  // there by round 24 (revision 3: four rounds for the raids); the stars are
  // for round 20 and for losing no city.
  objective: {
    kind: "ESCORT",
    unit: "ARCHIVIST",
    to: "IRONBRAID_GATE",
    within: 1,
    byRound: 24,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 20 }, { kind: "KEEP_CITIES" }],
  },
};
