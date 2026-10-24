import type { MissionDefinitionV7 } from "./types";

/**
 * `CANDY_5` "The Dream Door" (docs/product/SAGA.md section 3.8, C5; the
 * Candy campaign, `pulp_wars-hmyk.11`). Sugarcrest is a dream, dreamed by a
 * sleeper under a mountain, and the dream is going sour. The Martians have
 * found a door, a pair of Dimensional Gates; walk Queen Praline through,
 * and through the nightmare on the other side, to the Dreaming Palace.
 * Step 5 of 6: two halves of a board joined only by the Gates (saga
 * extension E1, CAMPAIGN.md section 10.9), and a far half where the enemy
 * is everywhere. A unit that steps onto a gate comes out of the other one,
 * shoving aside whoever stands there; hold the far gate first, then move
 * the Queen, and break Gingerbread Men off her crust to guard her flanks.
 *
 * The board is the map generator's (Continents 16, seed 4): two continents
 * and the strait between them. Nobody sails (the naval branch is
 * forbidden), so the Gates are the only way across. Sugarcrest and
 * Riftwatch are on the western shore, with the near gate in the hills
 * above them; the far shore is the dream side, a stale grey mirror of the
 * kingdom held by the dead, with the far gate at its northern end and the
 * Dreaming Palace by the crack in its south-east. The dead learn Liches;
 * the Palace keeps four at home (`GUARD`) and the rest roam; three waves
 * rise round the dream. Hand play (CAMPAIGN.md, the Candy campaign's
 * section): with the far gate in the woods beside the Palace the Queen
 * stood two tiles from it in round 4; on the final board a Queen who
 * walks south alone is shot to pieces by two Liches, and a Pie Launcher on
 * our shore can shoot across the strait.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~ff..^~~~~~~~f~~
 *    2   ~^....f~~~~f^f~~
 *    3   ~ff..f.~~fG.fO~~      G: Grey Gumdrop; O: the far gate
 *    4   ~....^~~~ff...~~
 *    5   ~f..Of~~~.fff.~~      O: the near gate
 *    6   ~~f....~~.f..~~~
 *    7   ~~~$...~~fff.~~~      $: treasure chests
 *    8   ~~S...R~~.f^fff~      S: Sugarcrest; R: Riftwatch
 *    9   ~f....f~~.f.x.P~      x: the crack; P: the Dreaming Palace
 *   10   ~~.^^~~~~f^.x.~~
 *   11   ~~$^v~~~~H..x.~~      H: Sour Hollow; v: a village
 *   12   ~v^f~~.~~^^...~~
 *   13   ~^.f~~~~~....^~~
 *   14   ~~~~~~.~~~~~~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 21.4, not
 * play-tested): a thin start. Sugarcrest alone at level 2 (Riftwatch is
 * gone) with Queen Praline, Madame Nougat, a Fighter and the old Pie
 * Launcher, four technologies and 3 Coins; only the Palace is seen. The
 * dead have seventeen units and 6 Coins, four hold the Palace and the rest
 * rush, and five announced waves rise in rounds 4, 7, 10, 13 and 15. The
 * clock is 16 (was 20).
 *
 * The fourth retune (`pulp_wars-hmyk.32`, CAMPAIGN.md section 21.5,
 * hand-played): Riftwatch back, Praline, Madame Nougat, a Fighter, the
 * Pie, a Gunner and a Marshmallow, six technologies, 5 Coins. The dead
 * have nine units and 2 Coins; each holds its own ground (the Palace, the
 * far gate, Grey Gumdrop, Sour Hollow) until round 6, and then six hold the
 * Palace and the rest rush. No waves. The clock is 18 (the stars: 14).
 */
