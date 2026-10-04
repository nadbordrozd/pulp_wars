import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_4` "Bone Neck" (docs/product/CAMPAIGN.md section 6.4): Chapter
 * One, mission 4. You lead Humans or Goblins against the Undead on a 16 x 16
 * board. Hard. The Undead realm is a peninsula joined to your shore by a
 * one-tile isthmus three tiles long (row 8, x 7–9), under a walled gate city
 * whose territory holds the three Field Defenses of the isthmus exit. The
 * Naval branch is forbidden, so the isthmus is the only way in. The Undead
 * `GUARD` the gate with a garrison of four while the rest of their army
 * plays `NORMAL`. The choice is Human or Goblin only: a Martian flyer or a
 * Dwarf Mole would bypass the isthmus.
 *
 * Revision 2 (`pulp_wars-68k.6`, CAMPAIGN.md section 8.5) is the design's
 * layout and economy (the capital's level-4 reward is Boom: its footprint
 * cannot hold the nine harvest records Treasury would need) with a siege
 * the headless proxy can win: Sawmilling is forbidden, so neither side
 * builds siege units; you start with two (Catapults, or Rocket Carts), and
 * the gate's fifth defender is a Skeleton, not a Lich.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  0   ^^ff..f~~~~^^ff^
 *    1   ^f..f..~~~~f..f^
 *    2   f......~~~~.f..f
 *    3   f..h...~~~..fU.f     h: your town; U: the Undead capital
 *    4   ..f..^.~~~...^.f
 *    5   .f...v.~~~~.^^.f     v: a village
 *    6   f..f...~~~~~f..f
 *    7   ^......~~~#....^     #: a Field Defense
 *    8   f..H...===#u...f     H: your capital; =: the isthmus; u: the gate city
 *    9   ^......~~~#....^
 *   10   f..f...~~~~~f..f
 *   11   .f.....~~~~.f^^.
 *   12   ..v..f.~~~~.u..f     v: a village; u: an Undead town
 *   13   f....v.~~~~.f..^     v: a village
 *   14   ^ff....~~~~~^ff^
 *   15   ^^fff..~~~~~^^^^
 * ```
 */
export const FRONTIER_4_V7: MissionDefinitionV7 = {
  id: "FRONTIER_4",
  revision: 2,
  size: 16,
  seed: 20261104,
  terrain: [
    "^^ff..f~~~~^^ff^",
    "^f..f..~~~~f..f^",
    "f......~~~~.f..f",
    "f......~~~..f..f",
    "..f..^.~~~...^.f",
    ".f.....~~~~.^^.f",
    "f..f...~~~~~f..f",
    "^......~~~.....^",
    "f..............f",
    "^......~~~.....^",
    "f..f...~~~~~f..f",
    ".f.....~~~~.f^^.",
    ".....f.~~~~....f",
    "f......~~~~.f..^",
    "^ff....~~~~~^ff^",
    "^^fff..~~~~~^^^^",
  ],
  resources: [
    "................",
    "....g...........",
    "....r...........",
    "................",
    "..greo.......or.",
    "................",
    "...g............",
    "..r.........r...",
    "................",
    "....r.......e...",
    "...g............",
    ".g..........go..",
    ".....g..........",
    "...r.........r..",
    "....e...........",
    "................",
  ],
  biome: "HIGHLANDS",
  villages: [
    { x: 5, y: 5 },
    { x: 2, y: 12 },
    { x: 5, y: 13 },
  ],
  fieldDefenses: [
    { x: 10, y: 7 },
    { x: 10, y: 8 },
    { x: 10, y: 9 },
  ],
  // The Undead capital's two Lumber Camps (it knows Forestry).
  improvements: [
    { at: { x: 12, y: 2 }, improvement: "LUMBER_CAMP" },
    { at: { x: 12, y: 3 }, improvement: "LUMBER_CAMP" },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: { choice: ["ORIGINAL", "GOBLIN"] },
      coins: 10,
      technologies: ["DRILL", "SCOUTING", "HUNTING", "FORESTRY"],
      cities: [
        { at: { x: 3, y: 8 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 3, y: 3 }, level: 2, rewards: ["SURVEY"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "GUARD", at: { x: 4, y: 8 } },
        { role: "RAIDER", at: { x: 4, y: 7 } },
        { role: "FIGHTER", at: { x: 3, y: 3 }, home: 1 },
        // The siege train: the only siege units of the mission.
        { role: "CATAPULT", at: { x: 2, y: 8 } },
        { role: "CATAPULT", at: { x: 3, y: 7 } },
      ],
      // The gate, seen across the water.
      reveal: { radius: 2, rects: [{ x0: 7, y0: 6, x1: 12, y1: 10 }] },
    },
    {
      faction: "UNDEAD",
      coins: 8,
      technologies: [
        "GATHERING",
        "HUNTING",
        "FORESTRY",
        "DRILL",
        "FORTIFICATION",
        "ADMINISTRATION",
      ],
      cities: [
        { at: { x: 13, y: 3 }, level: 4, rewards: ["SURVEY", "WALLS", "BOOM"] },
        { at: { x: 11, y: 8 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 12, y: 12 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "CAPTAIN", at: { x: 14, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 7 }, home: 1 },
        { role: "GUARD", at: { x: 10, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 10, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 12, y: 12 }, home: 2 },
      ],
      // The isthmus, watched from the gate.
      reveal: { radius: 2, rects: [{ x0: 7, y0: 8, x1: 9, y1: 8 }] },
      directive: {
        kind: "GUARD",
        zone: [{ x0: 10, y0: 7, x1: 12, y1: 9 }],
        garrison: 4,
      },
    },
  ],
  // The Naval branch (the isthmus is the only way in) and Sawmilling (no
  // Catapult, Rocket Cart, or Lich is trained; the Sawmill goes with it).
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SAWMILLING",
  ],
  objective: { kind: "DOMINATION" },
};
