import {
  RULESET_7_ID,
  applyCommandV7,
  buildMissionStateV7,
  createPlayableGameFromMapStateV7,
  parseGameStateV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type PlayerViewV7,
  type RectV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";

/**
 * Authored boards for the third pass of the Normal AI (`pulp_wars-9s0.14`
 * and `pulp_wars-9s0.17`): an 11 x 11 board from the mission terrain legend
 * with two to four seats, built through the mission builder (never through
 * the registry), so every state passes the full state schema. Seat 0 is the
 * seat under test. Each seat's first city is its capital and its first unit
 * the seat's first unit.
 */
export const THIRD_PASS_SIZE_V7 = 11;

export interface ThirdPassSeatV7 {
  readonly faction: FactionIdV7;
  /** The first is the capital; every city is level 2. */
  readonly cities: readonly CoordV7[];
  /** At least one. */
  readonly units: readonly {
    readonly role: UnitRoleIdV7;
    readonly at: CoordV7;
  }[];
  readonly technologies?: readonly TechnologyIdV7[];
  /** 0 by default: the seat decides with its units only. */
  readonly coins?: number;
  /** The whole board (the default), or these rectangles. */
  readonly explored?: readonly RectV7[];
}

export interface ThirdPassOptionsV7 {
  readonly mapType: "DRY_LAND" | "PANGEA" | "LAKES" | "CONTINENTS";
  /** Eleven rows of eleven characters (the mission terrain legend). */
  readonly terrain: readonly string[];
  readonly seats: readonly ThirdPassSeatV7[];
  readonly villages?: readonly CoordV7[];
  /** Ports, each inside the territory of some seat's city. */
  readonly ports?: readonly CoordV7[];
}

const WHOLE_BOARD: RectV7 = {
  x0: 0,
  y0: 0,
  x1: THIRD_PASS_SIZE_V7 - 1,
  y1: THIRD_PASS_SIZE_V7 - 1,
};

/**
 * Open ground with a pond of one tile in the corner (0, 0): a mission board
 * without water must forbid the Naval branch, and these boards forbid
 * nothing.
 */
export const OPEN_GROUND_V7: readonly string[] = Array.from(
  { length: THIRD_PASS_SIZE_V7 },
  (_, y) => (y === 0 ? "~" : ".") + ".".repeat(THIRD_PASS_SIZE_V7 - 1),
);

export function thirdPassSetupV7(
  mapType: ThirdPassOptionsV7["mapType"],
  factions: readonly FactionIdV7[],
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: THIRD_PASS_SIZE_V7,
    height: THIRD_PASS_SIZE_V7,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

export function thirdPassArenaV7(options: ThirdPassOptionsV7): GameStateV7 {
  const mission: MissionDefinitionV7 = {
    id: "THIRD_PASS_ARENA",
    revision: 1,
    hidden: true,
    size: THIRD_PASS_SIZE_V7,
    seed: 1,
    terrain: options.terrain,
    resources: options.terrain.map(() => ".".repeat(THIRD_PASS_SIZE_V7)),
    biome: "PLAINS",
    villages: [...(options.villages ?? [])],
    improvements: (options.ports ?? []).map((at) => ({
      at,
      improvement: "PORT" as const,
    })),
    aiMode: "RIVAL",
    seats: options.seats.map((seat) => ({
      faction: seat.faction,
      coins: seat.coins ?? 0,
      technologies: [...(seat.technologies ?? [])],
      cities: seat.cities.map((at) => ({
        at,
        level: 2,
        rewards: ["SURVEY" as const],
      })),
      units: seat.units.map((unit) => ({ role: unit.role, at: unit.at })),
      reveal: { radius: 0, rects: [...(seat.explored ?? [WHOLE_BOARD])] },
    })),
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
  const started = createPlayableGameFromMapStateV7({
    ok: true,
    state: buildMissionStateV7(
      mission,
      thirdPassSetupV7(
        options.mapType,
        options.seats.map((seat) => seat.faction),
      ),
    ),
    mapAttempt: 1,
  });
  if (!started.ok) throw new Error("the third-pass arena did not start");
  if (parseGameStateV7(started.state) === null)
    throw new Error("the third-pass arena is not a valid state");
  return started.state;
}

export function thirdPassSeatV7(state: GameStateV7, index: number) {
  const player = state.players.find((item) => item.seat === index);
  if (player === undefined) throw new Error("seat missing");
  return player;
}

/** Seat 0's view. */
export const thirdPassViewV7 = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, thirdPassSeatV7(state, 0).id);

export function thirdPassAcceptV7(
  state: GameStateV7,
  index: number,
  command: CommandV7,
): GameStateV7 {
  const result = applyCommandV7(
    state,
    thirdPassSeatV7(state, index).id,
    command,
  );
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result.state;
}

/** Every seat ends its turn in order: seat 0 decides again. */
export function thirdPassNextTurnV7(state: GameStateV7): GameStateV7 {
  let next = state;
  for (let index = 0; index < state.players.length; index += 1)
    next = thirdPassAcceptV7(next, index, { kind: "END_TURN" });
  return next;
}

export function thirdPassUnitAtV7(state: GameStateV7, at: CoordV7): UnitId {
  const unit = state.units.find(
    (item) => item.hp > 0 && item.at.x === at.x && item.at.y === at.y,
  );
  if (unit === undefined)
    throw new Error(`no unit at ${String(at.x)},${String(at.y)}`);
  return unit.id;
}

/** Patches units by ID and re-validates the state. */
export function thirdPassPatchV7(
  state: GameStateV7,
  patches: ReadonlyMap<UnitId, Partial<UnitStateV7>>,
): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    units: state.units.map((unit) => ({ ...unit, ...patches.get(unit.id) })),
  });
  if (parsed === null) throw new Error("the patched state is invalid");
  return parsed;
}
