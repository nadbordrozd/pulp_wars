import type { MissionDefinitionV7 } from "./types";

/**
 * The hidden AI-directive fixture missions (`pulp_wars-68k.3`,
 * docs/product/CAMPAIGN.md sections 7.2 and 8.2): one per directive, each a
 * small dry 11 x 11 board with the whole Naval branch forbidden. They are
 * registered for headless runs and tests and belong to no chapter. Each AI
 * seat's reveal rectangle includes the human capital, so the AI knows a
 * hostile city from the first turn (a `NORMAL` seat would march on it).
 */
const DRY_NAVAL_V7 = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  // The naval branch (`pulp_wars-5ti.2`): the whole five-node branch.
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const;

/**
 * `TEST_RUSH`: a Goblin `RUSH` seat with four units against a Human capital,
 * and two neutral villages next to the Goblins that a `NORMAL` seat would
 * take first.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff^^
 *    1   ^f.......^^
 *    2   f..v....G.f      G: the Goblin capital; v: a village
 *    3   f.........f
 *    4   ..^^......f
 *    5   ...^..v....      v: a village
 *    6   f......^^..
 *    7   f.........f
 *    8   f.H.......f      H: the Human capital
 *    9   ^..ff....f^
 *   10   ^^f...ff^^^
 * ```
 */
export const TEST_RUSH_V7: MissionDefinitionV7 = {
  id: "TEST_RUSH",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261004,
  terrain: [
    "^^ff...ff^^",
    "^f.......^^",
    "f.........f",
    "f.........f",
    "..^^......f",
    "...^.......",
    "f......^^..",
    "f.........f",
    "f.........f",
    "^..ff....f^",
    "^^f...ff^^^",
  ],
  resources: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
  ],
  biome: "PLAINS",
  villages: [
    { x: 3, y: 2 },
    { x: 6, y: 5 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: [],
      cities: [{ at: { x: 2, y: 8 }, level: 2, rewards: ["SURVEY"] }],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
      ],
      reveal: { radius: 2 },
    },
    {
      faction: "GOBLIN",
      coins: 6,
      technologies: [],
      cities: [{ at: { x: 8, y: 2 }, level: 2, rewards: ["STOCKPILE"] }],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 7, y: 2 } },
        { role: "FIGHTER", at: { x: 8, y: 3 } },
        { role: "RAIDER", at: { x: 7, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 7, x1: 3, y1: 9 }] },
      directive: { kind: "RUSH" },
    },
  ],
  forbiddenTechnologies: [...DRY_NAVAL_V7],
  objective: { kind: "DOMINATION" },
};

/**
 * `TEST_HOLD`: an Undead seat that holds the north (rows 0–4) until round 8,
 * then plays `NORMAL`. One of its units starts outside the zone (the
 * `RETURN` job), and one village lies outside it.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff^^
 *    1   ^f.......f^
 *    2   f.v..U....f      U: the Undead capital; v: a village (in the zone)
 *    3   f.........f
 *    4   ..f.....f..      the zone: rows 0–4
 *    5   ...........
 *    6   f.......s..      s: an Undead unit outside the zone
 *    7   f.v.......f      v: a village (outside the zone)
 *    8   f....H....f      H: the Human capital
 *    9   ^..ff....f^
 *   10   ^^f...ff^^^
 * ```
 */
export const TEST_HOLD_V7: MissionDefinitionV7 = {
  id: "TEST_HOLD",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261005,
  terrain: [
    "^^ff...ff^^",
    "^f.......f^",
    "f.........f",
    "f.........f",
    "..f.....f..",
    "...........",
    "f..........",
    "f.........f",
    "f.........f",
    "^..ff....f^",
    "^^f...ff^^^",
  ],
  resources: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
  ],
  biome: "PLAINS",
  villages: [
    { x: 2, y: 2 },
    { x: 2, y: 7 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: [],
      cities: [{ at: { x: 5, y: 8 }, level: 2, rewards: ["SURVEY"] }],
      units: [
        { role: "FIGHTER", at: { x: 5, y: 8 } },
        { role: "GUARD", at: { x: 4, y: 8 } },
      ],
      reveal: { radius: 2 },
    },
    {
      faction: "UNDEAD",
      coins: 6,
      technologies: [],
      cities: [{ at: { x: 5, y: 2 }, level: 2, rewards: ["STOCKPILE"] }],
      units: [
        { role: "FIGHTER", at: { x: 5, y: 2 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "GUARD", at: { x: 6, y: 3 } },
        { role: "FIGHTER", at: { x: 8, y: 6 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 6, x1: 9, y1: 9 }] },
      directive: {
        kind: "HOLD",
        zone: [{ x0: 0, y0: 0, x1: 10, y1: 4 }],
        untilRound: 8,
      },
    },
  ],
  forbiddenTechnologies: [...DRY_NAVAL_V7],
  objective: { kind: "DOMINATION" },
};

/**
 * `TEST_GUARD`: an Undead seat that guards its gate city (the 3 x 3 zone
 * around `(5, 5)`) with a garrison of two while the rest of its army plays
 * `NORMAL`. One unit starts in the zone; the nearest other unit joins it.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^ff...ff^^
 *    1   ^f.......f^
 *    2   f.......U.f      U: the Undead capital
 *    3   f.........f
 *    4   ..^^......f      the zone: x 4–6, y 4–6
 *    5   ...^.u.....      u: the Undead gate city
 *    6   f..........
 *    7   f.........f
 *    8   f.H.......f      H: the Human capital
 *    9   ^..ff....f^
 *   10   ^^f...ff^^^
 * ```
 */
export const TEST_GUARD_V7: MissionDefinitionV7 = {
  id: "TEST_GUARD",
  revision: 1,
  hidden: true,
  size: 11,
  seed: 20261006,
  terrain: [
    "^^ff...ff^^",
    "^f.......f^",
    "f.........f",
    "f.........f",
    "..^^......f",
    "...^.......",
    "f..........",
    "f.........f",
    "f.........f",
    "^..ff....f^",
    "^^f...ff^^^",
  ],
  resources: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
  ],
  biome: "PLAINS",
  villages: [{ x: 8, y: 8 }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: [],
      cities: [{ at: { x: 2, y: 8 }, level: 2, rewards: ["SURVEY"] }],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 3, y: 8 } },
      ],
      reveal: { radius: 2 },
    },
    {
      faction: "UNDEAD",
      coins: 6,
      technologies: [],
      cities: [
        { at: { x: 8, y: 2 }, level: 3, rewards: ["SURVEY", "WALLS"] },
        { at: { x: 5, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 7, y: 3 } },
        { role: "GUARD", at: { x: 5, y: 5 }, home: 1 },
        { role: "MARKSMAN", at: { x: 8, y: 3 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 1, y0: 7, x1: 3, y1: 9 }] },
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 4, x1: 6, y1: 6 }],
        garrison: 2,
      },
    },
  ],
  forbiddenTechnologies: [...DRY_NAVAL_V7],
  objective: { kind: "DOMINATION" },
};
