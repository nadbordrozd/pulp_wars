import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_4` "Bone Neck" (docs/product/CAMPAIGN.md section 9, mission 4).
 * You lead Humans or Goblins against the Undead on a 16 x 16 board. Hard.
 * The lesson is a breach: the Undead realm is the eastern land, joined to
 * yours by Bone Neck, a strip of land two tiles long, under a gate city
 * with Field Defenses. The Naval branch is forbidden, so the neck is the
 * only way in; Sawmilling is forbidden too, so the two siege engines you
 * start with are the only ones in the mission. The Undead `GUARD` the gate
 * with a garrison of four while the rest of their army plays `NORMAL`. The
 * choice is Human or Goblin only: a Martian flyer or a Dwarf Mole would
 * bypass the neck.
 *
 * Revision 4 (`pulp_wars-v642.1`): the board is the map generator's
 * (Continents, seed 6): two lands and the channel between them, with two
 * water tiles of the channel turned to land: Bone Neck. The village at its
 * eastern end is the gate city; the Undead capital, the Marquis's tower,
 * stands four tiles beyond it. Taking the gate wins the mission.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~~~~~~~~~~~~~
 *    2   ^~.~~~~~~~~~^~~.
 *    3   .^~^^.f~~.vf.~.f
 *    4   ^..v..v~~.fff~.f
 *    5   .f^.f..~~~fffu..      u: an Undead town
 *    6   .......==#g.....      =: Bone Neck; #: a Field Defense; g: the gate
 *    7   .....h.~~#...ff.      h: your town
 *    8   ......f~~~~...vf
 *    9   ..H....~~$^F...^      H: your capital; F: the tower's Farm
 *   10   .f...v^~~.fU.f.$      U: the Marquis's tower
 *   11   f~....f~~ff.^ff^
 *   12   .~v~.f~~~~^.f.~f
 *   13   ~.f~~f.~~.v~f.~f
 *   14   ~~~~~~~~~f~f~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const FRONTIER_4_V7: MissionDefinitionV7 = {
  id: "FRONTIER_4",
  revision: 4,
  seed: 20261104,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 6,
    edits: [
      { kind: "TERRAIN", at: { x: 7, y: 6 }, terrain: "." },
      { kind: "TERRAIN", at: { x: 8, y: 6 }, terrain: "." },
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 5 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "^~.~~~~~~~~~^~~.",
    ".^~^^.f~~..f.~.f",
    "^......~~.fff~.f",
    ".f^.f..~~~fff...",
    "................",
    ".......~~....ff.",
    "......f~~~~....f",
    ".......~~f^....^",
    ".f....^~~.f..f..",
    "f~....f~~ff.^ff^",
    ".~.~.f~~~~^.f.~f",
    "~.f~~f.~~..~f.~f",
    "~~~~~~~~~f~f~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...........p..p.",
    ".....p.........s",
    "o....s..ps....s.",
    ".o.ooe.s.r..rp..",
    "o......spe.....g",
    "......e.......er",
    ".r.re....e...e.r",
    "r..e..r.se....gr",
    "...r...s....re..",
    "....ee.s...e.r..",
    "egrr....p...r.e.",
    "..re.rg.p.gro.g.",
    "......s....eg.s.",
    "....p..s....g..g",
    ".p....s...pg.s.s",
    ".......p........",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "HPHPPPPPPPPPPPPP",
    "HHPHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPWPPPPPP",
    "PPPPPPWPPWWWWWWW",
    "PPPPPWPPPPWWWWPW",
    "PPPPPWWPPWWPWWPW",
    "PPPPPPPPPWPWPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 10, y: 3 },
    { x: 3, y: 4 },
    { x: 6, y: 4 },
    { x: 14, y: 8 },
    { x: 5, y: 10 },
    { x: 2, y: 12 },
    { x: 10, y: 13 },
  ],
  treasureChests: [
    { x: 9, y: 9 },
    { x: 15, y: 10 },
  ],
  // </map>
  fieldDefenses: [
    { x: 9, y: 6 },
    { x: 9, y: 7 },
  ],
  // The tower's Farm.
  improvements: [{ at: { x: 11, y: 9 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: { choice: ["ORIGINAL", "GOBLIN"] },
      coins: 12,
      technologies: [
        "DRILL",
        "FORTIFICATION",
        "SCOUTING",
        "HUNTING",
        "FORESTRY",
        "MARKSMANSHIP",
      ],
      cities: [
        { at: { x: 2, y: 9 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 5, y: 7 }, level: 2, rewards: ["SURVEY"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 9 } },
        { role: "MARKSMAN", at: { x: 2, y: 8 } },
        { role: "RAIDER", at: { x: 4, y: 8 } },
        { role: "GUARD", at: { x: 5, y: 7 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 6 }, home: 1 },
        // The siege train: the only siege units of the mission.
        { role: "CATAPULT", at: { x: 4, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 4, y: 6 }, home: 1 },
      ],
      // Bone Neck and the gate, seen across the water, and the tower.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 5, x1: 11, y1: 8 },
          { x0: 10, y0: 9, x1: 12, y1: 11 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "FORESTRY",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        { at: { x: 11, y: 10 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 10, y: 6 }, level: 2, rewards: ["STOCKPILE"] },
        { at: { x: 13, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 10 } },
        { role: "FIGHTER", at: { x: 12, y: 10 } },
        { role: "GUARD", at: { x: 9, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 9, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 7 }, home: 1 },
        { role: "RAIDER", at: { x: 13, y: 5 }, home: 2 },
      ],
      // Bone Neck, watched from the gate.
      reveal: { radius: 2, rects: [{ x0: 6, y0: 6, x1: 8, y1: 6 }] },
      // No Necromancers (hand play, CAMPAIGN.md section 11.4): three of
      // them raised a Skeleton on every Grave of the gate every turn, and
      // the siege never ended.
      forbiddenTechnologies: ["ADMINISTRATION", "PLANNING"],
      directive: {
        kind: "GUARD",
        zone: [{ x0: 9, y0: 5, x1: 11, y1: 7 }],
        garrison: 4,
      },
    },
  ],
  // The Naval branch (Bone Neck is the only way in) and Sawmilling (no
  // Catapult, Rocket Cart, or Lich is trained; the Sawmill goes with it).
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
    "SAWMILLING",
  ],
  landmarks: [
    { tag: "TOWER", at: { x: 11, y: 10 } },
    { tag: "GATE", at: { x: 10, y: 6 } },
  ],
  // Take the gate city: with Bone Neck open the Marquis asks for terms. The
  // stars are for doing it by round 12 and for losing no city of your own.
  objective: {
    kind: "CAPTURE",
    places: ["GATE"],
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
