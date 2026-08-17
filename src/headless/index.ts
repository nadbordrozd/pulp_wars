import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN,
  chooseNormalCommand,
} from "../ai/index";
import {
  MAP_GENERATION_REVISION,
  applyCommand,
  canonicalHash,
  createGame,
  DEMO_MATCH_SETUP,
  runReplay,
  viewFor,
  type ApplyResult,
  type Command,
  type CreateResult,
  type DomainEvent,
  type GameState,
  type MatchOutcome,
  type MatchSetup,
  type BoardSize,
  type FactionId,
  type PlayerId,
  type PlayerView,
  type ReplayFile,
  type ReplayRunResult,
  type UnitType,
  effectiveUnitLabel,
  arePlayersAllied,
  type EffectiveUnitLabel,
} from "../engine/index";

export type HeadlessResult = ReplayRunResult;

export interface AiCommandRecord {
  readonly index: number;
  readonly playerId: PlayerId;
  readonly command: Command;
  readonly events: readonly DomainEvent[];
  readonly stateHash: string;
}

export type AiMatchTermination =
  "OUTCOME" | "COMMAND_CAP" | "ROUND_CAP" | "STALL" | "ERROR";

export interface AiDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly playerId: PlayerId | null;
}

export interface AiMatchResult {
  readonly outcome: MatchOutcome | null;
  readonly termination: AiMatchTermination;
  readonly acceptedCommands: number;
  readonly rounds: number;
  readonly state: GameState;
  readonly stateHash: string;
  readonly events: readonly DomainEvent[];
  readonly commandLog: readonly AiCommandRecord[];
  readonly errors: readonly AiDiagnostic[];
  readonly stalls: readonly AiDiagnostic[];
  readonly metrics: HeadlessMetrics;
}

export interface HeadlessMetrics {
  readonly factionsBySeat: readonly FactionId[];
  readonly commandsByKind: Readonly<Record<string, number>>;
  readonly eventsByKind: Readonly<Record<string, number>>;
  readonly researchByTech: Readonly<Record<string, number>>;
  readonly trainedByUnit: Readonly<Record<UnitType, number>>;
  readonly actionsByUnit: Readonly<Record<UnitType, number>>;
  readonly commandsByEffectiveUnitLabel: Readonly<Record<string, number>>;
  readonly actionsByEffectiveUnitLabel: Readonly<Record<string, number>>;
  readonly wallsBuilt: number;
  readonly wallsDestroyed: number;
  readonly rolls: number;
  readonly rollDamageByRelationship: Readonly<Record<string, number>>;
  readonly rollPathCellsRevealed: number;
  readonly candifyStarted: number;
  readonly candifyChoices: number;
  readonly tilesCandified: number;
  readonly catapultAttacks: number;
  readonly catapultKills: number;
  readonly terrainCounts: Readonly<Record<string, number>>;
  readonly resourceCounts: Readonly<Record<string, number>>;
  readonly improvementCounts: Readonly<Record<string, number>>;
  readonly opportunityMinimum: number;
  readonly opportunityMaximum: number;
  readonly opportunityHistogram: Readonly<Record<string, number>>;
}

export interface AiMatchOptions {
  readonly maxCommands: number;
  readonly maxRounds?: number;
  readonly maxCommandsPerTurn?: number;
  /** Validation corpora can compare command/event/final hashes without the
   * more expensive state hash after every command. Defaults to true. */
  readonly recordCheckpointHashes?: boolean;
}

export interface AiBatchOptions {
  readonly seeds: readonly number[];
  readonly aiCounts: readonly (1 | 2 | 3)[];
  readonly maxCommands: number;
  readonly maxRounds?: number;
  /** Defaults to each AI count's Auto size; validation may request Huge. */
  readonly boardSize?: BoardSize;
  readonly aiMode?: MatchSetup["aiMode"];
  /** Exact seat order. Omission means all Original for each generated match. */
  readonly factions?: readonly FactionId[];
}

