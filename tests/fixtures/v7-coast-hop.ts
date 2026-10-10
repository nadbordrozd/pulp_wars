import {
  RULESET_7_ID,
  buildMissionStateV7,
  createPlayableGameFromMapStateV7,
  parseGameStateV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type RectV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";

/**
 * Authored boards for the landing and embark discipline on one landmass
 * (`pulp_wars-eru`): a target the viewer's units can walk to and can also
 * reach over water. Built through the mission builder (never through the
 * registry), so every state passes the full state schema; the setup names
 * the map type the shape stands for. Seat 0 is the seat under test and
 * holds every Naval technology unless `technologies` says otherwise; seat 1
 * holds none. Each seat's first unit is a Fighter on its capital.
 */
export const COAST_HOP_SIZE_V7 = 11;

export interface CoastHopUnitV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
}

export interface CoastHopOptionsV7 {
  readonly mapType: "PANGEA" | "LAKES" | "CONTINENTS";
  /** Eleven rows of eleven characters (the mission terrain legend). */
  readonly terrain: readonly string[];
  readonly capitals: readonly [CoordV7, CoordV7];
  /** Seat 0's Ports (inside its capital's territory). */
  readonly ports: readonly CoordV7[];
  readonly villages?: readonly CoordV7[];
  readonly units?: readonly CoastHopUnitV7[];
  /** Seat 0's technologies; every Naval technology by default. */
  readonly technologies?: readonly TechnologyIdV7[];
  /** What seat 0 has explored; the whole board by default. */
  readonly explored?: readonly RectV7[];
}

const NAVAL_TECHS: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
const WHOLE_BOARD: RectV7 = {
  x0: 0,
  y0: 0,
  x1: COAST_HOP_SIZE_V7 - 1,
  y1: COAST_HOP_SIZE_V7 - 1,
};

export function coastHopSetupV7(
  mapType: CoastHopOptionsV7["mapType"],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: COAST_HOP_SIZE_V7,
    height: COAST_HOP_SIZE_V7,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "UNDEAD"],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

export function coastHopV7(options: CoastHopOptionsV7): GameStateV7 {
  const seat = (index: 0 | 1): MissionDefinitionV7["seats"][number] => ({
    faction: index === 0 ? "ORIGINAL" : "UNDEAD",
    // No Coins: the seat under test decides with its units only.
    coins: 0,
    technologies: index === 0 ? [...(options.technologies ?? NAVAL_TECHS)] : [],
    cities: [{ at: options.capitals[index], level: 2, rewards: ["SURVEY"] }],
    units: [
      { role: "FIGHTER", at: options.capitals[index] },
      ...(options.units ?? [])
        .filter((unit) => unit.seat === index)
        .map((unit) => ({ role: unit.role, at: unit.at })),
    ],
    reveal:
      index === 0
        ? { radius: 0, rects: [...(options.explored ?? [WHOLE_BOARD])] }
        : { radius: 1 },
  });
  const mission: MissionDefinitionV7 = {
    id: "COAST_HOP_ARENA",
    revision: 1,
    hidden: true,
    size: COAST_HOP_SIZE_V7,
    seed: 1,
    terrain: options.terrain,
    resources: options.terrain.map(() => ".".repeat(COAST_HOP_SIZE_V7)),
    biome: "PLAINS",
    villages: [...(options.villages ?? [])],
    improvements: options.ports.map((at) => ({
      at,
      improvement: "PORT" as const,
    })),
    aiMode: "RIVAL",
    seats: [seat(0), seat(1)],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
  const started = createPlayableGameFromMapStateV7({
    ok: true,
    state: buildMissionStateV7(mission, coastHopSetupV7(options.mapType)),
    mapAttempt: 1,
  });
  if (!started.ok) throw new Error("the coast-hop arena did not start");
  if (parseGameStateV7(started.state) === null)
    throw new Error("the coast-hop arena is not a valid state");
  return started.state;
}

/**
 * Lakes-like: a lake (x 4 to 6, y 3 to 10) between seat 0's capital on
 * (3, 8) and seat 1's on (7, 8), with land round its north end, and a pond
 * of one tile on (2, 9). Walking round the lake takes 14 steps; the lake
 * is two tiles of water across.
 */
export const LAKE_TERRAIN_V7: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "....~~~....",
  "....~~~....",
  "....~~~....",
  "....~~~....",
  "....~~~....",
  "....~~~....",
  "..~.~~~....",
  "....~~~....",
];
export const LAKE_CAPITALS_V7: readonly [CoordV7, CoordV7] = [
  { x: 3, y: 8 },
  { x: 7, y: 8 },
];
/** The Port on the lake, in seat 0's territory. */
export const LAKE_PORT_V7: CoordV7 = { x: 4, y: 8 };
/** The Port on the pond: no water route leaves it. */
export const LAKE_POND_PORT_V7: CoordV7 = { x: 2, y: 9 };

