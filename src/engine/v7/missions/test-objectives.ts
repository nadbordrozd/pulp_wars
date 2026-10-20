import type { MissionDefinitionV7 } from "./types";

/**
 * The hidden objective fixtures (`pulp_wars-v642.1`,
 * docs/product/CAMPAIGN.md section 10.1): one small dry 11 x 11 board per
 * objective kind, registered for the tests and the text harness and in no
 * chapter. The whole Naval branch is forbidden on each.
 *
 * ```text
 *      x 0123456789A
 * y  0   ^^.......^^
 *    1   ^.........^
 *    2   ..v.....G..      G: the enemy capital; v: a village
 *    3   ...........
 *    4   ...........
 *    5   .....f.....
 *    6   ...........
 *    7   ...........
 *    8   ..H.....v..      H: your capital; v: a village
 *    9   ^.........^
 *   10   ^^.......^^
 * ```
 */
const TERRAIN_V7 = [
  "^^.......^^",
  "^.........^",
  "...........",
  "...........",
  "...........",
  ".....f.....",
  "...........",
  "...........",
  "...........",
  "^.........^",
  "^^.......^^",
] as const;
const NO_RESOURCES_V7 = TERRAIN_V7.map(() => "...........");
const DRY_NAVAL_V7 = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
] as const;
const BOARD_V7 = {
  revision: 1,
  hidden: true,
  size: 11,
  terrain: TERRAIN_V7,
  resources: NO_RESOURCES_V7,
  biome: "PLAINS",
  aiMode: "RIVAL",
  forbiddenTechnologies: DRY_NAVAL_V7,
} as const;
const WHOLE_BOARD_V7 = [{ x0: 0, y0: 0, x1: 10, y1: 10 }] as const;

/**
 * `TEST_ESCORT`: bring the Envoy (a Guard beside your capital) next to the
 * village in the north-west. Stars: arrive by round 6, and keep your city.
 */
export const TEST_ESCORT_V7: MissionDefinitionV7 = {
  ...BOARD_V7,
  id: "TEST_ESCORT",
  seed: 20261201,
  villages: [
    { x: 2, y: 2 },
    { x: 8, y: 8 },
  ],
  landmarks: [{ tag: "GATE", at: { x: 2, y: 2 } }],
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [{ at: { x: 2, y: 8 }, level: 1, rewards: [] }],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "GUARD", at: { x: 2, y: 7 }, tag: "ENVOY" },
      ],
      reveal: { radius: 2, rects: WHOLE_BOARD_V7 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [{ at: { x: 8, y: 2 }, level: 1, rewards: [] }],
      units: [{ role: "FIGHTER", at: { x: 8, y: 2 } }],
      reveal: { radius: 2 },
      directive: { kind: "HOLD", zone: [{ x0: 6, y0: 0, x1: 10, y1: 4 }] },
    },
  ],
  objective: {
    kind: "ESCORT",
    unit: "ENVOY",
    to: "GATE",
    within: 1,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 6 }, { kind: "KEEP_CITIES" }],
  },
};

/**
 * `TEST_SURVIVE`: hold your capital until round 3 ends. A Goblin wave of two
 * arrives in round 2, a relief Guard of yours in round 3.
 */
export const TEST_SURVIVE_V7: MissionDefinitionV7 = {
  ...BOARD_V7,
  id: "TEST_SURVIVE",
  seed: 20261202,
  villages: [
    { x: 2, y: 2 },
    { x: 8, y: 8 },
  ],
  landmarks: [{ tag: "KEEP", at: { x: 2, y: 8 } }],
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [{ at: { x: 2, y: 8 }, level: 1, rewards: [] }],
      units: [{ role: "GUARD", at: { x: 2, y: 8 } }],
      reveal: { radius: 2 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [{ at: { x: 8, y: 2 }, level: 1, rewards: [] }],
      units: [{ role: "FIGHTER", at: { x: 8, y: 2 } }],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 5, x1: 5, y1: 10 }] },
      directive: [
        {
          kind: "HOLD",
          zone: [{ x0: 6, y0: 0, x1: 10, y1: 4 }],
          untilRound: 2,
        },
        { kind: "RUSH", fromRound: 2 },
      ],
    },
  ],
  reinforcements: [
    {
      seat: 1,
      round: 2,
      units: [
        { role: "FIGHTER", at: { x: 5, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 5 } },
      ],
    },
    { seat: 0, round: 3, units: [{ role: "GUARD", at: { x: 2, y: 8 } }] },
  ],
  objective: {
    kind: "SURVIVE",
    rounds: 3,
    protect: [{ place: "KEEP" }],
  },
};

