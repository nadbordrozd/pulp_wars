import {
  RULESET_7_ID,
  buildMissionStateV7,
  createPlayableGameFromMapStateV7,
  parseGameStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type MissionImprovementV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { withFishingHolesV7 } from "./v7-frozen-sea";

/**
 * Fishing Hole links (`pulp_wars-vg5l`, `pulp-wars-poc-7r128`): an authored
 * 11 x 11 board, built through the mission builder so every state passes
 * the full state schema. Seat 0 (Ice Folk by default) has its capital on
 * (1, 1) and a second city on (`east`, 1); row 1 between them is a lane of
 * Shallow Water from x = 2 to x = `east` - 1, with land above and below
 * it. Each city's territory (radius 1) holds one end of the lane: (2, 1)
 * for the capital and (`east` - 1, 1) for the second city, five
 * eight-way steps apart when `east` is 8 and six when it is 9. Seat 1
 * (Humans) has its capital on (5, 8). Seat 0 knows Rime (Shorecraft) by
 * default, so its border water starts as ice (the starting border freeze).
 */
export const HOLE_LINK_CAPITAL_V7: CoordV7 = { x: 1, y: 1 };
export const HOLE_LINK_CAPITAL_HOLE_V7: CoordV7 = { x: 2, y: 1 };
export const HOLE_LINK_RIVAL_CAPITAL_V7: CoordV7 = { x: 5, y: 8 };

export interface HoleLinkWorldOptionsV7 {
  /** The second city's x (8 by default: the holes are five steps apart). */
  readonly east?: number;
  readonly faction?: FactionIdV7;
  /** Seat 0's technologies; Rime (Shorecraft) by default. */
  readonly technologies?: readonly TechnologyIdV7[];
  /** Extra water: a tile above the second city's lane end (same city). */
  readonly secondCityPool?: boolean;
  /** Extra water: the capital's isolated corner (0, 0), no lane to it. */
  readonly capitalPool?: boolean;
  readonly improvements?: readonly MissionImprovementV7[];
}

export function holeLinkSecondCityV7(east = 8): CoordV7 {
  return { x: east, y: 1 };
}

export function holeLinkSecondHoleV7(east = 8): CoordV7 {
  return { x: east - 1, y: 1 };
}

export function holeLinkWorldV7(
  options: HoleLinkWorldOptionsV7 = {},
): GameStateV7 {
  const east = options.east ?? 8;
  const row = (cells: (x: number) => boolean): string =>
    Array.from({ length: 11 }, (_, x) => (cells(x) ? "~" : ".")).join("");
  const terrain = [
    row(
      (x) =>
        (options.capitalPool === true && x === 0) ||
        (options.secondCityPool === true && x === east - 1),
    ),
    row((x) => x >= 2 && x <= east - 1),
    ...Array.from({ length: 9 }, () => row(() => false)),
  ];
  const mission: MissionDefinitionV7 = {
    id: "FISHING_HOLE_LINK_ARENA",
    revision: 1,
    hidden: true,
    size: 11,
    seed: 1,
    terrain,
    resources: terrain.map(() => ".".repeat(11)),
    biome: "PLAINS",
    villages: [],
    improvements: [...(options.improvements ?? [])],
    aiMode: "RIVAL",
    seats: [
      {
        faction: options.faction ?? "ICE_FOLK",
        coins: 60,
        technologies: [...(options.technologies ?? ["SHORECRAFT"])],
        cities: [
          { at: HOLE_LINK_CAPITAL_V7, level: 1, rewards: [] },
          { at: holeLinkSecondCityV7(east), level: 1, rewards: [] },
        ],
        units: [{ role: "FIGHTER", at: HOLE_LINK_CAPITAL_V7 }],
        reveal: { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] },
      },
      {
        faction: "ORIGINAL",
        coins: 0,
        technologies: [],
        cities: [{ at: HOLE_LINK_RIVAL_CAPITAL_V7, level: 1, rewards: [] }],
        units: [{ role: "FIGHTER", at: HOLE_LINK_RIVAL_CAPITAL_V7 }],
        reveal: { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
  const built = buildMissionStateV7(mission, {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [options.faction ?? "ICE_FOLK", "ORIGINAL"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  const started = createPlayableGameFromMapStateV7({
    ok: true,
    state: built,
    mapAttempt: 1,
  });
  if (!started.ok) throw new Error("the Fishing Hole arena did not start");
  if (parseGameStateV7(started.state) === null)
    throw new Error("the Fishing Hole arena is not a valid state");
  return started.state;
}

/**
 * The review board: the two Ice Folk cities five steps apart, each with a
 * Fishing Hole at its end of the lane (built by the real command), linked.
 */
export function holeLinkReviewBoardV7(): GameStateV7 {
  return withFishingHolesV7(holeLinkWorldV7(), [
    HOLE_LINK_CAPITAL_HOLE_V7,
    holeLinkSecondHoleV7(),
  ]);
}
