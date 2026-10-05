import {
  RULESET_7_ID,
  applyCommandV7,
  buildMissionStateV7,
  createPlayableGameFromMapStateV7,
  parseGameStateV7,
  type ApplyCommandResultV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type MissionDefinitionV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";

/**
 * The naval branch (`pulp_wars-5ti.2`,
 * docs/product/RULESET_7_NAVAL_BRANCH.md): an authored two-seat strait built
 * through the mission builder (never through the registry), so every state
 * passes the full state schema.
 *
 * Rows 0 to 2 and 8 to 10 are land; rows 3 and 7 are Shallow Water; rows 4
 * to 6 are Deep Water, except around the one-tile islet on (9, 5), whose
 * four orthogonal neighbours are Shallow. Seat 0's capital is on (5, 2)
 * with a Port on (4, 3); seat 1's capital is on (5, 8) with a Port on
 * (6, 7). Each seat's first unit is a Fighter on its capital.
 */
export const NAVAL_ARENA_SIZE_V7 = 11;
export const NAVAL_ARENA_CAPITALS_V7: readonly [CoordV7, CoordV7] = [
  { x: 5, y: 2 },
  { x: 5, y: 8 },
];
export const NAVAL_ARENA_PORTS_V7: readonly [CoordV7, CoordV7] = [
  { x: 4, y: 3 },
  { x: 6, y: 7 },
];

const TERRAIN: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~.~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "...........",
  "...........",
  "...........",
];

/** Every Naval technology, in prerequisite order. */
export const NAVAL_TECHS_V7: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

export interface NavalArenaUnitV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
}

export interface NavalArenaOptionsV7 {
  readonly factions?: readonly [FactionIdV7, FactionIdV7];
  /** Per seat; every Naval technology by default. */
  readonly technologies?: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ];
  readonly units: readonly NavalArenaUnitV7[];
  /** Per seat: the whole board is explored (the default) or radius 1 only. */
  readonly explored?: readonly [boolean, boolean];
  /** Per seat: whether its Port exists (the default). */
  readonly ports?: readonly [boolean, boolean];
  /** Rival (the default) or cooperative AI mode. */
  readonly aiMode?: "RIVAL" | "COOPERATIVE";
  /**
   * A third seat (a bystander): its capital on (9, 9), one Fighter, no
   * technology; it has explored its capital's surroundings only, unless
   * `explored`.
   */
  readonly third?: {
    readonly faction: FactionIdV7;
    readonly explored?: boolean;
  };
}

/** The bystander seat's capital ({@link NavalArenaOptionsV7.third}). */
export const NAVAL_ARENA_THIRD_CAPITAL_V7: CoordV7 = { x: 9, y: 9 };