export interface AiBatchEntry {
  readonly seed: number;
  readonly aiCount: 1 | 2 | 3;
  readonly outcome: MatchOutcome | null;
  readonly termination: AiMatchTermination;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  readonly finalHash: string;
  readonly metrics: HeadlessMetrics;
}

export interface AiBatchSummary {
  readonly matches: number;
  readonly completed: number;
  readonly capped: number;
  readonly errors: number;
  readonly stalls: number;
  readonly totalRounds: number;
  readonly totalCommands: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly entries: readonly AiBatchEntry[];
}

export interface HeadlessApi {
  create(setup: MatchSetup): Promise<CreateResult>;
  createDemo(): Promise<CreateResult>;
  apply(state: GameState, command: Command): Promise<ApplyResult>;
  viewFor(state: GameState, viewer: PlayerId): Promise<PlayerView>;
  run(
    replay: ReplayFile,
    options?: { readonly stopAfter?: number },
  ): Promise<HeadlessResult>;
  runAiMatch(
    setup: MatchSetup,
    options: number | AiMatchOptions,
  ): Promise<AiMatchResult>;
  runAiBatch(options: AiBatchOptions): Promise<AiBatchSummary>;
}

export const headless: HeadlessApi = {
  async create(setup: MatchSetup): Promise<CreateResult> {
    return Promise.resolve(createGame(setup));
  },
  async createDemo(): Promise<CreateResult> {
    return Promise.resolve(createGame(DEMO_MATCH_SETUP));
  },
  async apply(state: GameState, command: Command): Promise<ApplyResult> {
    return Promise.resolve(applyCommand(state, command));
  },
  async viewFor(state: GameState, viewer: PlayerId): Promise<PlayerView> {
    return Promise.resolve(viewFor(state, viewer));
  },
  async run(
    replay: ReplayFile,
    options: { readonly stopAfter?: number } = {},
  ): Promise<HeadlessResult> {
    return Promise.resolve(runReplay(replay, options));
  },
  async runAiMatch(
    setup: MatchSetup,
    options: number | AiMatchOptions,
  ): Promise<AiMatchResult> {
    return Promise.resolve(runAiMatch(setup, options));
  },
  async runAiBatch(options: AiBatchOptions): Promise<AiBatchSummary> {
    return runAiBatch(options);
  },
};

export function runAiMatch(
  setup: MatchSetup,
  options: number | AiMatchOptions,
): AiMatchResult {
  return runAiMatchInternal(setup, options, true);
}

