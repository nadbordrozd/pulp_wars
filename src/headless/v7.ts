import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyErrorV7,
  NormalTurnCommandCapErrorV7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../ai/v7";
import type { PlayerId, UnitId } from "../engine/model/ids";
import { canonicalHash, canonicalJson } from "../engine/replay/canonical";
import {
  TECHNOLOGY_BRANCH_IDS_V7,
  effectiveRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import {
  arePlayersAlliedV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
} from "../engine/v7/economy";
import type { DomainEventV7 } from "../engine/v7/events";
import {
  previewBlackoutV7,
  previewDefectionV7,
  previewEconomicV7,
  previewMonumentV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
} from "../engine/v7/query";
import {
  applyCommandV7,
  createPlayableGameV7,
  type ApplyCommandResultV7,
  type CreatePlayableGameResultV7,
} from "../engine/v7/reducer";
import {
  runReplayV7,
  type ReplayFileV7,
  type ReplayRunResultV7,
} from "../engine/v7/replay";
import { spatialContributionAtV7 } from "../engine/v7/spatial-economy";
import {
  COMMAND_KIND_ORDER_V7,
  DEFECTION_CANCELLATION_REASON_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type AiCountV7,
  type BoardSizeV7,
  type DefectionCancellationReasonV7,
  type GameStateV7,
  type ImprovementIdV7,
  type MatchOutcomeV7,
  type MatchSetupV7,
  type ResourceIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import { viewForV7, type PlayerViewV7 } from "../engine/v7/view";

export const V7_MATCH_MAX_COMMANDS_DEFAULT = 30_000;
export const V7_MATCH_MAX_ROUNDS_DEFAULT = 750;
export const V7_PUBLIC_EQUALITY_COMMAND_LIMIT = 32;

export type AiMatchTerminationV7 =
  "OUTCOME" | "COMMAND_CAP" | "ROUND_CAP" | "STALL" | "ERROR";

export interface AiDiagnosticV7 {
  readonly code: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly playerId: PlayerId | null;
}

export interface AiCommandRecordV7 {
  readonly index: number;
  readonly playerId: PlayerId;
  readonly command: CommandV7;
  readonly events: readonly DomainEventV7[];
  readonly stateHash: string;
}

export interface HeadlessMetricsV7 {
  readonly rulesetId: "pulp-wars-poc-7r2";
  readonly setupHash: string;
  readonly mapHash: string;
  readonly postGenerationPrngHash: string;
  finalPrngHash: string;
  commandHash: string;
  eventHash: string;
  checkpointHash: string;
  finalHash: string;
  readonly commandsByKind: Record<string, number>;
  readonly eventsByKind: Record<string, number>;
  readonly research: {
    readonly adoption: Record<TechnologyIdV7, number>;
    readonly firstRound: Record<TechnologyIdV7, number | null>;
    readonly byBranch: Record<string, number>;
  };
  readonly economy: {
    coinsEarned: number;
    coinsSpent: number;
    oneCoinFloorAwards: number;
    negativePopulationLoss: number;
    spoilsCoins: number;
    pillageCoins: number;
    disbandCoins: number;
  };
  readonly resources: {
    readonly generated: Record<ResourceIdV7, number>;
    readonly converted: Record<ResourceIdV7, number>;
    readonly restored: Record<ResourceIdV7, number>;
    readonly rebuilt: Record<ResourceIdV7, number>;
  };
  readonly improvements: {
    readonly built: Record<ImprovementIdV7, number>;
    readonly removed: Record<ImprovementIdV7, number>;
    readonly liveOutputHistogram: Record<
      ImprovementIdV7,
      Record<string, number>
    >;
    readonly outages: Record<ImprovementIdV7, number>;
    readonly resumptions: Record<ImprovementIdV7, number>;
    roadsBuilt: number;
  };
  readonly capacity: {
    barracksBuilt: number;
    fortificationAdoptions: number;
    overcapacityStates: number;
    reservationTurnBoundaries: number;
  };
  readonly achievements: {
    readonly progressMaximum: Record<"ENGINEER" | "MUSTER", number>;
    readonly unlockRound: Record<"ENGINEER" | "MUSTER", number | null>;
    monumentPlacements: number;
    monumentTransfers: number;
    monumentLosses: number;
    monumentPopulation: number;
    rewardsFromMonumentGrowth: number;
  };
  readonly rewards: Record<(typeof REWARD_IDS_V7)[number], number>;
  readonly roles: {
    readonly trained: Record<UnitRoleIdV7, number>;
    readonly actions: Record<UnitRoleIdV7, number>;
    readonly damage: Record<UnitRoleIdV7, number>;
    readonly kills: Record<UnitRoleIdV7, number>;
    readonly losses: Record<UnitRoleIdV7, number>;
    readonly captures: Record<UnitRoleIdV7, number>;
    readonly trainingCoins: Record<UnitRoleIdV7, number>;
    readonly survivors: Record<UnitRoleIdV7, number>;
    readonly survivalPerCoin: Record<UnitRoleIdV7, number>;
  };
  readonly pursuit: {
    activations: number;
    attacks: number;
    kills: number;
    paths: number;
    readonly stops: Record<string, number>;
    readonly endReasons: Record<string, number>;
    readonly targetSpacing: Record<string, number>;
    publicNodesSearched: number;
  };
  readonly defection: {
    offers: number;
    replyTurns: number;
    arms: number;
    resolutions: number;
    readonly cancellations: Record<DefectionCancellationReasonV7, number>;
    readonly convertedRoles: Record<UnitRoleIdV7, number>;
    convertedPublicValue: number;
    reservationDurationCommands: number;
  };
  readonly saboteur: {
    concealedTurns: number;
    detectedTurns: number;
    readonly exposedTurnsBySource: Record<
      "ATTACK" | "PILLAGE" | "BLACKOUT",
      number
    >;
    blackoutsBlocked: number;
    suppressionCoins: number;
    actionsDenied: number;
    recoveryTurns: number;
    cooldownObservations: number;
    postExposureSurvivals: number;
  };
  readonly catapult: {
    readonly shotRanges: Record<"2" | "3", number>;
    setupTurns: number;
    healingBetweenVolleys: number;
    coordinatedAttackers: number;
    siegeTurnBoundaries: number;
    screenSurvivals: number;
  };
  readonly observation: {
    checks: number;
    commandChecks: number;
    previewChecks: number;
    policyChecks: number;
    mismatches: number;
    hiddenInformationViolations: number;
  };
  readonly relationships: {
    alliedHostileActions: number;
    alliedTerritoryPathSteps: number;
  };
  errors: number;
  stalls: number;
  commandCapHits: number;
  roundCapHits: number;
}

export interface AiMatchOptionsV7 {
  readonly maxCommands?: number;
  readonly maxRounds?: number;
  readonly maxCommandsPerTurn?: number;
  readonly recordCheckpointHashes?: boolean;
  readonly progressEveryCommands?: number;
  readonly onProgress?: (progress: AiMatchProgressV7) => void;
}

export interface AiMatchProgressV7 {
  readonly acceptedCommands: number;
  readonly round: number;
  readonly activePlayerId: PlayerId;
}

export interface AiMatchResultV7 {
  readonly outcome: MatchOutcomeV7 | null;
  readonly termination: AiMatchTerminationV7;
  readonly acceptedCommands: number;
  readonly rounds: number;
  readonly state: GameStateV7;
  readonly stateHash: string;
  readonly events: readonly DomainEventV7[];
  readonly commandLog: readonly AiCommandRecordV7[];
  readonly errors: readonly AiDiagnosticV7[];
  readonly stalls: readonly AiDiagnosticV7[];
  readonly metrics: HeadlessMetricsV7;
}

export interface AiBatchOptionsV7 {
  readonly seeds: readonly number[];
  readonly aiCounts: readonly AiCountV7[];
  readonly modes?: readonly MatchSetupV7["aiMode"][];
  readonly boardSize?: BoardSizeV7;
  readonly maxCommands?: number;
  readonly maxRounds?: number;
}

export interface AiBatchEntryV7 {
  readonly seed: number;
  readonly aiCount: AiCountV7;
  readonly aiMode: MatchSetupV7["aiMode"];
  readonly outcome: MatchOutcomeV7 | null;
  readonly termination: AiMatchTerminationV7;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  readonly capFailure: boolean;
  readonly finalHash: string;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly checkpointHash: string;
  readonly metrics: HeadlessMetricsV7;
}

export interface AiBatchSummaryV7 {
  readonly matches: number;
  readonly completed: number;
  readonly failed: number;
  readonly capped: number;
  readonly errors: number;
  readonly stalls: number;
  readonly totalRounds: number;
  readonly totalCommands: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly entries: readonly AiBatchEntryV7[];
}

export interface HeadlessApiV7 {
  create(setup: MatchSetupV7): Promise<CreatePlayableGameResultV7>;
  apply(
    state: GameStateV7,
    actor: PlayerId,
    command: CommandV7,
  ): Promise<ApplyCommandResultV7>;
  viewFor(state: GameStateV7, viewer: PlayerId): Promise<PlayerViewV7>;
  run(replay: ReplayFileV7): Promise<ReplayRunResultV7>;
  runAiMatch(
    setup: MatchSetupV7,
    options?: AiMatchOptionsV7,
  ): Promise<AiMatchResultV7>;
  runAiBatch(options: AiBatchOptionsV7): Promise<AiBatchSummaryV7>;
}

export interface AcceptedTelemetryTransitionV7 {
  readonly before: GameStateV7;
  readonly after: GameStateV7;
  readonly actorId: PlayerId;
  readonly command: CommandV7;
  readonly events: readonly DomainEventV7[];
}

/** Deterministic telemetry collector for checked reducer fixture sequences. */
export function collectAcceptedTelemetryV7(
  initialState: GameStateV7,
  initialEvents: readonly DomainEventV7[],
  transitions: readonly AcceptedTelemetryTransitionV7[],
): HeadlessMetricsV7 {
  const metrics = createMetricsV7(initialState);
  const telemetry = createTelemetryState(initialState);
  recordEventsV7(initialState, initialState, initialEvents, metrics, telemetry);
  recordSnapshotV7(initialState, metrics, telemetry, true);
  let state = initialState;
  const commands: CommandV7[] = [];
  const events = [...initialEvents];
  const checkpoints: string[] = [];
  for (const transition of transitions) {
    if (canonicalHash(transition.before) !== canonicalHash(state))
      throw new RangeError("Telemetry transition is not contiguous");
    if (transition.after.commandIndex !== transition.before.commandIndex + 1)
      throw new RangeError("Telemetry transition is not accepted");
    increment(metrics.commandsByKind, transition.command.kind);
    recordCommandAndEventsV7(
      transition.before,
      transition.after,
      transition.actorId,
      transition.command,
      transition.events,
      metrics,
      telemetry,
    );
    recordSnapshotV7(
      transition.after,
      metrics,
      telemetry,
      transition.events.some((event) => event.kind === "TURN_STARTED"),
    );
    state = transition.after;
    commands.push(transition.command);
    events.push(...transition.events);
    checkpoints.push(canonicalHash(state));
  }
  finalizeMetricsV7(metrics, state, commands, events, checkpoints);
  return metrics;
}

export const headlessV7: HeadlessApiV7 = {
  async create(setup) {
    return Promise.resolve(createPlayableGameV7(setup));
  },
  async apply(state, actor, command) {
    return Promise.resolve(applyCommandV7(state, actor, command));
  },
  async viewFor(state, viewer) {
    return Promise.resolve(viewForV7(state, viewer));
  },
  async run(replay) {
    return Promise.resolve(runReplayV7(replay));
  },
  async runAiMatch(setup, options = {}) {
    return Promise.resolve(runAiMatchV7(setup, options));
  },
  async runAiBatch(options) {
    return runAiBatchV7(options);
  },
};

export function runAiMatchV7(
  setup: MatchSetupV7,
  options: AiMatchOptionsV7 = {},
): AiMatchResultV7 {
  return runAiMatchInternalV7(setup, options, true);
}

function runAiMatchInternalV7(
  setup: MatchSetupV7,
  options: AiMatchOptionsV7,
  recordCommands: boolean,
): AiMatchResultV7 {
  const maxCommands = options.maxCommands ?? V7_MATCH_MAX_COMMANDS_DEFAULT;
  const maxRounds = options.maxRounds ?? V7_MATCH_MAX_ROUNDS_DEFAULT;
  const maxCommandsPerTurn =
    options.maxCommandsPerTurn ?? NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7;
  validateCap(maxCommands, "maxCommands");
  validateCap(maxRounds, "maxRounds");
  validateCap(maxCommandsPerTurn, "maxCommandsPerTurn");
  const progressEveryCommands = options.progressEveryCommands ?? 100;
  validateCap(progressEveryCommands, "progressEveryCommands");
  if (maxCommandsPerTurn > NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7)
    throw new RangeError("maxCommandsPerTurn exceeds the Normal v7 limit");
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state = created.state;
  const commands: CommandV7[] = [];
  const events: DomainEventV7[] = [...created.events];
  const checkpoints: string[] = [];
  const commandLog: AiCommandRecordV7[] = [];
  const errors: AiDiagnosticV7[] = [];
  const stalls: AiDiagnosticV7[] = [];
  const metrics = createMetricsV7(state);
  const telemetry = createTelemetryState(state);
  recordEventsV7(state, state, created.events, metrics, telemetry);
  recordSnapshotV7(state, metrics, telemetry, true);
  let termination: AiMatchTerminationV7 = "COMMAND_CAP";
  let turnPlayerId = activePlayerIdV7(state);
  let commandsThisTurn = 0;

  while (state.outcome === null) {
    if (state.commandIndex >= maxCommands) {
      metrics.commandCapHits += 1;
      termination = "COMMAND_CAP";
      break;
    }
    if (state.round > maxRounds) {
      metrics.roundCapHits += 1;
      termination = "ROUND_CAP";
      break;
    }
    const actor = activePlayerIdV7(state);
    if (actor !== turnPlayerId) {
      turnPlayerId = actor;
      commandsThisTurn = 0;
    }
    const view = viewForV7(state, actor);
    if (state.commandIndex < V7_PUBLIC_EQUALITY_COMMAND_LIMIT)
      auditPublicEqualityV7(view, metrics);
    let command: CommandV7 | null;
    try {
      const decision = chooseNormalCommandV7(view);
      metrics.pursuit.publicNodesSearched += decision.pursuitNodesSearched;
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        maxCommandsPerTurn,
        decision,
      );
    } catch (cause) {
      const code =
        cause instanceof NormalTurnCommandCapErrorV7
          ? "TURN_COMMAND_CAP_EXCEEDED"
          : cause instanceof NormalPolicyErrorV7
            ? `POLICY_ERROR:${cause.code}`
            : "POLICY_ERROR";
      errors.push(diagnostic(state, actor, code, errorMessage(cause)));
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    if (command === null) {
      stalls.push(
        diagnostic(
          state,
          actor,
          "NO_PUBLIC_COMMAND",
          "Policy returned no command",
        ),
      );
      metrics.stalls += 1;
      termination = "STALL";
      break;
    }
    const before = state;
    const priorIndex = state.commandIndex;
    auditRelationshipCommandV7(state, actor, command, metrics);
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted) {
      errors.push(
        diagnostic(
          state,
          actor,
          `COMMAND_REJECTED:${applied.error.code}`,
          `AI-selected ${command.kind} was rejected`,
        ),
      );
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    state = applied.state;
    commands.push(command);
    events.push(...applied.events);
    const checkpoint = canonicalHash(state);
    checkpoints.push(checkpoint);
    if (recordCommands)
      commandLog.push({
        index: state.commandIndex,
        playerId: actor,
        command,
        events: applied.events,
        stateHash: options.recordCheckpointHashes === false ? "" : checkpoint,
      });
    increment(metrics.commandsByKind, command.kind);
    recordCommandAndEventsV7(
      before,
      state,
      actor,
      command,
      applied.events,
      metrics,
      telemetry,
    );
    recordSnapshotV7(
      state,
      metrics,
      telemetry,
      applied.events.some((event) => event.kind === "TURN_STARTED"),
    );
    commandsThisTurn += 1;
    if (
      options.onProgress !== undefined &&
      state.commandIndex % progressEveryCommands === 0
    )
      options.onProgress({
        acceptedCommands: state.commandIndex,
        round: state.round,
        activePlayerId: activePlayerIdV7(state),
      });
    if (state.commandIndex !== priorIndex + 1) {
      stalls.push(
        diagnostic(
          state,
          actor,
          "NO_COMMAND_PROGRESS",
          "Accepted command did not advance commandIndex",
        ),
      );
      metrics.stalls += 1;
      termination = "STALL";
      break;
    }
    if (command.kind === "END_TURN") commandsThisTurn = 0;
  }
  if (state.outcome !== null) termination = "OUTCOME";
  const stateHash = canonicalHash(state);
  finalizeMetricsV7(metrics, state, commands, events, checkpoints);
  return {
    outcome: state.outcome,
    termination,
    acceptedCommands: state.commandIndex,
    rounds: state.round,
    state,
    stateHash,
    events,
    commandLog,
    errors,
    stalls,
    metrics,
  };
}

function finalizeMetricsV7(
  metrics: HeadlessMetricsV7,
  state: GameStateV7,
  commands: readonly CommandV7[],
  events: readonly DomainEventV7[],
  checkpoints: readonly string[],
): void {
  for (const role of UNIT_ROLE_IDS_V7) {
    metrics.roles.survivors[role] = state.units.filter(
      (unit) => unit.hp > 0 && unit.role === role,
    ).length;
    metrics.roles.survivalPerCoin[role] =
      metrics.roles.trainingCoins[role] === 0
        ? 0
        : metrics.roles.survivors[role] / metrics.roles.trainingCoins[role];
  }
  metrics.commandHash = canonicalHash(commands);
  metrics.eventHash = canonicalHash(events);
  metrics.checkpointHash = canonicalHash(checkpoints);
  metrics.finalHash = canonicalHash(state);
  metrics.finalPrngHash = canonicalHash(state.random);
}

export async function runAiBatchV7(
  options: AiBatchOptionsV7,
): Promise<AiBatchSummaryV7> {
  if (options.seeds.length === 0) throw new RangeError("seeds cannot be empty");
  if (options.aiCounts.length === 0)
    throw new RangeError("aiCounts cannot be empty");
  const modes = options.modes ?? (["RIVAL"] as const);
  if (modes.length === 0) throw new RangeError("modes cannot be empty");
  const entries: AiBatchEntryV7[] = [];
  for (const aiMode of modes)
    for (const aiCount of options.aiCounts) {
      const size =
        options.boardSize ?? (aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16);
      if (size < (aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16))
        throw new RangeError("boardSize is too small for aiCount");
      for (const seed of options.seeds) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const result = runAiMatchInternalV7(
          {
            rulesetId: "pulp-wars-poc-7r2",
            mapGenerationRevision: "SPATIAL_ECONOMY",
            seed,
            width: size,
            height: size,
            aiCount,
            aiDifficulty: "NORMAL",
            aiMode,
            humanColor: "CORAL",
            factions: Array.from(
              { length: aiCount + 1 },
              () => "ORIGINAL" as const,
            ),
          },
          {
            ...(options.maxCommands === undefined
              ? {}
              : { maxCommands: options.maxCommands }),
            ...(options.maxRounds === undefined
              ? {}
              : { maxRounds: options.maxRounds }),
          },
          false,
        );
        entries.push({
          seed,
          aiCount,
          aiMode,
          outcome: result.outcome,
          termination: result.termination,
          rounds: result.rounds,
          commands: result.acceptedCommands,
          errors: result.errors.length,
          stalls: result.stalls.length,
          capFailure:
            result.termination === "COMMAND_CAP" ||
            result.termination === "ROUND_CAP",
          finalHash: result.stateHash,
          commandHash: result.metrics.commandHash,
          eventHash: result.metrics.eventHash,
          checkpointHash: result.metrics.checkpointHash,
          metrics: result.metrics,
        });
      }
    }
  const outcomes: Record<string, number> = {};
  for (const entry of entries)
    increment(outcomes, entry.outcome?.kind ?? entry.termination);
  const failed = entries.filter(
    (entry) => entry.termination !== "OUTCOME",
  ).length;
  return {
    matches: entries.length,
    completed: entries.length - failed,
    failed,
    capped: entries.filter((entry) => entry.capFailure).length,
    errors: sum(entries.map((entry) => entry.errors)),
    stalls: sum(entries.map((entry) => entry.stalls)),
    totalRounds: sum(entries.map((entry) => entry.rounds)),
    totalCommands: sum(entries.map((entry) => entry.commands)),
    outcomes,
    entries,
  };
}

interface TelemetryStateV7 {
  readonly contributionByTile: Map<
    string,
    { readonly improvement: ImprovementIdV7; readonly value: number }
  >;
  readonly defectionOffers: Map<number, number>;
  readonly catapultShotTargets: Set<UnitId>;
  readonly healingSinceCatapultShot: Map<UnitId, number>;
  readonly catapultSetupUnits: Set<UnitId>;
  readonly exposedSaboteurs: Set<UnitId>;
  readonly restoredSites: Set<string>;
}

function createTelemetryState(state: GameStateV7): TelemetryStateV7 {
  return {
    contributionByTile: currentContributions(state),
    defectionOffers: new Map(),
    catapultShotTargets: new Set(),
    healingSinceCatapultShot: new Map(),
    catapultSetupUnits: new Set(),
    exposedSaboteurs: new Set(),
    restoredSites: new Set(),
  };
}

function createMetricsV7(state: GameStateV7): HeadlessMetricsV7 {
  const generated = zeroRecord(RESOURCE_IDS_V7);
  for (const tile of state.board.tiles)
    if (tile.resource !== null) generated[tile.resource] += 1;
  return {
    rulesetId: "pulp-wars-poc-7r2",
    setupHash: canonicalHash(state.setup),
    mapHash: canonicalHash({
      board: state.board,
      treasureChests: state.treasureChests,
    }),
    postGenerationPrngHash: canonicalHash(state.random),
    finalPrngHash: "",
    commandHash: "",
    eventHash: "",
    checkpointHash: "",
    finalHash: "",
    commandsByKind: zeroStringRecord(COMMAND_KIND_ORDER_V7),
    eventsByKind: zeroStringRecord(DOMAIN_EVENT_KIND_ORDER_V7),
    research: {
      adoption: zeroRecord(TECHNOLOGY_IDS_V7),
      firstRound: Object.fromEntries(
        TECHNOLOGY_IDS_V7.map((tech) => [tech, null]),
      ) as Record<TechnologyIdV7, number | null>,
      byBranch: zeroStringRecord(TECHNOLOGY_BRANCH_IDS_V7),
    },
    economy: {
      coinsEarned: 0,
      coinsSpent: 0,
      oneCoinFloorAwards: 0,
      negativePopulationLoss: 0,
      spoilsCoins: 0,
      pillageCoins: 0,
      disbandCoins: 0,
    },
    resources: {
      generated,
      converted: zeroRecord(RESOURCE_IDS_V7),
      restored: zeroRecord(RESOURCE_IDS_V7),
      rebuilt: zeroRecord(RESOURCE_IDS_V7),
    },
    improvements: {
      built: zeroRecord(IMPROVEMENT_IDS_V7),
      removed: zeroRecord(IMPROVEMENT_IDS_V7),
      liveOutputHistogram: Object.fromEntries(
        IMPROVEMENT_IDS_V7.map((item) => [item, {}]),
      ) as Record<ImprovementIdV7, Record<string, number>>,
      outages: zeroRecord(IMPROVEMENT_IDS_V7),
      resumptions: zeroRecord(IMPROVEMENT_IDS_V7),
      roadsBuilt: 0,
    },
    capacity: {
      barracksBuilt: 0,
      fortificationAdoptions: 0,
      overcapacityStates: 0,
      reservationTurnBoundaries: 0,
    },
    achievements: {
      progressMaximum: { ENGINEER: 0, MUSTER: 0 },
      unlockRound: { ENGINEER: null, MUSTER: null },
      monumentPlacements: 0,
      monumentTransfers: 0,
      monumentLosses: 0,
      monumentPopulation: 0,
      rewardsFromMonumentGrowth: 0,
    },
    rewards: zeroRecord(REWARD_IDS_V7),
    roles: {
      trained: zeroRecord(UNIT_ROLE_IDS_V7),
      actions: zeroRecord(UNIT_ROLE_IDS_V7),
      damage: zeroRecord(UNIT_ROLE_IDS_V7),
      kills: zeroRecord(UNIT_ROLE_IDS_V7),
      losses: zeroRecord(UNIT_ROLE_IDS_V7),
      captures: zeroRecord(UNIT_ROLE_IDS_V7),
      trainingCoins: zeroRecord(UNIT_ROLE_IDS_V7),
      survivors: zeroRecord(UNIT_ROLE_IDS_V7),
      survivalPerCoin: zeroRecord(UNIT_ROLE_IDS_V7),
    },
    pursuit: {
      activations: 0,
      attacks: 0,
      kills: 0,
      paths: 0,
      stops: {},
      endReasons: {},
      targetSpacing: {},
      publicNodesSearched: 0,
    },
    defection: {
      offers: 0,
      replyTurns: 0,
      arms: 0,
      resolutions: 0,
      cancellations: zeroRecord(DEFECTION_CANCELLATION_REASON_ORDER_V7),
      convertedRoles: zeroRecord(UNIT_ROLE_IDS_V7),
      convertedPublicValue: 0,
      reservationDurationCommands: 0,
    },
    saboteur: {
      concealedTurns: 0,
      detectedTurns: 0,
      exposedTurnsBySource: { ATTACK: 0, PILLAGE: 0, BLACKOUT: 0 },
      blackoutsBlocked: 0,
      suppressionCoins: 0,
      actionsDenied: 0,
      recoveryTurns: 0,
      cooldownObservations: 0,
      postExposureSurvivals: 0,
    },
    catapult: {
      shotRanges: { "2": 0, "3": 0 },
      setupTurns: 0,
      healingBetweenVolleys: 0,
      coordinatedAttackers: 0,
      siegeTurnBoundaries: 0,
      screenSurvivals: 0,
    },
    observation: {
      checks: 0,
      commandChecks: 0,
      previewChecks: 0,
      policyChecks: 0,
      mismatches: 0,
      hiddenInformationViolations: 0,
    },
    relationships: { alliedHostileActions: 0, alliedTerritoryPathSteps: 0 },
    errors: 0,
    stalls: 0,
    commandCapHits: 0,
    roundCapHits: 0,
  };
}

function recordCommandAndEventsV7(
  before: GameStateV7,
  after: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  const actorUnit =
    "unitId" in command
      ? before.units.find((unit) => unit.id === command.unitId)
      : undefined;
  if (actorUnit !== undefined) metrics.roles.actions[actorUnit.role] += 1;
  recordCommandCost(before, actorId, command, metrics);
  if (command.kind === "PURSUE") metrics.pursuit.paths += 1;
  if (command.kind === "PURSUE")
    for (const event of events)
      if (event.kind === "UNIT_MOVE_INTERRUPTED")
        increment(metrics.pursuit.stops, event.reason);
  if (command.kind === "ATTACK" && actorUnit?.role === "LANCER")
    metrics.pursuit.attacks += 1;
  if (command.kind === "ATTACK" && actorUnit?.role === "CATAPULT") {
    const target = before.units.find(
      (unit) => unit.id === command.targetUnitId,
    );
    if (target !== undefined) {
      const range = chebyshev(actorUnit.at, target.at) as 2 | 3;
      if (range === 2 || range === 3)
        metrics.catapult.shotRanges[String(range) as "2" | "3"] += 1;
      metrics.catapult.healingBetweenVolleys +=
        telemetry.healingSinceCatapultShot.get(target.id) ?? 0;
      telemetry.healingSinceCatapultShot.delete(target.id);
      telemetry.catapultShotTargets.add(target.id);
      const view = viewForV7(before, actorId);
      metrics.catapult.coordinatedAttackers += before.units.filter(
        (unit) =>
          unit.ownerId === actorId &&
          unit.role === "CATAPULT" &&
          queryCombatPreviewV7(view, unit.id, target.id) !== null,
      ).length;
    }
  }
  if (command.kind === "MOVE" && actorUnit?.role === "CATAPULT")
    telemetry.catapultSetupUnits.add(actorUnit.id);
  if (command.kind === "CAPTURE" && actorUnit !== undefined)
    metrics.roles.captures[actorUnit.role] += 1;
  recordEventsV7(before, after, events, metrics, telemetry);
  if (command.kind === "END_TURN") {
    metrics.catapult.setupTurns += [...telemetry.catapultSetupUnits].filter(
      (unitId) =>
        before.units.some(
          (unit) => unit.id === unitId && unit.ownerId === actorId,
        ),
    ).length;
    for (const unit of before.units)
      if (unit.ownerId === actorId)
        telemetry.catapultSetupUnits.delete(unit.id);
    metrics.capacity.reservationTurnBoundaries += after.defectionMarks.length;
    for (const exposure of before.saboteurExposures)
      if (
        !after.saboteurExposures.some(
          (item) =>
            item.unitId === exposure.unitId &&
            item.anchorPlayerId === exposure.anchorPlayerId,
        ) &&
        after.units.some((unit) => unit.id === exposure.unitId && unit.hp > 0)
      )
        metrics.saboteur.postExposureSurvivals += 1;
  }
  recordContributionTransitions(before, after, metrics, telemetry);
}

function recordCommandCost(
  state: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  metrics: HeadlessMetricsV7,
): void {
  const view = viewForV7(state, actorId);
  const economic = previewEconomicV7(view, command);
  if (economic.ok) {
    metrics.economy.coinsSpent += economic.preview.cost;
    return;
  }
  if (command.kind === "RESEARCH")
    metrics.economy.coinsSpent += queryResearchCost(view, command.tech);
  if (command.kind === "TRAIN") {
    const cost = effectiveRoleRuleV7(command.role).cost ?? 0;
    metrics.economy.coinsSpent += cost;
    metrics.roles.trainingCoins[command.role] += cost;
  }
}

function recordEventsV7(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  for (const event of events) {
    increment(metrics.eventsByKind, event.kind);
    if (event.kind === "INCOME_AWARDED") {
      metrics.economy.coinsEarned += event.totalCoins;
      metrics.economy.oneCoinFloorAwards += event.cities.filter((income) => {
        const city = after.cities.find((item) => item.id === income.cityId);
        if (
          city === undefined ||
          city.blackout?.phase === "ACTIVE" ||
          cityIsBesieged(after, city.id)
        )
          return false;
        const market = after.board.tiles
          .filter(
            (tile) =>
              tile.territoryCityId === city.id && tile.improvement === "MARKET",
          )
          .reduce(
            (total, tile) =>
              total +
              spatialContributionAtV7(after, tile.at, "MARKET").marketIncome,
            0,
          );
        return (
          city.level +
            Number(city.isCapital) +
            market +
            Math.min(0, city.population) <=
            1 && income.coins === 1
        );
      }).length;
    }
    if (event.kind === "TECH_RESEARCHED") {
      increment(metrics.research.adoption, event.tech);
      metrics.research.firstRound[event.tech] ??= after.round;
      const branch = technologyBranch(event.tech);
      increment(metrics.research.byBranch, branch);
      if (event.tech === "FORTIFICATION")
        metrics.capacity.fortificationAdoptions += 1;
    }
    if (event.kind === "FRUIT_HARVESTED")
      metrics.resources.converted.FRUIT += 1;
    if (event.kind === "GAME_HUNTED") metrics.resources.converted.GAME += 1;
    if (event.kind === "ECONOMIC_BUILDING_BUILT") {
      metrics.improvements.built[event.improvement] += 1;
      if (event.improvement === "BARRACKS") metrics.capacity.barracksBuilt += 1;
      const prior = before.board.tiles.find((tile) =>
        same(tile.at, event.at),
      )?.resource;
      if (prior !== null && prior !== undefined) {
        metrics.resources.converted[prior] += 1;
        if (
          (prior === "FERTILE_GROUND" && event.improvement === "FARM") ||
          (prior === "ORE" && event.improvement === "MINE") ||
          (prior === "STONE" && event.improvement === "QUARRY")
        )
          metrics.resources.rebuilt[prior] += Number(
            telemetry.restoredSites.delete(coordKey(event.at)),
          );
      }
    }
    if (
      event.kind === "ECONOMIC_BUILDING_REMOVED" ||
      event.kind === "IMPROVEMENT_PILLAGED"
    ) {
      metrics.improvements.removed[event.improvement] += 1;
      if (event.resourceRestored !== null) {
        metrics.resources.restored[event.resourceRestored] += 1;
        telemetry.restoredSites.add(coordKey(event.at));
      }
      if (event.improvement === "MONUMENT")
        metrics.achievements.monumentLosses += 1;
    }
    if (event.kind === "ROAD_BUILT") metrics.improvements.roadsBuilt += 1;
    if (event.kind === "FOREST_CLEARED" && event.coinDelta > 0)
      metrics.economy.coinsEarned += event.coinDelta;
    if (event.kind === "TREASURE_CAPTURED" && event.coinDelta > 0)
      metrics.economy.coinsEarned += event.coinDelta;
    if (event.kind === "SPOILS_AWARDED") {
      metrics.economy.coinsEarned += event.coins;
      metrics.economy.spoilsCoins += event.coins;
    }
    if (event.kind === "IMPROVEMENT_PILLAGED") {
      metrics.economy.coinsEarned += event.coinDelta;
      metrics.economy.pillageCoins += event.coinDelta;
    }
    if (event.kind === "UNIT_DISBANDED") {
      metrics.economy.coinsEarned += event.coinDelta;
      metrics.economy.disbandCoins += event.coinDelta;
    }
    if (event.kind === "CITY_REWARD_CHOSEN") {
      metrics.rewards[event.reward] += 1;
      if (event.coinDelta > 0) metrics.economy.coinsEarned += event.coinDelta;
    }
    if (event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED") {
      metrics.rewards[event.reward] += 1;
      metrics.economy.coinsEarned += event.coins;
    }
    if (event.kind === "UNIT_TRAINED") metrics.roles.trained[event.role] += 1;
    if (event.kind === "COMBAT_RESOLVED") {
      const preview = event.preview;
      const attacker = before.units.find(
        (unit) => unit.id === preview.attackerId,
      );
      if (attacker !== undefined) {
        metrics.roles.damage[attacker.role] += preview.damageToDefender;
        if (preview.defenderDies) metrics.roles.kills[attacker.role] += 1;
        if (attacker.role === "LANCER" && preview.defenderDies) {
          metrics.pursuit.kills += 1;
          const target = before.units.find(
            (unit) => unit.id === preview.targetUnitId,
          );
          if (target !== undefined)
            increment(
              metrics.pursuit.targetSpacing,
              String(chebyshev(attacker.at, target.at)),
            );
        }
      }
      const defender = before.units.find(
        (unit) => unit.id === preview.targetUnitId,
      );
      if (defender !== undefined && preview.damageToAttacker > 0) {
        metrics.roles.damage[defender.role] += preview.damageToAttacker;
        if (preview.attackerDies) metrics.roles.kills[defender.role] += 1;
      }
    }
    if (event.kind === "UNIT_DIED") {
      const unit = before.units.find((item) => item.id === event.unitId);
      if (unit !== undefined) metrics.roles.losses[unit.role] += 1;
      telemetry.catapultShotTargets.delete(event.unitId);
      telemetry.healingSinceCatapultShot.delete(event.unitId);
      telemetry.catapultSetupUnits.delete(event.unitId);
    }
    if (event.kind === "PURSUIT_OPENED" && event.attacksUsed === 1)
      metrics.pursuit.activations += 1;
    if (event.kind === "PURSUIT_ENDED")
      increment(metrics.pursuit.endReasons, event.reason);
    if (event.kind === "DEFECTION_OFFERED") {
      metrics.defection.offers += 1;
      telemetry.defectionOffers.set(event.markId, event.offeredAtCommandIndex);
    }
    if (event.kind === "DEFECTION_ARMED") {
      metrics.defection.arms += 1;
      metrics.defection.replyTurns += 1;
    }
    if (event.kind === "DEFECTION_CANCELLED") {
      metrics.defection.cancellations[event.reason] += 1;
      const start = telemetry.defectionOffers.get(event.markId);
      if (start !== undefined)
        metrics.defection.reservationDurationCommands +=
          after.commandIndex - start;
      telemetry.defectionOffers.delete(event.markId);
    }
    if (event.kind === "DEFECTION_RESOLVED") {
      metrics.defection.resolutions += 1;
      const converted = after.units.find(
        (unit) => unit.id === event.targetUnitId,
      );
      if (converted !== undefined) {
        metrics.defection.convertedRoles[converted.role] += 1;
        metrics.defection.convertedPublicValue += publicRoleValue(
          converted.role,
          converted.hp,
        );
      }
      const marks = [...telemetry.defectionOffers.entries()];
      const matching = marks.find(([markId]) => markId === event.markId);
      if (matching !== undefined)
        metrics.defection.reservationDurationCommands +=
          after.commandIndex - matching[1];
      telemetry.defectionOffers.delete(event.markId);
    }
    if (event.kind === "SABOTEUR_EXPOSED")
      telemetry.exposedSaboteurs.add(event.unitId);
    if (event.kind === "BLACKOUT_ACTIVATED") {
      metrics.saboteur.suppressionCoins += event.suppressedCoins;
      metrics.saboteur.actionsDenied += blackoutDeniedCommands(
        after,
        event.cityId,
      );
    }
    if (event.kind === "BLACKOUT_RECOVERY_COMPLETED")
      metrics.saboteur.recoveryTurns += 1;
    if (
      event.kind === "UNIT_HEALED" &&
      telemetry.catapultShotTargets.has(event.targetUnitId)
    )
      telemetry.healingSinceCatapultShot.set(
        event.targetUnitId,
        (telemetry.healingSinceCatapultShot.get(event.targetUnitId) ?? 0) +
          event.amount,
      );
    if (
      event.kind === "UNIT_RECOVERED" &&
      telemetry.catapultShotTargets.has(event.unitId)
    )
      telemetry.healingSinceCatapultShot.set(
        event.unitId,
        (telemetry.healingSinceCatapultShot.get(event.unitId) ?? 0) +
          event.amount,
      );
    if (event.kind === "ACHIEVEMENT_UNLOCKED")
      metrics.achievements.unlockRound[event.achievement] ??= after.round;
    if (event.kind === "MONUMENT_BUILT") {
      metrics.achievements.monumentPlacements += 1;
      metrics.achievements.monumentPopulation += event.populationAdded;
      metrics.achievements.rewardsFromMonumentGrowth += events.filter(
        (candidate) =>
          candidate.kind === "CITY_REWARD_QUEUED" ||
          candidate.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED",
      ).length;
    }
    if (event.kind === "CITY_CAPTURED")
      recordMonumentOwnershipChange(before, after, event.cityId, metrics);
  }
}

function recordSnapshotV7(
  state: GameStateV7,
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
  turnBoundary: boolean,
): void {
  const activePlayerId = activePlayerIdV7(state);
  for (const player of state.players) {
    const view = viewForV7(state, player.id);
    for (const progress of view.achievementProgress)
      metrics.achievements.progressMaximum[progress.achievement] = Math.max(
        metrics.achievements.progressMaximum[progress.achievement],
        progress.achievement === "ENGINEER"
          ? progress.currentMaximumOutput
          : progress.currentDistinctTrainableRoles,
      );
    if (turnBoundary && player.id === activePlayerId)
      for (const unit of state.units.filter(
        (candidate) =>
          candidate.role === "SABOTEUR" && candidate.ownerId !== player.id,
      )) {
        if (view.units.some((visible) => visible.id === unit.id))
          metrics.saboteur.detectedTurns += 1;
        else metrics.saboteur.concealedTurns += 1;
      }
  }
  if (turnBoundary) {
    for (const city of state.cities.filter(
      (candidate) => candidate.ownerId === activePlayerId,
    )) {
      if (city.population < 0)
        metrics.economy.negativePopulationLoss += -city.population;
      if (assignedUnitCountV7(state, city.id) > cityUnitCapacityV7(state, city))
        metrics.capacity.overcapacityStates += 1;
      if (cityIsBesieged(state, city.id))
        metrics.catapult.siegeTurnBoundaries += 1;
    }
    for (const exposure of state.saboteurExposures)
      if (
        exposure.anchorPlayerId === activePlayerId ||
        arePlayersAlliedV7(state, activePlayerId, exposure.anchorPlayerId)
      )
        metrics.saboteur.exposedTurnsBySource[exposure.reason] += 1;
    for (const unit of state.units.filter(
      (candidate) =>
        candidate.role === "SABOTEUR" && candidate.ownerId === activePlayerId,
    )) {
      if (
        unit.blackoutEligibleRound !== null &&
        unit.blackoutEligibleRound > state.round
      )
        metrics.saboteur.cooldownObservations += 1;
      const adjacentHostileCity = state.cities.some(
        (city) =>
          city.ownerId !== unit.ownerId &&
          !arePlayersAlliedV7(state, city.ownerId, unit.ownerId) &&
          chebyshev(city.at, unit.at) === 1,
      );
      if (adjacentHostileCity) {
        const view = viewForV7(state, unit.ownerId);
        const offered = queryPlayerCommandsV7(view).some(
          (command) =>
            command.kind === "BLACKOUT_CITY" && command.unitId === unit.id,
        );
        if (!offered) metrics.saboteur.blackoutsBlocked += 1;
      }
    }
    for (const tile of state.board.tiles) {
      if (tile.improvement === null) continue;
      const value = spatialContributionAtV7(state, tile.at, tile.improvement);
      const output =
        tile.improvement === "MARKET"
          ? value.marketIncome
          : tile.improvement === "BARRACKS"
            ? value.capacity
            : value.population;
      increment(
        metrics.improvements.liveOutputHistogram[tile.improvement],
        String(output),
      );
    }
  }
  metrics.achievements.monumentPopulation =
    state.board.tiles.filter((tile) => tile.improvement === "MONUMENT").length *
    3;
  if (turnBoundary)
    for (const unit of state.units.filter(
      (candidate) =>
        candidate.role === "CATAPULT" &&
        candidate.ownerId === activePlayerId &&
        candidate.hp > 0,
    )) {
      const screened = state.units.some(
        (candidate) =>
          candidate.ownerId === unit.ownerId &&
          candidate.id !== unit.id &&
          candidate.hp * 2 >= candidate.maxHp &&
          effectiveRoleRuleV7(candidate.role).defense2 >= 4 &&
          chebyshev(candidate.at, unit.at) === 1,
      );
      if (screened) metrics.catapult.screenSurvivals += 1;
    }
  telemetry.contributionByTile.clear();
  for (const [key, value] of currentContributions(state))
    telemetry.contributionByTile.set(key, value);
}

function recordContributionTransitions(
  before: GameStateV7,
  after: GameStateV7,
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  const prior =
    telemetry.contributionByTile.size > 0
      ? telemetry.contributionByTile
      : currentContributions(before);
  const next = currentContributions(after);
  for (const [key, value] of next) {
    const old = prior.get(key);
    if (old !== undefined && old.value > 0 && value.value === 0)
      metrics.improvements.outages[value.improvement] += 1;
    if (old !== undefined && old.value === 0 && value.value > 0)
      metrics.improvements.resumptions[value.improvement] += 1;
  }
}

function currentContributions(state: GameStateV7) {
  const result = new Map<
    string,
    { readonly improvement: ImprovementIdV7; readonly value: number }
  >();
  for (const tile of state.board.tiles) {
    if (tile.improvement === null) continue;
    const contribution = spatialContributionAtV7(
      state,
      tile.at,
      tile.improvement,
    );
    result.set(coordKey(tile.at), {
      improvement: tile.improvement,
      value:
        tile.improvement === "MARKET"
          ? contribution.marketIncome
          : tile.improvement === "BARRACKS"
            ? contribution.capacity
            : contribution.population,
    });
  }
  return result;
}

function auditPublicEqualityV7(
  view: PlayerViewV7,
  metrics: HeadlessMetricsV7,
): void {
  const equal = JSON.parse(canonicalJson(view)) as PlayerViewV7;
  const left = queryPlayerCommandsV7(view);
  const right = queryPlayerCommandsV7(equal);
  metrics.observation.checks += 1;
  metrics.observation.commandChecks += 1;
  if (canonicalJson(left) !== canonicalJson(right))
    metrics.observation.mismatches += 1;
  for (const command of left) {
    const previews: unknown[] = [
      previewEconomicV7(view, command),
      previewEconomicV7(equal, command),
    ];
    if (command.kind === "ATTACK")
      previews.push(
        queryCombatPreviewV7(view, command.unitId, command.targetUnitId),
        queryCombatPreviewV7(equal, command.unitId, command.targetUnitId),
      );
    if (command.kind === "OFFER_DEFECTION")
      previews.push(
        previewDefectionV7(view, command),
        previewDefectionV7(equal, command),
      );
    if (command.kind === "BLACKOUT_CITY")
      previews.push(
        previewBlackoutV7(view, command),
        previewBlackoutV7(equal, command),
      );
    if (command.kind === "BUILD_MONUMENT")
      previews.push(
        previewMonumentV7(view, command),
        previewMonumentV7(equal, command),
      );
    for (let index = 0; index < previews.length; index += 2) {
      metrics.observation.previewChecks += 1;
      if (canonicalJson(previews[index]) !== canonicalJson(previews[index + 1]))
        metrics.observation.mismatches += 1;
    }
  }
  metrics.observation.policyChecks += 1;
  if (
    canonicalJson(chooseNormalCommandV7(view)) !==
    canonicalJson(chooseNormalCommandV7(equal))
  )
    metrics.observation.mismatches += 1;
  metrics.observation.hiddenInformationViolations =
    metrics.observation.mismatches;
}

function auditRelationshipCommandV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
  metrics: HeadlessMetricsV7,
): void {
  if (
    (command.kind === "ATTACK" || command.kind === "OFFER_DEFECTION") &&
    arePlayersAlliedV7(
      state,
      actor,
      state.units.find((unit) => unit.id === command.targetUnitId)?.ownerId ??
        actor,
    )
  )
    metrics.relationships.alliedHostileActions += 1;
  if (
    command.kind === "BLACKOUT_CITY" &&
    arePlayersAlliedV7(
      state,
      actor,
      state.cities.find((city) => city.id === command.cityId)?.ownerId ?? actor,
    )
  )
    metrics.relationships.alliedHostileActions += 1;
  if (command.kind === "MOVE" || command.kind === "PURSUE")
    for (const at of command.path) {
      const tile = state.board.tiles.find((item) => same(item.at, at));
      const owner = state.cities.find(
        (city) => city.id === tile?.territoryCityId,
      )?.ownerId;
      if (owner !== undefined && arePlayersAlliedV7(state, actor, owner))
        metrics.relationships.alliedTerritoryPathSteps += 1;
    }
}

