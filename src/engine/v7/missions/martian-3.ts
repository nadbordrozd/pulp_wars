import type { MissionDefinitionV7 } from "./types";

/**
 * `MARTIAN_3` "The Glass Ship" (docs/product/SAGA.md section 3.6, M3; the
 * Martian campaign, `pulp_wars-hmyk.7`). The star-drive core of the Glass
 * Ship is too heavy to fly: a Tripod carries it out of the Crater on the
 * dinosaur island, through the jungle and across the strait to Ray
 * Hollow, while the island's tribes come for it. Step 3 of 6: an escort
 * through charging beasts and a strait with a Plesiosaur in it (one
 * torpedo sinks a Tripod afloat). A Tripod strides through Forest and
 * Shallow Water and self-launches anywhere; with Hover Pods its foot
 * escort can launch from any beach too, no Port needed, so the crossing
 * can start where the beasts are not.
 *
 * The board is the map generator's (Archipelago 16, seed 22). The beasts'
 * island is in the west, jungle round the Crater in its heart, Tarpit on
 * its northern shore; the strait runs between the islands, deep but for a
 * shallow ford in the south; Ray Hollow stands at the eastern end of the
 * ford, on the south-western tip of the eastern island.
 *
 * The landing camp in the Crater is a camp of units, not a town: a Saucer
 * beams a Tripod down from beside any town of yours, so a town in the
 * Crater (or a beasts' town by the ford, once taken) carried the core
 * across in one turn in hand play. The strait is wider than a Beam Down
 * reaches, so the core crosses afloat: in two steps over the ford, or
 * (with Navigation) over the deep water.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  2   ~.~~~~~~~~f~~.~~
 *    3   .~.~~~~~~.~~~~~.
 *    4   .~...~~~~f.~.v$.      v: villages   $: a treasure chest
 *    5   ^~ffT~~~~^~....^      T: Tarpit
 *    6   f......~~~~.....
 *    7   ...f~~~~~~~..v.f
 *    8   ^.fCf.~~~~..ff.^      C: the Crater
 *    9   f.ffff~~~~..fff^
 *   10   .fffff~~~.^.f.v.
 *   11   .fff.ff~~.~R^~^~      R: Ray Hollow
 *   12   ff~~~.f~~~^~~~~~
 * ```
 */
