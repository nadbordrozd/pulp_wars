import type { MissionDefinitionV7 } from "./types";

/**
 * `DWARF_1` "Tremors" (docs/product/SAGA.md section 3.4, D1; the Dwarf
 * campaign, `pulp_wars-hmyk.9`). You lead Thane Ironbraid's dwarves and hold
 * Copperstep for twelve rounds while the Grey Shift, miners three hundred
 * years dead, walk out of three old mine mouths in the cliffs around it.
 * Step 1 of 6: the Dwarves from scratch. A Clockwork Gunner that has not
 * moved shoots twice, a Hammerer or Steam Mole that stands still by its own
 * city is dug in (as if fortified), and an Engineer repairs machines by 4
 * and winds up new Gunners. Constructs leave no Graves for the dead.
 *
 * The board is the map generator's (Dry Land 11, seed 7): Highlands, the
 * north all peaks. Copperstep stands in the middle with three ore Mines on
 * its peaks; Slagheap, its smelting hamlet, on the eastern slope; the three
 * mine mouths in the north cliffs, the south-western woods and the southern
 * grass.
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 20.4, NOT play
 * tested): Copperstep stands alone (Slagheap and the village by the Old
 * Drift are gone) with Tobbin, a Fighter and a Gunner, three technologies
 * and 3 Coins, and nothing but the town's own sight is explored. The Grey
 * Shift has twelve dead, 8 Coins and four announced waves (rounds 3, 5, 8
 * and 10) from all four cracks; it still storms Copperstep from round 1.
 * The twelve rounds stay: a shorter hold would be an easier one.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^.f^..^^^ff
 *    1   ^.vffN^^^.f      N: the North Adit
 *    2   ff.^^^^^.f^
 *    3   ^^^.^^^^f..
 *    4   ff^...^^^f^
 *    5   .^.fffC^.Sf      C: Copperstep; S: Slagheap
 *    6   f..ff.^....
 *    7   ^..fff^f...
 *    8   f^.ff^^....
 *    9   f.D.^v..G.f      D: the Old Drift; G: the Grey Stope
 *   10   .f^..fff...      v: villages
 * ```
 */
