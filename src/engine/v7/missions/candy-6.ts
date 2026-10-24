import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_6` "Sweet Dreams" (docs/product/SAGA.md section 3.8, C6; the Candy
 * campaign, `pulp_wars-hmyk.11`). The Long Night is weeks away and the
 * nightmares know it: they pour out of the Rift toward Sugarcrest, the last
 * sweet thing they have not soured, while the Sweet-tooth horde comes back
 * from the east to help itself. Hold Sugarcrest for eighteen nights and
 * keep the choir singing until the Ashen Marquis arrives with the Lullaby;
 * the Martians of Red Dust stand on their own walls across the lake. Step 6
 * of 6: a long siege on two fronts. A Confectioner bakes fallen sweets back
 * from their Crumbs, so a line that dies near her comes back; a Jawbreaker
 * is Rock Hard; the Gingerbread Giant breaks off Gingerbread Men when the
 * walls need bodies.
 *
 * The board is the map generator's (Lakes 16, seed 13, four seats), the
 * same country as the Martian campaign's Red Dust: the great lake in the
 * middle, Sugarcrest and Gumdrop on its southern shore, Riftwatch on the
 * western road below the crack, Red Dust across the water, the nightmares'
 * camps in the hills north of the Rift, and the goblin towns of Sourmash
 * and Spitewood in the east.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   .f.^ff.^........
 *    1   ^^^^.^..........
 *    2   f^^N....f.^f...^      N: Night Camp
 *    3   .f.f....f..f~..f
 *    4   f.^^ffB.....~~...      B: Sour Barrow
 *    5   .$xxx...$~~~~...      x: the Rift; $: treasure chests
 *    6   ......f.~~~~~.Wf      W: Sourmash
 *    7   ...Rf.D....~~fff      R: Riftwatch; D: Red Dust (ally)
 *    8   .....~~~~~..f^ff
 *    9   ....~~~~~~....Pf      P: Spitewood
 *   10   ...~~~~~~~~.f.ff
 *   11   ..f~~~~~~~~~.f..
 *   12   ...~~~~~~~~~~.f.
 *   13   ...vffS.fG.f.fff      S: Sugarcrest; G: Gumdrop; v: a village
 *   14   ...ffff^.ff.^fff
 *   15   .^f.f^...ff^f^ff
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 21.4, not
 * play-tested): a thin start. Sugarcrest keeps its walls (level 3) and
 * Gumdrop its farm (level 2); Riftwatch is gone; Praline, Madame Nougat, a
 * Swordsman and a Guard (four units, not seven), six technologies, 2 Coins,
 * only the two approaches seen. The nightmares have eleven units and 6
 * Coins; the horde ten and 5 Coins, marching on Gumdrop from round 1. The
 * nightmares rise beside Sugarcrest in rounds 4, 7, 10, 13 and 15, the
 * horde comes in rounds 5, 9, 12 and 15, every wave announced. The clock is
 * 15 nights (was 18).
 *
 * The fourth retune (`pulp_wars-hmyk.32`, CAMPAIGN.md section 21.5,
 * hand-played): Forestry and Sawmilling back (eight technologies), a Pie
 * on the walls and Gumdrop's Fighter (six units), 5 Coins. The first
 * nightmares and the first of the horde stand on the board from the start
 * (the dead sixteen, the horde fourteen), and three waves are left: the
 * nightmares in rounds 7 and 13, the horde in round 9. Still 15 nights.
 */
export const CANDY_6_V7: MissionDefinitionV7 = {
  id: "CANDY_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a thin start under
  // nine announced waves.
  // Revision 4 (`pulp_wars-hmyk.32`, the fourth retune): Pie Launchers, a
  // Pie and a Trooper back, 5 Coins, a smaller horde, three waves.
  revision: 4,
  seed: 20261806,
  // <map>
  size: 16,
  source: {
    mapType: "LAKES",
    size: 16,
    seats: 4,
    seed: 13,
    // Every city stands on a village; the villages in the north and by the
    // goblins would hand the besiegers more towns.
    edits: [
      { kind: "VILLAGE", at: { x: 6, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 13 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 13 }, present: false },
    ],
  },
  terrain: [
    ".f.^ff.^........",
    "^^^^.^..........",
    "f^^.....f.^f...^",
    ".f.f....f..f~..f",
    "f.^^ff.....~~...",
    "..xxx....~~~~...",
    "......f.~~~~~.ff",
    "....f......~~fff",
    ".....~~~~~..f^ff",
    "....~~~~~~.....f",
    "...~~~~~~~~.f.ff",
    "..f~~~~~~~~~.f..",
    "...~~~~~~~~~~.f.",
    "....ff..f.ff.fff",
    "...ffff^.ff.^fff",
    ".^f.f^...ff^f^ff",
  ],
  resources: [
    "...o...o....err.",
    "ooo.ro..e..er.re",
    "goo..eer.e.g.rr.",
    "....r.er.r....eg",
    "..o....r..rs.r..",
    ".....rr..pspsee.",
    "..ee...rp...s...",
    ".e.....er.e.p...",
    "e.eeesp...re...g",
    "..rr...p..erre.g",
    ".......ppps..e..",
    ".r.s.p..........",
    "eer....p.pps..g.",
    "r.r....e.....g..",
    "rrrgggg.e..e.g.g",
    "r.gego....gog...",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHPPPPPPPP",
    "HHHHHHHPPPPPPPPP",
    "HHHHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPWWW",
    "PPPPWWWWWWWWWWWW",
    "PPPWWWWWWWWWWWWW",
    "PPWWWWWWWWWWWWWW",
  ],
  villages: [{ x: 3, y: 13 }],
  treasureChests: [
    { x: 1, y: 5 },
    { x: 8, y: 5 },
  ],
  // </map>
  // Sugarcrest's sugar-beet Farm, candy-cane wood and lake jetties.
  improvements: [
    { at: { x: 7, y: 13 }, improvement: "FARM" },
    { at: { x: 5, y: 13 }, improvement: "LUMBER_CAMP" },
    { at: { x: 5, y: 12 }, improvement: "PORT" },
    { at: { x: 6, y: 12 }, improvement: "PORT" },
    // Gumdrop's, and Sourmash's stolen one.
    { at: { x: 8, y: 14 }, improvement: "FARM" },
    { at: { x: 13, y: 5 }, improvement: "FARM" },
  ],
  // The old graves north of the Rift.
  graves: [
    { x: 1, y: 4 },
    { x: 5, y: 3 },
    { x: 4, y: 6 },
  ],
  aiMode: "RIVAL",
  teams: [0, 1, 1, 0],
  seats: [
    {
      faction: "CANDY",
      // Retune 4: 5 Coins and eight technologies, Pie Launchers back
      // (retune 3: 2 and six; was 0 and eleven).
      coins: 5,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 6, y: 13 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        {
          name: "Gumdrop",
          at: { x: 9, y: 13 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Queen Praline, armed, on her walls.
        { role: "JUGGERNAUT", at: { x: 7, y: 13 }, tag: "PRALINE" },
        { role: "CAPTAIN", at: { x: 6, y: 13 } },
        { role: "SWORDSMAN", at: { x: 5, y: 13 } },
        { role: "GUARD", at: { x: 9, y: 13 }, home: 1 },
        // Retune 4: the Pie on the walls and Gumdrop's Trooper back.
        { role: "CATAPULT", at: { x: 6, y: 14 } },
        { role: "FIGHTER", at: { x: 10, y: 13 }, home: 1 },
      ],
      // The two approaches, west and east of the lake (retune 3).
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 9, x1: 5, y1: 12 },
          { x0: 10, y0: 9, x1: 15, y1: 12 },
        ],
      },
    },
    {
      // The nightmares, out of the Rift.
      faction: "UNDEAD",
      coins: 6,
      technologies: ["HUNTING", "FORESTRY", "SAWMILLING"],
      cities: [
        { name: "Night Camp", at: { x: 3, y: 2 }, level: 1, rewards: [] },
        { name: "Sour Barrow", at: { x: 6, y: 4 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 3, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 3 } },
        { role: "GUARD", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 6, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 5, y: 4 }, home: 1 },
        { role: "CATAPULT", at: { x: 7, y: 3 }, home: 1 },
        // Retune 3: five more nightmares.
        { role: "FIGHTER", at: { x: 4, y: 1 } },
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "GUARD", at: { x: 5, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 4 }, home: 1 },
        { role: "CATAPULT", at: { x: 3, y: 3 } },
        // Retune 4: retune 3's round-4 wave on the western shore from the
        // start.
        { role: "FIGHTER", at: { x: 1, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 12 } },
        { role: "FIGHTER", at: { x: 1, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 13 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 4, x1: 15, y1: 15 }] },
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
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // Every nightmare goes for Sugarcrest.
      directive: { kind: "ASSAULT", target: { x: 6, y: 13 } },
    },
    {
      // The Sweet-tooth horde, back with friends.
      faction: "GOBLIN",
      coins: 5,
      technologies: [],
      cities: [
        {
          name: "Sourmash",
          at: { x: 13, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Spitewood", at: { x: 14, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
        { role: "RAIDER", at: { x: 14, y: 5 } },
        { role: "GUARD", at: { x: 14, y: 6 } },
        { role: "FIGHTER", at: { x: 14, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 9 }, home: 1 },
        // Retune 3: four more goblins.
        { role: "FIGHTER", at: { x: 13, y: 4 } },
        { role: "FIGHTER", at: { x: 12, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 14, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 14, y: 4 } },
        // Retune 4: retune 3's round-5 wave on the eastern road from the
        // start.
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 14, y: 13 } },
        { role: "RAIDER", at: { x: 14, y: 14 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 9, x1: 15, y1: 15 }] },
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
      // They help themselves to Gumdrop from the first round, while the
      // walls are busy, and go for Sugarcrest itself from round 8 (retune
      // 3: was round 4 and round 10).
      directive: [
        { kind: "ASSAULT", target: { x: 9, y: 13 }, untilRound: 8 },
        { kind: "ASSAULT", target: { x: 6, y: 13 } },
      ],
    },
    {
      // The Martians of Red Dust, who have stood on these walls before.
      faction: "MARTIAN",
      coins: 2,
      technologies: ["HUNTING", "MARKSMANSHIP", "SCOUTING"],
      cities: [
        {
          name: "Red Dust",
          at: { x: 6, y: 7 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 6, y: 7 } },
        { role: "FIGHTER", at: { x: 7, y: 7 } },
        { role: "MARKSMAN", at: { x: 5, y: 7 } },
        { role: "RAIDER", at: { x: 6, y: 6 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 0, x1: 9, y1: 9 }] },
      // Red Dust holds its own land and nothing more.
      directive: { kind: "HOLD", zone: [{ x0: 5, y0: 6, x1: 7, y1: 7 }] },
    },
  ],
  // The seam of the Rift splits along the western shore: the nightmares
  // come up out of the ground beside Sugarcrest in rounds 4, 7, 10, 13 and
  // 15 (hand play: the dead that start north of the lake took Red Dust and
  // Riftwatch and never came round it), and the horde brings more goblins
  // down the eastern road in rounds 5, 9, 12 and 15. Retune 3: earlier and
  // bigger, and every wave announced. Retune 4: three of the nine are left
  // (the dead in rounds 7 and 13, the horde in round 9).
  reinforcements: [
    {
      seat: 1,
      round: 7,
      line: "More of the dream goes bad: a Lich and his choir of Skeletons.",
      announce: true,
      units: [
        { role: "CATAPULT", at: { x: 1, y: 14 } },
        { role: "GUARD", at: { x: 1, y: 12 } },
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 15 } },
        { role: "FIGHTER", at: { x: 0, y: 13 } },
      ],
    },
    {
      seat: 2,
      round: 9,
      line: "The goblins bring a second helping and their cousins from Spitewood.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 14, y: 14 } },
        { role: "RAIDER", at: { x: 15, y: 13 } },
        { role: "FIGHTER", at: { x: 13, y: 14 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      line: "A Necromancer's whole parish rises on the western shore.",
      announce: true,
      units: [
        { role: "GUARD", at: { x: 1, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 1, y: 14 } },
        { role: "CATAPULT", at: { x: 0, y: 13 } },
        { role: "CATAPULT", at: { x: 0, y: 15 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
      ],
    },
  ],
  landmarks: [{ tag: "SUGARCREST", at: { x: 6, y: 13 } }],
  // Nobody sails the lake.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Fifteen rounds, and Sugarcrest must not fall. The stars: Praline
  // lives, and no city lost.
  objective: {
    kind: "SURVIVE",
    rounds: 15,
    protect: [{ place: "SUGARCREST" }],
    bonus: [{ kind: "UNIT_ALIVE", unit: "PRALINE" }, { kind: "KEEP_CITIES" }],
  },
};
