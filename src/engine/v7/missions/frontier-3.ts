import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_3` "Green Tide" (docs/product/CAMPAIGN.md section 6.3):
 * Chapter One, mission 3. You lead the Goblins against the Undead on a dry
 * 14 x 14 board. Medium. The Undead hold the north behind a mountain ridge
 * (row 6) with two passes, and `HOLD` it until round 16, then play
 * `NORMAL`. The zone runs to the ridge so the passes are its approaches.
 * The Undead also know Gathering, the prerequisite of their Administration.
 * Final numbers and their tuning: CAMPAIGN.md section 8.3.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ^^ff..f.ff.^^^
 *    1   ^f.....f...f.^
 *    2   f.u....U...v.f     U: the Undead capital; u: an Undead town; v: a village
 *    3   f...+.....f..f     +: a Grave
 *    4   ..f......+...f     +: a Grave
 *    5   .f...+.f.....f     +: a Grave
 *    6   ^^.^^^^^^^.^^^     the ridge; passes at x = 2 and x = 10
 *    7   ..v....f....v.     v: villages
 *    8   f.....v......f     v: a village
 *    9   .f..f.....f...
 *   10   f..........f.f
 *   11   f...G.....g..f     G: your capital; g: your town
 *   12   ^f....ff...f^^
 *   13   ^^ff.....ff^^^
 * ```
 */
export const FRONTIER_3_V7: MissionDefinitionV7 = {
  id: "FRONTIER_3",
  revision: 2,
  size: 14,
  seed: 20261103,
  terrain: [
    "^^ff..f.ff.^^^",
    "^f.....f...f.^",
    "f............f",
    "f...f.....f..f",
    "..f.....f....f",
    ".f.....f.....f",
    "^^.^^^^^^^.^^^",
    ".......f......",
    "f............f",
    ".f..f.....f...",
    "f..........f.f",
    "f............f",
    "^f....ff...f^^",
    "^^ff.....ff^^^",
  ],
  resources: [
    "..............",
    ".gr...rg...g..",
    "..............",
    "...r....r...r.",
    "..............",
    "..............",
    ".o..........o.",
    ".......g......",
    "...r.......r.g",
    ".....e.r......",
    "...r.......g..",
    "..............",
    ".....r...r....",
    "..............",
  ],
  biome: "PLAINS",
  villages: [
    { x: 11, y: 2 },
    { x: 2, y: 7 },
    { x: 12, y: 7 },
    { x: 6, y: 8 },
  ],
  graves: [
    { x: 4, y: 3 },
    { x: 9, y: 4 },
    { x: 5, y: 5 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      coins: 6,
      // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Orc Brute is
      // at Fortification (revision 2).
      technologies: ["SCOUTING", "DRILL", "FORTIFICATION"],
      cities: [
        { at: { x: 4, y: 11 }, level: 2, rewards: ["SURVEY"] },
        { at: { x: 10, y: 11 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 3, y: 11 } },
        { role: "FIGHTER", at: { x: 5, y: 11 } },
        { role: "RAIDER", at: { x: 4, y: 10 } },
        { role: "FIGHTER", at: { x: 10, y: 11 }, home: 1 },
        { role: "GUARD", at: { x: 9, y: 11 }, home: 1 },
      ],
      // Both passes and the ground just below them.
      reveal: {
        radius: 2,
        rects: [
          { x0: 1, y0: 5, x1: 3, y1: 8 },
          { x0: 9, y0: 5, x1: 11, y1: 8 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 5,
      // The Industry reshuffle (7r56): the Zombie is at Fortification.
      technologies: ["GATHERING", "DRILL", "FORTIFICATION", "ADMINISTRATION"],
      cities: [
        { at: { x: 7, y: 2 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 2, y: 2 }, level: 2, rewards: ["STOCKPILE"] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "GUARD", at: { x: 7, y: 3 } },
        { role: "CAPTAIN", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 2 }, home: 1 },
        { role: "GUARD", at: { x: 2, y: 3 }, home: 1 },
      ],
      reveal: { radius: 2 },
      directive: {
        kind: "HOLD",
        zone: [{ x0: 0, y0: 0, x1: 13, y1: 6 }],
        untilRound: 16,
      },
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  objective: { kind: "DOMINATION" },
};