export function navalArenaSetupV7(
  factions: readonly FactionIdV7[],
  aiMode: "RIVAL" | "COOPERATIVE" = "RIVAL",
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: NAVAL_ARENA_SIZE_V7,
    height: NAVAL_ARENA_SIZE_V7,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode,
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

export function navalArenaV7(options: NavalArenaOptionsV7): GameStateV7 {
  const factions = options.factions ?? ["ORIGINAL", "UNDEAD"];
  const technologies = options.technologies ?? [NAVAL_TECHS_V7, NAVAL_TECHS_V7];
  const explored = options.explored ?? [true, true];
  const ports = options.ports ?? [true, true];
  const aiMode = options.aiMode ?? "RIVAL";
  const seat = (index: 0 | 1): MissionDefinitionV7["seats"][number] => ({
    faction: factions[index],
    coins: 60,
    technologies: [...technologies[index]],
    // Level 2: a Port with Harbours gives 2 population, more than a
    // level-1 city holds.
    cities: [
      { at: NAVAL_ARENA_CAPITALS_V7[index], level: 2, rewards: ["SURVEY"] },
    ],
    units: [
      { role: "FIGHTER", at: NAVAL_ARENA_CAPITALS_V7[index] },
      ...options.units
        .filter((unit) => unit.seat === index)
        .map((unit) => ({ role: unit.role, at: unit.at })),
    ],
    reveal: explored[index]
      ? { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] }
      : { radius: 1 },
  });
  const mission: MissionDefinitionV7 = {
    id: "NAVAL_BRANCH_ARENA",
    revision: 1,
    hidden: true,
    size: NAVAL_ARENA_SIZE_V7,
    seed: 1,
    terrain: TERRAIN,
    resources: TERRAIN.map(() => ".".repeat(NAVAL_ARENA_SIZE_V7)),
    biome: "PLAINS",
    villages: [],
    improvements: ([0, 1] as const).flatMap((index) =>
      ports[index]
        ? [{ at: NAVAL_ARENA_PORTS_V7[index], improvement: "PORT" as const }]
        : [],
    ),
    aiMode,
    seats: [
      seat(0),
      seat(1),
      ...(options.third === undefined
        ? []
        : [
            {
              faction: options.third.faction,
              coins: 0,
              technologies: [],
              cities: [
                { at: NAVAL_ARENA_THIRD_CAPITAL_V7, level: 1, rewards: [] },
              ],
              units: [
                { role: "FIGHTER" as const, at: NAVAL_ARENA_THIRD_CAPITAL_V7 },
              ],
              reveal:
                options.third.explored === true
                  ? { radius: 0, rects: [{ x0: 0, y0: 0, x1: 10, y1: 10 }] }
                  : { radius: 1 },
            },
          ]),
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
  const built = buildMissionStateV7(
    mission,
    navalArenaSetupV7(
      options.third === undefined
        ? factions
        : [...factions, options.third.faction],
      aiMode,
    ),
  );
  // The first Start Turn, as for every match (city actions, income).
  const started = createPlayableGameFromMapStateV7({
    ok: true,
    state: built,
    mapAttempt: 1,
  });
  if (!started.ok) throw new Error("the naval arena did not start");
  if (parseGameStateV7(started.state) === null)
    throw new Error("the naval arena is not a valid state");
  return started.state;
}

export function navalUnitAtV7(state: GameStateV7, at: CoordV7): UnitStateV7 {
  const unit = state.units.find(
    (candidate) =>
      candidate.hp > 0 && candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined)
    throw new Error(`no unit at ${String(at.x)},${String(at.y)}`);
  return unit;
}

export function navalUnitV7(state: GameStateV7, id: number): UnitStateV7 {
  const unit = state.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error(`no unit ${String(id)}`);
  return unit;
}

/** Patches one unit and re-validates the state. */
export function patchNavalUnitV7(
  state: GameStateV7,
  id: number,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  const next: GameStateV7 = {
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, ...patch } : unit,
    ),
  };
  const parsed = parseGameStateV7(next);
  if (parsed === null) throw new Error("the patched state is invalid");
  return parsed;
}

/** A unit that has moved one tile this turn and may still act. */
export function movedActivationV7(
  unit: UnitStateV7,
  tiles = 1,
): UnitStateV7["activation"] {
  return { ...unit.activation, moved: true, movedPathLength: tiles };
}

export function seatV7(state: GameStateV7, seat: 0 | 1 | 2) {
  const player = state.players.find((candidate) => candidate.seat === seat);
  if (player === undefined) throw new Error("seat missing");
  return player;
}

export function acceptV7(
  state: GameStateV7,
  seat: 0 | 1,
  command: CommandV7,
): Extract<ApplyCommandResultV7, { readonly accepted: true }> {
  const result = applyCommandV7(state, seatV7(state, seat).id, command);
  if (!result.accepted)
    throw new Error(
      `${command.kind} rejected: ${result.error.code} ${JSON.stringify(result.error.params)}`,
    );
  return result;
}

export function rejectV7(
  state: GameStateV7,
  seat: 0 | 1,
  command: CommandV7,
): { readonly code: string; readonly params: unknown } {
  const before = JSON.stringify(state);
  const result = applyCommandV7(state, seatV7(state, seat).id, command);
  if (result.accepted) throw new Error(`${command.kind} was accepted`);
  if (JSON.stringify(result.state) !== before)
    throw new Error("a rejection changed the state");
  return { code: result.error.code, params: result.error.params };
}