function runAiMatchInternal(
  setup: MatchSetup,
  options: number | AiMatchOptions,
  recordCommands: boolean,
): AiMatchResult {
  const normalized =
    typeof options === "number" ? { maxCommands: options } : options;
  validatePositiveCap(normalized.maxCommands, "maxCommands");
  const maxRounds = normalized.maxRounds ?? 500;
  const maxCommandsPerTurn =
    normalized.maxCommandsPerTurn ?? NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN;
  validatePositiveCap(maxRounds, "maxRounds");
  validatePositiveCap(maxCommandsPerTurn, "maxCommandsPerTurn");
  if (maxCommandsPerTurn > NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN) {
    throw new RangeError("maxCommandsPerTurn exceeds the Normal POC limit");
  }

  const created = createGame(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  // Policy-driving is external to controller identity. The historical rival
  // runner projection remains byte/hash stable; cooperative matches retain the
  // serialized human role so human defeat ends the coalition match immediately.
  let state: GameState =
    setup.aiMode === "RIVAL"
      ? {
          ...created.state,
          players: created.state.players.map((player) => ({
            ...player,
            controller: "AI" as const,
          })),
        }
      : created.state;
  const events: DomainEvent[] = [...created.events];
  const metrics = createMetrics(created.state, created.events);
  const commandLog: AiCommandRecord[] = [];
  const errors: AiDiagnostic[] = [];
  const stalls: AiDiagnostic[] = [];
  let termination: AiMatchTermination = "COMMAND_CAP";
  let turnPlayerId = activePlayerId(state);
  let commandsThisTurn = 0;

  while (state.outcome === null) {
    if (state.commandIndex >= normalized.maxCommands) {
      termination = "COMMAND_CAP";
      break;
    }
    if (state.round > maxRounds) {
      termination = "ROUND_CAP";
      break;
    }
    const playerId = activePlayerId(state);
    if (playerId !== turnPlayerId) {
      turnPlayerId = playerId;
      commandsThisTurn = 0;
    }
    const view = viewFor(state, playerId);
    let command: Command | null;
    const reserveForEnd = view.pendingChoice === null ? 1 : 2;
    if (commandsThisTurn >= maxCommandsPerTurn - reserveForEnd) {
      if (view.pendingChoice !== null) {
        command = chooseNormalCommand(view).command;
      } else {
        command = { kind: "END_TURN" };
      }
    } else {
      command = chooseNormalCommand(view).command;
    }
    if (command === null) {
      const diagnostic = makeDiagnostic(
        state,
        playerId,
        "NO_PUBLIC_COMMAND",
        "Observation-safe query returned no command for the active player",
      );
      stalls.push(diagnostic);
      termination = "STALL";
      break;
    }
    const beforeIndex = state.commandIndex;
    const actingUnit =
      "unitId" in command
        ? state.units.find((unit) => unit.id === command.unitId)
        : undefined;
    const beforeState = state;
    const applied = applyCommand(state, command);
    if (!applied.ok) {
      errors.push(
        makeDiagnostic(
          state,
          playerId,
          `COMMAND_REJECTED:${applied.error.code}`,
          `AI-selected ${command.kind} was rejected`,
        ),
      );
      termination = "ERROR";
      break;
    }
    state = applied.state;
    increment(metrics.commandsByKind, command.kind);
    if (command.kind === "RESEARCH")
      increment(metrics.researchByTech, command.tech);
    if (command.kind === "TRAIN") metrics.trainedByUnit[command.unit] += 1;
    if (actingUnit !== undefined) {
      metrics.actionsByUnit[actingUnit.type] += 1;
      const ownerFaction = beforeState.players.find(
        (player) => player.id === actingUnit.ownerId,
      )?.faction;
      if (ownerFaction !== undefined) {
        const label = effectiveUnitLabel(ownerFaction, actingUnit.type);
        increment(metrics.actionsByEffectiveUnitLabel, label);
        increment(
          metrics.commandsByEffectiveUnitLabel,
          `${label}:${command.kind}`,
        );
      }
      if (command.kind === "ATTACK" && actingUnit.type === "CATAPULT") {
        metrics.catapultAttacks += 1;
        if (
          applied.events.some(
            (event) =>
              event.kind === "COMBAT_RESOLVED" && event.preview.defenderDies,
          )
        ) {
          metrics.catapultKills += 1;
        }
      }
    }
    if (command.kind === "KAMIKAZE_ROLL") metrics.rolls += 1;
    if (command.kind === "CANDIFY") metrics.candifyStarted += 1;
    if (command.kind === "CHOOSE_CANDIFY_CITY") metrics.candifyChoices += 1;
    for (const event of applied.events) {
      if (event.kind === "CHOCOLATE_WALL_BUILT") metrics.wallsBuilt += 1;
      if (event.kind === "CHOCOLATE_WALL_DESTROYED")
        metrics.wallsDestroyed += 1;
      if (event.kind === "TILE_CANDIFIED") metrics.tilesCandified += 1;
      if (command.kind === "KAMIKAZE_ROLL" && event.kind === "TILES_REVEALED") {
        metrics.rollPathCellsRevealed += event.tiles.length;
      }
      if (event.kind === "ROLL_DAMAGE_RESOLVED") {
        const target = event.target;
        const targetOwner =
          target.kind === "UNIT"
            ? beforeState.units.find((unit) => unit.id === target.unitId)
                ?.ownerId
            : beforeState.chocolateWalls.find(
                (wall) => wall.id === target.wallId,
              )?.ownerId;
        const relationship =
          targetOwner === playerId
            ? "OWN"
            : targetOwner !== undefined &&
                arePlayersAllied(
                  beforeState.setup.aiMode,
                  beforeState.humanPlayerId,
                  playerId,
                  targetOwner,
                )
              ? "ALLIED"
              : "HOSTILE";
        increment(metrics.rollDamageByRelationship, relationship);
      }
    }
    for (const event of applied.events)
      increment(metrics.eventsByKind, event.kind);
    if (recordCommands) events.push(...applied.events);
    commandsThisTurn += 1;
    if (recordCommands) {
      commandLog.push({
        index: state.commandIndex,
        playerId,
        command,
        events: applied.events,
        stateHash:
          normalized.recordCheckpointHashes === false
            ? ""
            : canonicalHash(state),
      });
    }
    if (state.commandIndex !== beforeIndex + 1) {
      stalls.push(
        makeDiagnostic(
          state,
          playerId,
          "NO_COMMAND_PROGRESS",
          "Accepted command did not advance commandIndex",
        ),
      );
      termination = "STALL";
      break;
    }
    if (command.kind === "END_TURN") commandsThisTurn = 0;
  }
  if (state.outcome !== null) termination = "OUTCOME";
  return {
    outcome: state.outcome,
    termination,
    acceptedCommands: state.commandIndex,
    rounds: state.round,
    state,
    stateHash: canonicalHash(state),
    events,
    commandLog,
    errors,
    stalls,
    metrics,
  };
}

export async function runAiBatch(
  options: AiBatchOptions,
): Promise<AiBatchSummary> {
  if (options.seeds.length === 0) throw new RangeError("seeds cannot be empty");
  if (options.aiCounts.length === 0)
    throw new RangeError("aiCounts cannot be empty");
  const entries: AiBatchEntry[] = [];
  for (const aiCount of options.aiCounts) {
    const size =
      options.boardSize ?? (aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16);
    for (const seed of options.seeds) {
      // A macrotask boundary keeps large soak corpora memory-stable by giving
      // the runtime an opportunity to collect the prior match's immutable
      // intermediate states. Timing cannot affect policy or engine state.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const result = runAiMatchInternal(
        {
          rulesetId: "pulp-wars-poc-5",
          mapGenerationRevision: MAP_GENERATION_REVISION,
          seed,
          width: size,
          height: size,
          aiCount,
          aiDifficulty: "NORMAL",
          aiMode: options.aiMode ?? "RIVAL",
          humanColor: "CORAL",
          factions:
            options.factions === undefined
              ? Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const)
              : [...options.factions],
        },
        {
          maxCommands: options.maxCommands,
          ...(options.maxRounds === undefined
            ? {}
            : { maxRounds: options.maxRounds }),
        },
        false,
      );
      entries.push({
        seed,
        aiCount,
        outcome: result.outcome,
        termination: result.termination,
        rounds: result.rounds,
        commands: result.acceptedCommands,
        errors: result.errors.length,
        stalls: result.stalls.length,
        finalHash: result.stateHash,
        metrics: result.metrics,
      });
    }
  }
  const outcomes: Record<string, number> = {};
  for (const entry of entries) {
    const key = entry.outcome?.kind ?? entry.termination;
    outcomes[key] = (outcomes[key] ?? 0) + 1;
  }
  return {
    matches: entries.length,
    completed: entries.filter((entry) => entry.termination === "OUTCOME")
      .length,
    capped: entries.filter(
      (entry) =>
        entry.termination === "COMMAND_CAP" ||
        entry.termination === "ROUND_CAP",
    ).length,
    errors: entries.reduce((total, entry) => total + entry.errors, 0),
    stalls: entries.reduce((total, entry) => total + entry.stalls, 0),
    totalRounds: entries.reduce((total, entry) => total + entry.rounds, 0),
    totalCommands: entries.reduce((total, entry) => total + entry.commands, 0),
    outcomes,
    entries,
  };
}