export const DWARF_1_V7: MissionDefinitionV7 = {
  id: "DWARF_1",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a lean Copperstep
  // against twelve dead and four announced waves.
  revision: 2,
  seed: 20261501,
  // <map>
  size: 11,
  source: {
    mapType: "DRY_LAND",
    size: 11,
    seats: 2,
    seed: 7,
    // Copperstep, Slagheap and two of the mine mouths stand on villages.
    edits: [
      { kind: "VILLAGE", at: { x: 6, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 9 }, present: false },
      // The Grey Stope's mouth: the fruit there is long gone.
      { kind: "RESOURCE", at: { x: 8, y: 9 }, resource: "." },
      // Retune 3: the village below Copperstep is gone.
      { kind: "VILLAGE", at: { x: 5, y: 9 }, present: false },
    ],
  },
  terrain: [
    "^.f^..^^^ff",
    "^..ff.^^^.f",
    "ff.^^^^^.f^",
    "^^^.^^^^f..",
    "ff^...^^^f^",
    ".^.fff.^..f",
    "f..ff.^....",
    "^..fff^f...",
    "f^.ff^^....",
    "f...^.....f",
    ".f^..fff...",
  ],
  resources: [
    "o..o....og.",
    "......ooo..",
    "g.roo.o..go",
    "o.or..ooge.",
    "g...r.oo.go",
    "eo.........",
    "...g..oe.ee",
    ".e..gg.g...",
    ".o.....e..r",
    "...e..ee.r.",
    "r.or..gge.e",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHHH",
    "HHHHHHHHHHH",
    "HHHHHHHHHHH",
    "HHHHHHHHHHP",
    "WWWWHHHHHPP",
    "WWWWWHHHPPP",
    "WWWWWWHPPPP",
    "WWWWWWPPPPP",
    "WWWWWWPPPPP",
    "WWWWWWWPPPP",
    "WWWWWWWWPPP",
  ],
  villages: [{ x: 2, y: 1 }],
  treasureChests: [
    { x: 4, y: 0 },
    { x: 5, y: 10 },
  ],
  // </map>
  // Copperstep's three Mines on its ore peaks.
  improvements: [
    { at: { x: 6, y: 4 }, improvement: "MINE" },
    { at: { x: 7, y: 4 }, improvement: "MINE" },
    { at: { x: 6, y: 6 }, improvement: "MINE" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DWARF",
      // Retune 3: Copperstep alone, three units, three technologies (the
      // Gunner and a way to dig in), 3 Coins.
      coins: 3,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL"],
      cities: [
        {
          name: "Copperstep",
          at: { x: 6, y: 5 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        // Master Engineer Tobbin Copperstep, who does the sums.
        { role: "CAPTAIN", at: { x: 6, y: 5 }, tag: "TOBBIN" },
        { role: "FIGHTER", at: { x: 5, y: 4 } },
        { role: "MARKSMAN", at: { x: 7, y: 6 } },
      ],
      // Only what the walls see.
      reveal: { radius: 2 },
    },
    {
      // The Grey Shift: miners lost in a cave-in three hundred years ago,
      // the Unquiet, not the Marquis's.
      faction: "UNDEAD",
      // Retune 3: twelve dead and 8 Coins.
      coins: 8,
      // No Field Defense: dead that dig in on their mine mouths never come
      // (hand play).
      technologies: [],
      cities: [
        { name: "North Adit", at: { x: 5, y: 1 }, level: 1, rewards: [] },
        { name: "Old Drift", at: { x: 2, y: 9 }, level: 1, rewards: [] },
        { name: "Grey Stope", at: { x: 8, y: 9 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 5, y: 1 } },
        { role: "GUARD", at: { x: 4, y: 1 } },
        { role: "FIGHTER", at: { x: 5, y: 0 } },
        { role: "GUARD", at: { x: 3, y: 1 } },
        { role: "FIGHTER", at: { x: 2, y: 0 } },
        { role: "GUARD", at: { x: 2, y: 9 }, home: 1 },
        { role: "GUARD", at: { x: 3, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 3, y: 10 }, home: 1 },
        { role: "GUARD", at: { x: 8, y: 9 }, home: 2 },
        { role: "GUARD", at: { x: 7, y: 9 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 9 }, home: 2 },
        { role: "FIGHTER", at: { x: 9, y: 10 }, home: 2 },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 3, x1: 10, y1: 7 }] },
      // Step 1 keeps to the lesson: the dead learn nothing more.
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
      // Hand play: under RUSH the dead kept out of the Gunners' reach and
      // never came; they storm Copperstep.
      directive: { kind: "ASSAULT", target: { x: 6, y: 5 } },
    },
  ],
  // The tremors open new cracks: the dead come up by the north and south
  // mouths in rounds 3 and 10, by the west and the east in round 5, and in
  // round 8 with a Necromancer from the old workings in the west and the
  // east.
  reinforcements: [
    {
      seat: 1,
      round: 3,
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 3 } },
        { role: "GUARD", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 9, y: 8 } },
      ],
      line: "The tremors open two more cracks. Out come the miners.",
      announce: true,
    },
    {
      seat: 1,
      round: 5,
      units: [
        { role: "GUARD", at: { x: 2, y: 7 } },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 3 } },
      ],
      line: "The second crew clocks on, picks first.",
      announce: true,
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "CAPTAIN", at: { x: 2, y: 7 } },
        { role: "GUARD", at: { x: 3, y: 6 } },
        { role: "GUARD", at: { x: 2, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 8 } },
      ],
      line: "The old foreman climbs out, calling the roll of the dead.",
      announce: true,
    },
    {
      seat: 1,
      round: 10,
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "GUARD", at: { x: 3, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 8 } },
        { role: "FIGHTER", at: { x: 9, y: 8 } },
        { role: "GUARD", at: { x: 9, y: 3 } },
        { role: "FIGHTER", at: { x: 10, y: 3 } },
      ],
      line: "Every miner who ever died in these workings is here.",
      announce: true,
    },
  ],
  landmarks: [{ tag: "COPPERSTEP", at: { x: 6, y: 5 } }],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Twelve rounds, and Copperstep must not fall. The stars: no city lost,
  // and Tobbin lives.
  objective: {
    kind: "SURVIVE",
    rounds: 12,
    protect: [{ place: "COPPERSTEP" }],
    bonus: [{ kind: "KEEP_CITIES" }, { kind: "UNIT_ALIVE", unit: "TOBBIN" }],
  },
};