/**
 * `TEST_CAPTURE`: three seats, the Undead seat your ally. Take the Goblin
 * outpost by the end of round 4; your ally's capital must not fall.
 */
export const TEST_CAPTURE_V7: MissionDefinitionV7 = {
  ...BOARD_V7,
  id: "TEST_CAPTURE",
  seed: 20261203,
  villages: [{ x: 2, y: 2 }],
  landmarks: [
    { tag: "OUTPOST", at: { x: 5, y: 3 } },
    { tag: "ALLY_HOME", at: { x: 8, y: 8 } },
  ],
  teams: [0, 0, 1],
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["DRILL"],
      cities: [{ at: { x: 2, y: 8 }, level: 1, rewards: [] }],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 4, y: 4 } },
      ],
      reveal: { radius: 2, rects: WHOLE_BOARD_V7 },
    },
    {
      faction: "UNDEAD",
      coins: 0,
      technologies: [],
      cities: [{ at: { x: 8, y: 8 }, level: 1, rewards: [] }],
      units: [{ role: "FIGHTER", at: { x: 8, y: 8 } }],
      reveal: { radius: 2 },
      directive: { kind: "HOLD", zone: [{ x0: 6, y0: 6, x1: 10, y1: 10 }] },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [
        { at: { x: 8, y: 2 }, level: 1, rewards: [] },
        { at: { x: 5, y: 3 }, level: 1, rewards: [] },
      ],
      units: [{ role: "FIGHTER", at: { x: 8, y: 2 } }],
      reveal: { radius: 2 },
      directive: { kind: "HOLD", zone: [{ x0: 6, y0: 0, x1: 10, y1: 4 }] },
    },
  ],
  objective: {
    kind: "CAPTURE",
    places: ["OUTPOST"],
    byRound: 4,
    protect: [{ place: "ALLY_HOME" }],
    bonus: [{ kind: "HOLD_PLACE", place: "ALLY_HOME" }],
  },
};

/**
 * `TEST_KILL`: kill the Goblin Boss (a Goblin beside your Fighter); your
 * Hero (a Guard) must live.
 */
export const TEST_KILL_V7: MissionDefinitionV7 = {
  ...BOARD_V7,
  id: "TEST_KILL",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261204,
  villages: [
    { x: 2, y: 2 },
    { x: 8, y: 8 },
  ],
  seats: [
    {
      faction: "ORIGINAL",
      coins: 5,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [{ at: { x: 2, y: 8 }, level: 1, rewards: [] }],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 6 } },
        { role: "GUARD", at: { x: 4, y: 6 }, tag: "HERO" },
      ],
      reveal: { radius: 2, rects: WHOLE_BOARD_V7 },
    },
    {
      faction: "GOBLIN",
      coins: 0,
      technologies: [],
      cities: [{ at: { x: 8, y: 2 }, level: 1, rewards: [] }],
      units: [
        { role: "FIGHTER", at: { x: 8, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 5 }, tag: "BOSS" },
      ],
      reveal: { radius: 2 },
      directive: { kind: "HOLD", zone: [{ x0: 4, y0: 0, x1: 10, y1: 5 }] },
    },
  ],
  objective: {
    kind: "KILL",
    units: ["BOSS"],
    protect: [{ unit: "HERO" }],
    bonus: [{ kind: "UNIT_ALIVE", unit: "HERO" }],
  },
};