interface MutableMetrics {
  factionsBySeat: readonly FactionId[];
  commandsByKind: Record<string, number>;
  eventsByKind: Record<string, number>;
  researchByTech: Record<string, number>;
  trainedByUnit: Record<UnitType, number>;
  actionsByUnit: Record<UnitType, number>;
  commandsByEffectiveUnitLabel: Record<string, number>;
  actionsByEffectiveUnitLabel: Record<string, number>;
  wallsBuilt: number;
  wallsDestroyed: number;
  rolls: number;
  rollDamageByRelationship: Record<string, number>;
  rollPathCellsRevealed: number;
  candifyStarted: number;
  candifyChoices: number;
  tilesCandified: number;
  catapultAttacks: number;
  catapultKills: number;
  terrainCounts: Record<string, number>;
  resourceCounts: Record<string, number>;
  improvementCounts: Record<string, number>;
  opportunityMinimum: number;
  opportunityMaximum: number;
  opportunityHistogram: Record<string, number>;
}

function createMetrics(
  state: GameState,
  initialEvents: readonly DomainEvent[],
): MutableMetrics {
  const terrainCounts: Record<string, number> = {};
  const resourceCounts: Record<string, number> = {};
  const improvementCounts: Record<string, number> = {};
  for (const tile of state.board.tiles) {
    increment(terrainCounts, tile.terrain);
    increment(resourceCounts, tile.resource ?? "NONE");
    increment(improvementCounts, tile.improvement ?? "NONE");
  }
  const opportunityHistogram: Record<string, number> = {};
  let opportunityMinimum = Number.MAX_SAFE_INTEGER;
  let opportunityMaximum = 0;
  for (const center of state.board.tiles.filter((tile) => tile.site !== null)) {
    const count = state.board.tiles.filter(
      (tile) =>
        tile.territoryCenter?.x === center.at.x &&
        tile.territoryCenter.y === center.at.y &&
        (tile.at.x !== center.at.x || tile.at.y !== center.at.y) &&
        (tile.resource !== null || tile.terrain === "FOREST"),
    ).length;
    opportunityMinimum = Math.min(opportunityMinimum, count);
    opportunityMaximum = Math.max(opportunityMaximum, count);
    increment(opportunityHistogram, String(count));
  }
  const eventsByKind: Record<string, number> = {};
  for (const event of initialEvents) increment(eventsByKind, event.kind);
  return {
    factionsBySeat: [...state.setup.factions],
    commandsByKind: {},
    eventsByKind,
    researchByTech: {},
    trainedByUnit: emptyUnitMetrics(),
    actionsByUnit: emptyUnitMetrics(),
    commandsByEffectiveUnitLabel: {},
    actionsByEffectiveUnitLabel: emptyEffectiveLabelMetrics(),
    wallsBuilt: 0,
    wallsDestroyed: 0,
    rolls: 0,
    rollDamageByRelationship: {},
    rollPathCellsRevealed: 0,
    candifyStarted: 0,
    candifyChoices: 0,
    tilesCandified: 0,
    catapultAttacks: 0,
    catapultKills: 0,
    terrainCounts,
    resourceCounts,
    improvementCounts,
    opportunityMinimum:
      opportunityMinimum === Number.MAX_SAFE_INTEGER ? 0 : opportunityMinimum,
    opportunityMaximum,
    opportunityHistogram,
  };
}

function emptyEffectiveLabelMetrics(): Record<EffectiveUnitLabel, number> {
  return {
    Warrior: 0,
    Archer: 0,
    Defender: 0,
    Rider: 0,
    Catapult: 0,
    "Candy Warrior": 0,
    "Gumball Guard": 0,
    "Choco Engineer": 0,
    Donut: 0,
  };
}

function emptyUnitMetrics(): Record<UnitType, number> {
  return {
    WARRIOR: 0,
    ARCHER: 0,
    DEFENDER: 0,
    RIDER: 0,
    CATAPULT: 0,
  };
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function activePlayerId(state: GameState): PlayerId {
  const playerId = state.turnOrder[state.activeSeatIndex];
  if (playerId === undefined) throw new RangeError("Active player disappeared");
  return playerId;
}

function validatePositiveCap(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function makeDiagnostic(
  state: GameState,
  playerId: PlayerId | null,
  code: string,
  message: string,
): AiDiagnostic {
  return {
    code,
    message,
    commandIndex: state.commandIndex,
    round: state.round,
    playerId,
  };
}
