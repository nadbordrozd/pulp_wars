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
 */
export const CANDY_6_V7: MissionDefinitionV7 = {
  id: "CANDY_6",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
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
      coins: 0,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
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
        { name: "Riftwatch", at: { x: 3, y: 7 }, level: 1, rewards: [] },
      ],
      units: [
        // Queen Praline, armed, on her walls.
        { role: "JUGGERNAUT", at: { x: 7, y: 13 }, tag: "PRALINE" },
        { role: "CAPTAIN", at: { x: 6, y: 13 } },
        { role: "SWORDSMAN", at: { x: 5, y: 13 } },
        { role: "CATAPULT", at: { x: 6, y: 14 } },
        { role: "GUARD", at: { x: 9, y: 13 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 13 }, home: 1 },
        { role: "FIGHTER", at: { x: 3, y: 7 }, home: 2 },
      ],
      reveal: {
        radius: 2,
        rects: [
          { x0: 0, y0: 2, x1: 7, y1: 8 },
          { x0: 10, y0: 5, x1: 15, y1: 12 },
        ],
      },
    },
    {
      // The nightmares, out of the Rift.
      faction: "UNDEAD",
      coins: 2,
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
      coins: 2,
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
      // They help themselves to Gumdrop from round 4, while the walls are
      // busy, and go for Sugarcrest itself from round 10.
      directive: [
        { kind: "NORMAL", untilRound: 4 },
        { kind: "ASSAULT", target: { x: 9, y: 13 }, untilRound: 10 },
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
  // come up out of the ground beside Sugarcrest in rounds 5, 9, 13, 16 and 17
  // (hand play: the dead that start north of the lake took Red Dust and
  // Riftwatch and never came round it), and the horde brings more goblins
  // down the eastern road in rounds 7, 11 and 15.
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 12 } },
        { role: "FIGHTER", at: { x: 1, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 14 } },
      ],
    },
    {
      seat: 2,
      round: 7,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 14, y: 13 } },
        { role: "RAIDER", at: { x: 14, y: 14 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "GUARD", at: { x: 1, y: 12 } },
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "CATAPULT", at: { x: 1, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 15 } },
        { role: "CAPTAIN", at: { x: 0, y: 13 } },
      ],
    },
    {
      seat: 2,
      round: 11,
      units: [
        { role: "GUARD", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 14, y: 14 } },
      ],
    },
    {
      seat: 1,
      round: 13,
      units: [
        { role: "GUARD", at: { x: 1, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 1, y: 14 } },
        { role: "CATAPULT", at: { x: 0, y: 12 } },
        { role: "CATAPULT", at: { x: 0, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
      ],
    },
    {
      seat: 1,
      round: 16,
      units: [
        { role: "GUARD", at: { x: 1, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 13 } },
        { role: "FIGHTER", at: { x: 1, y: 14 } },
        { role: "FIGHTER", at: { x: 2, y: 15 } },
        { role: "CATAPULT", at: { x: 0, y: 13 } },
        { role: "CAPTAIN", at: { x: 0, y: 15 } },
      ],
    },
    {
      seat: 1,
      round: 17,
      units: [
        { role: "RAIDER", at: { x: 2, y: 12 } },
        { role: "RAIDER", at: { x: 2, y: 14 } },
        { role: "FIGHTER", at: { x: 1, y: 13 } },
        { role: "GUARD", at: { x: 2, y: 13 } },
      ],
    },
    {
      seat: 2,
      round: 15,
      units: [
        { role: "GUARD", at: { x: 13, y: 13 } },
        { role: "FIGHTER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 14, y: 14 } },
        { role: "RAIDER", at: { x: 15, y: 13 } },
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
  // Eighteen rounds, and Sugarcrest must not fall. The stars: Praline
  // lives, and no city lost.
  objective: {
    kind: "SURVIVE",
    rounds: 18,
    protect: [{ place: "SUGARCREST" }],
    bonus: [{ kind: "UNIT_ALIVE", unit: "PRALINE" }, { kind: "KEEP_CITIES" }],
  },
};