function recordMonumentOwnershipChange(
  before: GameStateV7,
  after: GameStateV7,
  cityId: number,
  metrics: HeadlessMetricsV7,
): void {
  const beforeOwner = before.cities.find((city) => city.id === cityId)?.ownerId;
  const afterOwner = after.cities.find((city) => city.id === cityId)?.ownerId;
  const count = before.board.tiles.filter(
    (tile) =>
      tile.territoryCityId === cityId && tile.improvement === "MONUMENT",
  ).length;
  if (count > 0 && beforeOwner !== afterOwner)
    metrics.achievements.monumentTransfers += count;
}

/** Counterfactual public command instances suppressed at Blackout activation. */
function blackoutDeniedCommands(state: GameStateV7, cityId: number): number {
  const city = state.cities.find((item) => item.id === cityId);
  if (city === undefined || city.blackout?.phase !== "ACTIVE") return 0;
  const withoutBlackout: GameStateV7 = {
    ...state,
    cities: state.cities.map((item) =>
      item.id === cityId ? { ...item, blackout: null } : item,
    ),
  };
  const view = viewForV7(withoutBlackout, city.ownerId);
  return queryPlayerCommandsV7(view).filter((command) => {
    if (command.kind === "TRAIN") return command.cityId === cityId;
    if (!("at" in command)) return false;
    const tile = withoutBlackout.board.tiles.find((item) =>
      same(item.at, command.at),
    );
    return tile?.territoryCityId === cityId;
  }).length;
}