export const MARTIAN_3_V7: MissionDefinitionV7 = {
  id: "MARTIAN_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261603,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 2,
    seed: 22,
    edits: [
      // Tarpit stands on the northern village; the two western villages
      // and the chest by Tarpit would hand the beasts more towns and a
      // Raptor.
      { kind: "VILLAGE", at: { x: 4, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 9 }, present: false },
      { kind: "CHEST", at: { x: 3, y: 6 }, present: false },
      // Ray Hollow stands on the village at the end of the ford.
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~.~~~~~~~~f~~.~~",
    ".~.~~~~~~.~~~~~.",
    ".~...~~~~f.~..f.",
    "^~ff.~~~~^~....^",
    "f......~~~~.....",
    "...f~~~~~~~....f",
    "^.f.f.~~~~..ff.^",
    "f.ffff~~~~..fff^",
    ".fffff~~~.^.f...",
    ".fff.ff~~.~.^~^~",
    "ff~~~.f~~~^~~~~~",
    "~~~~~~~~~~~~~~^~",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...pp.p..p.....p",
    ".p..p.......pp..",
    ".r...........e..",
    "..r.s....r..s.se",
    ".sr.e..p.g......",
    ".........o.r.er.",
    "g.e.e.r..s...re.",
    ".e....s...pe...g",
    "....grs..s.e...o",
    "..g.g.p..se.g..o",
    "eg..gg..seoe....",
    "r.gge.gs..s.o.o.",
    ".g.ss.g..s......",
    "ssp...s...s..so.",
    "....pp..........",
    "...p............",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "WPPPPPPPPPPPPPPP",
    "WWWWPPPPPPPPPPPP",
    "WWWWWWPPPPPPPPHH",
    "WWWWWWPPPPPPPHHH",
    "WWWWWWPPPPPPHHHH",
    "WWWWWWWPPHPHHPHP",
    "WWPPPWWPPPHPPPPP",
    "PPPPPPPPPPPPPPHP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 13, y: 4 },
    { x: 13, y: 7 },
    { x: 14, y: 10 },
  ],
  treasureChests: [{ x: 14, y: 4 }],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "MARTIAN",
      coins: 6,
      technologies: [
        "SCOUTING",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
        "SHORECRAFT",
        "SEAMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Ray Hollow",
          at: { x: 11, y: 11 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 11 } },
        { role: "RAIDER", at: { x: 11, y: 10 } },
        // The Core-Walker, a Tripod with the star-drive core.
        { role: "CATAPULT", at: { x: 3, y: 8 }, tag: "CORE_WALKER" },
        { role: "FIGHTER", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 4, y: 8 } },
        { role: "MARKSMAN", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 9 } },
      ],
      // The Crater, the strait and Ray Hollow.
      reveal: {
        radius: 2,
        rects: [{ x0: 1, y0: 4, x1: 13, y1: 12 }],
      },
    },
    {
      // The island's tribes.
      faction: "DINOSAUR",
      coins: 0,
      technologies: ["HUNTING", "SCOUTING", "SHORECRAFT", "NAVIGATION"],
      cities: [
        {
          name: "Tarpit",
          at: { x: 4, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 5 } },
        { role: "RAIDER", at: { x: 2, y: 3 } },
        { role: "RAIDER", at: { x: 0, y: 4 } },
        { role: "SWORDSMAN", at: { x: 3, y: 4 } },
        { role: "MARKSMAN", at: { x: 4, y: 4 } },
        // A hunting party in the southern jungle, by the ford.
        { role: "FIGHTER", at: { x: 5, y: 12 } },
        { role: "RAIDER", at: { x: 4, y: 11 } },
        // The Plesiosaur of the strait: one torpedo sinks a Tripod afloat.
        { role: "SUBMARINE", at: { x: 8, y: 9 } },
      ],
      // The Crater and Ray Hollow across the water.
      reveal: { radius: 2, rects: [{ x0: 1, y0: 6, x1: 12, y1: 12 }] },
      // The beasts hate the strangers: every free beast goes for them, down
      // to the shore that faces Ray Hollow.
      directive: { kind: "RUSH" },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "ROADS",
        "COMMERCE",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
    },
  ],
  forbiddenTechnologies: [],
  landmarks: [{ tag: "RAY_HOLLOW", at: { x: 11, y: 11 } }],
  // More of the island comes out of the jungle for the Crater, and a
  // second Plesiosaur slips into the strait from the north.
  reinforcements: [
    {
      seat: 1,
      round: 3,
      units: [
        { role: "RAIDER", at: { x: 1, y: 11 } },
        { role: "RAIDER", at: { x: 2, y: 11 } },
      ],
    },
    {
      seat: 1,
      round: 5,
      units: [
        { role: "SWORDSMAN", at: { x: 2, y: 4 } },
        { role: "RAIDER", at: { x: 0, y: 4 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [{ role: "SUBMARINE", at: { x: 8, y: 5 } }],
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "KNIGHT", at: { x: 1, y: 10 } },
        { role: "FIGHTER", at: { x: 2, y: 10 } },
      ],
    },
  ],
  // Bring the core home: the Core-Walker within a step of Ray Hollow by
  // round 16 (the saga's 20; hand play crossed in 5). The stars: by round
  // 12, and no city lost.
  objective: {
    kind: "ESCORT",
    unit: "CORE_WALKER",
    to: "RAY_HOLLOW",
    within: 1,
    byRound: 16,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