export const CANDY_5_V7: MissionDefinitionV7 = {
  id: "CANDY_5",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a thin start across
  // the door.
  // Revision 3 (`pulp_wars-hmyk.32`, the fourth retune): Riftwatch and a
  // Gunner back, fewer dead, no waves, a little more time.
  revision: 3,
  seed: 20261805,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 4,
    // Sugarcrest, Riftwatch and the dead's three towns stand on villages;
    // the village in the dream side's north-east would hand them a fourth.
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 3 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~ff..^~~~~~~~f~~",
    "~^....f~~~~f^f~~",
    "~ff..f.~~f..f.~~",
    "~....^~~~ff...~~",
    "~f...f~~~.fff.~~",
    "~~f....~~.f..~~~",
    "~~~....~~fff.~~~",
    "~~.....~~.f^fff~",
    "~f....f~~.f.x..~",
    "~~.^^~~~~f^.x.~~",
    "~~f^.~~~~...x.~~",
    "~.^f~~.~~^^...~~",
    "~^.f~~~~~....^~~",
    "~~~~~~.~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    ".......p..pp..p.",
    ".g..eo.p...s..s.",
    "s.e.......s.o...",
    "..gee.r....r...p",
    "..r...s...gee...",
    "s.er..s..e.g.rs.",
    "p..e..r.prg.rs..",
    ".p...er..gg.....",
    "...r.r.s.rg..g.p",
    "..rr.e.s..g.....",
    ".seoo.....or.esp",
    ".s........r...s.",
    "..o....s..ore...",
    ".o.gp....r....sp",
    "p..s.....s...s..",
    ".p...p.p.p...pp.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPWPP",
    "PPPPPPPPPPPWWWPP",
    "PPPPPPPPPPPWWWPP",
    "PPPPPPPPPPWWWWPP",
    "PPPPPPPPPWWWWWPP",
    "PPPPPPPPPWWWWPPP",
    "PPPPPPPPPWWWWPPP",
    "PPPPPPPPPWWWWWWP",
    "PPPPPPHPPHWWWWWP",
    "PPHHHPPPPHPPPPPP",
    "PPHHHPPPPHPPPPPP",
    "PHHHPPHPPHPPPPPP",
    "PHHHPPPPPHPPPPPP",
    "PPPPPPHPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 4, y: 11 },
    { x: 1, y: 12 },
  ],
  treasureChests: [
    { x: 3, y: 7 },
    { x: 2, y: 11 },
  ],
  // </map>
  // Sugarcrest's candy-cane wood.
  improvements: [{ at: { x: 1, y: 9 }, improvement: "LUMBER_CAMP" }],
  // The door the Martians found: one gate in the hills above Sugarcrest,
  // its partner in the dream's woods.
  curiosities: [
    { kind: "GATES", at: { x: 4, y: 5 }, partner: { x: 13, y: 3 } },
  ],
  // The old graves round the Dreaming Palace, for its Necromancer.
  graves: [
    { x: 13, y: 11 },
    { x: 11, y: 9 },
    { x: 13, y: 12 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CANDY",
      // Retune 4: 5 Coins and six technologies (retune 3: 3 and four; was
      // 8 and nine), Riftwatch back.
      coins: 5,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Sugarcrest",
          at: { x: 2, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Riftwatch", at: { x: 6, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        // Queen Praline, going to see for herself.
        { role: "JUGGERNAUT", at: { x: 3, y: 8 }, tag: "PRALINE" },
        // Madame Nougat, who read the recipe to the end.
        { role: "CAPTAIN", at: { x: 2, y: 8 }, tag: "NOUGAT" },
        { role: "FIGHTER", at: { x: 3, y: 9 } },
        { role: "CATAPULT", at: { x: 2, y: 9 } },
        { role: "MARKSMAN", at: { x: 5, y: 7 }, home: 1 },
        // Retune 4: a Marshmallow to hold the far gate.
        { role: "GUARD", at: { x: 4, y: 7 }, home: 1 },
      ],
      // The near gate, and the far gate and the Palace as the Martians
      // saw them from above (retune 3: no more of the far side).
      reveal: {
        radius: 2,
        rects: [
          { x0: 3, y0: 4, x1: 5, y1: 6 },
          { x0: 12, y0: 2, x1: 14, y1: 4 },
          { x0: 13, y0: 8, x1: 14, y1: 10 },
        ],
      },
    },
    {
      // The nightmares: the dream side's dead.
      faction: "UNDEAD",
      coins: 2,
      // Liches (Hunting, Forestry, Sawmilling) and nothing more.
      technologies: ["HUNTING", "FORESTRY", "SAWMILLING"],
      cities: [
        {
          name: "Dreaming Palace",
          at: { x: 14, y: 9 },
          level: 1,
          rewards: [],
        },
        { name: "Grey Gumdrop", at: { x: 10, y: 3 }, level: 1, rewards: [] },
        { name: "Sour Hollow", at: { x: 9, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        // The Palace's watch: a Zombie on the throne-room floor and a
        // Necromancer among the old graves (retune 4: its Lich gone; Sour
        // Hollow keeps one).
        { role: "GUARD", at: { x: 14, y: 9 } },
        { role: "CAPTAIN", at: { x: 13, y: 9 } },
        { role: "FIGHTER", at: { x: 14, y: 8 } },
        // The watch on the far gate.
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "GUARD", at: { x: 13, y: 4 } },
        { role: "FIGHTER", at: { x: 10, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 11 }, home: 2 },
        { role: "CATAPULT", at: { x: 11, y: 11 }, home: 2 },
        // Retune 3's six more nightmares and a second Necromancer; retune
        // 4 keeps one of them.
        { role: "FIGHTER", at: { x: 9, y: 10 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 9, y0: 3, x1: 14, y1: 12 }] },
      // Nightmares learn nothing.
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
      // Retune 4: every nightmare keeps to its own ground (the Palace, the
      // far gate, Grey Gumdrop and Sour Hollow) for five rounds; then the
      // Palace keeps its watch of six (retune 3) and the rest of the dead
      // rush whatever they can reach, the gate's far end first.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 13, y0: 8, x1: 14, y1: 10 },
            { x0: 12, y0: 2, x1: 14, y1: 4 },
            { x0: 9, y0: 2, x1: 11, y1: 5 },
            { x0: 9, y0: 10, x1: 12, y1: 12 },
          ],
          garrison: 10,
          untilRound: 6,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 13, y0: 8, x1: 14, y1: 10 }],
          garrison: 6,
          others: { kind: "RUSH" },
          fromRound: 6,
        },
      ],
    },
  ],
  landmarks: [{ tag: "DREAMING_PALACE", at: { x: 14, y: 9 } }],
  // Nobody sails the strait: the Gates are the only way across.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Praline beside the Dreaming Palace by round 18 (the saga's 24: the
  // thoughtful win came in round 14; retune 3: 16). The stars: by round 14,
  // and Madame Nougat lives.
  objective: {
    kind: "ESCORT",
    unit: "PRALINE",
    to: "DREAMING_PALACE",
    within: 1,
    byRound: 18,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 14 },
      { kind: "UNIT_ALIVE", unit: "NOUGAT" },
    ],
  },
};