function cityIsBesieged(state: GameStateV7, cityId: number): boolean {
  const city = state.cities.find((item) => item.id === cityId);
  return (
    city !== undefined &&
    state.units.some(
      (unit) =>
        unit.hp > 0 &&
        same(unit.at, city.at) &&
        unit.ownerId !== city.ownerId &&
        !arePlayersAlliedV7(state, unit.ownerId, city.ownerId),
    )
  );
}

function technologyBranch(tech: TechnologyIdV7): string {
  const ordinal = TECHNOLOGY_IDS_V7.indexOf(tech);
  return TECHNOLOGY_BRANCH_IDS_V7[Math.floor(ordinal / 5)] ?? "SETTLEMENT";
}

function queryResearchCost(view: PlayerViewV7, tech: TechnologyIdV7): number {
  const cities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  ).length;
  const position = TECHNOLOGY_IDS_V7.indexOf(tech) % 5;
  const tier = position === 0 ? 1 : position === 1 || position === 3 ? 2 : 3;
  return tier === 1
    ? 5 + cities - 1
    : tier === 2
      ? 7 + 2 * (cities - 1)
      : 9 + 3 * (cities - 1);
}

function publicRoleValue(role: UnitRoleIdV7, hp: number): number {
  const rule = effectiveRoleRuleV7(role);
  return role === "JUGGERNAUT"
    ? 40 + rule.attack2 + rule.defense2 + 8
    : (rule.cost ?? 0) * 4 + hp;
}

function activePlayerIdV7(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new RangeError("Active player disappeared");
  return id;
}

function diagnostic(
  state: GameStateV7,
  playerId: PlayerId | null,
  code: string,
  message: string,
): AiDiagnosticV7 {
  return {
    code,
    message,
    commandIndex: state.commandIndex,
    round: state.round,
    playerId,
  };
}

function validateCap(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive safe integer`);
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Policy failed";
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function zeroRecord<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<
    T,
    number
  >;
}

function zeroStringRecord(values: readonly string[]): Record<string, number> {
  return Object.fromEntries(values.map((value) => [value, 0]));
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const chebyshev = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => left.x === right.x && left.y === right.y;
const coordKey = (at: { x: number; y: number }) => `${at.y},${at.x}`;