/**
 * Pangea-like: one landmass round a bay (x 3 to 7, y 4 to 9) that opens on
 * the sea along the south edge (y = 10). Seat 0's capital is on (2, 8) with
 * its Port on (3, 8); seat 1's is on (8, 8). Walking round the bay takes 14
 * steps. The bay is four tiles of water across, Deep Water in the middle:
 * the Shallow Water along its two shores meets only at its north end.
 */
export const BAY_TERRAIN_V7: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...~~~~~...",
  "...~~~~~...",
  "...~~~~~...",
  "...~~~~~...",
  "...~~~~~...",
  "...~~~~~...",
  "~~~~~~~~~~~",
];
export const BAY_CAPITALS_V7: readonly [CoordV7, CoordV7] = [
  { x: 2, y: 8 },
  { x: 8, y: 8 },
];
export const BAY_PORT_V7: CoordV7 = { x: 3, y: 8 };
/**
 * What seat 0 has seen of the bay board: everything but the bay's north
 * end, so the only water route it knows across the bay is Deep Water.
 */
export const BAY_EXPLORED_V7: readonly RectV7[] = [
  { x0: 0, y0: 0, x1: 10, y1: 3 },
  { x0: 0, y0: 4, x1: 2, y1: 10 },
  { x0: 8, y0: 4, x1: 10, y1: 10 },
  { x0: 3, y0: 5, x1: 7, y1: 10 },
];

/**
 * A canal three tiles long (x 4 to 6 on y = 8) through a wall of Mountains
 * on x = 5 that leaves one gap, on (5, 0). Seat 0's capital is on (3, 8)
 * with its Port on (4, 8); seat 1's is on (7, 8), at the canal's other end.
 * Walking through the gap takes 16 steps; the canal is two tiles of water.
 */
export const CANAL_TERRAIN_V7: readonly string[] = [
  "...........",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  "....~~~....",
  ".....^.....",
  ".....^.....",
];
export const CANAL_CAPITALS_V7: readonly [CoordV7, CoordV7] = [
  { x: 3, y: 8 },
  { x: 7, y: 8 },
];
export const CANAL_PORT_V7: CoordV7 = { x: 4, y: 8 };

/**
 * Pangea-like: one landmass with the sea along its south edge (y = 10).
 * Seat 0's capital is on (1, 9) with its Port on (1, 10), in a valley
 * (x 0 to 4, y 6 to 9) closed by Mountains; seat 1's capital is on (8, 2).
 */
export const COAST_TERRAIN_V7: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "^^^^^^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  ".....^.....",
  "~~~~~~~~~~~",
];
export const COAST_CAPITALS_V7: readonly [CoordV7, CoordV7] = [
  { x: 1, y: 9 },
  { x: 8, y: 2 },
];
export const COAST_PORT_V7: CoordV7 = { x: 1, y: 10 };
/** The valley and its coast: what seat 0 has seen before contact. */
export const COAST_VALLEY_V7: RectV7 = { x0: 0, y0: 5, x1: 5, y1: 10 };
